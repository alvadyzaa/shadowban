import { FIA_SITE_ORIGIN } from './fia-browser-shared.js';

const FIA_IPIFY_URL = 'https://api.ipify.org?format=json';
const FIA_GENERATE_KEY_URL = 'https://xsearchbancheckerapi.fia-s.com/api/generate-keyvalue';
const FIA_CHECK_BY_USER_URL = 'https://xsearchbancheckerapi.fia-s.com/api/check-by-user';
const FIA_COMMON_HEADERS = {
  'Content-Type': 'application/json',
  Origin: FIA_SITE_ORIGIN,
  Referer: `${FIA_SITE_ORIGIN}/`,
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
};

function normalizeFiaError(bodyText, fallback) {
  try {
    const data = JSON.parse(bodyText);
    return data?.message || fallback;
  } catch {
    return fallback;
  }
}

function bytesToBase64(bytes) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

async function buildEncryptedKey() {
  const combinedKey = `x1y2z3${'stuvwxYZ7890'}${'ghijklMNOPQR'.slice(0, 6)}${'ABCDEF123456'}${'ghijklMNOPQR'.slice(6)}`;
  const rawKey = new TextEncoder().encode(combinedKey.slice(0, 32));
  const cryptoKey = await crypto.subtle.importKey('raw', rawKey, 'AES-CBC', false, ['encrypt']);
  const ipResponse = await fetch(FIA_IPIFY_URL, {
    headers: {
      'User-Agent': FIA_COMMON_HEADERS['User-Agent'],
    },
  });

  if (!ipResponse.ok) {
    throw new Error(`Gagal mengambil IP publik (${ipResponse.status}).`);
  }

  const { ip } = await ipResponse.json();
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const plainBytes = new TextEncoder().encode(ip || '');
  const encryptedBytes = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, cryptoKey, plainBytes),
  );
  const payloadBytes = new Uint8Array(iv.length + encryptedBytes.length);
  payloadBytes.set(iv, 0);
  payloadBytes.set(encryptedBytes, iv.length);
  return bytesToBase64(payloadBytes);
}

async function solveRequestHash(sessionToken, difficultyValue) {
  const difficulty = Math.max(0, Math.floor(Number(difficultyValue) / 123456789));
  const prefix = '0'.repeat(difficulty);
  const encoder = new TextEncoder();

  for (let counter = 0; counter < 10_000_000; counter += 1) {
    const hashInput = encoder.encode(`${sessionToken}${counter}`);
    const digest = await crypto.subtle.digest('SHA-256', hashInput);
    const digestHex = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    if (digestHex.startsWith(prefix)) {
      return String(counter);
    }
  }

  return '0';
}

export async function fetchFiaDeepScanDirect(username) {
  const payload = {
    screen_name: username,
    key: await buildEncryptedKey(),
    searchban: true,
    repost: true,
  };

  const generateResponse = await fetch(FIA_GENERATE_KEY_URL, {
    method: 'POST',
    headers: FIA_COMMON_HEADERS,
    body: JSON.stringify(payload),
  });
  const generateText = await generateResponse.text();

  if (!generateResponse.ok) {
    throw new Error(normalizeFiaError(generateText, `Generate key gagal (${generateResponse.status}).`));
  }

  const { key: sessionToken, value } = JSON.parse(generateText);
  const requestHash = await solveRequestHash(sessionToken, value);
  const checkResponse = await fetch(FIA_CHECK_BY_USER_URL, {
    method: 'POST',
    headers: {
      ...FIA_COMMON_HEADERS,
      'X-Session-Token': sessionToken,
      'X-Request-Hash': requestHash,
    },
    body: JSON.stringify(payload),
  });
  const checkText = await checkResponse.text();

  if (!checkResponse.ok) {
    throw new Error(normalizeFiaError(checkText, `Deep scan FIA gagal (${checkResponse.status}).`));
  }

  return JSON.parse(checkText);
}
