// 아이템 확인: 맵에 생기기 → 걸어서 줍기 → 1/2/3 고르기, 포스트잇(등 뒤 F, 바로 확정), 껌(자리 비웠을 때 → 돌아와 반응),
// 붙이다 들킴('붙이다 들켰다!'), 하단 아이템 칸·모바일 [아이템] 버튼 캡처.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-items.mjs
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
    await page.waitForTimeout(60);
  }
  return false;
};
const useItem = () => page.keyboard.press('KeyF');
const tapSpace = async () => {
  await page.keyboard.down('Space');
  await page.waitForTimeout(40);
  await page.keyboard.up('Space');
};
async function fresh(url = BASE) {
  await page.goto(url);
  await page.waitForSelector('canvas');
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__kingbatTest.setRemaining(999));
}
const log = [];

// 1) 생기기 → 줍기
await fresh();
await waitFor((s) => s.items.onMap.length >= 2, 10000);
const m = (await k()).items.onMap;
log.push(['맵 아이템', m.map((i) => `${i.id}@${i.spot}`).join(', ')]);
await tp(m[0].x, m[0].y + 60);
await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshots/item-onmap.png' });
await tp(m[0].x, m[0].y);
await page.waitForTimeout(300);
const a = (await k()).items;
log.push(['주운 뒤', { slots: a.slots, selected: a.selected, 맵에남음: a.onMap.length }]);
await page.screenshot({ path: 'screenshots/item-picked.png' });

// 2) 슬롯 고르기
await page.evaluate(() => window.__kingbatTest.giveItem('gum'));
await page.keyboard.press('Digit2');
await page.waitForTimeout(100);
const sel2 = (await k()).items.selected;
await page.keyboard.press('Digit1');
await page.waitForTimeout(100);
log.push(['1/2/3 고르기', { 둘째: sel2, 첫째: (await k()).items.selected }]);

// 3) 포스트잇: 동기가 평소 업무 중일 때 등 뒤에서 Space 짧게는 콕만(아이템 그대로) → F로 붙이면 바로 확정
await fresh();
await page.evaluate(() => window.__kingbatTest.giveItem('postit'));
await waitFor((s) => s.target.state === 'back');
await waitFor((s) => s.target.state === 'work');
await tp(1152, 240);
await page.waitForTimeout(150);
await page.screenshot({ path: 'screenshots/item-postit-prompt.png' });
await tapSpace();
await page.waitForTimeout(200);
const spaceKept = (await k()).items.slots[0] === 'postit' && !(await k()).items.sticking;
await useItem();
const sticking = await waitFor((s) => s.items.sticking, 500);
await page.waitForTimeout(250);
await page.screenshot({ path: 'screenshots/item-postit-sticking.png' });
const stuck = await waitFor((s) => s.items.postit, 2000);
const p = await k();
log.push(['포스트잇', { 붙이는중: sticking, 붙음: stuck, Space짧게아이템유지: spaceKept, score: p.score, slots: p.items.slots, poking: p.poking }]);
// 등 뒤에서 보이게 캡처: 동기가 탕비실 갈 때까지 숨어 있다가 걸어가는 모습
await tp(664, 940);
await page.keyboard.down('ShiftLeft');
await waitFor((s) => s.target.state === 'leaving', 60000);
await page.keyboard.up('ShiftLeft');
await waitFor((s) => s.target.x < 1000, 10000);
const t = (await k()).target;
await tp(t.x + 120, t.y + 120);
await page.waitForTimeout(200);
await page.screenshot({ path: 'screenshots/item-postit-back.png' });
await tp(664, 940);
const peeled = await waitFor((s) => s.target.state === 'away' && !s.items.postit, 20000);
log.push(['탕비실 도착 후 떼기', peeled]);

// 4) 껌: 자리에 있을 땐 안 됨 → 자리를 비웠을 때 붙이기 → 돌아와 반응 + 점수
await fresh();
await page.evaluate(() => window.__kingbatTest.giveItem('gum'));
let s0 = await k();
await tp(s0.items.bag.x, s0.items.bag.y - 40);
await page.waitForTimeout(150);
await useItem();
await page.waitForTimeout(300);
const refused = !(await k()).items.gum && !(await k()).items.sticking;
await tp(664, 940);
await waitFor((s) => s.target.state === 'away', 60000);
s0 = await k();
await tp(s0.items.bag.x, s0.items.bag.y - 40);
await page.waitForTimeout(150);
await page.screenshot({ path: 'screenshots/item-gum-prompt.png' });
await useItem();
const gummed = await waitFor((s) => s.items.gum, 2000);
await page.screenshot({ path: 'screenshots/item-gum-on.png' });
// 어디 있든 동기가 돌아와 가방을 만질 때 바로 확정
await tp(664, 940);
await page.waitForTimeout(150);
const before = (await k()).score;
await waitFor((s) => !s.items.gum, 40000);
await page.waitForTimeout(200);
const after = (await k()).score;
log.push(['껌', { 자리에있을때거절: refused, 붙음: gummed, 반응전: before, 반응후: after }]);

// 5) 붙이다 들킴: 진짜 전조가 시작되면 붙이기 시작
await fresh();
await page.evaluate(() => window.__kingbatTest.giveItem('postit'));
await tp(1152, 240);
// 동기가 탕비실로 떠나 버리면 진짜 전조가 안 오므로, 자리에서 진짜 전조가 올 때까지 기다린다
// 진짜 전조가 거의 끝나 갈 때 붙이기 시작해야 붙이는 0.5초 안에 돌아본다
await waitFor((s) => s.target.state === 'real' && s.target.y === 298 && s.target.left < 0.3, 120000);
await useItem();
const cut = await waitFor((s) => s.cutin, 4000);
await page.waitForTimeout(700);
await page.screenshot({ path: 'screenshots/item-caught.png' });
const c = await k();
log.push(['붙이다 들킴', { cutin: cut, caughtBy: c.caughtBy, hearts: c.hearts, slots: c.items.slots }]);

// 6) 모바일: [아이템] 버튼과 아이템 칸 터치
const mob = await browser.newPage({ viewport: { width: 960, height: 540 }, hasTouch: true });
mob.on('pageerror', (e) => errors.push(String(e)));
await mob.goto(BASE + '?touch=1');
await mob.waitForSelector('canvas');
await mob.waitForTimeout(800);
await mob.evaluate(() => {
  window.__kingbatTest.giveItem('postit');
  window.__kingbatTest.giveItem('gum');
});
await mob.waitForTimeout(100);
const box = await mob.locator('canvas').boundingBox();
const sx = box.width / 960;
await mob.touchscreen.tap(box.x + 480 * sx, box.y + (540 - 35) * sx); // 가운데 칸 = 2번
await mob.waitForTimeout(150);
const mSel = await mob.evaluate(() => window.__kingbat.items.selected);
// [콕] 버튼을 짧게 눌러도 아이템은 그대로
await mob.touchscreen.tap(box.x + (960 - 86) * sx, box.y + (540 - 86) * sx);
await mob.waitForTimeout(200);
const mKept = await mob.evaluate(() => window.__kingbat.items.slots.filter(Boolean).length === 2 && !window.__kingbat.items.sticking);
await mob.screenshot({ path: 'screenshots/item-mobile.png' });
log.push(['모바일 칸 터치', { selected: mSel, 콕짧게아이템유지: mKept }]);

for (const [l, v] of log) console.log(l.padEnd(16), typeof v === 'string' ? v : JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
