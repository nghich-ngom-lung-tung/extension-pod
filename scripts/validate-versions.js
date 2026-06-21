const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function findExtensionDirs() {
  return fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.endsWith('-extension'))
    .map(entry => path.join(ROOT, entry.name));
}

function isValidChromeVersion(version) {
  if (typeof version !== 'string') return false;
  const parts = version.split('.');
  if (parts.length < 1 || parts.length > 4) return false;

  const numbers = parts.map(part => {
    if (!/^(0|[1-9]\d*)$/.test(part)) return null;
    const value = Number(part);
    return value >= 0 && value <= 65535 ? value : null;
  });

  if (numbers.some(value => value === null)) return false;
  if (numbers.every(value => value === 0)) return false;
  return true;
}

let failed = false;

for (const extensionDir of findExtensionDirs()) {
  const manifestPath = path.join(extensionDir, 'manifest.json');
  const extensionName = path.basename(extensionDir);

  if (!fs.existsSync(manifestPath)) {
    console.log(`[skip] ${extensionName}: no manifest.json yet`);
    continue;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const version = manifest.version;

  if (!isValidChromeVersion(version)) {
    console.error(`[fail] ${extensionName}: invalid manifest.version "${version}"`);
    failed = true;
    continue;
  }

  if (manifest.version_name && typeof manifest.version_name !== 'string') {
    console.error(`[fail] ${extensionName}: version_name must be a string when present`);
    failed = true;
    continue;
  }

  console.log(`[ok] ${extensionName}: version ${version}${manifest.version_name ? ` (${manifest.version_name})` : ''}`);
}

if (failed) {
  process.exit(1);
}
