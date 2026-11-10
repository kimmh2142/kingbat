// STAGE 3 방해 요소 확인 (?stage=3): 이사 엄감시 순찰, 정전 중 비서 손전등(문 앞으로 나와 긴 노란 시야),
// 인사팀 방문(평소엔 숨어 있음 → 띵 → 3초 뒤 나타나 둘러보고 사라짐), 임시 점수 들고 인사팀 시야에 들어가면 "인사팀에게 걸렸다!".
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-stage3.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.GAME_URL ?? 'http://localhost:5173/';
mkdirSync('screenshots', { recursive: true });

const browser = await chromium.launch();
const errors = [];
const log = [];

async function open() {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + '?stage=3');
  await page.waitForFunction(() => !!window.__kingbatTest);
  await page.evaluate(() => {
    window.__kingbatTest.setRemaining(999);
    window.__kingbatTest.calmDaeri();
  });
  return page;
}
const waitFor = async (page, fn, ms, arg) => {
  try {
    await page.waitForFunction(fn, arg, { timeout: ms, polling: 100 });
    return true;
  } catch {
    return false;
  }
};
const pat = (page, id) => page.evaluate((i) => window.__kingbat.patrols.find((p) => p.id === i), id);
const tapE = async (page) => {
  await page.keyboard.down('KeyE');
  await page.waitForTimeout(120);
  await page.keyboard.up('KeyE');
  await page.waitForTimeout(150);
};

// 1) 순찰 NPC 구성, 이사 순찰
const page = await open();
const ids = await page.evaluate(() => window.__kingbat.patrols.map((p) => p.id));
const insa0 = await pat(page, 'insa');
const isaStates = new Set();
for (let i = 0; i < 40; i++) {
  isaStates.add((await pat(page, 'isa')).state);
  await page.waitForTimeout(500);
}
log.push(['순찰 구성', { ids, 인사팀처음숨음: insa0.hidden, 이사20초: [...isaStates] }]);

// 2) 정전 중 비서 손전등
await page.evaluate(() => window.__kingbatTest.teleport(360, 500));
await page.waitForTimeout(250);
await tapE(page);
await page.evaluate(() => window.__kingbatTest.teleport(2300, 1140));
await page.waitForTimeout(250);
await tapE(page);
const lit = await waitFor(page, () => {
  const b = window.__kingbat.patrols.find((p) => p.id === 'biseo');
  return b.range === 300 && (b.state === 'go' || b.state === 'stay');
}, 15000);
await page.evaluate(() => window.__kingbatTest.teleport(1250, 760));
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/stage3-flashlight.png' });
const off = await waitFor(page, () => window.__kingbat.blackout.dark <= 0 && window.__kingbat.patrols.find((p) => p.id === 'biseo').range !== 300, 20000);
log.push(['비서 손전등', { 정전중손전등: lit, 불켜지면끔: off }]);
await page.close();

// 3) 인사팀 방문: 띵 → 나타남 → 둘러보고 사라짐
const p2 = await open();
await p2.evaluate(() => window.__kingbatTest.hrNow());
const ding = await waitFor(p2, () => window.__kingbat.hr.phase === 'ding', 3000);
const hiddenDuringDing = (await pat(p2, 'insa')).hidden;
const arrive = await waitFor(p2, () => window.__kingbat.hr.phase === 'visiting' && !window.__kingbat.patrols.find((p) => p.id === 'insa').hidden, 6000);
await p2.evaluate(() => window.__kingbatTest.teleport(560, 1250));
await p2.waitForTimeout(1500);
await p2.screenshot({ path: 'screenshots/stage3-hr.png' });
const left = await waitFor(p2, () => window.__kingbat.hr.phase === 'idle' && window.__kingbat.patrols.find((p) => p.id === 'insa').hidden, 60000);
log.push(['인사팀 방문', { 띵: ding, 띵동안숨음: hiddenDuringDing, 나타남: arrive, 돌아가사라짐: left, 다음방문까지: Math.round((await p2.evaluate(() => window.__kingbat.hr.timer))) }]);
await p2.close();

// 4) 임시 점수 들고 인사팀 시야 → 인사팀에게 걸림
const p3 = await open();
await p3.evaluate(() => window.__kingbatTest.hrNow());
await waitFor(p3, () => window.__kingbat.hr.phase === 'visiting', 6000);
await p3.waitForTimeout(300);
// 인사팀 바로 앞에 서고 임시 점수를 들게 한다
const hr = await pat(p3, 'insa');
await p3.evaluate(([x, y]) => window.__kingbatTest.teleport(x + 40, y + 10), [hr.x, hr.y]);
await p3.evaluate(() => window.__kingbatTest.addTemp(5));
const caught = await waitFor(p3, () => window.__kingbat.caught > 0, 4000);
const s = await p3.evaluate(() => window.__kingbat);
log.push(['인사팀에게 들킴', { 들킴: caught, 원인: s.lastCaught?.reason, 누구: s.lastCaught?.by }]);

for (const [l, v] of log) console.log(l.padEnd(8), JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
