// STAGE 2 과장 확인 (?stage=2): 관리자 구역 열림, 과장이 자리 ↔ 복사실 앞·회의실 앞을 오가는지,
// 서 있는 곳에서도 의심 → 확인을 하는지, 통화 종료 인사 뒤 돌아보는지, 걷는 동안에도 콕 되는지(11/12 동기와 통일), 멈췄을 때 콕 되는지.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-gwajang.mjs
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
const waitFor = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 100 }).then(() => true, () => false);

await page.goto(BASE + '?stage=2&debug=1');
await page.waitForFunction(() => window.__kingbat?.stage === 2 && !!window.__kingbatTest);
await page.evaluate(() => {
  window.__kingbatTest.calmDaeri();
  window.__kingbatTest.setRemaining(999);
});
const start = (await k()).target;
await tp(start.x, start.y - 60);
await page.waitForTimeout(500);
await page.screenshot({ path: 'screenshots/gwajang-seat.png' });

// 30초 동안 상태·위치 기록
const states = new Set();
const spots = new Set();
let bubbleHangup = false;
const t0 = Date.now();
while (Date.now() - t0 < 30000) {
  const t = (await k()).target;
  states.add(t.state);
  if (t.state === 'away') spots.add(`${t.x},${t.y}`);
  if (t.hangup) bubbleHangup = true;
  await page.waitForTimeout(150);
}
log.push(['30초 상태', { states: [...states], 서있던곳: [...spots], 통화종료인사: bubbleHangup }]);

// 걷는 중 등 뒤 콕 → 됨 (11/12)
const walking = await waitFor(() => ['leaving', 'returning'].includes(window.__kingbat.target.state), 30000);
let walkPoke = null;
if (walking) {
  const t = (await k()).target;
  const back = { up: [0, 40], down: [0, -40], left: [40, 0], right: [-40, 0] }[t.facing] ?? [0, -40];
  await tp(t.x + back[0], t.y + back[1]);
  await page.keyboard.down('Space');
  await page.waitForTimeout(500);
  walkPoke = (await k()).score.temp;
  await page.keyboard.up('Space');
  await page.screenshot({ path: 'screenshots/gwajang-walking.png' });
}
log.push(['걷는 중 콕', { 걷기잡힘: walking, 임시점수: walkPoke }]);

// 서 있는 곳(away)에서 등 뒤 콕 → 됨
const away = await waitFor(() => window.__kingbat.target.state === 'away', 40000);
let awayPoke = null;
if (away) {
  const t = (await k()).target;
  const dy = t.facing === 'up' ? 50 : -50;
  await tp(t.x, t.y + dy);
  await page.keyboard.down('Space');
  await page.waitForTimeout(400);
  awayPoke = (await k()).score.temp;
  await page.keyboard.up('Space');
  await page.screenshot({ path: 'screenshots/gwajang-away.png' });
}
log.push(['멈춘 곳 콕', { 서있음: away, 임시점수: awayPoke }]);

for (const [l, v] of log) console.log(l.padEnd(10), JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
