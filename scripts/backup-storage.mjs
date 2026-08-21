// Storage backup — the gap neither Supabase's backups nor backup-data.mjs cover.
// Supabase's database backups hold only METADATA about storage objects, so a
// restore brings back the rows pointing at images, not the images themselves.
//
// Mirrors every bucket to ~/kinwove-backups/_storage/<bucket>/<path>.
// Incremental: a file already present at the same byte size is skipped, so the
// nightly run costs almost nothing once the first mirror is done. Files deleted
// upstream are KEPT locally on purpose — that is the point of a backup.
//
// Run: node scripts/backup-storage.mjs   (uses .env service key)
import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
config();

const URL_ = process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error('missing env'); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const JSON_H = { ...H, 'Content-Type': 'application/json' };

const root = path.join(os.homedir(), 'kinwove-backups', '_storage');
const human = n => n > 1e9 ? (n / 1e9).toFixed(2) + ' GB'
  : n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : (n / 1e3).toFixed(0) + ' KB';

// Recurse: entries with id === null are folders, not objects.
async function walk(bucket, prefix = '', depth = 0) {
  const out = [];
  let offset = 0;
  while (true) {
    const r = await fetch(`${URL_}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: JSON_H,
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }),
    });
    if (!r.ok) { console.warn(`  ⚠ list failed ${bucket}/${prefix} → HTTP ${r.status}`); break; }
    const items = await r.json();
    for (const it of items) {
      const full = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.id === null) {
        if (depth < 6) out.push(...await walk(bucket, full, depth + 1));
      } else {
        out.push({ path: full, size: it.metadata?.size ?? 0 });
      }
    }
    if (items.length < 1000) break;
    offset += 1000;
  }
  return out;
}

const buckets = await (await fetch(`${URL_}/storage/v1/bucket`, { headers: H })).json();
if (!Array.isArray(buckets)) { console.error('could not list buckets:', buckets); process.exit(1); }

let got = 0, skip = 0, fail = 0, bytes = 0;
const manifest = {};

for (const b of buckets) {
  const files = await walk(b.name);
  manifest[b.name] = { files: files.length, bytes: files.reduce((s, f) => s + f.size, 0) };
  console.log(`${b.name}: ${files.length} files`);

  for (const f of files) {
    const dest = path.join(root, b.name, f.path);
    // Same size on disk = already have it. Cheap and good enough for immutable
    // uploads; these files are written once and never edited in place.
    if (fs.existsSync(dest) && fs.statSync(dest).size === f.size && f.size > 0) { skip++; continue; }
    const r = await fetch(`${URL_}/storage/v1/object/${b.name}/${f.path}`, { headers: H });
    if (!r.ok) { console.warn(`  ⚠ ${b.name}/${f.path} → HTTP ${r.status}`); fail++; continue; }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
    got++; bytes += f.size;
  }
}

fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(path.join(root, '_manifest.json'), JSON.stringify({
  finishedAt: new Date().toISOString(),
  project: URL_,
  buckets: manifest,
  note: 'Mirror of Supabase Storage. Files deleted upstream are retained here.',
}, null, 2));

console.log(`\n✓ storage backup → ${root}`);
console.log(`  ${got} downloaded (${human(bytes)}), ${skip} already current, ${fail} failed`);
if (fail) process.exitCode = 1;
