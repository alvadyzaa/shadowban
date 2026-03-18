import { runFiaScanInPage } from './fia-browser-shared.js';

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
