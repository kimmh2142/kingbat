// 들킴 컷인·하트 확인: 3번 들키기 → 하트 3→0, 컷인 캡처, 실패 화면 → Space로 다시 도전.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-caught.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.GAME_URL ?? 'http://localhost:5173/';
mkdirSync('screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(BASE);
await page.waitForSelector('canvas');
await page.waitForTimeout(800);
const k = () => page.evaluate(() => window.__kingbat);
const log = [];

for (let round = 1; round <= 3; round++) {
  // 들킬 때까지 동기 등 뒤에서 계속 찌른다
  await page.evaluate(() => window.__kingbatTest.teleport(1152, 240));
  await page.waitForTimeout(200);
  await page.keyboard.down('Space');
  const t0 = Date.now();
  while (!(await k()).cutin && Date.now() - t0 < 40000) await page.waitForTimeout(50);
  await page.keyboard.up('Space');
  const shotAt = [0.3, 0.6, 1.2];
  let last = 0;
  for (const t of shotAt) {
    await page.waitForTimeout((t - last) * 1000);
    last = t;
    if (round === 1) await page.screenshot({ path: `screenshots/cutin-${t}s.png` });
  }
  if (round === 2) {
    // 두 번째는 Space로 넘기기 (0.8초 이후 가능)
    await page.keyboard.press('Space');
    await page.waitForTimeout(400);
    log.push(['2번째 Space 넘기기 후 컷인', (await k()).cutin]);
  }
  while ((await k()).cutin) await page.waitForTimeout(50);
  const s = await k();
  log.push([`${round}번째 들킨 뒤`, { hearts: s.hearts, failed: s.failed, temp: s.score.temp }]);
}
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/fail.png' });
await page.keyboard.press('Space');
await page.waitForTimeout(800);
const after = await k();
log.push(['다시 도전 후', { hearts: after.hearts, failed: after.failed, player: after.player, caught: after.caught }]);
await page.screenshot({ path: 'screenshots/retry.png' });

for (const [l, v] of log) console.log(l.padEnd(22), JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
