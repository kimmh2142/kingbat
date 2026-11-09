// STAGE 3 특별 미션 "대정전과 최후의 방석" 확인 (?stage=3).
// 라운지 방석 E 줍기 → 정전 전엔 의자에 못 깖 → 배전반 E (정전, 대표가 나감) → 대표가 자리를 비우면 의자 옆 E (1초 깔기)
// → 대표가 돌아와 앉으면 뿌우우욱 + 미션 성공(+30 확정). 8층 화면 캡처.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-blackout.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.GAME_URL ?? 'http://localhost:5173/';
mkdirSync('screenshots', { recursive: true });

const browser = await chromium.launch();
const errors = [];
const log = [];
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(BASE + '?stage=3');
await page.waitForFunction(() => !!window.__kingbatTest);
await page.evaluate(() => {
  window.__kingbatTest.setRemaining(999);
  window.__kingbatTest.calmDaeri();
});
const k = () => page.evaluate(() => window.__kingbat);
const tp = (x, y) => page.evaluate(([a, b]) => window.__kingbatTest.teleport(a, b), [x, y]);
const waitFor = async (fn, ms) => {
  try {
    await page.waitForFunction(fn, null, { timeout: ms, polling: 100 });
    return true;
  } catch {
    return false;
  }
};
const tapE = async () => {
  await page.keyboard.down('KeyE');
  await page.waitForTimeout(120);
  await page.keyboard.up('KeyE');
  await page.waitForTimeout(150);
};

await page.screenshot({ path: 'screenshots/blackout-0-start.png' });
log.push(['시작', { stage: (await k()).stage, 대표: (await k()).target.state }]);

// 1) 방석 줍기
await tp(360, 500);
await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshots/blackout-1-cushion.png' });
await tapE();
const picked = (await k()).blackout.phase;

// 2) 정전 전: 대표가 앉아 있으면 못 깖
await waitFor(() => window.__kingbat.target.state === 'work', 30000);
await tp(1940, 330);
await page.waitForTimeout(250);
await tapE();
const before = (await k()).blackout.phase;

// 3) 배전반 내리기
await tp(2300, 1140);
await page.waitForTimeout(250);
await tapE();
await page.waitForTimeout(900);
await page.screenshot({ path: 'screenshots/blackout-2-dark.png' });
const dark = (await k()).blackout.dark;

// 4) 대표가 나가면 의자 옆에서 깔기
const away = await waitFor(() => window.__kingbat.target.state === 'away' && !window.__kingbat.cutin, 60000);
const awayAt = { x: Math.round((await k()).target.x), y: Math.round((await k()).target.y) };
await tp(1940, 330);
await page.waitForTimeout(250);
await tapE();
const placing = (await k()).blackout.phase;
await page.waitForTimeout(1300);
const placed = (await k()).blackout.phase;
await page.screenshot({ path: 'screenshots/blackout-3-placed.png' });

// 5) 멀리 빠져나와 기다리면 대표가 앉고 뿌우우욱
await tp(1100, 1300);
const done = await waitFor(() => window.__kingbat.mission, 60000);
await page.evaluate(() => window.__kingbatTest.teleport(1940, 560));
await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshots/blackout-4-fart.png' });
const s = await k();
log.push(['미션', { 줍기: picked, 정전전깔기: before, 정전: dark > 0, 대표나감: away, 나간곳: awayAt, 깔기시작: placing, 깔기끝: placed, 성공: done, 점수: s.score, 들킴: s.caught }]);

for (const [l, v] of log) console.log(l.padEnd(6), JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
