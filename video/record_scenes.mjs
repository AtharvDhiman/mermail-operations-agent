import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const scenesConfig = JSON.parse(fs.readFileSync('video/scenes.json', 'utf8'));
const outputDir = path.resolve('video/raw_scenes');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function recordScene(scene, browser) {
  console.log(`\n========================================`);
  console.log(`Recording Scene: ${scene.id} (${scene.title})`);
  console.log(`Target scene duration: ${scene.sceneDuration}s`);
  console.log(`========================================`);

  const tempDir = path.join(outputDir, `temp_${scene.id}`);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: tempDir,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();
  const startTime = Date.now();
  const targetMs = Math.round((scene.sceneDuration + 0.5) * 1000);

  // Helper smooth mouse movement
  async function smoothMove(startX, startY, endX, endY, steps = 25) {
    for (let i = 0; i <= steps; i++) {
      const x = startX + (endX - startX) * (i / steps);
      const y = startY + (endY - startY) * (i / steps);
      await page.mouse.move(x, y);
      await page.waitForTimeout(20);
    }
  }

  try {
    if (scene.id === 'scene01_intro') {
      await page.goto('http://localhost:3333', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      await smoothMove(960, 300, 1100, 380, 20);
      await page.waitForTimeout(2000);
      await page.evaluate(() => window.scrollBy({ top: 550, behavior: 'smooth' }));
      await page.waitForTimeout(4000);
      await smoothMove(600, 600, 960, 650, 20);
    }
    else if (scene.id === 'scene02_problem') {
      const slideUrl = `file:///${path.resolve('video/slides/scene02_architecture.html').replace(/\\/g, '/')}`;
      await page.goto(slideUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      await smoothMove(500, 450, 550, 600, 30);
      await page.waitForTimeout(3500);
      await smoothMove(550, 600, 1350, 450, 40);
      await page.waitForTimeout(3500);
      await smoothMove(1350, 450, 1350, 680, 25);
    }
    else if (scene.id === 'scene03_mermail') {
      await page.goto('http://localhost:3333', { waitUntil: 'networkidle' });
      await page.evaluate(() => {
        document.getElementById('workbench')?.scrollIntoView({ behavior: 'instant' });
      });
      await page.waitForTimeout(2500);
      await smoothMove(400, 250, 450, 380, 25);
      await page.waitForTimeout(3000);
      await smoothMove(450, 380, 700, 420, 25);
      await page.waitForTimeout(3000);
      await smoothMove(700, 420, 500, 500, 20);
    }
    else if (scene.id === 'scene04_modes') {
      await page.goto('http://localhost:3333', { waitUntil: 'networkidle' });
      await page.evaluate(() => {
        document.getElementById('modes')?.scrollIntoView({ behavior: 'smooth' });
      });
      await page.waitForTimeout(3000);
      await smoothMove(350, 500, 400, 550, 20);
      await page.waitForTimeout(2500);
      await smoothMove(400, 550, 750, 550, 25);
      await page.waitForTimeout(2500);
      await smoothMove(750, 550, 1150, 550, 25);
      await page.waitForTimeout(2500);
      await smoothMove(1150, 550, 1550, 550, 25);
    }
    else if (scene.id === 'scene05_scenario') {
      await page.goto('http://localhost:3333', { waitUntil: 'networkidle' });
      await page.evaluate(() => {
        document.getElementById('workbench')?.scrollIntoView({ behavior: 'instant' });
      });
      await page.waitForTimeout(2000);
      await page.click('#btn-scen-treasury');
      await page.waitForTimeout(2500);
      await smoothMove(400, 300, 450, 450, 20);
      await page.waitForTimeout(2000);
      await page.click('#btn-run-agent');
      await page.waitForTimeout(4000);
      await smoothMove(900, 400, 1100, 500, 25);
    }
    else if (scene.id === 'scene06_dag') {
      await page.goto('http://localhost:3333', { waitUntil: 'networkidle' });
      await page.evaluate(() => {
        document.getElementById('workbench')?.scrollIntoView({ behavior: 'instant' });
      });
      await page.click('#btn-scen-treasury');
      await page.waitForTimeout(500);
      await page.click('#btn-run-agent');
      await page.waitForTimeout(3000);
      await smoothMove(1000, 400, 1200, 480, 25);
      await page.waitForTimeout(2500);
      await smoothMove(1200, 480, 1200, 550, 20);
      await page.waitForTimeout(2500);
      await smoothMove(1200, 550, 1200, 620, 20);
    }
    else if (scene.id === 'scene07_security') {
      await page.goto('http://localhost:3333', { waitUntil: 'networkidle' });
      await page.evaluate(() => {
        document.getElementById('workbench')?.scrollIntoView({ behavior: 'instant' });
      });
      await page.click('#btn-scen-treasury');
      await page.waitForTimeout(500);
      await page.click('#btn-run-agent');
      await page.waitForTimeout(3000);
      await smoothMove(1100, 300, 1300, 350, 25);
      await page.waitForTimeout(3000);
      await smoothMove(1300, 350, 1100, 380, 20);
    }
    else if (scene.id === 'scene08_approval') {
      await page.goto('http://localhost:3333', { waitUntil: 'networkidle' });
      await page.evaluate(() => {
        document.getElementById('workbench')?.scrollIntoView({ behavior: 'instant' });
      });
      await page.click('#btn-scen-treasury');
      await page.waitForTimeout(500);
      await page.click('#btn-run-agent');
      await page.waitForTimeout(3500);
      await smoothMove(1000, 500, 1200, 650, 30);
      await page.waitForTimeout(3500);
      const approveBtn = await page.$('#btn-gate-approve');
      if (approveBtn) {
        const box = await approveBtn.boundingBox();
        if (box) {
          await smoothMove(1200, 650, box.x + box.width / 2, box.y + box.height / 2, 25);
          await page.waitForTimeout(1000);
          await page.click('#btn-gate-approve');
        }
      }
      await page.waitForTimeout(3000);
    }
    else if (scene.id === 'scene09_settlement') {
      await page.goto('http://localhost:3333', { waitUntil: 'networkidle' });
      await page.evaluate(() => {
        document.getElementById('workbench')?.scrollIntoView({ behavior: 'instant' });
      });
      await page.click('#btn-scen-treasury');
      await page.waitForTimeout(400);
      await page.click('#btn-run-agent');
      await page.waitForTimeout(2000);
      await page.click('#btn-gate-approve');
      await page.waitForTimeout(2000);
      await smoothMove(1100, 650, 1250, 720, 25);
      await page.waitForTimeout(3000);
      await smoothMove(1250, 720, 1000, 500, 20);
    }
    else if (scene.id === 'scene10_audit') {
      await page.goto('http://localhost:3333', { waitUntil: 'networkidle' });
      await page.evaluate(() => {
        document.getElementById('console')?.scrollIntoView({ behavior: 'smooth' });
      });
      await page.waitForTimeout(3000);
      await smoothMove(500, 500, 800, 650, 30);
      await page.waitForTimeout(3000);
      await smoothMove(800, 650, 1200, 650, 25);
    }
    else if (scene.id === 'scene11_skillmd') {
      const slideUrl = `file:///${path.resolve('video/slides/scene11_skillmd.html').replace(/\\/g, '/')}`;
      await page.goto(slideUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2500);
      await smoothMove(500, 450, 550, 600, 25);
      await page.waitForTimeout(2500);
      await smoothMove(550, 600, 1250, 550, 30);
    }
    else if (scene.id === 'scene12_tests') {
      const slideUrl = `file:///${path.resolve('video/slides/scene12_tests.html').replace(/\\/g, '/')}`;
      await page.goto(slideUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2500);
      await smoothMove(500, 400, 900, 500, 25);
      await page.waitForTimeout(2500);
      await smoothMove(900, 500, 960, 680, 25);
    }
    else if (scene.id === 'scene13_conclusion') {
      const slideUrl = `file:///${path.resolve('video/slides/scene13_summary.html').replace(/\\/g, '/')}`;
      await page.goto(slideUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      await smoothMove(400, 550, 800, 550, 25);
      await page.waitForTimeout(2500);
      await smoothMove(800, 550, 1200, 550, 25);
      await page.waitForTimeout(2000);
      await smoothMove(1200, 550, 960, 750, 25);
    }

    const elapsed = Date.now() - startTime;
    if (elapsed < targetMs) {
      await page.waitForTimeout(targetMs - elapsed);
    }
  } catch (err) {
    console.error(`Error in scene ${scene.id}:`, err);
  }

  const video = page.video();
  await context.close();
  const rawVideoPath = await video.path();

  const finalRawPath = path.join(outputDir, `${scene.id}.webm`);
  if (fs.existsSync(finalRawPath)) {
    fs.unlinkSync(finalRawPath);
  }
  fs.copyFileSync(rawVideoPath, finalRawPath);
  console.log(`Saved raw video to: ${finalRawPath}`);

  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}
}

async function recordAll() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--font-render-hinting=none', '--force-device-scale-factor=1']
  });

  for (const scene of scenesConfig) {
    await recordScene(scene, browser);
  }

  await browser.close();
  console.log('\nAll 13 scenes recorded successfully!');
}

recordAll().catch(console.error);
