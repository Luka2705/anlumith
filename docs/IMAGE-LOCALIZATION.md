# Product image localization

All rendered screenshot families have DE, EN and ES variants in `public/echo/localized/<locale>/`: feed, diary, Americas map and Asia map. The same locale selects the image, all responsive sources, full-size links, Open Graph/Twitter card and application screenshots in JSON-LD. Shared logo/icon artwork contains no translatable UI text.

The owner supplied German source PNGs remain unchanged in `public/echo/`. The German feed also translates its formerly English iTunes attribution. English and Spanish variants translate interface labels, weekdays/month names and conventional geographic names. Artist names, song titles, album artwork text, product brands and the profile handle remain unchanged.

## Text-only editing

The built-in ImageGen tool produced text-localization edits using each source screenshot. The full regenerated images are not used on the website. The four `scripts/localize-*-images.mjs` helpers extract translated lettering and composite it onto the source PNG. Each helper accepts generated edit paths as arguments; it performs no network requests or image generation itself.

The helpers assert original dimensions and compare raw pixels: every pixel outside the permitted text areas remains unchanged. Protected regions additionally cover album artwork, markers/positions, profile numbers, timestamps, status icons and navigation. Both translated labels and the completed composites were visually checked. The map text masks include the font outlines and antialiasing needed to remove the previous lettering.

The share card is editable SVG in `scripts/optimize-images.mjs`, so only its text strings are localized there. Its dimensions, layout and existing logo remain the same.

## Responsive outputs and verification

Run `npm run images:optimize` after adding or updating full-size localized PNGs. It creates 360/600/900px WebPs, three 1200×630 social cards and the generated `src/investor/image-assets.js` manifest. Missing localized sources fail generation rather than silently displaying a different language. German maps/diary are copied from their already German source files. Source PNGs are never overwritten.

`npm test`, `npm run build` and `npm run check:seo` verify all three locales, screenshot sources and responsive sets, matching full-size links, localized social metadata and structured data, and built asset availability/size. These code checks complement the visual review of the actual raster text.
