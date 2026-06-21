const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MAX_GPT_INSTRUCTIONS_CHARS = 8000;

function findExtensionDirs() {
  return fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.endsWith('-extension'))
    .map(entry => path.join(ROOT, entry.name));
}

function fileExists(extensionDir, relativePath) {
  return fs.existsSync(path.join(extensionDir, relativePath));
}

function fail(errors, extensionName, message) {
  errors.push(`[fail] ${extensionName}: ${message}`);
}

function collectHtmlRefs(html) {
  return [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)]
    .map(match => match[1])
    .filter(ref => (
      !ref.startsWith('http://') &&
      !ref.startsWith('https://') &&
      !ref.startsWith('#') &&
      !ref.startsWith('data:')
    ));
}

function validateResource(extensionDir, extensionName, resource, errors) {
  if (!resource || typeof resource !== 'string') return;

  if (resource.includes('*')) {
    const prefix = resource.slice(0, resource.indexOf('*')).replace(/[\\/]+$/, '');
    if (prefix && !fileExists(extensionDir, prefix)) {
      fail(errors, extensionName, `web_accessible_resources wildcard target is missing: ${resource}`);
    }
    return;
  }

  if (!fileExists(extensionDir, resource)) {
    fail(errors, extensionName, `referenced file is missing: ${resource}`);
  }
}

function validateJsSyntax(filePath, errors) {
  const result = spawnSync(process.execPath, ['--check', filePath], {
    cwd: ROOT,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    errors.push(`[fail] ${path.relative(ROOT, filePath)}: JavaScript syntax check failed\n${result.stderr || result.stdout}`);
  }
}

function validateManifest(extensionDir, manifest, errors) {
  const extensionName = path.basename(extensionDir);

  if (manifest.manifest_version !== 3) {
    fail(errors, extensionName, 'manifest_version must be 3');
  }
  if (!manifest.name || typeof manifest.name !== 'string') {
    fail(errors, extensionName, 'name is required');
  }
  if (!manifest.description || typeof manifest.description !== 'string') {
    fail(errors, extensionName, 'description is required');
  }
  if (!manifest.background?.service_worker) {
    fail(errors, extensionName, 'background.service_worker is required');
  } else {
    validateResource(extensionDir, extensionName, manifest.background.service_worker, errors);
  }

  for (const iconPath of Object.values(manifest.icons || {})) {
    validateResource(extensionDir, extensionName, iconPath, errors);
  }
  for (const iconPath of Object.values(manifest.action?.default_icon || {})) {
    validateResource(extensionDir, extensionName, iconPath, errors);
  }

  for (const contentScript of manifest.content_scripts || []) {
    for (const jsPath of contentScript.js || []) validateResource(extensionDir, extensionName, jsPath, errors);
    for (const cssPath of contentScript.css || []) validateResource(extensionDir, extensionName, cssPath, errors);
  }

  for (const group of manifest.web_accessible_resources || []) {
    for (const resource of group.resources || []) {
      validateResource(extensionDir, extensionName, resource, errors);
    }
  }

  const panelPath = path.join(extensionDir, 'panel.html');
  if (fs.existsSync(panelPath)) {
    const html = fs.readFileSync(panelPath, 'utf8');
    for (const ref of collectHtmlRefs(html)) {
      validateResource(extensionDir, extensionName, ref, errors);
    }

    if (html.includes('fonts.googleapis.com')) {
      const csp = manifest.content_security_policy?.extension_pages || '';
      if (!csp.includes('fonts.googleapis.com') || !csp.includes('fonts.gstatic.com')) {
        fail(errors, extensionName, 'panel.html uses Google Fonts but manifest CSP does not allow fonts.googleapis.com/fonts.gstatic.com');
      }
    }
  }
}

let errors = [];

for (const extensionDir of findExtensionDirs()) {
  const extensionName = path.basename(extensionDir);
  const manifestPath = path.join(extensionDir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.log(`[skip] ${extensionName}: no manifest.json yet`);
    continue;
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    fail(errors, extensionName, `manifest.json is invalid JSON: ${error.message}`);
    continue;
  }

  validateManifest(extensionDir, manifest, errors);

  const jsFiles = fs.readdirSync(extensionDir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.js'))
    .map(entry => path.join(entry.parentPath || entry.path, entry.name));

  for (const jsFile of jsFiles) {
    validateJsSyntax(jsFile, errors);
  }

  const instructionFiles = fs.readdirSync(extensionDir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && /^custom-gpt-instructions.*\.txt$/.test(entry.name))
    .map(entry => path.join(entry.parentPath || entry.path, entry.name));

  for (const instructionFile of instructionFiles) {
    const length = fs.readFileSync(instructionFile, 'utf8').length;
    if (length > MAX_GPT_INSTRUCTIONS_CHARS) {
      errors.push(`[fail] ${path.relative(ROOT, instructionFile)}: ${length} chars exceeds ${MAX_GPT_INSTRUCTIONS_CHARS}`);
    }
  }

  console.log(`[ok] ${extensionName}: extension checks complete`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
