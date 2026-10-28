import { readFileSync, writeFileSync } from 'fs';

const ROOT = 'C:/Users/Josè De La Paz/Documents/Trabajo/standsComercial/stands-showroom/';
const R = f => readFileSync(ROOT + f, 'utf8');

const three = R('js/lib/three.module.min.js');

const expMatch = three.match(/export\{([^}]*)\}\s*;?/);
if (!expMatch) throw new Error('no export block en three');
const pairs = expMatch[1].split(',').map(p => p.trim()).filter(Boolean);
const aliasEntries = pairs.map(p => {
  const idx = p.indexOf(' as ');
  if (idx === -1) return p;
  const internal = p.slice(0, idx).trim();
  const pub = p.slice(idx + 4).trim();
  return pub + ':' + internal;
});
const THREE_ALIAS = 'const THREE={' + aliasEntries.join(',') + '};';

function strip(src) {
  return src
    .replace(/(^|\n)[ \t]*import[\s\S]*?from[ \t]*['"][^'"]+['"];?/g, '$1')
    .replace(/(^|\n)[ \t]*export\s*\{[^}]*\}[ \t]*;?/g, '$1')
    .replace(/(^|\n)[ \t]*export[ \t]+(?=(const|let|var|function|class))/g, '$1');
}

const roomEnv = strip(R('js/lib/RoomEnvironment.js'));
const materials = strip(R('js/materials.js'));
const stands = strip(R('js/stands.js'));
const carousel = strip(R('js/carousel.js'));
const badges = strip(R('js/badges.js'));
const app = strip(R('js/app.js'));
const css = R('css/stands-showroom.css');

let data = R('js/companies-data.js');
const logoPaths = [...data.matchAll(/'assets\/logos\/([^']+)'/g)].map(m => m[1]);
for (const p of logoPaths) {
  const buf = readFileSync(ROOT + 'assets/logos/' + p);
  const ext = p.split('.').pop().toLowerCase();
  const mime = ext === 'svg' ? 'image/svg+xml' : (ext === 'jpg' ? 'image/jpeg' : 'image/' + ext);
  const uri = 'data:' + mime + ';base64,' + buf.toString('base64');
  data = data.split("'" + 'assets/logos/' + p + "'").join("'" + uri + "'");
  console.log('logo embebido:', p, '(' + Math.round(buf.length / 1024) + ' KB)');
}

const bundle = three + '\n' + THREE_ALIAS + '\n(function(){\n' + roomEnv + '\n' + materials + '\n' + stands + '\n' + carousel + '\n' + badges + '\n' + app + '\n})();';

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Stand Showroom 3D — Standalone</title>
<style>
html, body { height: 100%; margin: 0; overflow: hidden; background: #f2f3f5; }
${css}
</style>
</head>
<body>

<div class="stshow" data-stshow data-height="100vh" data-title="Stands Comerciales"></div>

<script>
${data}
</script>

<script type="module">
${bundle}
</script>
</body>
</html>
`;

writeFileSync(ROOT + 'index.html', html, 'utf8');

const m2 = html.match(/<script type="module">\n([\s\S]*?)\n<\/script>/);
writeFileSync('C:/Users/Josè De La Paz/AppData/Local/Temp/stshow-check/standalone-bundle.mjs', m2[1], 'utf8');
console.log('OK — index.html fullscreen generado');
