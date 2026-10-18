import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The two arguments are EN and ES outputs from the built-in image_gen edit tool.
// Only their translated text regions are used. This script does not generate text.
const [englishEdit, spanishEdit] = process.argv.slice(2);
if (!englishEdit || !spanishEdit) throw new Error('Usage: node scripts/localize-asia-images.mjs <EN-imagegen.png> <ES-imagegen.png>');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(root, 'public/echo/map-asia.png');
const sourcePng = await readFile(sourcePath);
const { data: source, info } = await sharp(sourcePng, { ignoreIcc: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
if (info.width !== 1206 || info.height !== 2622 || info.channels !== 4) throw new Error('Unexpected original dimensions');

// Bounds cover the original and localized lettering, not the nearby covers or UI icons.
const textAreas = [
  { label: 'Asia', left: 340, top: 298, width: 260, height: 72, ink: 'purple', radius: 5 },
  { label: 'Indian Ocean', left: 280, top: 1260, width: 300, height: 125, ink: 'blue', radius: 2, secondLineTop: 1315, secondLineOffset: { en: 12, es: 16 } },
  { label: 'Australia', left: 826, top: 1328, width: 380, height: 66, ink: 'purple', radius: 5 },
  { label: 'Southern Ocean', left: 62, top: 1900, width: 470, height: 66, ink: 'blue', radius: 2 },
  { label: 'Continue', left: 180, top: 2155, width: 290, height: 64, ink: 'white', radius: 2 },
  { label: 'Legal', left: 208, top: 2295, width: 180, height: 44, ink: 'gray', radius: 2, spanishOnly: true },
];

function isInk(pixels, offset, ink, original = false) {
  const [r, g, b] = pixels.subarray(offset, offset + 3);
  if (ink === 'purple') return r > 90 && r < 225 && b > 80 && b < 225 && g < r - 15 && g < b - 15;
  // The latitude dashes are lighter than the lettering; exclude them from the
  // glyph masks so text alignment never copies or displaces a map grid line.
  if (ink === 'blue') return r < (original ? 70 : 80) && g < (original ? 150 : 122) && b < (original ? 195 : 185) && b > g + 10;
  if (ink === 'white') return r > 210 && g > 210 && b > 210;
  return r < 155 && g < 155 && b < 155;
}

function letteringMask(pixels, area, imageWidth, original = false) {
  const mask = new Float32Array(area.width * area.height);
  const radius = original && area.ink === 'blue' ? 4 : area.radius;
  for (let y = 0; y < area.height; y++) {
    for (let x = 0; x < area.width; x++) {
      const offset = ((area.top + y) * imageWidth + area.left + x) * 4;
      if (!isInk(pixels, offset, area.ink, original)) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const mx = x + dx, my = y + dy;
          if (mx < 0 || my < 0 || mx >= area.width || my >= area.height) continue;
          const distance = Math.hypot(dx, dy);
          const opacity = Math.min(1, Math.max(0, (radius + 1 - distance) / 2));
          const index = my * area.width + mx;
          mask[index] = Math.max(mask[index], opacity);
        }
      }
    }
  }
  return mask;
}

function neighboringBackground(pixels, mask, x, y, area, imageWidth) {
  const sums = [0, 0, 0];
  let weights = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    for (let distance = 1; distance <= 60; distance++) {
      const nx = x + dx * distance, ny = y + dy * distance;
      if (nx < 0 || ny < 0 || nx >= area.width || ny >= area.height) break;
      if (mask[ny * area.width + nx] > 0) continue;
      const offset = ((area.top + ny) * imageWidth + area.left + nx) * 4;
      const weight = 1 / distance;
      for (let channel = 0; channel < 3; channel++) sums[channel] += pixels[offset + channel] * weight;
      weights += weight;
      break;
    }
  }
  return sums.map(sum => sum / weights);
}

function chunks(png) {
  const result = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset) + 12;
    result.push({ type: png.toString('ascii', offset + 4, offset + 8), bytes: png.subarray(offset, offset + length) });
    offset += length;
  }
  return result;
}
const colorTypes = new Set(['iCCP', 'cHRM', 'gAMA', 'sRGB', 'pHYs']);
const originalColorChunks = chunks(sourcePng).filter(chunk => colorTypes.has(chunk.type));

for (const [locale, editPath] of [['en', englishEdit], ['es', spanishEdit]]) {
  const edit = await sharp(editPath).resize(info.width, info.height, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
  const result = Buffer.from(source);
  const allowed = new Uint8Array(info.width * info.height);
  for (const area of textAreas.filter(area => !area.spanishOnly || locale === 'es')) {
    const oldMask = letteringMask(source, area, info.width, true);
    const newMask = letteringMask(edit, area, info.width);
    // Keep original terrain between the glyphs. Reuse nearby original background
    // behind removed lettering so the generator's different ocean tint cannot
    // leave a German-letter silhouette or a rectangular patch. All new lettering
    // still comes directly from the built-in image_gen localization.
    for (let y = area.top; y < area.top + area.height; y++) {
      for (let x = area.left; x < area.left + area.width; x++) {
        const pixel = y * info.width + x;
        allowed[pixel] = 1;
        const maskOffset = (y - area.top) * area.width + x - area.left;
        const oldOpacity = oldMask[maskOffset];
        // Leave breathing room beneath the original dashed latitude line. The
        // generator raised this row enough that dashes looked like umlaut dots.
        const lineOffset = area.secondLineOffset?.[locale] || 0;
        const inSecondLine = area.secondLineTop !== undefined && y >= area.secondLineTop;
        const editY = inSecondLine ? y - lineOffset : y;
        const newMaskOffset = (editY - area.top) * area.width + x - area.left;
        const newOpacity = inSecondLine && editY < area.secondLineTop ? 0 : newMask[newMaskOffset];
        const background = oldOpacity ? neighboringBackground(source, oldMask, x - area.left, y - area.top, area, info.width) : null;
        for (let channel = 0; channel < 3; channel++) {
          const offset = pixel * 4 + channel;
          const cleaned = oldOpacity ? source[offset] * (1 - oldOpacity) + background[channel] * oldOpacity : source[offset];
          const editOffset = (editY * info.width + x) * 4 + channel;
          result[offset] = Math.round(cleaned * (1 - newOpacity) + edit[editOffset] * newOpacity);
        }
      }
    }
  }
  const png = await sharp(result, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  // Reattach original PNG color chunks verbatim, without converting untouched pixels.
  const outputChunks = chunks(png).filter(chunk => !colorTypes.has(chunk.type));
  const final = Buffer.concat([png.subarray(0, 8), outputChunks[0].bytes, ...originalColorChunks.map(chunk => chunk.bytes), ...outputChunks.slice(1).map(chunk => chunk.bytes)]);
  const decoded = await sharp(final, { ignoreIcc: true }).ensureAlpha().raw().toBuffer();
  let changedPixels = 0;
  for (let pixel = 0; pixel < allowed.length; pixel++) {
    const offset = pixel * 4;
    const changed = !decoded.subarray(offset, offset + 4).equals(source.subarray(offset, offset + 4));
    if (changed && !allowed[pixel]) throw new Error(`${locale}: changed pixel outside a permitted text region`);
    if (changed) changedPixels++;
  }
  const outputPath = resolve(root, `public/echo/localized/${locale}/map-asia.png`);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, final);
  console.log(JSON.stringify({ locale, outputPath, width: info.width, height: info.height, bytes: final.length, changedPixels, outsideTextChangedPixels: 0 }));
}
