import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Stages files only; never deploys or edits the adjacent Echo repository.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = process.argv[2];
if (!destination) throw new Error('Usage: node scripts/prepare-echo-backend.mjs <absolute-staging-directory>');
if (!destination.startsWith('/')) throw new Error('Use an absolute staging directory');
const source = resolve(destination, 'src/services/investor');
const compiled = resolve(destination, 'lib/services/investor');
await mkdir(source, { recursive: true }); await mkdir(compiled, { recursive: true });
await writeFile(resolve(source, 'investorWebsite.ts'), await readFile(resolve(root, 'integrations/firebase/investorWebsite.ts')));
for (const [input, name, exported] of [
  ['integrations/firebase/investorProjection.mjs', 'investorProjection.cjs', 'projectInvestorSnapshot'],
  ['src/investor/contact-schema.js', 'contact-schema.cjs', 'validateInquiry'],
]) {
  const content = (await readFile(resolve(root, input), 'utf8')).replace('export function ', 'function ') + `\nmodule.exports = { ${exported} };\n`;
  await writeFile(resolve(source, name), content); await writeFile(resolve(compiled, name), content);
}
console.log('Staged source and runtime companions. See docs/INVESTOR.md before deploying.');
