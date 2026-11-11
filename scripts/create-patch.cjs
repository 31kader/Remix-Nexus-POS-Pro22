const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
const version = pkg.version || '1.2.81';
const releaseDir = path.resolve(__dirname, '../release');
const distDir = path.resolve(__dirname, '../dist');

if (!fs.existsSync(distDir)) {
  console.error('Erreur: dossier dist introuvable. Veuillez exécuter npm run build.');
  process.exit(1);
}

if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}

const targetZip = path.join(releaseDir, `NexusPOSPro-Patch-v${version}.zip`);
const latestZip = path.join(releaseDir, 'NexusPOSPro-Patch-latest.zip');

console.log(`📦 Création du patch ultra-léger v${version}...`);

// Utiliser PowerShell natif pour compresser dist
const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${targetZip}' -Force"`;
execSync(psCmd, { stdio: 'inherit' });

// Copier vers patch latest
fs.copyFileSync(targetZip, latestZip);

const sizeMb = (fs.statSync(targetZip).size / (1024 * 1024)).toFixed(2);
console.log(`✅ Patch généré avec succès (${sizeMb} Mo au lieu de 130 Mo) :`);
console.log(`   - ${targetZip}`);
console.log(`   - ${latestZip}`);
