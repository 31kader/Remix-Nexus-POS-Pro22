/**
 * Générateur ICO sans WebAssembly
 * Crée un fichier .ico avec BMP intégré pour Electron Builder
 */
const fs = require('fs');
const path = require('path');

function createBMPData(size) {
  const BITMAPINFOHEADER_SIZE = 40;
  const pixelDataSize = size * size * 4; // 32bpp BGRA
  const andMaskRowSize = Math.ceil(size / 32) * 4;
  const andMaskSize = andMaskRowSize * size;
  const totalSize = BITMAPINFOHEADER_SIZE + pixelDataSize + andMaskSize;

  const buf = Buffer.alloc(totalSize);
  let offset = 0;

  // BITMAPINFOHEADER
  buf.writeInt32LE(BITMAPINFOHEADER_SIZE, offset); offset += 4;
  buf.writeInt32LE(size, offset); offset += 4;
  buf.writeInt32LE(size * 2, offset); offset += 4; // height x2 (XOR+AND)
  buf.writeUInt16LE(1, offset); offset += 2;        // planes
  buf.writeUInt16LE(32, offset); offset += 2;       // biBitCount
  buf.writeInt32LE(0, offset); offset += 4;         // biCompression
  buf.writeInt32LE(pixelDataSize, offset); offset += 4;
  buf.writeInt32LE(0, offset); offset += 4;
  buf.writeInt32LE(0, offset); offset += 4;
  buf.writeInt32LE(0, offset); offset += 4;
  buf.writeInt32LE(0, offset); offset += 4;

  // Pixel data (bottom-up, BGRA)
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const pixelOffset = offset + row * size * 4 + col * 4;
      const cx = size / 2;
      const cy = size / 2;
      // distance normalisée du centre
      const dist = Math.sqrt((col - cx) ** 2 + (row - cy) ** 2) / (size / 2);

      let r, g, b, a;
      if (dist < 0.35) {
        // Centre brillant indigo
        r = 0xA5; g = 0x80; b = 0xFF; a = 0xFF;
      } else if (dist < 0.65) {
        // Hexagone indigo foncé
        r = 0x79; g = 0x46; b = 0xE0; a = 0xFF;
      } else if (dist < 0.85) {
        // Bord sombre
        r = 0x3B; g = 0x1F; b = 0x8C; a = 0xFF;
      } else {
        // Fond bleu marine
        r = 0x02; g = 0x06; b = 0x17; a = 0xFF;
      }

      buf[pixelOffset + 0] = b; // Blue
      buf[pixelOffset + 1] = g; // Green
      buf[pixelOffset + 2] = r; // Red
      buf[pixelOffset + 3] = a; // Alpha
    }
  }

  // AND mask (tout opaque = tous zéros)
  // déjà à zéro grâce à Buffer.alloc

  return buf;
}

function createIco(sizes) {
  const count = sizes.length;

  // ICO Header (6 bytes)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type = ICO
  header.writeUInt16LE(count, 4); // Count

  // Calculer les images BMP
  const images = sizes.map(s => createBMPData(s));

  // Répertoire (16 octets par entrée)
  const dirEntries = [];
  let dataOffset = 6 + count * 16; // header + all dir entries

  for (let i = 0; i < count; i++) {
    const size = sizes[i];
    const imgSize = images[i].length;
    const entry = Buffer.alloc(16);

    entry.writeUInt8(size >= 256 ? 0 : size, 0);  // Width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1);  // Height
    entry.writeUInt8(0, 2);  // ColorCount
    entry.writeUInt8(0, 3);  // Reserved
    entry.writeUInt16LE(1, 4);  // Planes
    entry.writeUInt16LE(32, 6); // BitCount
    entry.writeUInt32LE(imgSize, 8);     // SizeInBytes
    entry.writeUInt32LE(dataOffset, 12); // Offset

    dirEntries.push(entry);
    dataOffset += imgSize;
  }

  return Buffer.concat([header, ...dirEntries, ...images]);
}

// Créer le dossier build si nécessaire
const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Créer l'ICO avec tailles 16, 32, 48, 64, 128, 256
const ico = createIco([16, 32, 48, 64, 128, 256]);
const outPath = path.join(buildDir, 'icon.ico');
fs.writeFileSync(outPath, ico);
console.log(`✅ ICO créé : ${outPath} (${ico.length} bytes)`);
