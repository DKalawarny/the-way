/**
 * Render the win-back email's Matthew 5 card to a PNG.
 *
 * ⭐ WHY. Daniel: "cant it just be part of the image becasue thats all it is."
 * The card was HTML trying to imitate BibleReader, and email HTML cannot get
 * there: Gmail strips @font-face so Fraunces falls back to Georgia, Outlook
 * drops rgba() so the tapped-verse tint had to be hand-flattened, and the
 * floated illuminated cap wraps differently in every client. It is a picture
 * of a page. So draw the picture once, properly, and ship one <img>.
 *
 * Everything here is the reader's real value, not an email-safe approximation:
 *   body      Fraunces 18px / 1.9          (T.serif, the reading area)
 *   heading   Newsreader 15.5px / 700      (T.display, section headings)
 *   paper     #0E0906  ink rgba(253,248,240,0.92)   (DARK.bg / DARK.text)
 *   verse no. #A85530                      (DARK.verse, superscript 10px)
 *   red text  #E0796F                      (the wj branch, dark mode)
 *   tapped    rgba(184,115,58,0.15)        (the real selection tint)
 *
 * The initial is public/email/illuminated-cap.png — the real IlluminatedCap,
 * seeded MAT:5, produced by render-illuminated-cap.mjs. Rendered here rather
 * than floated in the email, so the wrap is fixed for every client.
 *
 * ⚠️ PUPPETEER IS NOT A DEPENDENCY. Install transiently and remove after:
 *      npm i --no-save puppeteer && node scripts/render-verse-card.mjs
 */
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const capB64 = fs.readFileSync(path.join(root, 'public/email/illuminated-cap.png')).toString('base64')
const out = path.join(root, 'public/email/verse-card.png')

const W = 416                                  // 480px email body minus 32px padding each side
const RED = '#E0796F'
const num = (n) => `<sup style="font-size:10px;font-weight:700;color:#A85530;vertical-align:super;line-height:1;margin-right:3px">${n}</sup>`
const chip = (l, on) => on
  ? `<span style="background:#B8733A;color:#FDF8F0;border-radius:999px;padding:7px 14px;font-size:13px;margin:0 6px 8px 0;display:inline-block">${l}</span>`
  : `<span style="background:#1A0E07;color:#D9C4AC;border:1px solid #402A18;border-radius:999px;padding:6px 13px;font-size:13px;margin:0 6px 8px 0;display:inline-block">${l}</span>`

const page = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400..700&family=Fraunces:opsz,wght@9..144,300..600&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;background:transparent}
  #card{width:${W}px;box-sizing:border-box;background:#0E0906;border:1px solid rgba(184,115,58,0.2);border-radius:14px;padding:24px 22px 16px;
        font-family:-apple-system,'Helvetica Neue',Arial,sans-serif}
  .label{font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(253,248,240,0.45);margin-bottom:14px}
  .head{font-family:'Newsreader',Georgia,serif;font-size:15.5px;font-weight:700;color:#A85530;letter-spacing:-0.01em;margin:0 0 10px}
  .body{font-family:'Fraunces',Georgia,serif;font-variation-settings:"opsz" 40;font-size:18px;line-height:1.9;color:rgba(253,248,240,0.92)}
  .cap{float:left;width:76px;height:76px;margin:6px 13px 2px 0}
  .sel{background:rgba(184,115,58,0.15);border-radius:4px;padding:2px 4px;color:${RED}}
  .rule{clear:both;border-top:1px solid rgba(184,115,58,0.2);margin-top:18px;padding-top:14px}
</style></head><body>
<div id="card">
  <div class="label">Matthew 5 &nbsp;·&nbsp; KJV</div>
  <div class="head">The Sermon on the Mount</div>
  <div class="body">
    <img class="cap" src="data:image/png;base64,${capB64}">nd seeing the multitudes, he went up into a mountain: and when he was set, his disciples came unto him:
    ${num(2)}And he opened his mouth, and taught them, saying,
    <span class="sel">${num(3)}Blessed are the poor in spirit: for theirs is the kingdom of heaven.</span>
    <span style="color:${RED}">${num(4)}Blessed are they that mourn: for they shall be comforted. ${num(5)}Blessed are the meek: for they shall inherit the earth. ${num(6)}Blessed are they which do hunger and thirst after righteousness: for they shall be filled.</span>
  </div>
  <div class="rule">${chip('Explain simply', true)}${chip('Historical context')}${chip('Cross-references')}${chip('Original Greek')}${chip('Compare versions')}</div>
</div></body></html>`

fs.writeFileSync('/tmp/verse-card.html', page)
const browser = await puppeteer.launch()
const p = await browser.newPage()
await p.setViewport({ width: W + 40, height: 900, deviceScaleFactor: 2 })
await p.goto('file:///tmp/verse-card.html', { waitUntil: 'networkidle0' })
await p.evaluate(() => document.fonts.ready)
const el = await p.$('#card')
await el.screenshot({ path: out, omitBackground: true })
await browser.close()
const { width, height } = await import('child_process').then(() => ({}))
console.log('wrote', out, fs.statSync(out).size, 'bytes')
