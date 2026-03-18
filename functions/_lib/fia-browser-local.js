import { runFiaScanInPage } from './fia-browser-shared.js';

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
