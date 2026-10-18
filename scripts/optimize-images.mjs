import sharp from 'sharp';
import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = resolve(root, 'public/echo');
const widths = [360, 600, 900];
const imageNames = ['feed-original', 'map-americas', 'map-asia', 'diary-original'];
const locales = ['en', 'de', 'es'];
const manifest = {};
const socialManifest = {};
const measurements = [];

await mkdir(outputDirectory, { recursive: true });

// Preserve supplied evidence. German images already match the selected language,
// except the feed's English iTunes attribution, which has its own localized PNG.
for (const name of imageNames) {
  if (name !== 'feed-original') {
    await mkdir(resolve(outputDirectory, 'localized/de'), { recursive: true });
    await copyFile(resolve(outputDirectory, `${name}.png`), resolve(outputDirectory, `localized/de/${name}.png`));
  }
}
for (const locale of locales) {
  manifest[locale] = {};
  const directory = resolve(outputDirectory, 'localized', locale);
  for (const name of imageNames) {
    const source = resolve(directory, `${name}.png`);
    const metadata = await sharp(source).metadata();
    const originalBytes = (await stat(source)).size;
    for (const width of widths) {
      const filename = `${name}-${width}.webp`;
      await sharp(source)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 82, effort: 6 })
        .toFile(resolve(directory, filename));
      const bytes = (await stat(resolve(directory, filename))).size;
      measurements.push({ locale, image: name, width, originalBytes, bytes, reduction: `${((1 - bytes / originalBytes) * 100).toFixed(1)}%` });
    }
    manifest[locale][name] = {
      src: `/echo/localized/${locale}/${name}-600.webp`,
      srcSet: widths.map(width => `/echo/localized/${locale}/${name}-${width}.webp ${width}w`).join(', '),
      original: `/echo/localized/${locale}/${name}.png`,
      width: metadata.width,
      height: metadata.height,
    };
  }
}

// Small genuine brand assets for browser and iOS home-screen icons.
const logoSource = resolve(root, 'public/echo-icon.png');
await sharp(logoSource).resize(64, 64).png().toFile(resolve(root, 'public/echo-icon-64.png'));
await sharp(logoSource).resize(180, 180).png().toFile(resolve(root, 'public/apple-touch-icon.png'));

// The share card is code-native artwork. Localize only its existing text.
const cardCopy = {
  en: { category: 'SOCIAL MUSIC DISCOVERY', growth: 'Organic growth.', spend: '€0 spent on advertising.', source: 'ORGANIC GROWTH · OWNER-REPORTED', investors: 'INVESTOR OVERVIEW', alt: 'echo music. Organic growth. €0 spent on advertising, according to the owner.' },
  de: { category: 'SOZIALE MUSIKENTDECKUNG', growth: 'Organisch gewachsen.', spend: '0 € Werbeausgaben.', source: 'ORGANISCH GEWACHSEN · BETREIBERANGABE', investors: 'FÜR INVESTOREN', alt: 'echo music. Organisch gewachsen. 0 € Werbeausgaben laut Betreiber.' },
  es: { category: 'DESCUBRIMIENTO MUSICAL SOCIAL', growth: 'Crecimiento orgánico.', spend: '0 € en publicidad.', source: 'CRECIMIENTO ORGÁNICO · DATOS DEL OPERADOR', investors: 'PARA INVERSORES', alt: 'echo music. Crecimiento orgánico. 0 € en publicidad, según el operador.' },
};
const logo = await sharp(logoSource).resize(330, 330).png().toBuffer();
for (const locale of locales) {
  const text = cardCopy[locale];
  const card = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#151515"/>
    <path d="M72 72H1128" stroke="#41413A"/>
    <text x="72" y="121" font-family="Arial,Helvetica,sans-serif" font-size="17" letter-spacing="3" fill="#B6B7AC">${text.category}</text>
    <text x="66" y="278" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="102" letter-spacing="-5" fill="#F4F1EA">echo music<tspan fill="#FF9638">.</tspan></text>
    <text x="72" y="356" font-family="Arial,Helvetica,sans-serif" font-size="35" letter-spacing="-0.5" fill="#D8D7CB">${text.growth}</text>
    <text x="72" y="405" font-family="Arial,Helvetica,sans-serif" font-size="35" letter-spacing="-0.5" fill="#D8D7CB">${text.spend}</text>
    <path d="M72 510H1128" stroke="#41413A"/>
    <text x="72" y="557" font-family="Arial,Helvetica,sans-serif" font-size="16" letter-spacing="2" fill="#B6B7AC">${text.source}</text>
    <text x="1128" y="557" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="16" letter-spacing="1.5" fill="#FFAB61">${text.investors}</text>
  </svg>`);
  await sharp(card)
    .composite([{ input: logo, left: 807, top: 148 }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(resolve(outputDirectory, `localized/${locale}/echo-music-investors.jpg`));
  socialManifest[locale] = { src: `/echo/localized/${locale}/echo-music-investors.jpg`, width: 1200, height: 630, type: 'image/jpeg', alt: text.alt };
}

const manifestSource = `// Generated by scripts/optimize-images.mjs. Supplied source PNGs remain untouched.\nexport const screenshotImages = Object.freeze(${JSON.stringify(manifest, null, 2)});\n\nexport function getScreenshotImage(name, locale = 'en') {\n  return (screenshotImages[locale] || screenshotImages.en)[name];\n}\n\nexport const socialImages = Object.freeze(${JSON.stringify(socialManifest, null, 2)});\n\nexport function getSocialImage(locale = 'en') {\n  return socialImages[locale] || socialImages.en;\n}\nexport const socialImage = socialImages.en;\n`;
await writeFile(resolve(root, 'src/investor/image-assets.js'), manifestSource);
console.table(measurements);
console.log('Created EN/DE/ES responsive screenshots and share images, plus browser icons.');
