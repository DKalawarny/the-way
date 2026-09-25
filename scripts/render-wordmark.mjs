/**
 * Render the real KinwoveWordmark to a PNG, for use in email.
 *
 * ⭐ WHY. Daniel, on the wordmark in the email header: "why defaulting to this
 * it is not on brand... still needs to be fixed." He was right. The email drew
 * a bare ✦ glyph in front of the word in Georgia. The actual mark is Fraunces
 * with the star sitting ON the "i" as its tittle, over a dotless ı.
 *
 * ⚠️ IT HAS TO BE A RASTER IMAGE. Gmail strips @font-face, so Fraunces always
 * falls back to Georgia, and it strips `position` too, which is what lifts the
 * star onto the i. Neither half of the mark survives as HTML.
 *
 * ⚠️ EVERY VALUE HERE IS LOCKED IN CLAUDE.md — star path, viewBox, the 0.28em
 * container and -0.72em offset, the dotless ı. Do not adjust any of them to
 * make the render "look better"; fix the component and re-run instead. Mirrors
 * the app's own dark-header call site (App.jsx): cream text, honey star.
 *
 *      npm i --no-save puppeteer && node scripts/render-wordmark.mjs
 */
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const out = path.join(root, 'public/email/wordmark.png')

const SIZE = 32                       // AppHeader/MobileHeader size — LOCKED in CLAUDE.md
const STAR_EM = 0.38                  // the header call sites' starEm — LOCKED in CLAUDE.md
const TEXT = '#F5EDD8'                // T.cream, as the app's dark header passes
const STAR = '#D4A24A'                // T.honey, likewise
const opsz = Math.min(144, Math.max(9, SIZE * 2.5))

const star = `<svg width="100%" height="100%" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="${STAR}" d="M12 1 L13.4 9.6 L22 11 L13.4 12.4 L12 23 L10.6 12.4 L2 11 L10.6 9.6 Z"/></svg>`

const page = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..600&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;background:transparent}
  #mark{display:inline-block;font-family:'Fraunces',Georgia,serif;font-variation-settings:"opsz" ${opsz};
        font-weight:500;font-size:${SIZE}px;line-height:1;letter-spacing:-0.022em;color:${TEXT};position:relative;
        margin:${Math.ceil(SIZE * 0.72)}px 0 0 4px}
  .i{position:relative;display:inline-block}
  .s{position:absolute;top:-0.72em;left:50%;transform:translateX(-50%);width:${STAR_EM}em;height:${STAR_EM}em;display:block}
</style></head><body>
<span id="mark">k<span class="i">&#x131;<span class="s">${star}</span></span>nwove</span>
</body></html>`

fs.writeFileSync('/tmp/wordmark.html', page)
const browser = await puppeteer.launch()
const p = await browser.newPage()
await p.setViewport({ width: 400, height: 140, deviceScaleFactor: 3 })
await p.goto('file:///tmp/wordmark.html', { waitUntil: 'networkidle0' })
await p.evaluate(() => document.fonts.ready)

// Clip to the union of the wordmark and the star rather than to #mark alone.
// The star is absolutely positioned at top:-0.72em and escapes the text box, so
// screenshotting the element either clips it or bakes in whatever padding was
// guessed to clear it. Measuring both gives a tight, exact crop every time.
const clip = await p.evaluate(() => {
  const m = document.querySelector('#mark').getBoundingClientRect()
  const s = document.querySelector('.s').getBoundingClientRect()
  const top = Math.min(m.top, s.top), left = Math.min(m.left, s.left)
  return {
    x: Math.floor(left), y: Math.floor(top),
    width: Math.ceil(Math.max(m.right, s.right) - left),
    height: Math.ceil(Math.max(m.bottom, s.bottom) - top),
  }
})
await p.screenshot({ path: out, omitBackground: true, clip })
await browser.close()
console.log('wrote', out, fs.statSync(out).size, 'bytes')
