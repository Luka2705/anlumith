// Live public-file smoke; run with an existing local preview and Playwright.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const { readPublicSnapshot, PUBLIC_SNAPSHOT_URL } = await import('../src/investor/public-snapshot.js');
const expected = await readPublicSnapshot();
const headers = await readFile(new URL('../dist/_headers', import.meta.url), 'utf8');
const csp = headers.match(/Content-Security-Policy: (.+)/)[1];
const base = process.env.SNAPSHOT_PREVIEW_URL || 'http://127.0.0.1:4186';
const output = process.env.SNAPSHOT_SCREENSHOT_DIR || '/private/tmp/anlumith-snapshot-screenshots';
const browser = await chromium.launch({headless:true,executablePath:process.env.SNAPSHOT_BROWSER_PATH});
await mkdir(output,{recursive:true});
try {
 for (const [path,width] of [['/en',1366],['/de',390],['/en/investors',390]]) {
  const page = await browser.newPage({viewport:{width,height:950}});
  const errors=[], forbidden=[];let downloads=0;
  page.on('pageerror', e=>errors.push(e.message));
  page.on('request',r=>{const u=r.url();if(u===PUBLIC_SNAPSHOT_URL)downloads++;if(/firestore\.googleapis|cloudfunctions\.net|\/api\/(metrics|geography)/.test(u))forbidden.push(u);});
  if (['127.0.0.1','localhost'].includes(new URL(base).hostname)) await page.route(base+'/**',async route=>{
   if(route.request().resourceType()!=='document')return route.continue();
   const response=await route.fetch();return route.fulfill({response,headers:{...response.headers(),'Content-Security-Policy':csp}});
  });
  await page.goto(base+path);
  await page.locator('.data-status.live').first().waitFor();
  await page.locator('.community-map-live.is-live').waitFor();
  assert.equal(await page.locator('.community-map-dot').count(),expected.geography.cells.length);
  const language=path==='/de'?'de':'en';
  const text=new Intl.NumberFormat(language,{useGrouping:'always'}).format(path.includes('investors') ? expected.metrics.periods['3m'].newUsers : expected.metrics.totalUsers);
  assert((await page.locator('body').innerText()).includes(text));
  if(await page.locator('.proof-details').count()) {
   await page.locator('.proof-details > summary').click();
   await page.locator('.period-selector button').first().click();
   await page.locator('.period-selector button').last().click();
  }
  await page.locator('.echo-languages a[lang="es"]').click();
  await page.locator('.data-status.live').first().waitFor();
  assert.equal(downloads,1,'cards/map/language/period must share one file download');
  assert.deepEqual(forbidden,[]);assert.deepEqual(errors,[]);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');
  await page.locator('#world-map').screenshot({path:`${output}/map-${width}-${path.includes('investors')?'investor':'home'}.png`});
  console.log(JSON.stringify({path,width,downloads,mapCells:expected.geography.cells.length,noDatabaseCalls:true,csp:true}));
  await page.close();
 }
 const offline=await browser.newPage();
 await offline.route('**/firebasestorage.googleapis.com/**',r=>r.abort());
 await offline.goto(base+'/en');
 await offline.locator('.community-map-error').waitFor();
 assert.equal(await offline.locator('.community-map-dot').count(),0);
 assert.equal(await offline.locator('.data-status.live').count(),0);
 assert(!(await offline.locator('body').innerText()).includes('27,815'),'no historical fallback values');
 console.log(JSON.stringify({initialFailure:'unavailable placeholders',noHistoricalFallback:true}));
 await offline.close();
} finally {await browser.close();}
