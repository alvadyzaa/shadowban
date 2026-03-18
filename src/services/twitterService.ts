import type { AuditLogEntry, CheckResult, ForensicResult, ForensicThread } from '../types';

function isLocalPreviewRuntime() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

async function fetchShadowbanClientSide(username: string): Promise<CheckResult> {
  const yuzuRes = await fetch(`https://shadowban-api.yuzurisa.com/${username}`);
  if (!yuzuRes.ok) throw new Error('API failed');
  const data = await yuzuRes.json();

  if (!data.profile || !data.profile.exists) {
    return {
      exists: false,
      username,
      tests: { searchSuggestion: false, searchBan: false, ghostBan: false },
      timestamp: new Date().toISOString(),
    };
  }

  const tests = data.tests || {};
  const screenName = data.profile.screen_name || username;
  const profileImageUrl = data.profile.profile_image_url_https
    ? data.profile.profile_image_url_https.replace('_normal', '_400x400')
    : `https://unavatar.io/twitter/${screenName}`;
  let followersCount = data.profile.followers_count || 0;
  let followingCount = data.profile.friends_count || data.profile.following_count || 0;
  let displayName = data.profile.name || screenName;

  try {
    const vxRes = await fetch(`https://api.vxtwitter.com/${screenName}`);
    if (vxRes.ok) {
      const vxData = await vxRes.json();
      if (vxData.name) {
        displayName = vxData.name;
      }
      if (vxData.followers_count !== undefined && vxData.followers_count > 0) {
        followersCount = vxData.followers_count;
      }
      if (vxData.following_count !== undefined && vxData.following_count > 0) {
        followingCount = vxData.following_count;
      }
    }
  } catch {
    console.warn('vxtwitter fetch failed, using yuzurisa fallback');
  }

  return {
    username: screenName,
    displayName,
    profileImageUrl,
    followersCount,
    followingCount,
    isVerified: data.profile.is_blue_verified || data.profile.verified || false,
    exists: true,
    tests: {
      searchSuggestion: tests.typeahead === true || tests.typeahead === '_implied_good',
      searchBan: tests.search === true || tests.search === '_implied_good',
      ghostBan: tests.ghost?.ban !== true,
    },
    timestamp: new Date().toISOString(),
  };
}

export const checkShadowbanReal = async (username: string): Promise<CheckResult> => {
  try {
    const response = await fetch('/api/shadow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch data from backend');
    }

    return await response.json();
  } catch (error) {
    if (import.meta.env?.DEV || isLocalPreviewRuntime()) {
      try {
        return await fetchShadowbanClientSide(username);
      } catch (fallbackError) {
        console.error('Fallback client check failed:', fallbackError);
      }
    }

    console.error('Real check failed:', error);
    throw error;
  }
};

export const checkShadowbanMock = async (username: string): Promise<CheckResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const isBanned = username.toLowerCase().includes('ban');
      const isGhost = username.toLowerCase().includes('ghost');

      resolve({
        username,
        exists: true,
        displayName: username.charAt(0).toUpperCase() + username.slice(1),
        profileImageUrl: `https://unavatar.io/twitter/${username}`,
        followersCount: Math.floor(Math.random() * 10000),
        followingCount: Math.floor(Math.random() * 1000),
        tests: {
          searchSuggestion: !isBanned,
          searchBan: !isBanned,
          ghostBan: !isGhost,
        },
        timestamp: new Date().toISOString(),
      });
    }, 1500);
  });
};

const FIA_API_BASE = 'https://xsearchbancheckerapi.fia-s.com/api';
const FIA_GENERATE_KEY_URL = `${FIA_API_BASE}/generate-keyvalue`;
const FIA_CHECK_BY_USER_URL = `${FIA_API_BASE}/check-by-user`;

type ForensicLogHandler = (entry: AuditLogEntry) => void;
type ForensicThreadHandler = (thread: ForensicThread) => void;

interface FiaTweetCheck {
  url: string;
  code: number;
  status: string;
  message: string;
  tweetDate?: string;
  isPinned?: boolean;
  type?: string;
}

interface FiaCheckResponse {
  not_found: boolean;
  suspend: boolean;
  protect: boolean;
  no_tweet: boolean;
  no_reply?: boolean;
  search_ban: boolean;
  search_suggestion_ban: boolean;
  ghost_ban: boolean;
  reply_deboosting: boolean;
  api_status?: {
    userSearchGroup?: { rate_limit?: boolean };
    userTimelineGroup?: { rate_limit?: boolean };
  };
  tweets?: FiaTweetCheck[];
}

const now = () => new Date().toTimeString().split(' ')[0];

function createLog(
  icon: string,
  message: string,
  type: AuditLogEntry['type'] = 'info',
): AuditLogEntry {
  return { timestamp: now(), icon, message, type };
}

function emitLog(
  logs: AuditLogEntry[],
  onLog: ForensicLogHandler,
  icon: string,
  message: string,
  type: AuditLogEntry['type'] = 'info',
) {
  const entry = createLog(icon, message, type);
  logs.push(entry);
  onLog(entry);
}

function createScanKey() {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);

    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    return btoa(binary);
  }

  return btoa(`${Date.now()}-${Math.random()}`);
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'message' in data
        ? String((data as { message?: unknown }).message)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

function extractTweetId(url: string) {
  const match = url.match(/status\/(\d+)/);
  return match?.[1] ?? 'unknown';
}

function mapTweetToThread(tweet: FiaTweetCheck, index: number): ForensicThread {
  const isVisible = tweet.code === 200 && tweet.status === 'AVAILABLE';

  return {
    authorUsername: `Latest ${tweet.type || 'POST'} #${index + 1}`,
    tweetId: extractTweetId(tweet.url),
    visible: isVisible,
    tweetPreview: tweet.message,
    threadUrl: tweet.url,
    postType: tweet.type || 'POST',
    statusCode: tweet.code,
    statusText: tweet.status,
  };
}

async function fetchFiaDeepScan(username: string) {
  const payload = {
    screen_name: username,
    key: createScanKey(),
    searchban: true,
    repost: true,
  };

  await postJson(FIA_GENERATE_KEY_URL, payload);
  return postJson<FiaCheckResponse>(FIA_CHECK_BY_USER_URL, payload);
}

async function runForensicAuditFia(
  username: string,
  onLog: ForensicLogHandler,
  onThread: ForensicThreadHandler,
): Promise<ForensicResult> {
  const logs: AuditLogEntry[] = [];
  const threads: ForensicThread[] = [];

  try {
    emitLog(logs, onLog, '🚀', `Memulai Visibility Deep Scan @${username}`);
    emitLog(logs, onLog, '🔐', 'Menyiapkan session key untuk deep scan...');

    const data = await fetchFiaDeepScan(username);

    emitLog(logs, onLog, '✅', 'Session key siap. Mengambil data akun dan post terbaru...', 'success');

    if (data.not_found) {
      emitLog(logs, onLog, '❌', `Akun @${username} tidak ditemukan.`, 'error');
      return {
        logs,
        threads,
        ghostBanVerified: false,
        totalChecked: 0,
        totalVisible: 0,
        searchBanPassed: false,
        searchSuggestionPassed: false,
        replyDeboostingPassed: false,
        scanSource: 'fia-s',
      };
    }

    if (data.suspend) {
      emitLog(logs, onLog, '❌', `Akun @${username} sedang suspend.`, 'error');
    }

    if (data.protect) {
      emitLog(logs, onLog, '⚠️', `Akun @${username} bersifat private/protected.`, 'warning');
    }

    emitLog(
      logs,
      onLog,
      data.search_suggestion_ban ? '❌' : '✅',
      data.search_suggestion_ban
        ? 'Search Suggestion: akun tidak muncul di suggestion search.'
        : 'Search Suggestion: akun muncul normal di suggestion search.',
      data.search_suggestion_ban ? 'error' : 'success',
    );

    emitLog(
      logs,
      onLog,
      data.search_ban ? '❌' : '✅',
      data.search_ban
        ? 'Search Ban: post akun terdeteksi tersembunyi dari search.'
        : 'Search Ban: post akun muncul normal di search.',
      data.search_ban ? 'error' : 'success',
    );

    emitLog(
      logs,
      onLog,
      data.ghost_ban ? '❌' : '✅',
      data.ghost_ban
        ? 'Ghost Ban: reply berpotensi tidak terlihat.'
        : 'Ghost Ban: tidak terdeteksi masalah reply utama.',
      data.ghost_ban ? 'error' : 'success',
    );

    emitLog(
      logs,
      onLog,
      data.reply_deboosting ? '❌' : '✅',
      data.reply_deboosting
        ? 'Reply Deboosting: reply bisa turun visibilitasnya.'
        : 'Reply Deboosting: tidak terdeteksi deboosting reply.',
      data.reply_deboosting ? 'error' : 'success',
    );

    if (data.api_status?.userSearchGroup?.rate_limit || data.api_status?.userTimelineGroup?.rate_limit) {
      emitLog(logs, onLog, '⚠️', 'Engine referensi memberi sinyal rate limit. Hasil bisa kurang lengkap.', 'warning');
    }

    if (data.no_tweet) {
      emitLog(logs, onLog, '⚠️', `Akun @${username} belum punya post untuk dipindai.`, 'warning');
    }

    if (data.no_reply) {
      emitLog(logs, onLog, '⚠️', `Akun @${username} belum punya sampel reply yang cukup.`, 'warning');
    }

    const tweets = Array.isArray(data.tweets) ? data.tweets : [];
    emitLog(logs, onLog, '🧪', `Memindai ${tweets.length} post terbaru untuk cek visibilitas...`);

    tweets.forEach((tweet, index) => {
      const thread = mapTweetToThread(tweet, index);
      threads.push(thread);
      onThread(thread);

      emitLog(
        logs,
        onLog,
        thread.visible ? '✅' : '❌',
        `${thread.authorUsername}: ${tweet.status} (${tweet.message})`,
        thread.visible ? 'success' : 'error',
      );
    });

    const checkedThreads = threads.filter((thread) => thread.visible !== null);
    const visibleThreads = threads.filter((thread) => thread.visible === true);
    const ghostBanVerified = data.ghost_ban !== true && data.reply_deboosting !== true;

    emitLog(
      logs,
      onLog,
      ghostBanVerified ? '🛡️' : '⚠️',
      ghostBanVerified
        ? 'Deep scan selesai. Reply visibility terlihat aman berdasarkan engine referensi.'
        : 'Deep scan selesai. Engine referensi mendeteksi potensi masalah pada reply visibility.',
      ghostBanVerified ? 'success' : 'warning',
    );
    emitLog(logs, onLog, '📋', `${visibleThreads.length}/${checkedThreads.length} post scan lolos pengecekan visibilitas.`);

    return {
      logs,
      threads,
      ghostBanVerified,
      totalChecked: checkedThreads.length,
      totalVisible: visibleThreads.length,
      searchBanPassed: !data.search_ban,
      searchSuggestionPassed: !data.search_suggestion_ban,
      replyDeboostingPassed: !data.reply_deboosting,
      scanSource: 'fia-s',
    };
  } catch (error) {
    emitLog(logs, onLog, '💥', `Deep scan gagal: ${(error as Error).message}`, 'error');
    return {
      logs,
      threads,
      ghostBanVerified: false,
      totalChecked: 0,
      totalVisible: 0,
      searchBanPassed: false,
      searchSuggestionPassed: false,
      replyDeboostingPassed: false,
      scanSource: 'fia-s',
    };
  }
}

const runForensicAuditSSE = (
  username: string,
  onLog: ForensicLogHandler,
  onThread: ForensicThreadHandler,
): Promise<ForensicResult> => {
  return new Promise((resolve) => {
    const url = `/api/forensic?username=${encodeURIComponent(username)}`;
    const eventSource = new EventSource(url);

    const logs: AuditLogEntry[] = [];
    const threads: ForensicThread[] = [];
    let finalResult: ForensicResult | null = null;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'log' && data.entry) {
          logs.push(data.entry);
          onLog(data.entry);
        }

        if (data.type === 'thread' && data.thread) {
          threads.push(data.thread);
          onThread(data.thread);
        }

        if (data.type === 'result' && data.forensic) {
          finalResult = { ...data.forensic, logs };
        }

        if (data.type === 'done') {
          eventSource.close();
          resolve(
            finalResult || {
              logs,
              threads,
              ghostBanVerified: false,
              totalChecked: 0,
              totalVisible: 0,
            },
          );
        }
      } catch (e) {
        console.error('Failed to parse SSE event:', e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      resolve(
        finalResult || {
          logs,
          threads,
          ghostBanVerified: false,
          totalChecked: 0,
          totalVisible: 0,
        },
      );
    };
  });
};

export const runForensicAudit = (
  username: string,
  onLog: ForensicLogHandler,
  onThread: ForensicThreadHandler,
): Promise<ForensicResult> => {
  if ((import.meta.env?.DEV || isLocalPreviewRuntime()) && typeof EventSource === 'undefined') {
    return runForensicAuditFia(username, onLog, onThread);
  }
  return runForensicAuditSSE(username, onLog, onThread);
};
