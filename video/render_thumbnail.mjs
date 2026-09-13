import { chromium } from 'playwright';
import path from 'node:path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const htmlUrl = `file:///${path.resolve('video/thumbnail.html').replace(/\\/g, '/')}`;
  await page.goto(htmlUrl, { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'video/thumbnail.png' });
  await browser.close();
  console.log('Thumbnail saved to video/thumbnail.png');
}

main().catch(console.error);
