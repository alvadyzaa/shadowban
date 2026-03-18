export const FIA_SITE_ORIGIN = 'https://x-shadowban-checker.fia-s.com';

const FIA_IPIFY_URL = 'https://api.ipify.org?format=json';
const FIA_GENERATE_KEY_URL = 'https://xsearchbancheckerapi.fia-s.com/api/generate-keyvalue';
const FIA_CHECK_BY_USER_URL = 'https://xsearchbancheckerapi.fia-s.com/api/check-by-user';

function normalizeFiaError(bodyText, fallback) {
  try {
    const data = JSON.parse(bodyText);
    return data?.message || fallback;
  } catch {
    return fallback;
  }
}

async function runFiaScanInPage(page, username) {
  await page.goto(FIA_SITE_ORIGIN, { waitUntil: 'domcontentloaded' });

  const result = await page.evaluate(
    async ({ username, ipifyUrl, generateUrl, checkUrl }) => {
      const combinedKey = `x1y2z3${'stuvwxYZ7890'}${'ghijklMNOPQR'.slice(0, 6)}${'ABCDEF123456'}${'ghijklMNOPQR'.slice(6)}`;
      const rawKey = new TextEncoder().encode(combinedKey.slice(0, 32));
      const cryptoKey = await crypto.subtle.importKey('raw', rawKey, 'AES-CBC', false, ['encrypt']);

      const ipResponse = await fetch(ipifyUrl);
      const { ip } = await ipResponse.json();

      const iv = crypto.getRandomValues(new Uint8Array(16));
      const plainBytes = new TextEncoder().encode(ip || '');
      const encryptedBytes = new Uint8Array(
        await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, cryptoKey, plainBytes),
      );
      const payloadBytes = new Uint8Array(iv.length + encryptedBytes.length);
      payloadBytes.set(iv, 0);
      payloadBytes.set(encryptedBytes, iv.length);

      const payload = {
        screen_name: username,
        key: btoa(String.fromCharCode(...payloadBytes)),
        searchban: true,
        repost: true,
      };

      const generateResponse = await fetch(generateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const generateText = await generateResponse.text();

      if (!generateResponse.ok) {
        return {
          generateStatus: generateResponse.status,
          generateText,
          checkStatus: 0,
          checkText: '',
        };
      }

      const { key: sessionToken, value } = JSON.parse(generateText);
      const difficulty = Math.max(0, Math.floor(Number(value) / 123456789));
      const prefix = '0'.repeat(difficulty);
      const encoder = new TextEncoder();

      let requestHash = '0';
      for (let counter = 0; counter < 10_000_000; counter += 1) {
        const hashInput = encoder.encode(`${sessionToken}${counter}`);
        const digest = await crypto.subtle.digest('SHA-256', hashInput);
        const digestHex = Array.from(new Uint8Array(digest))
          .map((byte) => byte.toString(16).padStart(2, '0'))
          .join('');

        if (digestHex.startsWith(prefix)) {
          requestHash = String(counter);
          break;
        }
      }

      const checkResponse = await fetch(checkUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionToken,
          'X-Request-Hash': requestHash,
        },
        body: JSON.stringify(payload),
      });

      return {
        generateStatus: generateResponse.status,
        generateText,
        checkStatus: checkResponse.status,
        checkText: await checkResponse.text(),
      };
    },
    {
      username,
      ipifyUrl: FIA_IPIFY_URL,
      generateUrl: FIA_GENERATE_KEY_URL,
      checkUrl: FIA_CHECK_BY_USER_URL,
    },
  );

  if (result.generateStatus !== 200) {
    throw new Error(normalizeFiaError(result.generateText, `Generate key gagal (${result.generateStatus}).`));
  }

  if (result.checkStatus !== 200) {
    throw new Error(normalizeFiaError(result.checkText, `Deep scan FIA gagal (${result.checkStatus}).`));
  }

  return JSON.parse(result.checkText);
}

export async function fetchFiaDeepScanWithLocalBrowser(username, executablePath) {
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-networking'],
  });

  try {
    const page = await browser.newPage();
    return await runFiaScanInPage(page, username);
  } finally {
    await browser.close();
  }
}

export async function fetchFiaDeepScanWithCloudflareBrowser(username, browserBinding) {
  const { launch } = await import('@cloudflare/playwright');
  const browser = await launch(browserBinding);

  try {
    const page = await browser.newPage();
    return await runFiaScanInPage(page, username);
  } finally {
    await browser.close();
  }
}
