import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = process.argv[2];
if (!destination || !isAbsolute(destination)) throw new Error('Usage: node scripts/prepare-website-publisher.mjs <absolute-functions-staging-directory>');
const source = resolve(destination, 'src/services/investor');
const compiled = resolve(destination, 'lib/services/investor');
await mkdir(source, { recursive: true }); await mkdir(compiled, { recursive: true });
await writeFile(resolve(source, 'publishWebsiteSnapshots.ts'), await readFile(resolve(root, 'integrations/firebase/publishWebsiteSnapshots.ts')));
for (const [input, name, exported] of [
  ['integrations/firebase/investorProjection.mjs', 'investorProjection.cjs', 'projectInvestorSnapshot'],
  ['src/investor/geography.js', 'geography.cjs', 'aggregateSongGeography, validateGeography, GEO_MAX_POSTS'],
  ['src/investor/metrics.js', 'metrics.cjs', 'validateSnapshot'],
  ['integrations/firebase/websitePublication.mjs', 'websitePublication.cjs', 'loadSongGeography, publishWebsiteData'],
]) {
  const content = (await readFile(resolve(root, input), 'utf8'))
    .replace(/import \{([^}]+)\} from '[^']+\/(investorProjection|geography|metrics)\.(?:mjs|js)';/g, 'const {$1} = require(\'./$2.cjs\');')
    .replace(/\bexport\s+(?=(?:async\s+)?function\b|const\b)/g, '') + `\nmodule.exports = { ${exported} };\n`;
  await writeFile(resolve(source, name), content); await writeFile(resolve(compiled, name), content);
}
console.log('Staged scheduled publisher and runtime companions; no deployment performed.');
