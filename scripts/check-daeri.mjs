// 대리 김카페 확인: 순찰(자리 → 탕비실 → 자리)과 부채꼴, 시야에 걸리면 '도망치다 들켰다!', "커피 좀 사 올래?" 붙잡기.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-daeri.mjs
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
const waitFor = async (fn, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (fn(await k())) return true;
    await page.waitForTimeout(80);
  }
  return false;
};
async function fresh() {
  await page.goto(BASE);
  await page.waitForSelector('canvas');
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__kingbatTest.setRemaining(999));
}

// 1) 순찰 한 바퀴 + 걷는 모습 캡처
await fresh();
const seen = [];
let shot = false;
const t0 = Date.now();
while (Date.now() - t0 < 80000) {
  const d = (await k()).daeri;
  if (seen.at(-1)?.state !== d.state) seen.push({ t: ((Date.now() - t0) / 1000).toFixed(0), ...d });
  if (d.state === 'go' && d.x < 1000 && !shot) {
    shot = true;
    await tp(d.x - 40, d.y + 170);
    await page.waitForTimeout(250);
    await page.screenshot({ path: 'screenshots/daeri-walk.png' });
  }
  if (d.state === 'work' && seen.length > 3) break;
  await page.waitForTimeout(120);
}
console.log('순찰:', seen.map((s) => `${s.t}s ${s.state}`).join(' → '));

// 2) 임시 점수를 들고 대리 시야(앞쪽)에 서 있으면 들킨다
await fresh();
await waitFor((s) => s.target.state === 'back');
await waitFor((s) => s.target.state === 'work');
await tp(1152, 240);
await page.keyboard.down('Space');
await page.waitForTimeout(800);
await page.keyboard.up('Space');
const temp = (await k()).score.temp;
await waitFor((s) => s.daeri.state === 'go' && s.daeri.x < 1150 && s.daeri.x > 800);
const d = (await k()).daeri;
await tp(d.x - 130, d.y); // 대리가 걸어오는 방향(왼쪽) 앞
const caught = await waitFor((s) => s.cutin, 3000);
await page.waitForTimeout(700);
await page.screenshot({ path: 'screenshots/daeri-caught.png' });
const c = await k();
console.log('시야 들킴:', JSON.stringify({ tempBefore: temp, caught, caughtBy: c.caughtBy, hearts: c.hearts, daeri: c.daeri.state }));

// 3) 붙잡기 (확률을 1로 강제)
await fresh();
await page.evaluate(() => window.__kingbatTest.forceGrab());
await waitFor((s) => s.daeri.state === 'go' && s.daeri.x < 1150 && s.daeri.x > 800);
const d2 = (await k()).daeri;
await tp(d2.x - 40, d2.y + 30);
const grabbed = await waitFor((s) => s.daeri.state === 'grab', 3000);
const p0 = (await k()).player;
await page.keyboard.down('ArrowDown');
await page.waitForTimeout(1200);
await page.screenshot({ path: 'screenshots/daeri-grab.png' });
const p1 = (await k()).player;
await page.keyboard.up('ArrowDown');
const released = await waitFor((s) => s.daeri.state !== 'grab', 4000);
await page.keyboard.down('ArrowDown');
await page.waitForTimeout(500);
await page.keyboard.up('ArrowDown');
const p2 = (await k()).player;
console.log('붙잡기:', JSON.stringify({ grabbed, 붙잡힌동안이동: p1.y - p0.y, released, 풀린뒤이동: p2.y - p1.y }));

console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
