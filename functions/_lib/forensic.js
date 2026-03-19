function now() {
  return new Date().toTimeString().split(' ')[0];
}

const MAX_FORENSIC_THREADS = 7;
const MAX_SPECIAL_THREADS = 2;
const MAX_REPLY_THREADS = 2;
const OEMBED_BASE_URL = 'https://publish.twitter.com/oembed?omit_script=1&url=';
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

function hasPostType(tweet, type) {
  return String(tweet?.type || '').toUpperCase() === type;
}

function findReplacementIndex(tweets, preserveTypes = []) {
  const preserve = new Set(preserveTypes);

  for (let index = tweets.length - 1; index >= 0; index -= 1) {
    const type = String(tweets[index]?.type || '').toUpperCase();
    if (!preserve.has(type)) {
      return index;
    }
  }

  return -1;
}

function buildRepresentativeRecentSample(tweets) {
  const items = Array.isArray(tweets) ? tweets.filter(Boolean) : [];

  if (items.length <= MAX_FORENSIC_THREADS) {
    return items;
  }

  const selected = [];
  let replyCount = 0;
  let specialCount = 0;

  for (const tweet of items) {
    if (selected.length >= MAX_FORENSIC_THREADS) {
      break;
    }

    const type = String(tweet?.type || '').toUpperCase();

    if (type === 'REPLY' && replyCount >= MAX_REPLY_THREADS) {
      continue;
    }

    if ((type === 'REPOST' || type === 'QUOTE') && specialCount >= MAX_SPECIAL_THREADS) {
      continue;
    }

    selected.push(tweet);

    if (type === 'REPLY') {
      replyCount += 1;
    } else if (type === 'REPOST' || type === 'QUOTE') {
      specialCount += 1;
    }
  }

  const remaining = items.filter((tweet) => !selected.some((entry) => entry.url === tweet.url));

  const injectCandidate = (matcher, preserveTypes) => {
    if (selected.some((tweet) => matcher(tweet))) {
      return;
    }

    const candidate = remaining.find(
      (tweet) => matcher(tweet) && !selected.some((entry) => entry.url === tweet.url),
    );
    if (!candidate) {
      return;
    }

    const replacementIndex = findReplacementIndex(selected, preserveTypes);
    if (replacementIndex >= 0) {
      selected[replacementIndex] = candidate;
    }
  };

  injectCandidate((tweet) => hasPostType(tweet, 'REPLY'), ['REPLY']);
  injectCandidate(
    (tweet) => hasPostType(tweet, 'REPOST') || hasPostType(tweet, 'QUOTE'),
    ['REPLY', 'REPOST', 'QUOTE'],
  );

  return selected;
}

function normalizePreviewText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildPreviewFromType(type, text, fallbackMessage) {
  const preview = normalizePreviewText(text) || normalizePreviewText(fallbackMessage);

  if (!preview) {
    return normalizePreviewText(fallbackMessage);
  }

  if (type === 'REPOST') {
    return preview.startsWith('Repost ') || preview.startsWith('Repost dari ') ? preview : `Repost: ${preview}`;
  }

  if (type === 'QUOTE') {
    return preview.startsWith('Quote ') ? preview : `Quote: ${preview}`;
  }

  if (type === 'REPLY') {
    return preview.startsWith('Reply ') || preview.startsWith('Reply ke ') ? preview : `Reply: ${preview}`;
  }

  return preview;
}

function extractPreviewFromJina(markdown, fallbackMessage) {
  if (typeof markdown !== 'string' || !markdown.trim()) {
    return normalizePreviewText(fallbackMessage);
  }

  const titleMatch = markdown.match(/Title:\s.*?on X:\s"([^"]+)"/i);
  if (titleMatch?.[1]) {
    return normalizePreviewText(titleMatch[1]);
  }

  const lines = markdown
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !line.startsWith('Title:') &&
        !line.startsWith('URL Source:') &&
        !line.startsWith('Published Time:') &&
        !line.startsWith('Markdown Content:') &&
        line !== '## Post' &&
        line !== '## Conversation' &&
        !line.startsWith('[') &&
        !line.includes('https://x.com/') &&
        !line.includes('https://twitter.com/'),
    );

  return normalizePreviewText(lines[0]) || normalizePreviewText(fallbackMessage);
}

async function fetchOEmbedPreview(tweetUrl) {
  const response = await fetch(`${OEMBED_BASE_URL}${encodeURIComponent(tweetUrl)}`);
  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return stripHtml(data?.html);
}

async function fetchJinaPreview(tweetUrl) {
  const jinaUrl = `https://r.jina.ai/http://${tweetUrl.replace(/^https?:\/\//, '')}`;
  const response = await fetch(jinaUrl);
  if (!response.ok) {
    return null;
  }

  return extractPreviewFromJina(await response.text(), '');
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
    if (response.ok) {
      const statusData = await response.json();
      return {
        ...tweet,
        type: inferTypeFromLookup(statusData),
        message: buildPreviewFromLookup(statusData, tweet.message),
      };
    }
  } catch {
    // Fall through to secondary preview sources.
  }

  try {
    const oEmbedPreview = await fetchOEmbedPreview(tweet.url);
    if (oEmbedPreview) {
      return {
        ...tweet,
        message: buildPreviewFromType(String(tweet?.type || 'POST').toUpperCase(), oEmbedPreview, tweet.message),
      };
    }
  } catch {
    // Fall through to jina fallback.
  }

  try {
    const jinaPreview = await fetchJinaPreview(tweet.url);
    if (jinaPreview) {
      return {
        ...tweet,
        message: buildPreviewFromType(String(tweet?.type || 'POST').toUpperCase(), jinaPreview, tweet.message),
      };
    }
  } catch {
    // Keep the original generic message if every enrichment source fails.
  }

  return tweet;
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

    const sampledTweets = buildRepresentativeRecentSample(Array.isArray(data.tweets) ? data.tweets : []);
    const tweets = await enrichTweets(sampledTweets);
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
