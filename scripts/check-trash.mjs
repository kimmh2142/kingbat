// 쓰레기통 버전 확인 (?mode=trash, 11/10 비교 플레이): 대상 곁에선 못 쓰고, 떨어져서 E 꾹이면 쓰레기통 쓰고 임시 점수 확정,
// 쓰레기통 안에서 느리게 걷기, 대상이 돌아볼 때 가만히 있으면 안전 / 움직이면 "쓰레기통이 움직였다!"
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-trash.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.GAME_URL ?? 'http://localhost:5173/';
mkdirSync('screenshots', { recursive: true });
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const k = () => page.evaluate(() => window.__kingbat);
const tp = (x, y) => page.evaluate(([a, b]) => window.__kingbatTest.teleport(a, b), [x, y]);
const log = [];

await page.goto(BASE + '?stage=1&mode=trash');
await page.waitForFunction(() => !!window.__kingbatTest && !!window.__kingbat);
await page.waitForTimeout(500);
await page.evaluate(() => {
  window.__kingbatTest.setRemaining(999);
  window.__kingbatTest.calmDaeri();
});
const t = (await k()).target;

// 1) 대상 곁 (100px)에선 못 쓴다
await page.evaluate(() => window.__kingbatTest.addTemp(5));
await tp(t.x, t.y - 90);
await page.waitForTimeout(300);
await page.keyboard.down('KeyE');
await page.waitForTimeout(400);
const near = (await k()).hidden;
await page.keyboard.up('KeyE');

// 2) 떨어져서 (등 뒤 대각선 약 185px, 대상이 돌아보면 보이는 곳) E 꾹 → 쓰레기통, 임시 점수 확정
await tp(t.x - 130, t.y - 130);
await page.waitForTimeout(300);
await page.keyboard.down('KeyE');
await page.waitForTimeout(1200);
const s2 = await k();
await page.screenshot({ path: 'screenshots/trash-hide.png' });
// 안에서 느리게 걷기
const p0 = s2.player;
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(600);
await page.keyboard.up('ArrowRight');
const p1 = (await k()).player;
log.push(['쓰레기통', { 곁에서숨음: near, 숨음: s2.hidden, 점수: s2.score, '0.6초이동': Math.round(p1.x - p0.x) }]);

// 3) 쓰레기통 안에서 대상이 돌아보면: 가만히 = 안전, 움직임 = 들킴
await page.evaluate(() => window.__kingbatTest.addTemp(5));
const look1 = await page
  .waitForFunction(() => window.__kingbat.target.state === 'look' && window.__kingbat.targetSees, null, { timeout: 90000, polling: 50 })
  .then(() => true, () => false);
await page.waitForTimeout(500);
const still = await k();
await page.screenshot({ path: 'screenshots/trash-still.png' });
await page.waitForFunction(() => window.__kingbat.target.state !== 'look', null, { timeout: 20000 });
const look2 = await page
  .waitForFunction(() => window.__kingbat.target.state === 'look' && window.__kingbat.targetSees, null, { timeout: 90000, polling: 50 })
  .then(() => true, () => false);
await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(500);
await page.keyboard.up('ArrowLeft');
await page.waitForTimeout(800);
const moved = await k();
await page.screenshot({ path: 'screenshots/trash-caught.png' });
await page.keyboard.up('KeyE');
log.push(['돌아볼 때', { 가만히: { 봄: look1, 들킴: still.caught }, 움직임: { 봄: look2, 들킴: moved.caught, 원인: moved.lastCaught?.reason } }]);

// 4) 기본 버전은 그대로: 숨을 곳 없는 데서 E → 안 숨는다
await page.goto(BASE + '?stage=1');
await page.waitForFunction(() => !!window.__kingbatTest && !!window.__kingbat);
await page.waitForTimeout(500);
await tp(t.x, t.y + 260);
await page.keyboard.down('KeyE');
await page.waitForTimeout(600);
log.push(['기본 버전', { 숨음: (await k()).hidden }]);
await page.keyboard.up('KeyE');

for (const [l, v] of log) console.log(l.padEnd(8), JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
