import { fetchShadowSourceData, runShadowCheck } from './shadow.js';

const PROFILE_SNAPSHOT_BASE_URL = 'https://r.jina.ai/http://x.com/';
const STATUS_LOOKUP_BASE_URL = 'https://api.vxtwitter.com/status/';
const OEMBED_BASE_URL = 'https://publish.twitter.com/oembed?omit_script=1&url=';
const CANDIDATE_PATHS = ['', '/highlights', '/media', '/with_replies'];
const TWEET_CHECK_CONCURRENCY = 4;
const FALLBACK_MAX_TWEETS = 7;
const FALLBACK_CANDIDATE_POOL = 10;
const SPECIAL_TYPE_POOL_LIMIT = 2;
const REPLY_POOL_LIMIT = 2;

function sortIdsByRecency(ids) {
  return [...ids].sort((left, right) => {
    const leftId = BigInt(left);
    const rightId = BigInt(right);

    if (leftId === rightId) {
      return 0;
    }

    return leftId > rightId ? -1 : 1;
  });
}

function extractStatusIds(markdown, username) {
  const normalizedUsername = String(username || '').replace(/^@+/, '');
  const pattern = new RegExp(`https?:\\/\\/x\\.com\\/${normalizedUsername}\\/status\\/(\\d+)`, 'gi');
  const uniqueIds = [];
  const seen = new Set();

  for (const match of markdown.matchAll(pattern)) {
    const id = match[1];
    if (!seen.has(id)) {
      seen.add(id);
      uniqueIds.push(id);
    }
  }

  return uniqueIds;
}

function inferPostType(statusData) {
  if (statusData.qrt) {
    return 'QUOTE';
  }

  if (typeof statusData.text === 'string' && statusData.text.startsWith('RT @')) {
    return 'REPOST';
  }

  if (statusData.replyingTo) {
    return 'REPLY';
  }

  return 'POST';
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

function buildTweetUrl(username, tweetId) {
  return `https://x.com/${username}/status/${tweetId}`;
}

function extractReplyCandidateIds(shadowSourceData) {
  const candidates = [
    shadowSourceData?.tests?.ghost?.tweet,
    shadowSourceData?.tests?.more_replies?.tweet,
  ];

  return candidates
    .map((value) => String(value || '').trim())
    .filter((value) => /^\d+$/.test(value));
}

async function fetchStatusLookup(tweetId) {
  const response = await fetch(`${STATUS_LOOKUP_BASE_URL}${tweetId}`);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function fetchOEmbed(tweetUrl) {
  const response = await fetch(`${OEMBED_BASE_URL}${encodeURIComponent(tweetUrl)}`);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function fetchJinaTweetSnapshot(tweetUrl) {
  const jinaUrl = `https://r.jina.ai/http://${tweetUrl.replace(/^https?:\/\//, '')}`;
  const response = await fetch(jinaUrl);

  if (!response.ok) {
    return null;
  }

  return response.text();
}

async function fetchRecentTweetCheck(username, tweetId) {
  const tweetUrl = buildTweetUrl(username, tweetId);
  const [statusData, oEmbedData] = await Promise.all([
    fetchStatusLookup(tweetId).catch(() => null),
    fetchOEmbed(tweetUrl).catch(() => null),
  ]);

  let jinaMarkdown = null;
  if (!statusData && !oEmbedData) {
    jinaMarkdown = await fetchJinaTweetSnapshot(tweetUrl).catch(() => null);
  }

  const sourceHits = [statusData, oEmbedData, jinaMarkdown].filter(Boolean).length;
  const message =
    (statusData?.text && String(statusData.text).trim()) ||
    (oEmbedData?.html && stripHtml(oEmbedData.html)) ||
    (typeof jinaMarkdown === 'string' &&
      jinaMarkdown
        .split('\n')
        .find((line) => line.startsWith('Title: ') || line.startsWith('# '))) ||
    'Tweet visibility could not be confirmed';

  if (sourceHits === 0) {
    return {
      url: tweetUrl,
      code: 404,
      status: 'UNAVAILABLE',
      message: 'Tweet visibility could not be confirmed from fallback sources',
      type: 'POST',
    };
  }

  return {
    url: statusData?.tweetURL || tweetUrl,
    code: 200,
    status: 'AVAILABLE',
    message,
    type: statusData ? inferPostType(statusData) : 'POST',
  };
}

async function collectCandidateTweetIds(username, replyCandidateIds = []) {
  const collectedIds = new Set();
  const replyPathIds = new Set();

  await Promise.all(
    CANDIDATE_PATHS.map(async (suffix) => {
      try {
        const response = await fetch(`${PROFILE_SNAPSHOT_BASE_URL}${username}${suffix}`);
        if (!response.ok) {
          return;
        }

        const markdown = await response.text();
        const ids = extractStatusIds(markdown, username);
        ids.forEach((id) => {
          collectedIds.add(id);
          if (suffix === '/with_replies') {
            replyPathIds.add(id);
          }
        });
      } catch {
        // Ignore per-page snapshot failures and continue with the rest.
      }
    }),
  );

  replyCandidateIds.forEach((id) => {
    collectedIds.add(id);
    replyPathIds.add(id);
  });

  const prioritizedReplyIds = sortIdsByRecency([...replyPathIds]);
  const remainingIds = sortIdsByRecency([...collectedIds]).filter((id) => !replyPathIds.has(id));

  return [...prioritizedReplyIds, ...remainingIds].slice(0, FALLBACK_CANDIDATE_POOL);
}

function pickBalancedTweetSample(tweets) {
  if (!Array.isArray(tweets) || tweets.length <= FALLBACK_MAX_TWEETS) {
    return tweets;
  }

  const selected = [];
  const usedUrls = new Set();
  const replyTweets = tweets.filter((tweet) => tweet.type === 'REPLY');
  const specialTweets = tweets.filter((tweet) => tweet.type === 'QUOTE' || tweet.type === 'REPOST');
  const regularTweets = tweets.filter((tweet) => !['QUOTE', 'REPOST', 'REPLY'].includes(tweet.type));

  for (const tweet of replyTweets.slice(0, REPLY_POOL_LIMIT)) {
    if (!usedUrls.has(tweet.url)) {
      usedUrls.add(tweet.url);
      selected.push(tweet);
    }
  }

  for (const tweet of specialTweets.slice(0, SPECIAL_TYPE_POOL_LIMIT)) {
    if (!usedUrls.has(tweet.url)) {
      usedUrls.add(tweet.url);
      selected.push(tweet);
    }
  }

  for (const tweet of regularTweets) {
    if (selected.length >= FALLBACK_MAX_TWEETS) {
      break;
    }

    if (!usedUrls.has(tweet.url)) {
      usedUrls.add(tweet.url);
      selected.push(tweet);
    }
  }

  for (const tweet of tweets) {
    if (selected.length >= FALLBACK_MAX_TWEETS) {
      break;
    }

    if (!usedUrls.has(tweet.url)) {
      usedUrls.add(tweet.url);
      selected.push(tweet);
    }
  }

  return selected;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const index = currentIndex;
      currentIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}

export async function fetchIndependentDeepScan(username) {
  const shadowSourceData = await fetchShadowSourceData(username);
  const basicResult = await runShadowCheck(username, { enrichProfile: false });

  if (!basicResult.exists) {
    return {
      not_found: true,
      suspend: false,
      protect: false,
      no_tweet: true,
      no_reply: true,
      search_ban: true,
      search_suggestion_ban: true,
      ghost_ban: true,
      reply_deboosting: true,
      tweets: [],
      api_status: {
        userSearchGroup: { rate_limit: false },
        userTimelineGroup: { rate_limit: false },
      },
      scan_source: 'shadow-api-fallback-v2',
    };
  }

  const replyCandidateIds = extractReplyCandidateIds(shadowSourceData);
  const tweetIds = await collectCandidateTweetIds(basicResult.username, replyCandidateIds);
  const tweets = await mapWithConcurrency(
    tweetIds,
    TWEET_CHECK_CONCURRENCY,
    async (tweetId) => fetchRecentTweetCheck(basicResult.username, tweetId),
  );
  const balancedTweets = pickBalancedTweetSample(tweets);

  const replyTweets = balancedTweets.filter((tweet) => tweet.type === 'REPLY');
  const visibleReplyTweets = replyTweets.filter((tweet) => tweet.code === 200 && tweet.status === 'AVAILABLE');
  const replyVisibilityPassed =
    replyTweets.length > 0 ? visibleReplyTweets.length === replyTweets.length : basicResult.tests.ghostBan;
  const ghostBanDetected = !basicResult.tests.ghostBan || !replyVisibilityPassed;

  return {
    not_found: false,
    suspend: false,
    protect: false,
    no_tweet: balancedTweets.length === 0,
    no_reply: replyTweets.length === 0,
    search_ban: !basicResult.tests.searchBan,
    search_suggestion_ban: !basicResult.tests.searchSuggestion,
    ghost_ban: ghostBanDetected,
    reply_deboosting: ghostBanDetected,
    tweets: balancedTweets,
    api_status: {
      userSearchGroup: { rate_limit: false },
      userTimelineGroup: { rate_limit: false },
    },
    scan_source: 'shadow-api-fallback-v2',
  };
}
