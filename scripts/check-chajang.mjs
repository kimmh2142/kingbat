// STAGE 2 차장 확인 (?stage=2): 대리·차장 둘 다 순찰하는지, 차장이 세 갈래 길을 다니는지,
// 임시 점수를 든 채 차장 시야(보라 부채꼴)에 들어가면 차장에게 들키는지. STAGE 1엔 차장이 없는지.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-chajang.mjs
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
const k = () => page.evaluate(() => window.__kingbat);
const tp = (x, y) => page.evaluate(([a, b]) => window.__kingbatTest.teleport(a, b), [x, y]);
const waitFor = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 50 }).then(() => true, () => false);
const chajang = async () => (await k()).patrols.find((p) => p.id === 'chajang');

await page.goto(BASE + '?stage=1');
await page.waitForFunction(() => window.__kingbat?.stage === 1);
log.push(['STAGE 1', { 순찰: (await k()).patrols.map((p) => p.id) }]);

await page.goto(BASE + '?stage=2');
await page.waitForFunction(() => window.__kingbat?.stage === 2 && !!window.__kingbatTest);
await page.evaluate(() => {
  window.__kingbatTest.calmDaeri();
  window.__kingbatTest.setRemaining(999);
});
log.push(['STAGE 2', { 순찰: (await k()).patrols.map((p) => p.id) }]);

// 40초 동안 차장이 간 길
const routes = new Set();
const states = new Set();
const t0 = Date.now();
while (Date.now() - t0 < 40000) {
  const c = await chajang();
  states.add(c.state);
  if (c.state === 'go' || c.state === 'stay') routes.add(c.route);
  await page.waitForTimeout(200);
}
log.push(['차장 40초', { states: [...states], 길: [...routes] }]);

// 과장 등 뒤 콕으로 임시 점수 → 걷는 차장 앞에 서기 → 차장에게 들킴
let got = false;
for (let i = 0; i < 10 && !got; i++) {
  await waitFor(() => ['work', 'away'].includes(window.__kingbat.target.state), 30000);
  const t = (await k()).target;
  const back = t.facing === 'up' ? 1 : t.facing === 'down' ? -1 : 0;
  await tp(t.x, t.y + back * 50);
  await page.keyboard.down('Space');
  await page.waitForTimeout(250);
  await page.keyboard.up('Space');
  got = (await k()).score.temp > 0;
}
await tp(1300, 1300); // 차장 시야에서 먼 곳
await waitFor(() => ['go', 'stay'].includes(window.__kingbat.patrols.find((p) => p.id === 'chajang').state), 40000);
await page.waitForTimeout(300);
const c = await chajang();
// 차장 바로 앞 (가는 방향 모를 때를 대비해 nearRadius 안쪽)
await tp(c.x + 20, c.y + 20);
const caught = await waitFor(() => window.__kingbat.lastCaught?.by === 'chajang', 3000);
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/chajang-caught.png' });
log.push(['차장에게 들킴', { 임시점수: got, 들킴: caught, 원인: (await k()).lastCaught?.reason }]);

for (const [l, v] of log) console.log(l.padEnd(10), JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
