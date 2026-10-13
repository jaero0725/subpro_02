import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { getMatch, matches, pageNumber } from '../src/data.js';

const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = spawn(process.execPath, ['scripts/serve.mjs', 'dist'], { env: { ...process.env, PORT: '4175' }, stdio: ['ignore', 'pipe', 'pipe'] });
await Promise.race([
  once(server.stdout, 'data'),
  once(server, 'exit').then(([code]) => { throw new Error(`Test server exited: ${code}`); }),
]);
const url = 'http://127.0.0.1:4175';
await mkdir('test-results', { recursive: true });
let browser;
const errors = [];
try {
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  assert.equal(await page.locator('html').getAttribute('lang'), 'ko');
  await page.getByRole('button', { name: '나의 초이스 찾기', exact: true }).click();
  assert.equal(await page.locator('#visitor-name').getAttribute('aria-invalid'), 'true');
  await page.locator('#visitor-name').fill('지현');
  await page.locator('#visitor-age').fill('0');
  await page.getByRole('button', { name: '나의 초이스 찾기', exact: true }).click();
  assert.equal(await page.locator('#visitor-age').getAttribute('aria-invalid'), 'true');
  await page.locator('#visitor-age').fill('27');
  await page.getByRole('button', { name: '中文', exact: true }).click();
  assert.equal(await page.locator('#visitor-name').inputValue(), '지현');
  assert.equal(await page.locator('#visitor-age').inputValue(), '27');
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
  await page.screenshot({ path: 'test-results/landing-zh-390.png', fullPage: true });
  await page.getByRole('button', { name: '한국어', exact: true }).click();
  await page.screenshot({ path: 'test-results/landing-ko-390.png', fullPage: true });
  await page.getByRole('button', { name: '나의 초이스 찾기', exact: true }).click();
  assert.equal(await page.locator('.result').getAttribute('data-actor'), 'kim-danhee');
  const resultAddress = new URL(page.url());
  assert.equal(resultAddress.hash, '#result=INFP');
  assert.equal(resultAddress.search, '?lang=ko');
  await page.reload();
  await page.locator('.result-image').evaluate((img) => img.decode());
  assert.equal(await page.locator('.result').getAttribute('data-actor'), 'kim-danhee');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '결과 이미지 저장', exact: true }).click(),
  ]);
  assert.equal(download.suggestedFilename(), 'THEMAN-kim-danhee-ko.png');
  const downloaded = await readFile(await download.path());
  assert.deepEqual(downloaded, await readFile('docs/THEMAN QR-20.png'));
  assert.equal(await page.locator('dialog').evaluate((dialog) => dialog.open), true);
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  assert.equal(await page.locator('dialog').evaluate((dialog) => dialog.open), false);
  console.log('PASS: validation, language preservation, INFP match, reload, byte-identical PNG download, save dialog');

  for (const lang of ['ko', 'zh']) for (const mbti of Object.keys(matches)) {
    await page.goto(`${url}/?lang=${lang}`);
    await page.locator('#visitor-name').fill(lang === 'ko' ? '지현' : '小明');
    await page.locator('#visitor-age').fill('27');
    for (let i = 0; i < 4; i++) await page.locator(`input[value="${mbti[i]}"]`).check();
    await page.locator('button[type="submit"]').click();
    const actor = getMatch(mbti);
    assert.equal(await page.locator('.result').getAttribute('data-actor'), actor.id);
    await page.locator('.result-image').evaluate((img) => img.decode());
    assert.ok((await page.locator('.result-image').getAttribute('src')).endsWith(`result-${pageNumber(actor, lang)}.webp`));
    if (mbti === 'ENFJ') await page.screenshot({ path: `test-results/result-${lang}-390.png`, fullPage: true });
  }
  console.log('PASS: all 32 MBTI/language UI flows and result artwork');

  await page.goto(`${url}/?lang=ko`);
  await page.locator('#visitor-name').fill('수민');
  await page.locator('#visitor-age').fill('31');
  await page.locator('button[type="submit"]').click();
  await page.getByRole('button', { name: '中文', exact: true }).click();
  assert.ok((await page.locator('.result-image').getAttribute('src')).endsWith('result-10.webp'));
  await page.goBack();
  assert.equal(await page.locator('#visitor-name').inputValue(), '수민');
  assert.equal(await page.locator('#visitor-age').inputValue(), '31');
  await page.goForward();
  assert.equal(await page.locator('.result').getAttribute('data-actor'), 'kim-danhee');
  await page.getByRole('button', { name: '重新寻找心动之选', exact: true }).click();
  assert.equal(await page.locator('#visitor-name').inputValue(), '수민');
  console.log('PASS: result language switch, browser back/forward, try again preserve inputs');

  for (const width of [320, 375, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.ok((await page.locator('#visitor-name').boundingBox()).height >= 44);
    await page.screenshot({ path: `test-results/landing-${width}.png`, fullPage: true });
    await page.goto(`${url}/?lang=zh#result=ENFJ`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  console.log('PASS: no horizontal overflow at 320/375/390/430/768/1440px; input touch height');

  // Native OS share sheets cannot be automated; verify the browser API contract.
  await page.addInitScript(() => {
    window.shareCalls = [];
    navigator.canShare = ({ files }) => files[0].type === 'image/png';
    navigator.share = async ({ files }) => { window.shareCalls.push({ name: files[0].name, size: files[0].size }); };
  });
  await page.goto(`${url}/?lang=ko#result=ENFJ`);
  await page.getByRole('button', { name: '결과 이미지 저장', exact: true }).click();
  await page.waitForFunction(() => window.shareCalls.length === 1);
  assert.equal((await page.evaluate(() => window.shareCalls[0])).name, 'THEMAN-kim-jongmin-ko.png');
  assert.equal(await page.locator('dialog').evaluate((dialog) => dialog.open), false);
  await page.evaluate(() => { navigator.share = async () => { throw new DOMException('Cancelled', 'AbortError'); }; });
  await page.getByRole('button', { name: '결과 이미지 저장', exact: true }).click();
  assert.equal(await page.locator('dialog').evaluate((dialog) => dialog.open), false);
  console.log('PASS: native file-share payload and cancellation');

  await page.route('**/public/originals/*.png', (route) => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto(`${url}/?lang=ko#result=ENFJ`);
  await page.locator('.save-status').filter({ hasText: '다시 눌러주세요' }).waitFor();
  await page.unroute('**/public/originals/*.png');
  await page.getByRole('button', { name: '결과 이미지 저장', exact: true }).click();
  await page.waitForFunction(() => window.shareCalls.length === 1);
  console.log('PASS: download source failure and retry recovery');
  assert.deepEqual(errors, []);
  await browser.close();
  browser = await webkit.launch();
  const safari = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  safari.on('pageerror', (error) => errors.push(error.message));
  await safari.goto(`${url}/?lang=ko`);
  await safari.locator('#visitor-name').fill('민지');
  await safari.locator('#visitor-age').fill('24');
  await safari.locator('button[type="submit"]').click();
  await safari.locator('.result-image').evaluate((img) => img.decode());
  assert.equal(await safari.locator('.result').getAttribute('data-actor'), 'kim-danhee');
  assert.ok(await safari.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await safari.screenshot({ path: 'test-results/webkit-result.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: mobile WebKit render and submit; zero browser JavaScript errors');
} finally {
  await browser?.close();
  server.kill();
}
