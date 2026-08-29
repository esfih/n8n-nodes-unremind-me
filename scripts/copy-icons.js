// n8n loads node icons from dist/, so they must sit alongside the compiled JS.
// This replaces a gulp dependency whose native build broke on Node 18 — for a
// job that is one recursive copy.
const fs = require('fs');
const path = require('path');

function copyIcons(from, to) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(dst, { recursive: true });
      copyIcons(src, dst);
    } else if (/\.(svg|png)$/i.test(entry.name)) {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
      console.log('icon ->', path.relative(process.cwd(), dst));
    }
  }
}
// Both trees, not just nodes/: n8n resolves a credential's `file:` icon
// relative to the credential file, so credentials/ needs its own copy in
// dist/ or the credential renders iconless with no build error to show for it.
for (const dir of ['nodes', 'credentials']) {
  copyIcons(dir, path.join('dist', dir));
}
