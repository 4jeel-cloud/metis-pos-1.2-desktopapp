#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const source = join(root, 'main logo.png');
const outDir = join(root, 'build');
const outIco = join(outDir, 'icon.ico');
const sizes = [16, 32, 48, 64, 128, 256];

if (!existsSync(source)) {
  console.error(`Source image not found: ${source}`);
  process.exit(1);
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const pngBuffers = await Promise.all(
  sizes.map((size) =>
    sharp(source)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer()
  )
);

const buf = await pngToIco(pngBuffers);
writeFileSync(outIco, buf);
console.log(`Generated ${sizes.join('/')}px ICO at ${outIco}`);
