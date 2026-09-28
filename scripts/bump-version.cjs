/**
 * Script d'auto-incrémentation de version pour Nexus POS Pro
 * Exécuté automatiquement avant chaque génération de fichier (.exe / build)
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const oldVersion = pkg.version || '1.2.14';

// Calculer la nouvelle version (ex: 1.2.14 -> 1.2.15)
const parts = oldVersion.split('.').map(n => parseInt(n, 10));
if (parts.length === 3 && !parts.some(isNaN)) {
  parts[2] += 1;
} else {
  parts[0] = 1;
  parts[1] = 2;
  parts[2] = 15;
}
const newVersion = process.argv[2] || parts.join('.');

pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

const filesToUpdate = [
  'src/config/appConfig.ts',
  'src/components/Sidebar.tsx',
  'src/components/Settings.tsx',
  'src/components/LoginView.tsx',
  'src/components/ErrorBoundary.tsx',
  'src/components/IOSInstallModal.tsx',
  'build/license.txt',
  'GEMINI.md'
];

const escapedOld = oldVersion.replace(/\./g, '\\.');
const regexOld = new RegExp(escapedOld, 'g');

for (const relPath of filesToUpdate) {
  const fullPath = path.join(rootDir, relPath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const updated = content.replace(regexOld, newVersion);
    if (updated !== content) {
      fs.writeFileSync(fullPath, updated, 'utf8');
    }
  }
}

// Mettre à jour aussi android/app/build.gradle (versionCode + versionName) pour Google Play Store
const gradlePath = path.join(rootDir, 'android/app/build.gradle');
if (fs.existsSync(gradlePath)) {
  let gradleContent = fs.readFileSync(gradlePath, 'utf8');
  gradleContent = gradleContent.replace(/versionCode\s+(\d+)/, (_, code) => `versionCode ${parseInt(code, 10) + 1}`);
  gradleContent = gradleContent.replace(/versionName\s+"[^"]+"/, `versionName "${newVersion}"`);
  fs.writeFileSync(gradlePath, gradleContent, 'utf8');
}

console.log(`✅ [Nexus Auto-Version] Version incrémentée automatiquement : v${oldVersion} -> v${newVersion}`);
