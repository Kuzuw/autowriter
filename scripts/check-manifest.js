'use strict';
/*
 * manifest.json'u doğrular: zorunlu alanlar, başvurulan dosyaların varlığı
 * ve package.json ile sürüm uyumu.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));

const manifest = read('manifest.json');
const pkg = read('package.json');
const problems = [];

if (manifest.manifest_version !== 3) problems.push('manifest_version 3 olmalı');
for (const key of ['name', 'version', 'description', 'author']) {
  if (!manifest[key]) problems.push(`"${key}" alanı eksik`);
}
if (manifest.version !== pkg.version) {
  problems.push(`Sürüm uyuşmuyor: manifest ${manifest.version}, package.json ${pkg.version}`);
}
if (manifest.description && manifest.description.length > 132) {
  problems.push('description 132 karakteri geçmemeli (Chrome Web Store sınırı)');
}

const files = new Set();
const icons = (obj) => obj && Object.values(obj).forEach((f) => files.add(f));
icons(manifest.icons);
icons(manifest.action && manifest.action.default_icon);
if (manifest.action && manifest.action.default_popup) files.add(manifest.action.default_popup);
if (manifest.background && manifest.background.service_worker) files.add(manifest.background.service_worker);
(manifest.content_scripts || []).forEach((cs) => (cs.js || []).concat(cs.css || []).forEach((f) => files.add(f)));

for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) problems.push(`Dosya bulunamadı: ${f}`);
}

if (problems.length) {
  console.error('manifest kontrolü başarısız:\n  - ' + problems.join('\n  - '));
  process.exit(1);
}
console.log(`manifest OK (v${manifest.version}, ${files.size} dosya)`);
