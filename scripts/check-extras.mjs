// 회색 엑스트라 직원 확인: 앉은 사람·돌아다니는 사람 수, 전체 맵 캡처,
// 걷는 사람 앞을 막으면 멈춰서 "앗, 실례~", 앉은 사람을 플레이어가 통과하지 못함.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-extras.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.GAME_URL ?? 'http://localhost:5173/';
mkdirSync('screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const k = () => page.evaluate(() => window.__kingbat);
const tp = (x, y) => page.evaluate(([x, y]) => window.__kingbatTest.teleport(x, y), [x, y]);
const waitFor = async (fn, ms = 30000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await k();
    if (fn(s)) return s;
    await page.waitForTimeout(60);
  }
  return null;
};
const log = [];
const count = (s) => ({ 앉음: s.extras.filter((e) => e.state === 'sit').length, 돌아다님: s.extras.filter((e) => e.state !== 'sit').length });

// 1) 전체 맵
await page.goto(BASE + '?overview=1');
await page.waitForSelector('canvas');
await page.waitForTimeout(1500);
await page.screenshot({ path: 'screenshots/extras-overview.png' });

await page.goto(BASE);
await page.waitForSelector('canvas');
await page.evaluate(() => window.__kingbatTest.setRemaining(999));
await page.waitForTimeout(500);
log.push(['시작', count(await k())]);
await page.screenshot({ path: 'screenshots/extras-start.png' });

// 2) 걷는 사람 앞을 막는다: 통로 위(가로 통로 y 500/830/1150)를 걷는 사람을 찾아 진행 방향 앞에 선다
let walker = null;
let dir = null;
for (let tries = 0; tries < 400 && !walker; tries++) {
  const a = (await k()).extras;
  await page.waitForTimeout(150);
  const b = (await k()).extras;
  for (let i = 0; i < a.length; i++) {
    if (a[i].state !== 'walk' || b[i].state !== 'walk') continue;
    const dx = b[i].x - a[i].x;
    const dy = b[i].y - a[i].y;
    // 가로 통로를 옆으로 걷는 중이고 다음 꺾는 곳까지 여유가 있는 사람
    if (Math.abs(dx) > 4 && Math.abs(dy) < 1 && [500, 830, 1150].includes(b[i].y)) {
      walker = i;
      dir = Math.sign(dx);
      break;
    }
  }
}
if (walker === null) log.push(['막기', '걷는 사람을 못 찾음']);
else {
  const w0 = (await k()).extras[walker];
  await tp(w0.x + dir * 70, w0.y + 2);
  const blocked = await waitFor((s) => s.extras[walker].blocked, 3000);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'screenshots/extras-blocked.png' });
  const w1 = (await k()).extras[walker];
  await page.waitForTimeout(800);
  const w2 = (await k()).extras[walker];
  // 비켜 주면 다시 간다
  await tp(w2.x, w2.y + 120);
  await page.waitForTimeout(800);
  const w3 = (await k()).extras[walker];
  log.push(['막기', { 막힘: !!blocked, 막힌동안이동: Math.abs(w2.x - w1.x), 비킨뒤이동: Math.abs(w3.x - w2.x) + Math.abs(w3.y - w2.y) }]);
}

// 3) 앉은 사람은 통과할 수 없다: 앉은 사람 바로 위에서 아래로 걷기
const seated = (await k()).extras.find((e) => e.state === 'sit');
await tp(seated.x, seated.y - 50);
await page.waitForTimeout(200);
await page.keyboard.down('KeyS');
await page.waitForTimeout(700);
await page.keyboard.up('KeyS');
const p = (await k()).player;
log.push(['앉은 사람 통과', { 앉은자리y: seated.y, 플레이어y: p.y, 막힘: p.y < seated.y - 10 }]);
await page.screenshot({ path: 'screenshots/extras-seated-block.png' });

// 4) 30초 뒤에도 사람들이 움직이고 있는가
await page.waitForTimeout(15000);
log.push(['15초 뒤', count(await k())]);

for (const [l, v] of log) console.log(l.padEnd(10), typeof v === 'string' ? v : JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
