'use strict';
/*
 * Validates manifest.json: required fields, referenced files, version parity
 * with package.json, and that every locale has the same message keys.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));

const manifest = read('manifest.json');
const pkg = read('package.json');
const problems = [];

if (manifest.manifest_version !== 3) problems.push('manifest_version must be 3');
for (const key of ['name', 'version', 'description', 'author', 'default_locale']) {
  if (!manifest[key]) problems.push(`missing "${key}"`);
}
if (manifest.version !== pkg.version) {
  problems.push(`version mismatch: manifest ${manifest.version}, package.json ${pkg.version}`);
}

// Locales
const localesDir = path.join(root, '_locales');
const locales = fs.readdirSync(localesDir).filter((d) => fs.existsSync(path.join(localesDir, d, 'messages.json')));
const catalogs = Object.fromEntries(locales.map((l) => [l, read(`_locales/${l}/messages.json`)]));
const base = catalogs[manifest.default_locale];
if (!base) problems.push(`default_locale "${manifest.default_locale}" has no messages.json`);

if (base) {
  for (const [locale, cat] of Object.entries(catalogs)) {
    const missing = Object.keys(base).filter((k) => !cat[k]);
    const extra = Object.keys(cat).filter((k) => !base[k]);
    if (missing.length) problems.push(`${locale}: missing messages ${missing.join(', ')}`);
    if (extra.length) problems.push(`${locale}: unknown messages ${extra.join(', ')}`);
    const desc = cat.extDescription && cat.extDescription.message;
    if (desc && desc.length > 132) problems.push(`${locale}: extDescription is over 132 characters`);
  }
  // Every __MSG_x__ in the manifest and every data-i18n / getMessage key must exist
  const used = new Set();
  JSON.stringify(manifest).replace(/__MSG_(\w+)__/g, (_, k) => used.add(k));
  for (const f of ['popup.html', 'popup.js', 'content.js', 'background.js']) {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    src.replace(/data-i18n(?:-[\w-]+)?="(\w+)"/g, (_, k) => used.add(k));
    src.replace(/(?:\bL|\bt|getMessage)\('(\w+)'/g, (_, k) => used.add(k));
  }
  for (const k of used) if (!base[k]) problems.push(`message "${k}" is used but not defined`);
}

// Files referenced by the manifest
const files = new Set();
const icons = (obj) => obj && Object.values(obj).forEach((f) => files.add(f));
icons(manifest.icons);
icons(manifest.action && manifest.action.default_icon);
if (manifest.action && manifest.action.default_popup) files.add(manifest.action.default_popup);
if (manifest.background && manifest.background.service_worker) files.add(manifest.background.service_worker);
(manifest.content_scripts || []).forEach((cs) => (cs.js || []).concat(cs.css || []).forEach((f) => files.add(f)));
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) problems.push(`file not found: ${f}`);
}

if (problems.length) {
  console.error('manifest check failed:\n  - ' + problems.join('\n  - '));
  process.exit(1);
}
console.log(`manifest OK (v${manifest.version}, ${files.size} files, locales: ${locales.join(', ')})`);
