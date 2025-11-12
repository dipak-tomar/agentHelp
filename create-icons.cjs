const fs = require('fs');

// Function to create a simple PNG with color
// This creates a minimal PNG with the Agent Help brand color (#667eea)
function createColoredPNG(size, filename) {
  // PNG header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);  // width
  ihdr.writeUInt32BE(size, 4);  // height
  ihdr.writeUInt8(8, 8);        // bit depth
  ihdr.writeUInt8(2, 9);        // color type (RGB)
  ihdr.writeUInt8(0, 10);       // compression
  ihdr.writeUInt8(0, 11);       // filter
  ihdr.writeUInt8(0, 12);       // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Create image data (purple color: #667eea = rgb(102, 126, 234))
  const bytesPerPixel = 3; // RGB
  const bytesPerRow = size * bytesPerPixel + 1; // +1 for filter byte
  const imageData = Buffer.alloc(size * bytesPerRow);

  for (let y = 0; y < size; y++) {
    const rowOffset = y * bytesPerRow;
    imageData[rowOffset] = 0; // filter type: none

    for (let x = 0; x < size; x++) {
      const pixelOffset = rowOffset + 1 + x * bytesPerPixel;
      imageData[pixelOffset] = 102;     // R
      imageData[pixelOffset + 1] = 126; // G
      imageData[pixelOffset + 2] = 234; // B
    }
  }

  // Compress data (simplified - just use deflate)
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(imageData);

  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  // Combine all chunks
  const png = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);

  fs.writeFileSync(filename, png);
  console.log(`Created ${filename} (${size}x${size})`);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = require('zlib').crc32(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// Create icons
createColoredPNG(16, 'dist/icons/icon16.png');
createColoredPNG(48, 'dist/icons/icon48.png');
createColoredPNG(128, 'dist/icons/icon128.png');

console.log('\n✅ Brand-colored icons created successfully!');
console.log('Color: #667eea (Agent Help purple)');
