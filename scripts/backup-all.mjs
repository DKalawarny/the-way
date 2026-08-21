// Nightly kinwove backup: table data + storage objects.
// Driven by ~/Library/LaunchAgents/com.kinwove.backup.plist.
//
// Deliberately a .mjs and not a shell wrapper: the repo lives under ~/Desktop,
// which macOS protects with TCC. The node binary has already been granted
// access; /bin/bash has not, and a bash wrapper dies with "Operation not
// permitted". Keep this driven by node.
//
// Both halves run even if the first throws, so a data-export failure can't
// silently cost the storage mirror too.

const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
let rc = 0;

for (const [label, mod] of [['data', './backup-data.mjs'], ['storage', './backup-storage.mjs']]) {
  console.log(`===== ${stamp()}  ${label} =====`);
  try {
    await import(mod);
  } catch (e) {
    console.error(`!! ${label} backup FAILED: ${e?.message ?? e}`);
    rc = 1;
  }
}

console.log(`===== ${stamp()}  done (exit ${rc}) =====`);
process.exitCode = rc;
