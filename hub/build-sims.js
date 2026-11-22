#!/usr/bin/env node
// The standalone simulations of the apps for the admin panel: writes hub/sims.json (deployed as
// /sims.json next to the hub page), which the panel's Simulations tab lists.
//   node hub/build-sims.js          write hub/sims.json
//   node hub/build-sims.js --check  only report whether it differs from the pages (exit 1 if so)
// A standalone simulation is a page one folder below an app (e.g. acceleration-voltage/sim/index.html)
// whose head says so, with what it shows:
//   <meta name="standalone-sim" content="A uniform field, a point charge … in slow motion.">
// Its name is the page's <title> (without a trailing " · App"). A new page with that tag is listed
// once this has run; nothing else needs to change. The file: [{ app (as on the hub page, e.g. coe),
// path (/app/folder/), title, description }], in the order of the apps in deploy.sh, then by folder.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'sims.json');

const decode = (s) => s.replace(/&(amp|lt|gt|quot|#39);/g, (m, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[e]).replace(/\s+/g, ' ').trim();

function sims() {
  const deploy = fs.readFileSync(path.join(ROOT, 'deploy.sh'), 'utf8').match(/^APPS="([^"]*)"/m)[1].split(/\s+/).filter(Boolean);
  const out = [];
  for (const a of deploy) {
    const [src, dst] = a.split(':');
    const dir = path.join(ROOT, src);
    if (!fs.existsSync(dir)) continue;
    const subs = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
    for (const sub of subs) {
      const file = path.join(dir, sub, 'index.html');
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, 'utf8');
      const head = html.split(/<\/head>/i)[0];
      const meta = head.match(/<meta\s+name="standalone-sim"\s+content="([^"]*)"\s*\/?>/i);
      if (!meta) continue;
      const title = decode((head.match(/<title>([^<]*)<\/title>/i) || [, ''])[1]).replace(/\s+·\s+[^·]*$/, '');
      if (!title) throw new Error(`${src}/${sub}/index.html: a standalone simulation needs a <title>`);
      out.push({ app: dst || src, path: `/${dst || src}/${sub}/`, title, description: decode(meta[1]) });
    }
  }
  return out;
}

const text = JSON.stringify(sims(), null, 2) + '\n';
if (process.argv.includes('--check')) {
  const old = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (old !== text) {
    console.error('hub/sims.json differs from the standalone simulations of the apps: run node hub/build-sims.js');
    process.exit(1);
  }
  console.log('hub/sims.json is up to date');
} else {
  fs.writeFileSync(OUT, text);
  console.log(`hub/sims.json: ${JSON.parse(text).length} standalone simulations`);
}
