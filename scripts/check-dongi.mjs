// 동기 패턴 확인: 상태 전환 기록, 콕 찌르기, 돌아볼 때 들킴.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-dongi.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.GAME_URL ?? 'http://localhost:5173/';
mkdirSync('screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(BASE + '?debug=1');
await page.waitForSelector('canvas');
await page.waitForTimeout(800);
const state = () => page.evaluate(() => window.__kingbat);

// 1) 동기 등 뒤로 이동
await page.evaluate(() => window.__kingbatTest.teleport(1152, 255));
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/dongi-behind.png' });

// 2) 상태 전환 관찰 (20초, 찌르지 않음)
const seen = [];
const shot = new Set();
const t0 = Date.now();
while (Date.now() - t0 < 20000) {
  const s = await state();
  const st = s.target.state;
  if (seen.at(-1)?.state !== st) seen.push({ t: ((Date.now() - t0) / 1000).toFixed(1), state: st });
  if (['suspect', 'real', 'fake', 'look', 'distracted'].includes(st) && !shot.has(st)) {
    shot.add(st);
    await page.screenshot({ path: `screenshots/dongi-${st}.png` });
  }
  await page.waitForTimeout(100);
}
console.log('상태 전환:', seen.map((s) => `${s.t}s ${s.state}`).join(' → '));

// 3) 콕 찌르기: 업무 중일 때 1.5초 꾹
for (let i = 0; i < 100; i++) {
  const s = await state();
  if (s.target.state === 'work' && Math.abs(s.target.y - 298) < 2) break;
  await page.waitForTimeout(100);
}
await page.evaluate(() => window.__kingbatTest.teleport(1152, 255));
await page.keyboard.down('Space');
await page.waitForTimeout(1500);
const mid = await state();
await page.screenshot({ path: 'screenshots/dongi-poking.png' });
await page.keyboard.up('Space');
console.log('콕 1.5초 뒤:', JSON.stringify({ poking: mid.poking, score: mid.score, state: mid.target.state }));

// 4) 계속 찌르면 언젠가 돌아봐서 들킨다
await page.keyboard.down('Space');
let caught = 0;
const t1 = Date.now();
while (Date.now() - t1 < 30000) {
  const s = await state();
  if (s.caught > 0) {
    caught = s.caught;
    await page.waitForTimeout(250);
    await page.screenshot({ path: 'screenshots/dongi-caught.png' });
    break;
  }
  await page.waitForTimeout(80);
}
await page.keyboard.up('Space');
const end = await state();
console.log('들킴:', caught, '들킨 뒤 점수:', JSON.stringify(end.score), '상태:', end.target.state);

console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
