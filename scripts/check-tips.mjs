// 튜토리얼 안내창 확인 (?tips=1): STAGE 1 안내는 3개만 (11/10): 시작 목표 → 포스트잇 줍기(특별 미션 설명 포함) → 첫 임시 점수.
// 붙이기·첫 돌아봄·첫 확정 때는 안 뜬다.
// 안내창이 떠 있는 동안 퇴근 시계가 멈추는지, 동기 등 뒤 "여기서 Z!" 표시, [다시 안 보기](N) → 새로 들어와도 안 뜸,
// 타이틀에서 T로 다시 켜기, 모바일 버튼 터치로 닫기.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-tips.mjs
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
const waitFor = async (fn, ms) => {
  try {
    await page.waitForFunction(fn, null, { timeout: ms, polling: 100 });
    return true;
  } catch {
    return false;
  }
};
/** 떠 있는 안내창을 Space로 닫는다 (뜬 직후 0.45초는 입력을 안 받음) */
const close = async () => {
  // 뜬 직후 0.8초(게임 시간)는 입력을 안 받는다
  await page.waitForTimeout(1500);
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
};
/** 원하는 안내창이 뜰 때까지, 그 사이 다른 안내창(돌아봄 등)이 뜨면 닫는다 */
const waitTip = async (id, ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const tip = (await k()).tip;
    if (tip === id) return true;
    if (tip) await close();
    await page.waitForTimeout(150);
  }
  return false;
};

await page.goto(BASE + '?tips=1');
await page.waitForFunction(() => !!window.__kingbatTest);
await page.evaluate(() => localStorage.removeItem('kingbat.tipsOff'));
await page.reload();
await page.waitForFunction(() => !!window.__kingbatTest);
await page.evaluate(() => window.__kingbatTest.calmDaeri());

// ⓪ 시작 목표: 시계 멈춤
const goal = await waitFor(() => window.__kingbat?.tip === 'goal', 10000);
const r0 = (await k()).remaining;
await page.waitForTimeout(1500);
const r1 = (await k()).remaining;
await page.screenshot({ path: 'screenshots/tips-0-goal.png' });
await page.keyboard.press('Space'); // 0.45초 지났으니 닫힘
await page.waitForTimeout(300);
log.push(['⓪ 목표', { 뜸: goal, 시계멈춤: r0 === r1, 'Space후닫힘': (await k()).tip === null }]);
await page.evaluate(() => window.__kingbatTest.setRemaining(999));

// ① 포스트잇 줍기
await waitFor(() => window.__kingbat.items.onMap.some((i) => i.id === 'postit'), 20000);
const item = (await k()).items.onMap.find((i) => i.id === 'postit');
await tp(item.x, item.y);
const picked = await waitTip('picked', 8000);
await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshots/tips-1-picked.png' });
await close();

// ② 동기 등 뒤 "여기서 Z!" → 붙이기 → 특별 미션 설명
const spotOn = await waitFor(() => !!window.__kingbat.backSpot && !window.__kingbat.tip, 40000);
const spot = (await k()).backSpot;
await tp(spot.x + 160, spot.y + 260);
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/tips-2-backspot-far.png' });
await tp(spot.x, spot.y);
await page.waitForTimeout(300);
await page.keyboard.press('KeyZ');
// 붙이기는 시간이 걸린다 (헤드리스는 게임 시간이 느려 넉넉히). 다 붙을 때까지 기다리며 안내가 안 뜨는지 본다
await waitFor(() => window.__kingbat.score.confirmed > 0, 10000);
const stuck = await waitTip('stuck', 1500);
await page.screenshot({ path: 'screenshots/tips-3-stuck.png' });
// 붙이기 안내는 이제 없다: 여기서 Space를 누르면 동기 등 뒤라 콕이 된다
log.push(['①② 줍기·붙이기', { picked, 등뒤표시: spot, spotOn, '붙이기안내(안 떠야)': stuck, 포스트잇: (await k()).items.postit }]);

// ④ 임시 점수: 업무 중인 동기 등 뒤에서 콕
let temp = false;
for (let i = 0; i < 6 && !temp; i++) {
  await waitFor(() => window.__kingbat.target.state === 'work' && !window.__kingbat.tip, 40000);
  const t = (await k()).target;
  await tp(t.x, t.y - 52);
  await page.keyboard.down('Space');
  await waitFor(() => window.__kingbat.score.temp > 0 || !!window.__kingbat.tip || window.__kingbat.cutin, 6000);
  await page.keyboard.up('Space');
  // 안내는 다음 프레임들에 뜬다 (헤드리스는 느려 넉넉히)
  temp = await waitTip('temp', 6000);
  if (!temp && (await k()).tip) await close();
}
await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshots/tips-4-temp.png' });
// [다시 안 보기](N)로 끄기
await page.waitForTimeout(1500);
await page.keyboard.press('KeyN');
await page.waitForTimeout(300);
const stored = await page.evaluate(() => localStorage.getItem('kingbat.tipsOff'));
log.push(['④ 임시점수·끄기', { 뜸: temp, 점수: (await k()).score, 닫힘: (await k()).tip === null, 저장: stored }]);

// ⑤ 내 자리 E 꾹 → 확정 (안내는 안 뜬다)
await tp(664, 952);
await page.waitForTimeout(300);
await page.keyboard.down('KeyE');
await page.waitForTimeout(1500);
await page.keyboard.up('KeyE');
log.push(['⑤ 확정', { 점수: (await k()).score, 안내: (await k()).tip }]);

// 새로 들어와도 안 뜸
await page.reload();
await page.waitForFunction(() => !!window.__kingbatTest);
await page.waitForTimeout(2500);
const noTip = (await k()).tip === null;

// 타이틀에서 T로 다시 켜기
await page.goto(BASE + '?title=1');
await page.waitForFunction(() => !!window.__kingbatTitle);
const before = await page.evaluate(() => window.__kingbatTitle.tipsOn());
await page.screenshot({ path: 'screenshots/tips-title-off.png' });
await page.keyboard.press('KeyT');
await page.waitForTimeout(200);
const after = await page.evaluate(() => window.__kingbatTitle.tipsOn());
log.push(['끈 뒤', { 새판에안뜸: noTip, 타이틀표시: before, 'T후켜짐': after }]);

// 모바일: 화면 아무 데나 떼면 안 닫히고, [계속] 버튼을 눌러야 닫힌다 (11/10 "알아서 꺼져서 설명을 못 봄")
const mob = await browser.newPage({ viewport: { width: 960, height: 540 }, hasTouch: true });
mob.on('pageerror', (e) => errors.push(String(e)));
await mob.goto(BASE + '?tips=1&touch=1');
await mob.waitForFunction(() => window.__kingbat?.tip === 'goal', null, { timeout: 15000 });
await mob.waitForTimeout(1500);
await mob.screenshot({ path: 'screenshots/tips-mobile.png' });
const box = await mob.locator('canvas').boundingBox();
const sc = box.width / 960;
// 조이스틱 자리를 톡 (예전엔 이것만으로 닫혔다)
await mob.touchscreen.tap(box.x + 130 * sc, box.y + 430 * sc);
await mob.waitForTimeout(400);
const stillOpen = (await mob.evaluate(() => window.__kingbat.tip)) === 'goal';
// [계속 ▶] 버튼 (480, 540-52 위쪽 가운데)
await mob.touchscreen.tap(box.x + 480 * sc, box.y + 466 * sc);
await mob.waitForTimeout(400);
log.push(['모바일', { 다른곳터치는유지: stillOpen, 계속버튼로닫힘: (await mob.evaluate(() => window.__kingbat.tip)) === null }]);

for (const [l, v] of log) console.log(l.padEnd(10), JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
