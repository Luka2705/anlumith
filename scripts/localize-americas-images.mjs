// Composite only translated label pixels from two built-in imagegen edits.

/*
BUILT-IN IMAGEGEN PROMPT SET (text-localization; reference: public/echo/map-americas.png)

ENGLISH:
Use case: text-localization.
Asset type: exact localization of an original iPhone app screenshot, not a redesign.
Input image: the attached local image is the EDIT TARGET. Keep the full original 1206x2622 portrait canvas and same field of view.
Primary request: Translate ONLY the existing map labels and UI words from German to ENGLISH while preserving everything else exactly. Use crisp Apple Maps-style typography matching each original label's size, color, outline, angle, baseline and placement.
Exact replacements where visible:
NORDAMERIKA -> NORTH AMERICA
SÜDAMERIKA -> SOUTH AMERICA (keep the same right-edge clipping as the original)
APPALACHEN -> APPALACHIANS
Äquator -> Equator
Südlicher Wendekreis -> Tropic of Capricorn
OSTPAZIFISCHER RÜCKEN -> EAST PACIFIC RISE, preserving the original diagonal orientation in the Pacific
ANDEN -> ANDES
Mexiko-Stadt / Mexiko Stadt -> Mexico City where visible, preserving the occlusion behind the existing album-cover markers.
Fortsetzen -> Continue, same button, globe icon and alignment.
Legal -> Legal, leave Apple Maps attribution exactly as is.
Keep English geographic labels already in English such as GREAT PLAINS and the partially clipped ROCKY MOUNTAINS. Keep city names Montreal, Toronto, Chicago, New York, Washington, Dallas, Houston, Caracas, Bogotá, Lima, Santiago de Chile and Buenos Aires unless an English conventional form requires only spelling adjustment.
Strict invariants: terrain pixels and texture, coastlines, water and land colors, borders, latitude lines, geographic framing, every small city point, every album cover and its lettering, every album-marker white outline and pin, all green dots and their precise positions, overlaps/occlusions, Apple Maps logo, time 14:36, signal/Wi-Fi/battery icons, bottom navigation, red notification dot. Do not add, remove, enlarge, recrop, relocate or redraw these elements. No new decorations. The ONLY changed regions must be the text glyph areas named above. Do not translate any song title or artist text inside album artwork. Preserve opaque background.

SPANISH:
Use case: text-localization.
Asset type: exact localization of an original iPhone app screenshot, not a redesign.
Input image: the attached local image is the EDIT TARGET. Keep the full original 1206x2622 portrait canvas and same field of view.
Primary request: Translate ONLY the existing map labels and UI words from German to SPANISH while preserving everything else exactly. Use crisp Apple Maps-style typography matching each original label's size, color, outline, angle, baseline and placement. All translated text must be correct Spanish with accents.
Exact replacements where visible:
NORDAMERIKA -> AMÉRICA DEL NORTE
SÜDAMERIKA -> AMÉRICA DEL SUR (keep the same right-edge clipping as the original)
APPALACHEN -> APALACHES
GREAT PLAINS -> GRANDES LLANURAS, same vertical diagonal region label.
The partially clipped ROCKY MOUNTAINS -> MONTAÑAS ROCOSAS, same clipped left edge and diagonal text, do not widen canvas.
Äquator -> Ecuador
Südlicher Wendekreis -> Trópico de Capricornio
OSTPAZIFISCHER RÜCKEN -> DORSAL DEL PACÍFICO ORIENTAL, preserving the original diagonal orientation in the Pacific
ANDEN -> ANDES
New York -> Nueva York, exactly the same map position.
Mexiko-Stadt / Mexiko Stadt -> Ciudad de México where visible, preserving the occlusion behind the existing album-cover markers.
Fortsetzen -> Continuar, same button, globe icon and alignment.
Legal -> Aviso legal, same legal-link location; do not alter Apple Maps attribution.
Keep city names Montreal, Toronto, Chicago, Washington, Dallas, Houston, Caracas, Bogotá, Lima, Santiago de Chile and Buenos Aires at exactly their original locations.
Strict invariants: terrain pixels and texture, coastlines, water and land colors, borders, latitude lines, geographic framing, every small city point, every album cover and its lettering, every album-marker white outline and pin, all green dots and their precise positions, overlaps/occlusions, Apple Maps logo, time 14:36, signal/Wi-Fi/battery icons, bottom navigation, red notification dot. Do not add, remove, enlarge, recrop, relocate or redraw these elements. No new decorations. The ONLY changed regions must be the text glyph areas named above. Do not translate any song title or artist text inside album artwork. Preserve opaque background.
*/

// Usage: node scripts/localize-americas-images.mjs <english-generated.png> <spanish-generated.png> [--locale=es]
// Map geography, original album covers, pin locations, icons and status remain
// source pixels. The German source is never written.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const [english, spanish] = process.argv.slice(2);
const selectedLocale = process.argv.slice(4).find(argument => argument.startsWith('--locale='))?.split('=')[1];
if (selectedLocale && !['en', 'es'].includes(selectedLocale)) throw new Error('Locale must be en or es.');
if (!english || !spanish) throw new Error('Supply the two built-in imagegen localized outputs.');
const source = resolve('public/echo/map-americas.png');
const { data: original, info } = await sharp(source).toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
if (width !== 1206 || height !== 2622) throw new Error('Unexpected original screenshot dimensions.');
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const common = [
  { name: 'North America', shape: rect(16, 18, 710, 67), ink: 'purple' },
  { name: 'South America', shape: rect(810, 1411, 396, 92), ink: 'purple' },
  { name: 'Appalachians', shape: [[542, 544], [607, 574], [922, 240], [852, 200]], ink: 'grey' },
  { name: 'Equator', shape: rect(397, 1261, 220, 55), ink: 'blue' },
  { name: 'Tropic of Capricorn', shape: rect(284, 1738, 440, 62), ink: 'blue' },
  { name: 'East Pacific Rise', shape: rect(0, 1375, 260, 760), ink: 'blue' },
  { name: 'Andes', shape: rect(845, 1710, 135, 230), ink: 'grey' },
  { name: 'Occluded Mexico City label', shape: rect(277, 844, 303, 62), ink: 'grey' },
  { name: 'Continue button text', shape: rect(178, 2144, 294, 73), ink: 'white' },
];
const spanishOnly = [
  { name: 'Rocky Mountains and Great Plains', shape: rect(0, 100, 340, 505), ink: 'grey' },
  { name: 'Nueva York', shape: rect(808, 389, 236, 51), ink: 'grey' },
  { name: 'Aviso legal', shape: rect(207, 2294, 184, 49), ink: 'legal' },
];
const protectedShapes = [
  rect(138, 74, 174, 54), // exact source 14:36 status text
  rect(840, 55, 300, 95), // exact source signal, Wi-Fi and battery
  rect(0, 2354, 1206, 268), // complete bottom navigation
  rect(25, 2288, 170, 61), // Apple Maps attribution
  rect(187, 600, 136, 199), // first two overlapping covers
  rect(227, 739, 175, 141), // left and middle Mexico covers
  rect(355, 750, 136, 135), // right Mexico cover
  rect(396, 825, 136, 136), // southern Mexico cover
  [[265, 868], [321, 868], [294, 905]],
  [[305, 875], [361, 875], [334, 907]],
  [[393, 880], [451, 880], [423, 915]],
  [[432, 953], [495, 953], [464, 989]],
  rect(687, 1039, 137, 135),
  [[722, 1166], [783, 1166], [754, 1203]],
  rect(627, 1290, 137, 136),
  [[662, 1417], [724, 1417], [694, 1455]],
];
const sourcePoints = [[526, 361], [691, 313], [806, 259], [800, 391], [738, 440], [341, 590], [370, 662], [939, 1074], [797, 1193], [738, 1528], [865, 1998], [1110, 2025], [293, 904], [333, 904], [422, 914], [463, 987], [753, 1202], [693, 1453]];
for (const [x, y] of sourcePoints) protectedShapes.push(rect(x - 14, y - 14, 29, 29));

function contains(shape, x, y) {
  let inside = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const [xi, yi] = shape[i], [xj, yj] = shape[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function ink(data, index, kind) {
  const r = data[index], g = data[index + 1], b = data[index + 2];
  if (kind === 'purple') return r > g + 10 && b > g + 4 && r < 210 && b < 210;
  if (kind === 'white') return r > 211 && g > 211 && b > 211;
  if (kind === 'legal') return g > 25 && g < 145 && b < 185 && b - g < 80 && r < g + 30;
  if (kind === 'blue') return r > 15 && g > 50 && g < 172 && b < 214 && b - g < 80 && r < g + 30;
  return Math.max(r, g, b) < 195 && r - g <= 12 && b - g <= 12 && Math.max(r, g, b) - Math.min(r, g, b) < 60;
}
for (const [locale, generatedFile] of [['en', english], ['es', spanish]]) {
  if (selectedLocale && locale !== selectedLocale) continue;
  const generated = await sharp(generatedFile).resize(width, height, { fit: 'fill' }).toColourspace('srgb').ensureAlpha().raw().toBuffer();
  const final = Buffer.from(original);
  const mask = new Uint8Array(width * height);
  const regions = locale === 'es' ? [...common, ...spanishOnly] : common;
  for (const region of regions) {
    const xs = region.shape.map(p => p[0]), ys = region.shape.map(p => p[1]);
    const left = Math.max(0, Math.floor(Math.min(...xs))), right = Math.min(width, Math.ceil(Math.max(...xs)));
    const top = Math.max(0, Math.floor(Math.min(...ys))), bottom = Math.min(height, Math.ceil(Math.max(...ys)));
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
      if (!contains(region.shape, x + .5, y + .5)) continue;
      const i = (y * width + x) * 4;
      if (!ink(original, i, region.ink) && !ink(generated, i, region.ink)) continue;
      // Include the original/translated font's narrow outline and antialiasing.
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= left && xx < right && yy >= top && yy < bottom && contains(region.shape, xx + .5, yy + .5)) mask[yy * width + xx] = 1;
      }
    }
  }
  let changedPixels = 0, protectedPixels = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = y * width + x;
    if (!mask[p]) continue;
    if (protectedShapes.some(shape => contains(shape, x + .5, y + .5))) { protectedPixels++; continue; }
    const i = p * 4;
    generated.copy(final, i, i, i + 4);
    if (!original.subarray(i, i + 4).equals(final.subarray(i, i + 4))) changedPixels++;
  }
  const targetDirectory = resolve('public/echo/localized', locale);
  await mkdir(targetDirectory, { recursive: true });
  const target = resolve(targetDirectory, 'map-americas.png');
  await sharp(final, { raw: { width, height, channels: 4 } }).png().toFile(target);
  const verified = await sharp(target).ensureAlpha().raw().toBuffer();
  let outsideChanges = 0, protectedChanges = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = y * width + x, i = p * 4;
    if (original.subarray(i, i + 4).equals(verified.subarray(i, i + 4))) continue;
    if (!mask[p]) outsideChanges++;
    if (protectedShapes.some(shape => contains(shape, x + .5, y + .5))) protectedChanges++;
  }
  if (outsideChanges || protectedChanges) throw new Error(`Pixel preservation failed: ${outsideChanges}/${protectedChanges}`);
  console.log(JSON.stringify({ locale, target, width, height, changedPixels, protectedPixels, outsideChanges, protectedChanges }));
}
