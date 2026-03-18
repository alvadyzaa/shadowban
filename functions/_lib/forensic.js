function now() {
  return new Date().toTimeString().split(' ')[0];
}

const MAX_FORENSIC_THREADS = 7;
const GENERIC_TWEET_MESSAGES = new Set([
  'tweet is available',
  'tweet visibility could not be confirmed',
  'tweet visibility could not be confirmed from fallback sources',
]);

export function createLog(icon, message, type = 'info') {
  return {
    timestamp: now(),
    icon,
    message,
    type,
  };
}

export function extractTweetId(url) {
  const match = url.match(/status\/(\d+)/);
  return match ? match[1] : 'unknown';
}

export function mapTweetToThread(tweet, index) {
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

function normalizePreviewText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferTypeFromLookup(statusData) {
  if (statusData?.qrt) {
    return 'QUOTE';
  }

  if (statusData?.retweet || (typeof statusData?.text === 'string' && statusData.text.startsWith('RT @'))) {
    return 'REPOST';
  }

  if (statusData?.replyingTo) {
    return 'REPLY';
  }

  return 'POST';
}

function buildPreviewFromLookup(statusData, fallbackMessage) {
  const fallback = normalizePreviewText(fallbackMessage);
  const type = inferTypeFromLookup(statusData);

  if (type === 'REPOST') {
    const repostUser = statusData?.retweet?.user_screen_name || statusData?.text?.match(/^RT @([^:]+):/)?.[1];
    const repostText = normalizePreviewText(statusData?.retweet?.text || statusData?.text?.replace(/^RT @[^:]+:\s*/, ''));
    return repostUser && repostText ? `Repost dari @${repostUser}: ${repostText}` : repostText || fallback;
  }

  if (type === 'QUOTE') {
    const quoteUser = statusData?.qrt?.user_screen_name;
    const quoteText = normalizePreviewText(statusData?.qrt?.text);
    const commentText = normalizePreviewText(statusData?.text);
    if (commentText && quoteUser && quoteText) {
      return `${commentText} | Quote @${quoteUser}: ${quoteText}`;
    }
    return commentText || (quoteUser && quoteText ? `Quote @${quoteUser}: ${quoteText}` : fallback);
  }

  if (type === 'REPLY') {
    const replyTarget = statusData?.replyingTo;
    const replyText = normalizePreviewText(statusData?.text);
    return replyTarget && replyText ? `Reply ke @${replyTarget}: ${replyText}` : replyText || fallback;
  }

  return normalizePreviewText(statusData?.text) || fallback;
}

async function enrichTweetIfNeeded(tweet) {
  const currentMessage = normalizePreviewText(tweet?.message);
  const needsEnrichment =
    !currentMessage ||
    GENERIC_TWEET_MESSAGES.has(currentMessage.toLowerCase()) ||
    currentMessage.toLowerCase() === 'tweet is available';

  if (!needsEnrichment) {
    return tweet;
  }

  const tweetId = extractTweetId(tweet?.url || '');
  if (!tweetId || tweetId === 'unknown') {
    return tweet;
  }

  try {
    const response = await fetch(`https://api.vxtwitter.com/status/${tweetId}`);
    if (!response.ok) {
      return tweet;
    }

    const statusData = await response.json();
    return {
      ...tweet,
      type: inferTypeFromLookup(statusData),
      message: buildPreviewFromLookup(statusData, tweet.message),
    };
  } catch {
    return tweet;
  }
}

async function enrichTweets(tweets) {
  return Promise.all((Array.isArray(tweets) ? tweets : []).map((tweet) => enrichTweetIfNeeded(tweet)));
}

function buildCompactThreadLog(thread) {
  const status = thread.statusText || (thread.visible ? 'AVAILABLE' : 'UNAVAILABLE');
  return createLog(
    thread.visible ? '✅' : '❌',
    `${thread.authorUsername}: ${status}`,
    thread.visible ? 'success' : 'error',
  );
}

export async function replayCompactForensicResult({ username, forensic, sendEvent }) {
  const threads = Array.isArray(forensic?.threads) ? forensic.threads : [];

  const logs = [
    createLog('🚀', `Memulai Visibility Deep Scan @${username}`),
    createLog('✅', 'Engine deep scan berhasil diakses.', 'success'),
    createLog(
      forensic?.searchSuggestionPassed ? '✅' : '❌',
      forensic?.searchSuggestionPassed ? 'Search Suggestion: normal.' : 'Search Suggestion: terbatas.',
      forensic?.searchSuggestionPassed ? 'success' : 'error',
    ),
    createLog(
      forensic?.searchBanPassed ? '✅' : '❌',
      forensic?.searchBanPassed ? 'Search Ban: normal.' : 'Search Ban: terdeteksi.',
      forensic?.searchBanPassed ? 'success' : 'error',
    ),
    createLog(
      forensic?.replyDeboostingPassed ? '✅' : '❌',
      forensic?.replyDeboostingPassed ? 'Reply Deboosting: tidak terdeteksi.' : 'Reply Deboosting: terdeteksi.',
      forensic?.replyDeboostingPassed ? 'success' : 'error',
    ),
    createLog('🧪', `Memindai ${threads.length} item terbaru untuk cek visibilitas...`),
  ];

  if (!threads.some((thread) => (thread.postType || '').toUpperCase() === 'REPLY')) {
    logs.splice(
      5,
      0,
      createLog('ℹ️', 'Tidak ditemukan reply publik pada sampel terbaru.', 'info'),
    );
  }

  for (const entry of logs) {
    await sendEvent({ type: 'log', entry });
  }

  for (const thread of threads) {
    await sendEvent({ type: 'thread', thread });
    await sendEvent({ type: 'log', entry: buildCompactThreadLog(thread) });
  }

  await sendEvent({
    type: 'log',
    entry: createLog(
      forensic?.ghostBanVerified ? '🛡️' : '⚠️',
      forensic?.ghostBanVerified
        ? 'Deep scan selesai. Reply visibility aman.'
        : 'Deep scan selesai. Ada potensi masalah reply visibility.',
      forensic?.ghostBanVerified ? 'success' : 'warning',
    ),
  });
  await sendEvent({
    type: 'log',
    entry: createLog('📋', `${forensic?.totalVisible || 0}/${forensic?.totalChecked || 0} item lolos pengecekan visibilitas.`),
  });
  await sendEvent({ type: 'result', forensic });
  await sendEvent({ type: 'done' });
}

export async function streamForensicAudit({ username, sendEvent, fetchDeepScan }) {
  const sendLog = async (icon, message, type = 'info') => {
    await sendEvent({
      type: 'log',
      entry: createLog(icon, message, type),
    });
  };

  try {
    await sendLog('🚀', `Memulai Visibility Deep Scan @${username}`);
    await sendLog('🌐', 'Menjalankan Engine Deep Scan...');

    const data = await fetchDeepScan(username);
    const scanSource = data.scan_source || 'shadow-api';

    await sendLog('✅', 'Engine deep scan berhasil diakses. Mengolah hasil akun dan post terbaru...', 'success');
    if (data.not_found) {
      await sendLog('❌', `Akun @${username} tidak ditemukan.`, 'error');
      await sendEvent({
        type: 'result',
        forensic: {
          threads: [],
          ghostBanVerified: false,
          totalChecked: 0,
          totalVisible: 0,
          searchBanPassed: false,
          searchSuggestionPassed: false,
          replyDeboostingPassed: false,
          scanSource,
        },
      });
      await sendEvent({ type: 'done' });
      return;
    }

    if (data.suspend) {
      await sendLog('❌', `Akun @${username} sedang suspend.`, 'error');
    }

    if (data.protect) {
      await sendLog('⚠️', `Akun @${username} bersifat private/protected.`, 'warning');
    }

    await sendLog(
      data.search_suggestion_ban ? '❌' : '✅',
      data.search_suggestion_ban
        ? 'Search Suggestion: akun tidak muncul di suggestion search.'
        : 'Search Suggestion: akun muncul normal di suggestion search.',
      data.search_suggestion_ban ? 'error' : 'success',
    );

    await sendLog(
      data.search_ban ? '❌' : '✅',
      data.search_ban
        ? 'Search Ban: post akun terdeteksi tersembunyi dari search.'
        : 'Search Ban: post akun muncul normal di search.',
      data.search_ban ? 'error' : 'success',
    );

    await sendLog(
      data.ghost_ban ? '❌' : '✅',
      data.ghost_ban
        ? 'Ghost Ban: reply berpotensi tidak terlihat.'
        : 'Ghost Ban: tidak terdeteksi masalah reply utama.',
      data.ghost_ban ? 'error' : 'success',
    );

    await sendLog(
      data.reply_deboosting ? '❌' : '✅',
      data.reply_deboosting
        ? 'Reply Deboosting: reply bisa turun visibilitasnya.'
        : 'Reply Deboosting: tidak terdeteksi deboosting reply.',
      data.reply_deboosting ? 'error' : 'success',
    );

    if (data.api_status?.userSearchGroup?.rate_limit || data.api_status?.userTimelineGroup?.rate_limit) {
      await sendLog('⚠️', 'Engine deep scan memberi sinyal rate limit. Hasil bisa kurang lengkap.', 'warning');
    }

    if (data.no_tweet) {
      await sendLog('⚠️', `Akun @${username} belum punya post untuk dipindai.`, 'warning');
    }

    if (data.no_reply) {
      await sendLog('ℹ️', 'Tidak ditemukan reply publik pada sampel terbaru.', 'info');
    }

    const tweets = await enrichTweets(Array.isArray(data.tweets) ? data.tweets.slice(0, MAX_FORENSIC_THREADS) : []);
    const threads = [];

    await sendLog('🧪', `Memindai ${tweets.length} item terbaru untuk cek visibilitas...`);

    for (let index = 0; index < tweets.length; index += 1) {
      const thread = mapTweetToThread(tweets[index], index);
      threads.push(thread);

      await sendEvent({ type: 'thread', thread });
      await sendEvent({ type: 'log', entry: buildCompactThreadLog(thread) });
    }

    const checkedThreads = threads.filter((thread) => thread.visible !== null);
    const visibleThreads = threads.filter((thread) => thread.visible === true);
    const ghostBanVerified = data.ghost_ban !== true && data.reply_deboosting !== true;

    await sendLog(
      ghostBanVerified ? '🛡️' : '⚠️',
      ghostBanVerified
        ? 'Deep scan selesai. Reply visibility terlihat aman berdasarkan engine API pribadi.'
        : 'Deep scan selesai. Engine API pribadi mendeteksi potensi masalah pada reply visibility.',
      ghostBanVerified ? 'success' : 'warning',
    );
    await sendLog('📋', `${visibleThreads.length}/${checkedThreads.length} item lolos pengecekan visibilitas.`);

    await sendEvent({
      type: 'result',
      forensic: {
        threads,
        ghostBanVerified,
        totalChecked: checkedThreads.length,
        totalVisible: visibleThreads.length,
        searchBanPassed: !data.search_ban,
        searchSuggestionPassed: !data.search_suggestion_ban,
        replyDeboostingPassed: !data.reply_deboosting,
        scanSource,
      },
    });

    await sendEvent({ type: 'done' });
  } catch (error) {
    await sendLog('💥', `Deep scan gagal: ${error.message}`, 'error');
    await sendEvent({ type: 'done' });
  }
}
