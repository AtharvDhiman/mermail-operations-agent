import { chromium } from 'playwright';
import fs from 'node:fs';

async function testRecord() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: 'video/test_out',
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();
  await page.goto('http://localhost:3333');
  await page.waitForTimeout(3000);

  const video = page.video();
  await context.close();
  await browser.close();

  const videoPath = await video.path();
  console.log('Video saved to:', videoPath);
}

testRecord();
