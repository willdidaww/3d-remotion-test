/* =========================================================================
 * Export the deterministic HTML video to a PNG sequence, then (optionally)
 * to MP4 with ffmpeg. This is NOT a screen recording: we SET the timeline
 * time, wait for the browser to actually paint, then capture. No dropped
 * frames even if a frame takes 300ms to render.
 *
 * Prereqs:
 *   npm install               (installs puppeteer, see package.json)
 *   ffmpeg on PATH            (only needed for the final MP4 mux)
 *
 * Usage:
 *   node scripts/export-frames.mjs
 *   ffmpeg -framerate 60 -i frames/f%05d.png -c:v libx264 -pix_fmt yuv420p -crf 16 out.mp4
 *
 * Env overrides:  FPS=60  OUT=frames  URL=...  SCALE=1
 * ======================================================================= */
import puppeteer from 'puppeteer';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const FPS   = Number(process.env.FPS   || 60);
const OUT   = process.env.OUT          || 'frames';
const SCALE = Number(process.env.SCALE || 1);     // 1 = 1080x1920
// default to the local file via file:// (ES-module inline + CDN works on file://)
const URL = process.env.URL ||
  pathToFileURL(resolve(process.cwd(), 'index.html')).href + '?clean=1';

await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  headless: 'new',
  // These GL flags are what make headless WebGL render instead of going black.
  args: ['--enable-gpu', '--use-gl=angle', '--use-angle=swiftshader',
         '--enable-webgl', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: SCALE });
await page.goto(URL, { waitUntil: 'networkidle0' });

await page.waitForFunction('window.VIDEO && window.VIDEO.ready', { timeout: 120000 });
await page.evaluate(() => document.fonts.ready);

const DURATION = await page.evaluate(() => window.VIDEO.DURATION);
const total = Math.ceil(DURATION * FPS);
console.log(`${total} frames @ ${FPS}fps (${DURATION}s) -> ${OUT}/`);

for (let i = 0; i < total; i++) {
  const t = i / FPS;
  // set time, then let TWO rAFs pass: one for DOM/style writes, one for the
  // WebGL render loop to draw with the new values.
  await page.evaluate(async (time) => {
    window.VIDEO.seek(time);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, t);

  await page.screenshot({
    path: `${OUT}/f${String(i).padStart(5, '0')}.png`,
    clip: { x: 0, y: 0, width: 1080, height: 1920 },
    optimizeForSpeed: true,
  });

  if (i % FPS === 0) process.stdout.write(`\r${i}/${total}  ${t.toFixed(1)}s`);
}

console.log(`\ndone — ${total} frames in ${OUT}/`);
await browser.close();
