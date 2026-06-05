/**
 * Generate icon-192.png and icon-512.png from their SVG sources.
 * Uses Playwright (already installed as a dev dep via Vite ecosystem).
 *
 * Run: node scripts/generate-icons.mjs
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dir, '..', 'public');

async function svgToPng(svgPath, size) {
  const svgContent = readFileSync(svgPath, 'utf8');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Render SVG at exact pixel size — no rounding.
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; }
          body { background: transparent; width: ${size}px; height: ${size}px; overflow: hidden; }
          img { width: ${size}px; height: ${size}px; display: block; }
        </style>
      </head>
      <body>
        <img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}" />
      </body>
    </html>
  `);
  await page.waitForLoadState('networkidle');

  const screenshot = await page.screenshot({
    clip: { x: 0, y: 0, width: size, height: size },
    omitBackground: false,
    type: 'png',
  });

  await browser.close();
  return screenshot;
}

async function main() {
  console.log('Generating icons…');

  const icon192 = await svgToPng(join(publicDir, 'icon-192.svg'), 192);
  writeFileSync(join(publicDir, 'icon-192.png'), icon192);
  console.log('✓ icon-192.png');

  // 512: scale the same SVG — SVG is resolution-independent
  const icon512 = await svgToPng(join(publicDir, 'icon-192.svg'), 512);
  writeFileSync(join(publicDir, 'icon-512.png'), icon512);
  console.log('✓ icon-512.png');

  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
