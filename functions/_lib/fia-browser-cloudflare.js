import { runFiaScanInPage } from './fia-browser-shared.js';

async function loadCloudflarePlaywright() {
  const dynamicImport = new Function('specifier', 'return import(specifier);');
  const moduleName = ['@cloudflare', 'playwright'].join('/');
  return dynamicImport(moduleName);
}

export async function fetchFiaDeepScanWithCloudflareBrowser(username, browserBinding) {
  const { launch } = await loadCloudflarePlaywright();
  const browser = await launch(browserBinding);

  try {
    const page = await browser.newPage();
    return await runFiaScanInPage(page, username);
  } finally {
    await browser.close();
  }
}
