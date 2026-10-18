import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Built-in ImageGen creates the translated glyphs. This helper only composes
// those glyphs onto the original screenshot; it never draws replacement text.
// Usage: node scripts/localize-diary-images.mjs --en /generated/en.png --es /generated/es.png
const args = process.argv.slice(2);
const input = flag => args[args.indexOf(flag) + 1];
if (!args.includes('--en') || !args.includes('--es')) throw new Error('Provide --en and --es built-in ImageGen PNG paths.');
const root = process.cwd();
const originalPath = path.join(root, 'public/echo/diary-original.png');
const originalFile = await fs.readFile(originalPath);
const original = await sharp(originalFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = original.info;
if (width !== 1206 || height !== 2622) throw new Error('The text mapping requires the original 1206 × 2622 screenshot.');

const box = (left, top, width, height) => ({ left, top, width, height });
const patch = (label, clear, source, left, top, white = false) => ({ label, clear, source, left, top, white });
// Rectangles use original-resolution pixels. Icons are explicitly excluded.
const common = {
  title: box(45, 238, 188, 66),
  following: box(239, 852, 235, 62),
  followers: box(750, 852, 218, 62),
  share: box(560, 1096, 170, 64),
  sound: box(492, 1288, 278, 54),
  memories: box(48, 1460, 746, 88),
  calendar: box(279, 1659, 225, 58),
  map: box(825, 1660, 141, 61),
  month: box(360, 1929, 290, 68),
};
const mappings = {
  en: [
    patch('Account', common.title, box(46, 239, 272, 65), 46, 239),
    patch('Following', common.following, box(240, 852, 238, 62), 240, 851),
    patch('Followers', common.followers, box(744, 852, 238, 62), 746, 851),
    patch('Share', common.share, box(566, 1096, 162, 64), 561, 1095, true),
    patch('Your sound', common.sound, box(507, 1288, 274, 55), 492, 1288),
    patch('Your memories', common.memories, box(45, 1460, 578, 82), 48, 1460),
    patch('Calendar', common.calendar, box(278, 1659, 225, 58), 279, 1659, true),
    patch('Map', common.map, box(829, 1660, 112, 61), 825, 1660),
    patch('October', common.month, box(361, 1929, 290, 68), 360, 1929),
    patch('Tuesday T', box(290, 2078, 45, 50), box(292, 2078, 43, 50), 291, 2078),
    patch('Wednesday W', box(432, 2078, 51, 50), box(429, 2078, 58, 50), 428, 2078),
    patch('Thursday T', box(582, 2078, 45, 50), box(582, 2078, 43, 50), 583, 2078),
  ],
  es: [
    patch('Cuenta', common.title, box(44, 239, 235, 65), 45, 239),
    patch('Siguiendo', common.following, box(231, 852, 252, 62), 227, 851),
    patch('Seguidores', common.followers, box(720, 852, 285, 62), 713, 851),
    patch('Compartir', common.share, box(518, 1096, 270, 65), 560, 1099, true),
    patch('Tu sonido', common.sound, box(523, 1288, 242, 55), 492, 1288),
    patch('Tus recuerdos', common.memories, box(45, 1460, 536, 82), 48, 1460),
    patch('Calendario', common.calendar, box(267, 1659, 266, 58), 279, 1659, true),
    patch('Mapa', common.map, box(825, 1660, 140, 62), 825, 1660),
    patch('Octubre', common.month, box(360, 1929, 290, 68), 360, 1929),
    patch('Monday L', box(140, 2078, 52, 50), box(147, 2079, 40, 50), 147, 2078),
    patch('Tuesday M', box(290, 2078, 45, 50), box(287, 2079, 51, 50), 283, 2078),
    patch('Wednesday X', box(432, 2078, 51, 50), box(434, 2079, 45, 50), 434, 2078),
    patch('Thursday J', box(582, 2078, 45, 50), box(583, 2079, 38, 50), 585, 2078),
    patch('Friday V', box(730, 2078, 40, 50), box(728, 2079, 46, 50), 727, 2078),
    patch('Sunday D', box(1018, 2078, 44, 50), box(1019, 2079, 45, 50), 1017, 2078),
  ],
};
const protectedAreas = {
  statusAndTime: box(100, 55, 1020, 85),
  profileBadge608: box(675, 350, 180, 115),
  username: box(400, 485, 420, 90),
  number56: box(290, 730, 130, 90),
  number29: box(790, 730, 140, 90),
  shareIcon: box(475, 1095, 60, 65),
  soundIcon: box(415, 1290, 60, 52),
  calendarIcon: box(200, 1655, 60, 58),
  mapIcon: box(745, 1655, 65, 60),
  year2026: box(658, 1929, 190, 68),
  coversAndDates: box(45, 2160, 1115, 200),
  bottomNavigation: box(0, 2360, 1206, 262),
};

const mark = (mask, region) => {
  for (let y = region.top; y < region.top + region.height; y++) {
    mask.fill(1, y * width + region.left, y * width + region.left + region.width);
  }
};

for (const locale of ['en', 'es']) {
  const generatedPath = input(`--${locale}`);
  const metadata = await sharp(generatedPath).metadata();
  // ImageGen may return another resolution. Only translated glyph crops use
  // this resampling; the original screenshot itself is never resized.
  const normalized = await sharp(generatedPath).resize(width, height, { fit: 'fill', kernel: 'lanczos3' }).flatten({ background: '#fff' }).raw().toBuffer();
  const layers = [], mask = new Uint8Array(width * height);
  for (const entry of mappings[locale]) {
    const color = entry.white ? 0 : 255;
    layers.push({
      input: await sharp({ create: { width: entry.clear.width, height: entry.clear.height, channels: 4, background: { r: color, g: color, b: color, alpha: 1 } } }).png().toBuffer(),
      left: entry.clear.left, top: entry.clear.top,
    });
    mark(mask, entry.clear);
    const glyph = Buffer.alloc(entry.source.width * entry.source.height * 4);
    for (let y = 0; y < entry.source.height; y++) for (let x = 0; x < entry.source.width; x++) {
      const from = ((entry.source.top + y) * width + entry.source.left + x) * 3;
      const luminance = Math.round((normalized[from] + normalized[from + 1] + normalized[from + 2]) / 3);
      const alpha = entry.white ? (luminance < 10 ? 0 : luminance) : (luminance > 245 ? 0 : 255 - luminance);
      const to = (y * entry.source.width + x) * 4;
      glyph[to] = glyph[to + 1] = glyph[to + 2] = entry.white ? 255 : 0;
      glyph[to + 3] = alpha;
    }
    layers.push({ input: await sharp(glyph, { raw: { width: entry.source.width, height: entry.source.height, channels: 4 } }).png().toBuffer(), left: entry.left, top: entry.top });
    mark(mask, box(entry.left, entry.top, entry.source.width, entry.source.height));
  }
  const result = await sharp(originalFile).composite(layers).png().toBuffer();
  const pixels = await sharp(result).ensureAlpha().raw().toBuffer();
  let changed = 0;
  for (let i = 0; i < mask.length; i++) {
    const offset = i * 4;
    const differs = pixels[offset] !== original.data[offset] || pixels[offset + 1] !== original.data[offset + 1] || pixels[offset + 2] !== original.data[offset + 2] || pixels[offset + 3] !== original.data[offset + 3];
    if (differs && !mask[i]) throw new Error(`${locale}: unexpected pixel change outside a text patch at ${i % width},${Math.floor(i / width)}`);
    if (differs) changed++;
  }
  for (const [name, region] of Object.entries(protectedAreas)) for (let y = region.top; y < region.top + region.height; y++) for (let x = region.left; x < region.left + region.width; x++) {
    const offset = (y * width + x) * 4;
    for (let channel = 0; channel < 4; channel++) if (pixels[offset + channel] !== original.data[offset + channel]) throw new Error(`${locale}: protected content changed: ${name}`);
  }
  const outputPath = path.join(root, `public/echo/localized/${locale}/diary-original.png`);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, result);
  console.log(JSON.stringify({ locale, input: { width: metadata.width, height: metadata.height }, output: outputPath, width, height, changedPixels: changed, outsideTextChangedPixels: 0, protectedAreas: Object.keys(protectedAreas), patches: mappings[locale].map(({ label, clear, source, left, top }) => ({ label, clear, source, left, top })) }));
}
if (!(await fs.readFile(originalPath)).equals(originalFile)) throw new Error('The original source changed during composition.');
