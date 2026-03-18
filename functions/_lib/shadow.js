const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
};
const PROFILE_SNAPSHOT_BASE_URL = 'https://r.jina.ai/http://x.com/';

function encodeBase64(binary) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(binary, 'binary').toString('base64');
  }

  return btoa(binary);
}

function parseCompactNumber(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim().replace(/,/g, '');
  const match = normalized.match(/^(\d+(?:\.\d+)?)([KMB])?$/i);

  if (!match) {
    const plain = Number(normalized);
    return Number.isFinite(plain) ? plain : null;
  }

  const base = Number(match[1]);
  const suffix = match[2]?.toUpperCase();

  if (!Number.isFinite(base)) {
    return null;
  }

  if (suffix === 'K') return Math.round(base * 1_000);
  if (suffix === 'M') return Math.round(base * 1_000_000);
  if (suffix === 'B') return Math.round(base * 1_000_000_000);
  return Math.round(base);
}

function parseProfileSnapshot(markdown) {
  const followingValue = markdown.match(/\[([\d.,KMB]+) Following\]/i)?.[1] || null;
  const followersValue =
    markdown.match(/\[([\d.,KMB]+) Followers\]/i)?.[1] ||
    markdown.match(/\[([\d.,KMB]+) Verified Followers\]/i)?.[1] ||
    null;
  const lines = markdown.split('\n').map((line) => line.trim()).filter(Boolean);
  const usernameLineIndex = lines.findIndex((line) => /^@[\w_]+$/i.test(line));
  let displayName = null;

  if (usernameLineIndex > 0) {
    for (let index = usernameLineIndex - 1; index >= 0; index -= 1) {
      const candidate = lines[index];
      if (
        candidate &&
        !candidate.startsWith('![') &&
        !candidate.startsWith('[') &&
        !candidate.includes(' posts') &&
        !candidate.startsWith('Follow') &&
        !candidate.startsWith('Click to Follow')
      ) {
        displayName = candidate;
        break;
      }
    }
  }

  return {
    followingCount: parseCompactNumber(followingValue),
    followersCount: parseCompactNumber(followersValue),
    displayName,
  };
}

export async function fetchShadowSourceData(username) {
  const normalizedUsername = String(username || '').trim().replace(/^@+/, '');

  if (!normalizedUsername) {
    throw new Error('Username is required');
  }

  const yuzuRes = await fetch(`https://shadowban-api.yuzurisa.com/${normalizedUsername}`, {
    headers: DEFAULT_HEADERS,
  });

  if (!yuzuRes.ok) {
    throw new Error(`Failed to fetch primary profile data (${yuzuRes.status})`);
  }

  return yuzuRes.json();
}

export async function runShadowCheck(username, options = {}) {
  const normalizedUsername = String(username || '').trim().replace(/^@+/, '');
  const { enrichProfile = true } = options;
  const data = await fetchShadowSourceData(normalizedUsername);

  if (!data.profile || !data.profile.exists) {
    return {
      username: normalizedUsername,
      displayName: '',
      profileImageUrl: '',
      exists: false,
      followersCount: 0,
      followingCount: 0,
      tests: {
        searchSuggestion: false,
        searchBan: false,
        ghostBan: false,
      },
      timestamp: new Date().toISOString(),
    };
  }

  const tests = data.tests || {};
  const screenName = data.profile.screen_name || normalizedUsername;
  let profileImageUrl = data.profile.profile_image_url_https
    ? data.profile.profile_image_url_https.replace('_normal', '_400x400')
    : `https://unavatar.io/twitter/${screenName}`;
  let followersCount = data.profile.followers_count || 0;
  let followingCount = data.profile.friends_count || data.profile.following_count || 0;
  let displayName = data.profile.name || screenName;

  if (enrichProfile) {
    try {
      const vxRes = await fetch(`https://api.vxtwitter.com/${screenName}`, {
        headers: DEFAULT_HEADERS,
      });

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
      // Fall back to Yuzurisa profile data when vxTwitter is unavailable.
    }

    if (followersCount <= 0 || followingCount <= 0 || displayName === screenName) {
      try {
        const snapshotResponse = await fetch(`${PROFILE_SNAPSHOT_BASE_URL}${screenName}`, {
          headers: DEFAULT_HEADERS,
        });

        if (snapshotResponse.ok) {
          const snapshot = parseProfileSnapshot(await snapshotResponse.text());

          if (snapshot.displayName) {
            displayName = snapshot.displayName;
          }

          if (snapshot.followersCount !== null && snapshot.followersCount > 0) {
            followersCount = snapshot.followersCount;
          }

          if (snapshot.followingCount !== null && snapshot.followingCount > 0) {
            followingCount = snapshot.followingCount;
          }
        }
      } catch {
        // Keep the best data we already have.
      }
    }

    try {
      const bustUrl = new URL(profileImageUrl);
      bustUrl.searchParams.set('cb', Date.now().toString());

      const imgRes = await fetch(bustUrl.toString(), {
        headers: DEFAULT_HEADERS,
      });

      if (imgRes.ok) {
        const bytes = new Uint8Array(await imgRes.arrayBuffer());
        let binary = '';

        for (const byte of bytes) {
          binary += String.fromCharCode(byte);
        }

        const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
        profileImageUrl = `data:${contentType};base64,${encodeBase64(binary)}`;
      }
    } catch {
      // Keep the remote image URL if inlining fails.
    }
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
