const fs = require('fs');
const path = require('path');
const tus = require('tus-js-client');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
const version = pkg.version || '1.2.34';
const apkPath = path.resolve(__dirname, `../release/NexusPOSPro-${version}.apk`);
if (!fs.existsSync(apkPath)) {
  console.error('Fichier APK non trouvé:', apkPath);
  process.exit(1);
}

const fileSize = fs.statSync(apkPath).size;
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const projectIdMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
const projectId = projectIdMatch ? projectIdMatch[1] : (process.env.SUPABASE_PROJECT_ID || '');
const bucketName = process.env.SUPABASE_APK_BUCKET || 'KSSGOP';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
if (!anonKey || !projectId) {
  console.error('Variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes dans .env');
  process.exit(1);
}

function uploadFileWithTus(targetObjectName) {
  return new Promise((resolve, reject) => {
    console.log(`\nDébut du téléversement TUS de ${targetObjectName} (${(fileSize / (1024 * 1024)).toFixed(2)} Mo)...`);
    const fileStream = fs.createReadStream(apkPath);

    const upload = new tus.Upload(fileStream, {
      endpoint: `https://${projectId}.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
        'x-upsert': 'true',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucketName,
        objectName: targetObjectName,
        contentType: 'application/vnd.android.package-archive',
        cacheControl: 'no-cache',
      },
      chunkSize: 4 * 1024 * 1024, // morceaux de 4 Mo
      uploadSize: fileSize,
      onError: (error) => {
        console.error(`❌ Échec pour ${targetObjectName}:`, error);
        reject(error);
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
        console.log(`[${targetObjectName}] ${percentage}% (${(bytesUploaded / (1024 * 1024)).toFixed(2)} / ${(bytesTotal / (1024 * 1024)).toFixed(2)} Mo)`);
      },
      onSuccess: () => {
        const publicUrl = `https://${projectId}.supabase.co/storage/v1/object/public/${bucketName}/${targetObjectName}`;
        console.log(`✅ Succès pour ${targetObjectName} !`);
        console.log(`🔗 Lien direct : ${publicUrl}`);
        resolve(publicUrl);
      }
    });

    upload.start();
  });
}

async function main() {
  const urlVersion = await uploadFileWithTus(`NexusPOSPro-${version}.apk`);
  const urlUniversal = await uploadFileWithTus('ksshop.apk');

  console.log('\n======================================================');
  console.log('🎉 TÉLÉVERSEMENT TERMINÉ AVEC SUCCÈS !');
  console.log(`1. Lien versionné (v${version}) :`);
  console.log(urlVersion);
  console.log('2. Lien universel permanent (ksshop.apk) :');
  console.log(urlUniversal);
  console.log('======================================================\n');
}

main().catch(err => {
  console.error('Erreur globale:', err);
  process.exit(1);
});
