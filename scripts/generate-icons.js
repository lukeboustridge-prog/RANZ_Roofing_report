// Script to generate PWA icons
// Run with: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');

// Simple PNG generator for solid color icons with "R" letter
// This creates a minimal valid PNG file

function createPNG(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0); // Length
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr.writeUInt8(8, 16); // Bit depth
  ihdr.writeUInt8(2, 17); // Color type (RGB)
  ihdr.writeUInt8(0, 18); // Compression
  ihdr.writeUInt8(0, 19); // Filter
  ihdr.writeUInt8(0, 20); // Interlace

  // Calculate CRC for IHDR
  const ihdrData = ihdr.slice(4, 21);
  ihdr.writeUInt32BE(crc32(ihdrData), 21);

  // IDAT chunk - create raw image data
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // Filter byte
    for (let x = 0; x < width; x++) {
      // Create "R" pattern in center
      const centerX = width / 2;
      const centerY = height / 2;
      const size = Math.min(width, height) * 0.4;

      const relX = (x - centerX) / size;
      const relY = (y - centerY) / size;

      // Simple "R" shape detection
      const isR = (
        // Vertical bar
        (relX >= -0.4 && relX <= -0.1 && relY >= -0.5 && relY <= 0.5) ||
        // Top horizontal
        (relX >= -0.4 && relX <= 0.3 && relY >= -0.5 && relY <= -0.3) ||
        // Middle horizontal
        (relX >= -0.4 && relX <= 0.2 && relY >= -0.1 && relY <= 0.1) ||
        // Top curve (simplified as box)
        (relX >= 0.1 && relX <= 0.4 && relY >= -0.5 && relY <= 0.1) ||
        // Diagonal leg
        (relX >= -0.1 && relX <= 0.4 && relY >= 0.1 && relY <= 0.5 &&
         (relX - (-0.1)) / (0.4 - (-0.1)) <= (relY - 0.1) / (0.5 - 0.1) + 0.3 &&
         (relX - (-0.1)) / (0.4 - (-0.1)) >= (relY - 0.1) / (0.5 - 0.1) - 0.3)
      );

      if (isR) {
        rawData.push(255, 255, 255); // White R
      } else {
        rawData.push(r, g, b); // Background color
      }
    }
  }

  // Compress with zlib
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(rawData));

  const idat = Buffer.alloc(compressed.length + 12);
  idat.writeUInt32BE(compressed.length, 0);
  idat.write('IDAT', 4);
  compressed.copy(idat, 8);
  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  idat.writeUInt32BE(idatCrc, compressed.length + 8);

  // IEND chunk
  const iend = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// CRC32 implementation
function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = makeCrcTable();

  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF];
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

// RANZ blue color: #2d5c8f
const r = 0x2d, g = 0x5c, b = 0x8f;

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Ensure directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate icons
console.log('Generating PWA icons...');

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPNG(192, 192, r, g, b));
console.log('Created icon-192.png');

fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPNG(512, 512, r, g, b));
console.log('Created icon-512.png');

fs.writeFileSync(path.join(iconsDir, 'icon-maskable.png'), createPNG(512, 512, r, g, b));
console.log('Created icon-maskable.png');

console.log('Done!');
