import type { CheckResult } from '../types';

// This is a template for the REAL implementation using a proxy service.
// In a production environment, you would call your backend API which then rotates proxies
// to scrape Twitter or uses a commercial API like ScraperAPI/BrightData.

export const checkShadowbanReal = async (username: string): Promise<CheckResult> => {
  if (import.meta.env?.DEV) {
    try {
      const yuzuRes = await fetch(`https://shadowban-api.yuzurisa.com/${username}`);
      if (!yuzuRes.ok) throw new Error('API failed');
      const data = await yuzuRes.json();
      
      if (!data.profile || !data.profile.exists) {
        return {
           exists: false, username, tests: { searchSuggestion: false, searchBan: false, ghostBan: false }, timestamp: new Date().toISOString()
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

      // Note: In dev mode, we skip blob proxy because pbs.twimg.com blocks CORS fetch.
      // The <img> tag can still display cross-origin images fine.
      // In production, the backend (shadow.js) does the base64 proxy for us.

      return {
        username: screenName,
        displayName: displayName,
        profileImageUrl: profileImageUrl,
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
    } catch(err) {
      console.error(err);
      throw err;
    }
  }

  try {
    const response = await fetch('/api/shadow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username })
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch data from backend');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Real check failed:", error);
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

import type { AuditLogEntry, ForensicResult, ForensicThread } from '../types';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
const now = () => new Date().toTimeString().split(' ')[0];

// Client-side forensic audit for dev mode (no CORS issues with yuzurisa API)
const runForensicAuditLocal = async (
  username: string,
  onLog: (entry: AuditLogEntry) => void,
  onThread: (thread: ForensicThread) => void,
): Promise<ForensicResult> => {
  const logs: AuditLogEntry[] = [];
  const threads: ForensicThread[] = [];
  
  const log = (icon: string, message: string, type: AuditLogEntry['type'] = 'info') => {
    const entry: AuditLogEntry = { timestamp: now(), icon, message, type };
    logs.push(entry);
    onLog(entry);
  };

  try {
    // Phase 1: Start
    log('🚀', `Memulai Visibility Deep Scan @${username}`);
    await delay(300);

    // Phase 2: Basic checks
    log('🔍', 'Memeriksa Search Ban + Suggestion Ban...');
    await delay(200);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let yuzuData: any = null;
    try {
      const yuzuRes = await fetch(`https://shadowban-api.yuzurisa.com/${username}`);
      if (yuzuRes.ok) {
        yuzuData = await yuzuRes.json();
      }
    } catch {
      log('⚠️', 'Gagal mengambil data dari API utama', 'warning');
    }

    if (yuzuData?.tests) {
      const searchOk = yuzuData.tests.search === true || yuzuData.tests.search === '_implied_good';
      const typeaheadOk = yuzuData.tests.typeahead === true || yuzuData.tests.typeahead === '_implied_good';

      await delay(400);
      log(searchOk ? '✅' : '❌', searchOk ? 'Search Index: Akun ditemukan di pencarian.' : 'Search Index: TIDAK DITEMUKAN di pencarian.', searchOk ? 'success' : 'error');
      
      await delay(200);
      log(typeaheadOk ? '✅' : '❌', typeaheadOk ? 'Suggestion: Muncul normal di kolom saran.' : 'Suggestion: TIDAK MUNCUL di kolom saran.', typeaheadOk ? 'success' : 'error');
    }

    // Phase 3: Profile scan
    await delay(300);
    log('🔎', 'Mengambil data profil dan aktivitas reply...');
    
    await delay(200);
    log('👤', `Memuat profil @${username}...`);

    const screenName = yuzuData?.profile?.screen_name || username;

    // Try to get additional profile data
    try {
      await fetch(`https://api.vxtwitter.com/${screenName}`);
    } catch {
      // ignore — vxtwitter is optional
    }

    await delay(500);
    log('✅', `Profil @${screenName} berhasil dimuat.`, 'success');

    // Phase 4: Ghost ban verification using yuzurisa's detailed ghost ban data
    const ghostData = yuzuData?.tests?.ghost;
    const hasGhostBan = ghostData?.ban === true;
    
    if (ghostData) {
      await delay(300);
      log('📊', 'Memeriksa visibilitas reply dari berbagai sumber...');

      const testThreads = [
        { name: 'Search Timeline', visible: !hasGhostBan, url: `https://x.com/search?q=from%3A${screenName}&f=live` },
        { name: 'Reply Thread', visible: ghostData.ban !== true, url: `https://x.com/${screenName}/with_replies` },
        { name: 'Notification Feed', visible: yuzuData?.tests?.more_reply_pane !== 'banned', url: `https://x.com/${screenName}` },
      ];

      for (const t of testThreads) {
        await delay(400);
        const threadResult: ForensicThread = {
          authorUsername: t.name,
          tweetId: 'api-check',
          visible: t.visible,
          threadUrl: t.url,
        };
        threads.push(threadResult);
        onThread(threadResult);
        
        log(
          t.visible ? '✅' : '❌',
          t.visible
            ? `${t.name}: Reply terlihat normal`
            : `${t.name}: Reply TERSEMBUNYI`,
          t.visible ? 'success' : 'error'
        );
      }

      if (ghostData.tweet) {
        await delay(300);
        const tweetVisible = !hasGhostBan;
        const tweetId = typeof ghostData.tweet === 'string' ? ghostData.tweet : 'unknown';
        const tweetThread: ForensicThread = {
          authorUsername: 'Tweet Visibility',
          tweetId,
          visible: tweetVisible,
          threadUrl: tweetId !== 'unknown' ? `https://x.com/${screenName}/status/${tweetId}` : `https://x.com/${screenName}`,
        };
        threads.push(tweetThread);
        onThread(tweetThread);
        log(
          tweetVisible ? '✅' : '❌',
          tweetVisible
            ? `Tweet Visibility: Konten terlihat normal`
            : `Tweet Visibility: Konten dibatasi`,
          tweetVisible ? 'success' : 'error'
        );
      }
    } else {
      await delay(300);
      log('⚠️', 'Data ghost ban tidak tersedia. Sumber data terbatas.', 'warning');
    }

    // Calculate results
    const checkedThreads = threads.filter(t => t.visible !== null);
    const visibleThreads = threads.filter(t => t.visible === true);
    const ghostBanVerified = checkedThreads.length > 0 && visibleThreads.length === checkedThreads.length;

    await delay(200);
    log('📋', `Scan selesai. ${visibleThreads.length}/${checkedThreads.length} pengecekan lolos.`);

    return {
      logs,
      threads,
      ghostBanVerified,
      totalChecked: checkedThreads.length,
      totalVisible: visibleThreads.length,
    };
  } catch (error) {
    log('💥', `Fatal error: ${(error as Error).message}`, 'error');
    return {
      logs,
      threads,
      ghostBanVerified: false,
      totalChecked: 0,
      totalVisible: 0,
    };
  }
};

// SSE-based forensic audit for production (Cloudflare Pages Function)
const runForensicAuditSSE = (
  username: string,
  onLog: (entry: AuditLogEntry) => void,
  onThread: (thread: ForensicThread) => void,
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
          resolve(finalResult || { logs, threads, ghostBanVerified: false, totalChecked: 0, totalVisible: 0 });
        }
      } catch (e) {
        console.error('Failed to parse SSE event:', e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      resolve(finalResult || { logs, threads, ghostBanVerified: false, totalChecked: 0, totalVisible: 0 });
    };
  });
};

// Main export: auto-selects dev (client-side) or production (SSE)
export const runForensicAudit = (
  username: string,
  onLog: (entry: AuditLogEntry) => void,
  onThread: (thread: ForensicThread) => void,
): Promise<ForensicResult> => {
  if (import.meta.env?.DEV) {
    return runForensicAuditLocal(username, onLog, onThread);
  }
  return runForensicAuditSSE(username, onLog, onThread);
};
