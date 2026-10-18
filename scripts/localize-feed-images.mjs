import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Compose only glyphs created by the built-in ImageGen text-localization edit.
// Usage: node scripts/localize-feed-images.mjs --en /generated/en.png --es /generated/es.png --de /generated/de.png
const args = process.argv.slice(2);
const input = flag => args[args.indexOf(flag) + 1];
for (const flag of ['--en', '--es', '--de']) if (!args.includes(flag)) throw new Error(`Missing ${flag} ImageGen PNG path`);
const sourcePath = 'public/echo/feed-original.png';
const sourceFile = await fs.readFile(sourcePath);
const original = await sharp(sourceFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = original.info;
if (width !== 1206 || height !== 2622) throw new Error('Expected the unchanged 1206 × 2622 original');
const box = (left, top, width, height) => ({ left, top, width, height });
const clear = {
  public: box(176, 350, 252, 68), friends: box(795, 359, 215, 61),
  forYou: box(279, 658, 228, 66), post: box(438, 2091, 325, 66),
  courtesy: box(338, 1951, 527, 49),
};
const patch = (label, clear, source, centerX, top, kind = 'dark') => ({ label, clear, source, centerX, top, kind });
const mappings = {
  en: [
    patch('Public', clear.public, box(158, 254, 116, 38), 301, 363),
    patch('Friends', clear.friends, box(571, 254, 134, 38), 901, 363),
    patch('For you', clear.forYou, box(197, 474, 146, 39), null, 663),
    patch('Post song', clear.post, box(337, 1478, 176, 38), 600, 2095, 'light'),
  ],
  es: [
    patch('Público', clear.public, box(147, 252, 137, 44), 301, 352),
    patch('Amigos', clear.friends, box(563, 254, 140, 45), 901, 363),
    patch('Para ti', clear.forYou, box(201, 464, 129, 44), null, 661),
    patch('Publicar canción', clear.post, box(281, 1475, 285, 38), 600, 2095, 'light'),
    patch('Cortesía de iTunes', clear.courtesy, box(303, 1375, 244, 30), 601, 1953),
  ],
  de: [patch('Mit freundlicher Genehmigung von iTunes', clear.courtesy, box(206, 1378, 443, 27), 601, 1954)],
};
const mark = (mask, region) => {
  for (let y = region.top; y < region.top + region.height; y++) mask.fill(1, y * width + region.left, y * width + region.left + region.width);
};
for (const locale of ['de', 'en', 'es']) {
  const generated = await sharp(input(`--${locale}`)).flatten({ background: '#fff' }).raw().toBuffer({ resolveWithObject: true });
  const scale = width / generated.info.width;
  const layers = [], mask = new Uint8Array(width * height);
  for (const entry of mappings[locale]) {
    const region = entry.clear;
    const clean = Buffer.alloc(region.width * region.height * 4);
    for (let y = 0; y < region.height; y++) for (let x = 0; x < region.width; x++) {
      const above = ((region.top - 4) * width + region.left + x) * 4;
      const below = ((region.top + region.height + 4) * width + region.left + x) * 4;
      const to = (y * region.width + x) * 4;
      const weight = (y + 4) / (region.height + 8);
      for (let c = 0; c < 3; c++) clean[to + c] = Math.round(original.data[above + c] * (1 - weight) + original.data[below + c] * weight);
      clean[to + 3] = 255;
    }
    layers.push({ input: await sharp(clean, { raw: { width: region.width, height: region.height, channels: 4 } }).png().toBuffer(), left: region.left, top: region.top });
    mark(mask, region);
    const crop = entry.source;
    const glyph = Buffer.alloc(crop.width * crop.height * 4);
    for (let y = 0; y < crop.height; y++) for (let x = 0; x < crop.width; x++) {
      const from = ((crop.top + y) * generated.info.width + crop.left + x) * generated.info.channels;
      const above = ((crop.top - 4) * generated.info.width + crop.left + x) * generated.info.channels;
      const lum = (generated.data[from] + generated.data[from + 1] + generated.data[from + 2]) / 3;
      const bg = (generated.data[above] + generated.data[above + 1] + generated.data[above + 2]) / 3;
      const light = entry.kind === 'light';
      const alpha = light ? (lum > 15 ? lum : 0) : (bg - lum > 12 ? 255 * (1 - lum / Math.max(1, bg)) : 0);
      const to = (y * crop.width + x) * 4;
      glyph[to] = glyph[to + 1] = glyph[to + 2] = light ? 255 : 0;
      glyph[to + 3] = Math.max(0, Math.min(255, Math.round(alpha)));
    }
    const w = Math.round(crop.width * scale), h = Math.round(crop.height * scale);
    const left = entry.centerX === null ? 281 : Math.round(entry.centerX - w / 2);
    const translated = await sharp(glyph, { raw: { width: crop.width, height: crop.height, channels: 4 } }).resize(w, h).png().toBuffer();
    layers.push({ input: translated, left, top: entry.top });
    mark(mask, box(left, entry.top, w, h));
  }
  const result = await sharp(sourceFile).composite(layers).png().toBuffer();
  const pixels = await sharp(result).ensureAlpha().raw().toBuffer();
  let changed = 0;
  for (let i = 0; i < mask.length; i++) {
    const differs = [0, 1, 2, 3].some(c => pixels[i * 4 + c] !== original.data[i * 4 + c]);
    if (differs && !mask[i]) throw new Error(`${locale}: changed non-text pixel at ${i % width},${Math.floor(i / width)}`);
    if (differs) changed++;
  }
  const protectedRegions = [box(118, 795, 970, 837), box(100, 55, 1020, 85), box(110, 1950, 135, 49), box(955, 1948, 145, 51), box(0, 2355, 1206, 267)];
  for (const r of protectedRegions) for (let y = r.top; y < r.top + r.height; y++) for (let x = r.left; x < r.left + r.width; x++) for (let c = 0; c < 4; c++) {
    const i = (y * width + x) * 4 + c;
    if (pixels[i] !== original.data[i]) throw new Error(`${locale}: protected artwork, time or icon changed`);
  }
  const output = `public/echo/localized/${locale}/feed-original.png`;
  await fs.mkdir(path.dirname(output), { recursive: true }); await fs.writeFile(output, result);
  console.log(JSON.stringify({ locale, output, width, height, changedTextPixels: changed, outsideTextChangedPixels: 0, protectedRegions: 'exact original', labels: mappings[locale].map(p => p.label) }));
}
