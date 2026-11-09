// 특별 미션 + 결과 화면 확인: 포스트잇 붙인 채로 동기가 탕비실 도착 → 미션 성공(+15 확정),
// 킹받음 100까지 채우면 클리어 화면, 시간 초과 → 야근 확정, 하트 0개 → 딱 걸렸다. Space로 다시 하기, Esc로 타이틀.
// 클리어 화면: Space = 다음 스테이지(STAGE 2 도입 컷신 → Esc → 게임), R = 다시 하기. 효과음(확정·클리어·실패) 기록.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-result.mjs
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
const tp = (x, y) => page.evaluate(([a, b]) => window.__kingbatTest.teleport(a, b), [x, y]);
const waitFor = async (fn, ms) => {
  try {
    await page.waitForFunction(fn, null, { timeout: ms, polling: 100 });
    return true;
  } catch {
    return false;
  }
};
async function fresh() {
  await page.goto(BASE);
  await page.waitForSelector('canvas');
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    window.__kingbatTest.setRemaining(999);
    window.__kingbatTest.calmDaeri();
  });
}
const log = [];

// 1) 미션: 업무 중인 동기 등 뒤에서 포스트잇 → 탕비실 도착하면 미션 성공
await fresh();
await page.screenshot({ path: 'screenshots/mission-chip.png' });
await page.evaluate(() => window.__kingbatTest.giveItem('postit'));
await waitFor(() => window.__kingbat.target.state === 'work', 30000);
await tp(1152, 240);
await page.waitForTimeout(150);
await page.keyboard.press('KeyZ');
const stuck = await waitFor(() => window.__kingbat.items.postit, 2000);
const afterPostit = (await k()).score;
await tp(664, 940); // 멀리 떨어져서 기다린다
// 동기가 자리에서 일어나 탕비실 쪽으로 걸어가는 중 (퍼레이드)
const walking = await waitFor(() => window.__kingbat.target.x < 1000 || window.__kingbat.mission, 50000);
await page.waitForTimeout(1200);
await page.screenshot({ path: 'screenshots/mission-parade.png' });
const done = await waitFor(() => window.__kingbat.mission, 30000);
await page.waitForTimeout(500);
await page.screenshot({ path: 'screenshots/mission-done.png' });
const m = await k();
log.push(['미션', { 붙음: stuck, 포스트잇후: afterPostit, 걸어감: walking, 성공: done, 점수: m.score, 클리어: m.cleared, 효과음: m.sfx }]);

// 2) 킹받음 100 → 클리어 화면
await page.evaluate(() => window.__kingbatTest.addScore(100));
await waitFor(() => window.__kingbat.resultReady, 15000);
await page.waitForTimeout(600);
await page.screenshot({ path: 'screenshots/result-clear.png' });
const c = await k();
await page.keyboard.press('KeyR');
await page.waitForTimeout(600);
const afterRetry = await k();
log.push(['클리어', { cleared: c.cleared, 효과음: c.sfx.slice(-2), 'R후 새판': !afterRetry.cleared && afterRetry.score.confirmed === 0 }]);
// 클리어 → Space: STAGE 2 (도입 컷신이 없으면 바로 게임)
await fresh();
await page.evaluate(() => window.__kingbatTest.giveItem('postit'));
await waitFor(() => window.__kingbat.target.state === 'work', 30000);
await tp(1152, 240);
await page.waitForTimeout(150);
await page.keyboard.press('KeyZ');
await waitFor(() => window.__kingbat.items.postit, 2000);
await tp(664, 940);
await waitFor(() => window.__kingbat.mission, 80000);
await page.evaluate(() => window.__kingbatTest.addScore(100));
await waitFor(() => window.__kingbat.resultReady, 15000);
await page.waitForTimeout(400);
await page.keyboard.press('Space');
const story2 = await waitFor(() => !!window.__kingbatStory, 8000);
await page.waitForTimeout(400);
await page.keyboard.press('Escape');
const stage2 = await waitFor(() => window.__kingbat?.stage === 2 && !window.__kingbat.cleared, 8000);
await page.waitForTimeout(700);
await page.screenshot({ path: 'screenshots/result-next-stage.png' });
log.push(['다음 스테이지', { 'STAGE 2 컷신': story2, 'STAGE 2 시작': stage2 }]);

// 3) 미션 없이 100: 클리어 아님
await fresh();
await page.evaluate(() => window.__kingbatTest.addScore(100));
await page.waitForTimeout(600);
await page.screenshot({ path: 'screenshots/result-goal-only.png' });
log.push(['100만', { cleared: (await k()).cleared }]);

// 4) 야근 확정
await page.evaluate(() => window.__kingbatTest.setRemaining(0.5));
await waitFor(() => window.__kingbat.resultReady, 15000);
await page.waitForTimeout(600);
await page.screenshot({ path: 'screenshots/result-overtime.png' });
const o = await k();
await page.keyboard.press('Escape');
await page.waitForTimeout(800);
const title = await page.evaluate(() => !!window.__kingbatTitle);
log.push(['야근', { failed: o.failed, 'Esc후 타이틀': title }]);

// 5) 하트 0개
await fresh();
await page.evaluate(() => window.__kingbatTest.loseAll());
await waitFor(() => window.__kingbat.resultReady, 15000);
await page.waitForTimeout(600);
await page.screenshot({ path: 'screenshots/result-caught.png' });
log.push(['하트 0', { failed: (await k()).failed }]);

// 6) 모바일: 버튼 터치로 다시 도전
const mob = await browser.newPage({ viewport: { width: 960, height: 540 }, hasTouch: true });
mob.on('pageerror', (e) => errors.push(String(e)));
await mob.goto(BASE + '?touch=1');
await mob.waitForSelector('canvas');
await mob.waitForTimeout(800);
await mob.evaluate(() => window.__kingbatTest.loseAll());
await mob.waitForFunction(() => window.__kingbat.resultReady, null, { timeout: 15000 });
await mob.waitForTimeout(600);
await mob.screenshot({ path: 'screenshots/result-caught-mobile.png' });
const box = await mob.locator('canvas').boundingBox();
const sc = box.width / 960;
await mob.touchscreen.tap(box.x + (650 - 110) * sc, box.y + 420 * sc);
await mob.waitForTimeout(700);
log.push(['모바일', { '다시 도전 후 실패화면': (await mob.evaluate(() => window.__kingbat.failed)) }]);

for (const [l, v] of log) console.log(l.padEnd(8), JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
