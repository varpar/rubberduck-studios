// Regenerate the legacy favicon from the editable SVG: node scripts/generate-favicon.mjs
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const source = await readFile(new URL("../app/icon.svg", import.meta.url));
const sizes = [16, 32, 48];
const images = await Promise.all(
  sizes.map((size) => sharp(source, { density: 384 }).resize(size, size).png().toBuffer()),
);

// ICO directories can contain lossless PNG images at each native tab size.
const directory = Buffer.alloc(6 + images.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(images.length, 4);
let offset = directory.length;
images.forEach((image, index) => {
  const entry = 6 + index * 16;
  directory[entry] = sizes[index];
  directory[entry + 1] = sizes[index];
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(image.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});

await writeFile(new URL("../app/favicon.ico", import.meta.url), Buffer.concat([directory, ...images]));
