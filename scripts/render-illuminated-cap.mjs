/**
 * Render the real IlluminatedCap to a PNG, for use in email.
 *
 * ⭐⭐ WHY THIS EXISTS. Daniel: "we spent a lot of time on design i want to
 * showcase that especially the illumination." The win-back email was drawing a
 * plain Georgia letter in brown where the app draws a jewelled panel — dark
 * ground, gold-gradient versal, sage sprigs, berries, filigree corners.
 *
 * ⚠️ IT HAS TO BE A RASTER IMAGE AND THERE IS NO WAY ROUND THAT. Every part of
 * the illumination is something email cannot do: Gmail strips inline <svg>
 * entirely, `background-clip: text` (the gold on the glyph) is unsupported,
 * radial gradients do not render in Outlook, and the sprigs are SVG paths. An
 * approximation in table HTML would be a different, worse drawing — which is
 * the opposite of showcasing the design.
 *
 * ⚠️ THE SEED LOGIC IS COPIED EXACTLY FROM BibleReader.jsx. Same FNV-1a plus
 * avalanche, same GROUNDS order, same rand() call ORDER — ground, then mirror,
 * then layout. Change the order and the same chapter draws a different panel,
 * which is the one thing the seeding exists to prevent: "same chapter always
 * renders the same panel, like a printed edition." If that component changes,
 * this must change with it.
 *
 *   npx puppeteer@latest --version   # kinwove does NOT depend on puppeteer
 *   node scripts/render-illuminated-cap.mjs MAT 5 A
 *
 * ⚠️ PUPPETEER IS NOT A DEPENDENCY OF THIS PROJECT and should not become one for
 * a script that runs by hand a few times a year. Install it transiently
 * (`npm i --no-save puppeteer`) and remove it after. Do NOT symlink it in from
 * another repo on this machine — that is a path that works only here, breaks
 * silently for anyone else, and I did exactly that while building this.
 */
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer'

const [bookId = 'MAT', chNum = '5', letter = 'A'] = process.argv.slice(2)
const red = false
const seedKey = `${bookId}:${chNum}`

// ── FNV-1a + avalanche, verbatim from the component ──────────────────────────
let h = 2166136261
for (let i = 0; i < seedKey.length; i++) h = Math.imul(h ^ seedKey.charCodeAt(i), 16777619)
h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16
const rand = () => {
  h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909)
  return ((h ^= h >>> 16) >>> 0) / 4294967296
}
const uid = `il${(h >>> 0).toString(36)}${letter}`

const GROUNDS = [
  { g: '#233252', g2: '#131C31' },
  { g: '#33200E', g2: '#190E04' },
  { g: '#522219', g2: '#30120C' },
  { g: '#24371F', g2: '#122010' },
  { g: '#2C2040', g2: '#150F20' },
]
const ground = GROUNDS[Math.floor(rand() * GROUNDS.length)]
const sage = '#7FA26B', sageDeep = '#55713F'
const goldLine = '#D9AE5C'
const berry = red ? '#E0796F' : '#C24A3F'
const mirror = rand() < 0.5
const layout = Math.floor(rand() * 3)

const sprig = (x, y, rot, mir2) => `
  <g transform="translate(${x} ${y}) rotate(${rot}) scale(${mir2 ? -1 : 1} 1)">
    <path d="M 0 0 C 6 -4, 14 -6, 22 -4" fill="none" stroke="${sageDeep}" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M 7 -3.5 C 8 -8, 12 -10, 16 -9 C 13 -6, 11 -4.5, 9 -3.2 Z" fill="${sage}" stroke="${sageDeep}" stroke-width="0.5"/>
    <path d="M 13 -5 C 15 -1, 19 0.5, 23 -0.5 C 20 -3, 17 -4.5, 14 -5 Z" fill="${sage}" stroke="${sageDeep}" stroke-width="0.5"/>
    <circle cx="24" cy="-5.5" r="2.1" fill="${berry}"/>
    <circle cx="27.6" cy="-3" r="1.8" fill="${berry}"/>
    <circle cx="24.6" cy="-1" r="1.5" fill="${berry}"/>
    <circle cx="23.4" cy="-6.1" r="0.65" fill="#FFE9D9" opacity="0.9"/>
  </g>`

const sprigs = layout === 0
  ? sprig(12, 22, -18, mirror) + sprig(60, 88, 8, !mirror)
  : layout === 1
    ? sprig(10, 84, -4, false) + sprig(66, 14, 14, true)
    : sprig(8, 50, -85, mirror) + sprig(64, 90, 6, !mirror)

const gld = red ? 'rg' : 'gg'
const T = (dx, dy, attrs) =>
  `<text x="${50 + dx}" y="${55 + dy}" text-anchor="middle" dominant-baseline="central" font-family="Fraunces, Georgia, serif" font-weight="700" font-size="62" ${attrs}>${letter}</text>`

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="bg-${uid}" cx="38%" cy="28%" r="95%">
      <stop offset="0%" stop-color="${ground.g}"/><stop offset="100%" stop-color="${ground.g2}"/>
    </radialGradient>
    <radialGradient id="halo-${uid}" cx="50%" cy="46%" r="50%">
      <stop offset="0%" stop-color="#F3D27E" stop-opacity="0.34"/>
      <stop offset="70%" stop-color="#F3D27E" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#F3D27E" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gg-${uid}" x1="0" y1="0" x2="0.25" y2="1">
      <stop offset="0%" stop-color="#FDF0BF"/><stop offset="30%" stop-color="#F2CE72"/>
      <stop offset="62%" stop-color="#D19A3F"/><stop offset="100%" stop-color="#8E5A22"/>
    </linearGradient>
    <linearGradient id="rg-${uid}" x1="0" y1="0" x2="0.25" y2="1">
      <stop offset="0%" stop-color="#F5B3A3"/><stop offset="45%" stop-color="#C8543F"/>
      <stop offset="100%" stop-color="#7A2A1C"/>
    </linearGradient>
    <linearGradient id="sh-${uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0"/>
      <stop offset="34%" stop-color="#FFFFFF" stop-opacity="0.9"/>
      <stop offset="47%" stop-color="#FFFFFF" stop-opacity="0"/>
      <stop offset="72%" stop-color="#FFFFFF" stop-opacity="0.35"/>
      <stop offset="82%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <pattern id="in-${uid}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(24)">
      <path d="M 0 5.5 Q 2.6 0.8, 6.2 2.6 Q 4 3.6, 3.1 6.2" fill="none" stroke="#6E4514" stroke-width="1" stroke-linecap="round"/>
      <circle cx="6.6" cy="6" r="0.65" fill="#6E4514"/>
    </pattern>
    <filter id="blur-${uid}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.6"/>
    </filter>
    <clipPath id="round-${uid}"><rect x="0" y="0" width="100" height="100" rx="9" ry="9"/></clipPath>
  </defs>
  <g clip-path="url(#round-${uid})">
    <rect x="0" y="0" width="100" height="100" fill="url(#bg-${uid})"/>
    <g opacity="0.13" stroke="${goldLine}" fill="none" stroke-width="1">
      <path d="M 8 30 Q 22 10 40 14 M 60 12 Q 80 10 92 26 M 90 66 Q 92 84 74 90 M 26 92 Q 10 88 8 70"/>
    </g>
    <rect x="3.5" y="3.5" width="93" height="93" fill="none" stroke="${goldLine}" stroke-width="1.7" opacity="0.95"/>
    <rect x="7" y="7" width="86" height="86" fill="none" stroke="${goldLine}" stroke-width="0.55" opacity="0.5"/>
    <circle cx="3.5" cy="3.5" r="2" fill="${goldLine}"/><circle cx="96.5" cy="3.5" r="2" fill="${goldLine}"/>
    <circle cx="3.5" cy="96.5" r="2" fill="${goldLine}"/><circle cx="96.5" cy="96.5" r="2" fill="${goldLine}"/>
    ${sprigs}
    <circle cx="50" cy="52" r="40" fill="url(#halo-${uid})"/>
    ${T(2.6, 3.2, `fill="rgba(0,0,0,0.55)" filter="url(#blur-${uid})"`)}
    ${T(1.7, 1.9, `fill="${red ? '#571A10' : '#5C3A10'}"`)}
    ${T(1.0, 1.1, `fill="${red ? '#7A2A1C' : '#7A4C16'}"`)}
    ${T(-0.8, -0.9, `fill="${red ? '#FFD9CE' : '#FFF4D2'}"`)}
    ${T(0, 0, `fill="url(#${gld}-${uid})" stroke="${red ? '#4A150C' : '#4A2E0C'}" stroke-width="0.8" paint-order="stroke"`)}
    ${T(0, 0, `fill="url(#in-${uid})" opacity="0.5"`)}
    ${T(0, 0, `fill="url(#sh-${uid})" opacity="0.72"`)}
    <g transform="translate(36 32)" fill="#FFFFFF" opacity="0.9">
      <path d="M 0 -3.2 L 0.85 -0.85 L 3.2 0 L 0.85 0.85 L 0 3.2 L -0.85 0.85 L -3.2 0 L -0.85 -0.85 Z"/>
    </g>
  </g>
</svg>`

// ⚠️ Rendered through a browser with the REAL font loaded. Fraunces is what the
// app sets; falling back to Georgia silently would put a different letterform
// in the email than the one on the screen it is advertising.
const page = `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&display=block">
<style>html,body{margin:0;background:transparent}#c{width:100px;height:100px}</style>
<div id="c">${svg}</div>`

// ⚠️ Relative to THIS FILE, not the cwd. kinwove has no puppeteer, so this is
// run with node resolving modules from the other repo — and a cwd-relative path
// then writes the PNG into the wrong project.
const out = path.resolve(
  path.dirname(new URL(import.meta.url).pathname), '../public/email/illuminated-cap.png',
)
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync('/tmp/cap.html', page)

const b = await puppeteer.launch({ headless: 'new' })
const p = await b.newPage()
// ⚠️ 3x, not 4x. It displays at 78px, so 3x (234px) is already past retina —
// and GMAIL CLIPS A MESSAGE OVER 102KB, which makes every kilobyte here a
// question of whether the email survives intact.
await p.setViewport({ width: 100, height: 100, deviceScaleFactor: 3 })
await p.goto('file:///tmp/cap.html', { waitUntil: 'networkidle0' })
await p.evaluate(() => document.fonts.ready)
await new Promise(r => setTimeout(r, 400))
await p.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: 100, height: 100 } })
await b.close()

console.log(`${seedKey} "${letter}"  ground ${ground.g}  layout ${layout}  mirror ${mirror}`)
console.log(`→ ${out}  (${(fs.statSync(out).size / 1024).toFixed(1)} KB)`)
