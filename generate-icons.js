const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function createPng(size, filename) {
  const width = size;
  const height = size;
  
  const rowSize = width * 4;
  const rawData = Buffer.alloc((rowSize + 1) * height);
  
  for (let y = 0; y < height; y++) {
    rawData[y * (rowSize + 1)] = 0; // Filter byte 0 (None)
    for (let x = 0; x < width; x++) {
      const idx = y * (rowSize + 1) + 1 + x * 4;
      
      const borderWidth = Math.max(1, Math.round(size * 0.08));
      const isBorder = (x < borderWidth || x >= width - borderWidth || y < borderWidth || y >= height - borderWidth);
      
      const nx = x / width;
      const ny = y / height;
      
      let isSymbol = false;
      // Bold Lightning bolt shape
      if (nx >= 0.25 && nx <= 0.75 && ny >= 0.18 && ny <= 0.82) {
        if (ny <= 0.52 && nx >= 0.42 - (ny - 0.18) * 0.35 && nx <= 0.75 - (ny - 0.18) * 0.3) isSymbol = true;
        if (ny >= 0.48 && nx >= 0.25 + (0.82 - ny) * 0.3 && nx <= 0.58 + (0.82 - ny) * 0.35) isSymbol = true;
      }
      
      if (isBorder || isSymbol) {
        rawData[idx] = 0;     // R
        rawData[idx + 1] = 0; // G
        rawData[idx + 2] = 0; // B
        rawData[idx + 3] = 255; // A
      } else {
        // #00ff66 Neo-Brutalist Green
        rawData[idx] = 0;       // R
        rawData[idx + 1] = 255; // G
        rawData[idx + 2] = 102; // B
        rawData[idx + 3] = 255; // A
      }
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);

  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  const png = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(filename, png);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(len + 12);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, len + 8));
  chunk.writeUInt32BE(crc, len + 8);
  return chunk;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (-(crc & 1) & 0xEDB88320);
    }
  }
  return (crc ^ -1) >>> 0;
}

const dir = path.join(__dirname, 'extension', 'public', 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

[16, 32, 48, 128].forEach(size => {
  createPng(size, path.join(dir, `icon${size}.png`));
});
console.log('Icons generated successfully in ' + dir);

