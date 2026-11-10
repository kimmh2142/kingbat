// Lv2 아이템 확인 (?stage=2): 모니터 끄기(과장 책상 앞)·의자 최저(과장 의자 옆).
// 과장이 자리에 있으면 거절 → 자리를 비우면 사용 → 돌아와 앉으면 차례로 반응 + 점수(각 +20 확정).
// 스테이지별 아이템: STAGE 1 = 포스트잇·껌만, STAGE 2 = 넷 다, STAGE 3 = 모니터 빼고.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-lv2.mjs
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
const waitFor = async (fn, ms) => {
  try {
    await page.waitForFunction(fn, null, { timeout: ms, polling: 100 });
    return true;
  } catch {
    return false;
  }
};
const k = () => page.evaluate(() => window.__kingbat);
const tp = (x, y) => page.evaluate(([a, b]) => window.__kingbatTest.teleport(a, b), [x, y]);
const useItem = async () => {
  await page.keyboard.press('KeyZ');
  await page.waitForTimeout(1100);
};

await page.goto(BASE + '?stage=2');
await page.waitForFunction(() => !!window.__kingbatTest);
await page.evaluate(() => {
  window.__kingbatTest.setRemaining(999);
  window.__kingbatTest.calmDaeri();
  window.__kingbatTest.giveItem('monitor');
  window.__kingbatTest.giveItem('chair');
});
// 과장 자리: 의자 (2200, 758), 책상 (2200, 820) → 책상 앞 (2200, 850)
await waitFor(() => window.__kingbat.target.state === 'work', 30000);
await tp(2200, 860);
await page.waitForTimeout(250);
await useItem();
const refused = (await k()).items.slots;

// 자리를 비우면 모니터 → 의자
await waitFor(() => window.__kingbat.target.state === 'away' && !window.__kingbat.cutin, 60000);
await tp(2200, 860);
await page.waitForTimeout(250);
await useItem();
await page.keyboard.press('KeyX');
await page.waitForTimeout(150);
await tp(2250, 740);
await page.waitForTimeout(250);
await useItem();
const after = await k();
await page.screenshot({ path: 'screenshots/lv2-set.png' });

// 멀리 가서 기다리면 과장이 앉고 쿵 + 퐁
await tp(1900, 1350);
const scored = await waitFor(() => window.__kingbat.score.confirmed >= 40, 60000);
await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshots/lv2-react.png' });
log.push(['STAGE 2', { 자리에있을때: refused, 사용후칸: after.items.slots, 사용후점수: after.score, 앉은뒤점수: (await k()).score, 둘다점수: scored, 들킴: (await k()).caught }]);

// 스테이지별 아이템 종류 (맵에 생기는 것만 모아 본다)
const pools = {};
for (const n of [1, 3]) {
  await page.goto(BASE + `?stage=${n}`);
  await page.waitForFunction(() => !!window.__kingbatTest);
  const seen = new Set();
  for (let i = 0; i < 20; i++) {
    for (const m of await page.evaluate(() => window.__kingbat.items.onMap.map((x) => x.id))) seen.add(m);
    await page.waitForTimeout(400);
  }
  pools[n] = [...seen];
}
log.push(['맵 아이템', pools]);

for (const [l, v] of log) console.log(l.padEnd(8), JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
