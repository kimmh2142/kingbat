// STAGE 1 단계 안내 확인: 첫 아이템은 서랍(왼쪽)에 포스트잇 → ① 줍기 → ② 등 뒤에서 Z(발밑 원 초록) → ③ 기다리는 동안 ④ 콕 →
// ⑤ 내 자리 E 꾹 확정(자리 표시) → 미션 성공하면 "이제 킹받음 100". 맵 맨 위에서 머리 위 글자가 HUD에 안 가리는지, 첫 의심 혼잣말.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-tutorial.mjs
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
const log = [];

await page.goto(BASE);
await page.waitForSelector('canvas');
await page.waitForTimeout(800);
await page.evaluate(() => {
  window.__kingbatTest.setRemaining(999);
  window.__kingbatTest.calmDaeri();
});
const s0 = await k();
log.push(['시작', { 단계: s0.tutorial.step, 칸: s0.tutorial.line, 남은시간기본: 150 }]);

// 첫 아이템: 서랍(왼쪽)에 포스트잇
await waitFor(() => window.__kingbat.items.onMap.length > 0, 20000);
const first = (await k()).items.onMap[0];
await page.screenshot({ path: 'screenshots/tut-1-pick.png' });
await tp(first.x, first.y);
const picked = await waitFor(() => window.__kingbat.tutorial.step !== 'pick', 5000);
log.push(['① 줍기', { 첫아이템: `${first.id}@${first.spot}`, 다음: (await k()).tutorial.step, picked }]);

// ② 등 뒤에서 Z: 업무 중일 때 등 뒤로
await waitFor(() => window.__kingbat.target.state === 'work', 40000);
await tp(1152, 240);
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/tut-2-ready.png' });
await page.keyboard.press('KeyZ');
const stuck = await waitFor(() => window.__kingbat.items.postit, 4000);
await page.waitForTimeout(300);
const s2 = await k();
log.push(['② 붙이기', { stuck, 단계: s2.tutorial.step, 칸: s2.tutorial.line }]);

// ④ 기다리는 동안 콕 (등 뒤에서 Space 꾹)
await waitFor(() => window.__kingbat.target.state === 'work' && window.__kingbat.target.x > 1100, 40000);
await tp(1152, 240);
await page.keyboard.down('Space');
const poked = await waitFor(() => window.__kingbat.score.temp > 0 || window.__kingbat.cutin, 8000);
await page.keyboard.up('Space');
await page.waitForTimeout(300);
const s4 = await k();
log.push(['④ 콕', { poked, 임시: s4.score.temp, 들킴: s4.caught, 단계: s4.tutorial.step, 칸: s4.tutorial.line, 안내: s4.items.guide }]);
await tp(900, 700);
await page.waitForTimeout(600);
await page.screenshot({ path: 'screenshots/tut-4-seat-arrow.png' });

// ⑤ 내 자리에서 E 꾹
await tp(664, 952);
await page.waitForTimeout(500);
await page.screenshot({ path: 'screenshots/tut-5-seat.png' });
await page.keyboard.down('KeyE');
const confirmed = await waitFor(() => window.__kingbat.score.temp === 0 && window.__kingbat.hidden, 15000);
await page.waitForTimeout(1500);
await page.keyboard.up('KeyE');
const s5 = await k();
log.push(['⑤ 확정', { confirmed, 점수: s5.score, 단계: s5.tutorial.step, 칸: s5.tutorial.line }]);

// ③ 미션 성공 → 다 끝
const done = await waitFor(() => window.__kingbat.mission, 90000);
await page.waitForTimeout(800);
const s3 = await k();
await page.screenshot({ path: 'screenshots/tut-6-done.png' });
log.push(['③ 미션', { done, 단계: s3.tutorial.step, 칸: s3.tutorial.line }]);

// 맵 맨 위: 탕비실·동기 자리 위쪽 글자가 HUD에 안 가리는지 (스크린샷으로 확인)
await tp(1152, 150);
await page.waitForTimeout(1200);
await page.screenshot({ path: 'screenshots/tut-top-dongi.png' });
await tp(250, 150);
await page.waitForTimeout(1200);
await page.screenshot({ path: 'screenshots/tut-top-pantry.png' });

// 첫 의심 혼잣말: 새 판에서 동기 근처에 가만히 서서 기다린다
await page.goto(BASE);
await page.waitForSelector('canvas');
await page.waitForTimeout(800);
await page.evaluate(() => {
  window.__kingbatTest.setRemaining(999);
  window.__kingbatTest.calmDaeri();
});
await tp(1000, 330);
const thought = await waitFor(() => window.__kingbat.thought, 90000);
await page.waitForTimeout(200);
await page.screenshot({ path: 'screenshots/tut-thought.png' });
log.push(['혼잣말', { thought, 동기: (await k()).target.state }]);

for (const [l, v] of log) console.log(l.padEnd(8), JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
