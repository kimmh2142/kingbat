// STAGE 2 특별 미션 "전 직원 칼퇴 승인서" 확인 (?stage=2).
// 복사실 서류 E 줍기 → 과장 자리에 있을 땐 못 끼움 → 자리 비우면 결재 더미 앞 E → 화살표 3장(틀리면 그대로) → 성공 +25 확정
// → 과장이 돌아와 서류 발견 → 부장실 앞으로 → 부장이 벌떡 "이게 뭐야아아!!". 끼우다 들키면 서류는 복사실로. 모바일 방향 버튼.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-approval.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.GAME_URL ?? 'http://localhost:5173/';
mkdirSync('screenshots', { recursive: true });

const browser = await chromium.launch();
const errors = [];
const log = [];
const KEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const WRONG = { up: 'ArrowDown', down: 'ArrowUp', left: 'ArrowRight', right: 'ArrowLeft' };

async function open(url, opts = {}) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, ...opts });
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + url);
  await page.waitForFunction(() => !!window.__kingbatTest);
  await page.evaluate(() => {
    window.__kingbatTest.setRemaining(999);
    window.__kingbatTest.calmDaeri();
  });
  return page;
}
const k = (page) => page.evaluate(() => window.__kingbat);
const tp = (page, x, y) => page.evaluate(([a, b]) => window.__kingbatTest.teleport(a, b), [x, y]);
const waitFor = async (page, fn, ms) => {
  try {
    await page.waitForFunction(fn, null, { timeout: ms, polling: 100 });
    return true;
  } catch {
    return false;
  }
};
const tapE = async (page) => {
  await page.keyboard.down('KeyE');
  await page.waitForTimeout(120);
  await page.keyboard.up('KeyE');
  await page.waitForTimeout(150);
};
/** 서류를 줍고 과장이 목적지에 도착할 때까지 기다렸다가 결재 더미 앞에서 E */
async function startSorting(page) {
  await tp(page, 2010, 1372);
  await page.waitForTimeout(250);
  await tapE(page);
  await waitFor(page, () => window.__kingbat.target.state === 'away' && !window.__kingbat.cutin, 60000);
  await tp(page, 2252, 870);
  await page.waitForTimeout(250);
  await tapE(page);
}

// 1) 줍기 → 자리에 있을 땐 못 끼움 → 끼우기 → 틀린 방향 → 성공
const page = await open('?stage=2');
await tp(page, 2010, 1372);
await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshots/approval-1-paper.png' });
await tapE(page);
const picked = (await k(page)).approval.phase;
await waitFor(page, () => window.__kingbat.target.state === 'work', 30000);
await tp(page, 2252, 870);
await page.waitForTimeout(250);
await tapE(page);
const atSeat = (await k(page)).approval.phase;
await waitFor(page, () => window.__kingbat.target.state === 'away' && !window.__kingbat.cutin, 60000);
await tp(page, 2252, 870);
await page.waitForTimeout(250);
await tapE(page);
let a = (await k(page)).approval;
await page.screenshot({ path: 'screenshots/approval-2-minigame.png' });
await page.keyboard.press(WRONG[a.seq[0]]);
await page.waitForTimeout(500);
const afterWrong = (await k(page)).approval.index;
for (const d of a.seq) {
  await page.keyboard.press(KEY[d]);
  await page.waitForTimeout(120);
}
await page.waitForTimeout(300);
let s = await k(page);
await page.screenshot({ path: 'screenshots/approval-3-done.png' });
log.push(['줍기·끼우기', { 줍기: picked, 자리에있을때: atSeat, 시작: a.phase, 틀린뒤장수: afterWrong, 결과: s.approval.phase, 미션: s.mission, 점수: s.score, 들킴: s.caught }]);

// 2) 성공 연출: 과장이 돌아와 앉았다가 부장실 앞으로
await tp(page, 2080, 640);
const seated = await waitFor(page, () => window.__kingbat.target.state === 'work', 40000);
const went = await waitFor(page, () => window.__kingbat.target.state === 'away' && window.__kingbat.target.y < 600, 40000);
await page.waitForTimeout(1900);
await page.screenshot({ path: 'screenshots/approval-4-boss.png' });
log.push(['성공 연출', { 자리복귀: seated, 부장실앞: went, 위치: { x: (await k(page)).target.x, y: (await k(page)).target.y } }]);
await page.close();

// 3) 끼우다 들킴: 아무것도 안 누르고 과장이 돌아올 때까지
const p2 = await open('?stage=2');
await startSorting(p2);
const sorting = (await k(p2)).approval.phase;
const caught = await waitFor(p2, () => window.__kingbat.caught > 0, 40000);
await p2.waitForTimeout(400);
await p2.screenshot({ path: 'screenshots/approval-5-caught.png' });
s = await k(p2);
log.push(['끼우다 들킴', { 시작: sorting, 들킴: caught, 원인: s.lastCaught?.reason, 누구: s.lastCaught?.by, 서류: s.approval.phase }]);
await p2.close();

// 4) 모바일: 방향 버튼 터치
const mob = await open('?stage=2&touch=1', { hasTouch: true });
await startSorting(mob);
a = (await k(mob)).approval;
await mob.waitForTimeout(300);
await mob.screenshot({ path: 'screenshots/approval-6-mobile.png' });
const box = await mob.locator('canvas').boundingBox();
const sc = box.width / 960;
const order = ['up', 'down', 'left', 'right'];
for (const d of a.seq) {
  const i = order.indexOf(d);
  // Approval.ts: PANEL (480, 150, h 150), 버튼 64 간격 78
  const x = 480 + (i - 1.5) * 78;
  const y = 150 + 75 + 14 + 32;
  await mob.touchscreen.tap(box.x + x * sc, box.y + y * sc);
  await mob.waitForTimeout(150);
}
s = await k(mob);
log.push(['모바일', { 시작: a.phase, 결과: s.approval.phase, 미션: s.mission }]);

for (const [l, v] of log) console.log(l.padEnd(10), JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
