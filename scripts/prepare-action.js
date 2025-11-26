#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const actionRoot = path.resolve(__dirname, '..');
const workspaceRoot = process.env.GITHUB_WORKSPACE
  ? path.resolve(process.env.GITHUB_WORKSPACE)
  : process.cwd();

const input = (key, defaultValue = '') => {
  const value = process.env[key];
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return String(value).trim();
};

const toSlug = (value, fallback) => {
  if (!value) return fallback;
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
};

const ensureDir = (dirPath, label) => {
  if (!fs.existsSync(dirPath)) {
    throw new Error(`${label} not found: ${dirPath}`);
  }
  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) {
    throw new Error(`${label} must be a directory: ${dirPath}`);
  }
};

const copySite = (source, target) => {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(source, target, {
    recursive: true,
    filter: (file) => {
      const base = path.basename(file);
      return base !== '.DS_Store' && base !== 'Thumbs.db';
    },
  });
};

const copyIconIfProvided = (sourcePath, targetName, workspace, assetsDir) => {
  if (!sourcePath) return;
  const resolvedSource = path.resolve(workspace, sourcePath);
  if (!fs.existsSync(resolvedSource)) {
    throw new Error(`Icon file not found: ${resolvedSource}`);
  }
  const destination = path.join(assetsDir, targetName);
  fs.copyFileSync(resolvedSource, destination);
  console.log(`Icon updated: ${destination}`);
};

const generateUpdateConfig = (autoUpdate, githubOwner, githubRepo) => {
  if (autoUpdate !== 'true') return null;

  // githubOwner and githubRepo should have defaults from GitHub context
  // but validate just in case
  if (!githubOwner || !githubRepo) {
    console.warn('Warning: GitHub owner/repo not provided, auto-update may not work correctly');
  }

  return {
    provider: 'github',
    owner: githubOwner,
    repo: githubRepo,
  };
};

const writeAutoUpdateModule = (actionRoot, enabled, githubOwner, githubRepo) => {
  const autoUpdatePath = path.join(actionRoot, 'src', 'auto-update.js');
  
  if (enabled !== 'true') {
    // Write a stub module when auto-update is disabled
    const stubContent = `// Auto-update is disabled
module.exports = {
  enabled: false,
  init: () => {},
};
`;
    fs.writeFileSync(autoUpdatePath, stubContent);
    console.log('Auto-update disabled, wrote stub module');
    return;
  }

  // Write the full auto-update module when enabled using update-electron-app
  const moduleContent = `const updateElectronApp = require('update-electron-app');

module.exports = {
  enabled: true,
  init: () => {
    updateElectronApp({
      repo: '${githubOwner}/${githubRepo}',
      updateInterval: '1 hour',
    });
  },
};
`;
  fs.writeFileSync(autoUpdatePath, moduleContent);
  console.log('Auto-update module generated with update-electron-app');
};

// Normalize version string for Windows compatibility
// Windows rcedit requires version format X.Y.Z, not vX.Y.Z
const normalizeVersion = (version) => {
  if (!version) return version;
  // Remove leading 'v' or 'V' if present
  return version.replace(/^v/i, '');
};

const main = () => {
  const sitePath = input('SITE_PATH', 'dist');
  const appNameInput = input('APP_NAME');
  const productName = input('PRODUCT_NAME');
  const appVersion = normalizeVersion(input('APP_VERSION'));
  const appDescription = input('APP_DESCRIPTION');
  const author = input('AUTHOR');
  const iconIcns = input('ICON_ICNS_PATH');
  const iconIco = input('ICON_ICO_PATH');
  const iconPng = input('ICON_PNG_PATH');
  const autoUpdate = input('AUTO_UPDATE', 'false');
  const githubOwner = input('GITHUB_OWNER');
  const githubRepo = input('GITHUB_REPO');

  const resolvedSitePath = path.resolve(workspaceRoot, sitePath);
  ensureDir(resolvedSitePath, 'Site path');

  fs.rmSync(path.join(actionRoot, 'out'), { recursive: true, force: true });

  const pkgPath = path.join(actionRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const updatedName = toSlug(appNameInput, pkg.name);

  pkg.name = updatedName;
  if (productName) pkg.productName = productName;
  if (appVersion) pkg.version = appVersion;
  if (appDescription) pkg.description = appDescription;
  if (author) {
    if (typeof pkg.author === 'object' && pkg.author !== null) {
      pkg.author.name = author;
    } else {
      pkg.author = { name: author };
    }
  }

  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(
    `Metadata applied -> name: ${pkg.name}, productName: ${pkg.productName}, version: ${pkg.version}, author: ${pkg.author?.name || 'unchanged'}`
  );

  const assetsDir = path.join(actionRoot, 'assets');
  copyIconIfProvided(iconIcns, 'AppIcon.icns', workspaceRoot, assetsDir);
  copyIconIfProvided(iconIco, 'AppIcon.ico', workspaceRoot, assetsDir);
  copyIconIfProvided(iconPng, 'AppIcon.png', workspaceRoot, assetsDir);

  const distTarget = path.join(actionRoot, 'dist');
  copySite(resolvedSitePath, distTarget);
  console.log(`Copied static site from ${resolvedSitePath} into ${distTarget}`);

  // Generate auto-update module based on configuration
  writeAutoUpdateModule(actionRoot, autoUpdate, githubOwner, githubRepo);

  // Generate update config for forge.config.js if auto-update is enabled
  const updateConfig = generateUpdateConfig(autoUpdate, githubOwner, githubRepo);
  if (updateConfig) {
    const updateConfigPath = path.join(actionRoot, 'update-config.json');
    fs.writeFileSync(updateConfigPath, JSON.stringify(updateConfig, null, 2));
    console.log(`Update config generated: ${JSON.stringify(updateConfig)}`);
  } else {
    // Remove update config if it exists
    const updateConfigPath = path.join(actionRoot, 'update-config.json');
    if (fs.existsSync(updateConfigPath)) {
      fs.unlinkSync(updateConfigPath);
    }
  }
};

main();
