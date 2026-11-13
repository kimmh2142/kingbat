// STAGE 3 방석: 대표가 원래 외출 중일 때 불을 끄면, 돌아와 앉았다가 정전 확인하러 다시 나간다.
// 그때도 방석을 깔 수 있어야 한다 (11/13 "대표가 자리 비웠는데 '대표가 자리를 비웠을 때!'가 떴다" 버그).
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-blackout-away.mjs
import { chromium } from 'playwright';

const BASE = process.env.GAME_URL ?? 'http://localhost:5173/';
const browser = await chromium.launch();
const errors = [];
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

// 방석 줍기
await tp(360, 500);
await page.waitForTimeout(300);
const picked = (await k()).blackout.phase;
// 대표를 원래 외출(0번 길)로 먼저 내보낸다
await waitFor(() => window.__kingbat.target.state === 'work', 30000);
await page.evaluate(() => window.__kingbatTest.targetTrip(0));
const out1 = await waitFor(() => window.__kingbat.target.state === 'away', 30000);
// 돌아오는 길에 불 끄기 (헤드리스는 느려서 일찍 끄면 다시 나가기 전에 불이 켜진다)
await tp(2300, 1140);
const back = await waitFor(() => window.__kingbat.target.state === 'returning', 60000);
await tp(2300, 1140);
await page.waitForTimeout(250);
await tapE();
const dark = (await k()).blackout.dark > 0;
// 돌아와 앉았다가 (work) 정전 확인하러 다시 나갈 때
const sat = await waitFor(() => window.__kingbat.target.state === 'work', 30000);
const out2 = await waitFor(() => ['leaving', 'away'].includes(window.__kingbat.target.state), 30000);
await page.waitForTimeout(600);
const s = await k();
await tp(1940, 330);
await page.waitForTimeout(250);
await tapE();
const after = await k();
console.log(JSON.stringify({ 줍기: picked, 원래외출: out1, 돌아오는길: back, 정전: dark, 앉음: sat, 다시나감: out2, 그때정전: s.blackout.dark > 0, 대표: after.target.state, 깔기: after.blackout.phase }));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(after.blackout.phase === 'placing' && !errors.length ? 0 : 1);
