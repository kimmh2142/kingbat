// 오프닝 독백 + 도입 컷신 확인 (?title=1 → [게임 시작]): 독백이 저절로 동기 컷신으로 넘어가는지, 장면마다 캡처, Space로 글자 다 보이기·다음 장면, 끝나면 게임,
// Esc로 건너뛰기, 모바일 터치로 넘기기.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-story.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.GAME_URL ?? 'http://localhost:5173/';
mkdirSync('screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const st = (p = page) => p.evaluate(() => ({ story: window.__kingbatStory ? window.__kingbatStory.step() : null, game: !!window.__kingbat }));
const log = [];

async function toStory(p, url) {
  await p.goto(url);
  await p.waitForSelector('canvas');
  await p.waitForTimeout(1000);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(500);
}

// 1) 끝까지 보기
await toStory(page, BASE + '?title=1');
const total = await page.evaluate(() => window.__kingbatStory.total);
const steps = [];
// 첫 장면(오프닝 독백)은 아무것도 안 눌러도 끝까지 나온 뒤 저절로 다음 장면으로 넘어간다 (서서히 밝아짐)
await page.waitForTimeout(4000);
await page.screenshot({ path: 'screenshots/story-1-typing.png' });
await page.waitForFunction(() => !window.__kingbatStory.typing(), null, { timeout: 30000 });
await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshots/story-1.png' });
steps.push((await st()).story);
await page.waitForFunction(() => window.__kingbatStory.step() === 1, null, { timeout: 5000 });
const autoNext = (await st()).story;
await page.waitForTimeout(250);
await page.screenshot({ path: 'screenshots/story-1-fade.png' });
for (let i = 1; i < total; i++) {
  await page.waitForTimeout(1900);
  await page.screenshot({ path: `screenshots/story-${i + 1}.png` });
  steps.push((await st()).story);
  await page.keyboard.press('Space');
  await page.waitForTimeout(80);
}
await page.waitForTimeout(900);
log.push(['끝까지', { 장면수: total, 지나간장면: steps, 독백뒤저절로: autoNext, 끝난뒤: await st() }]);

// 2) 글자 나오는 중 Space = 글자 다 보이기 (장면은 그대로)
await toStory(page, BASE + '?title=1');
await page.waitForTimeout(150);
await page.keyboard.press('Space');
await page.waitForTimeout(100);
const s1 = (await st()).story;
await page.keyboard.press('Escape');
await page.waitForTimeout(900);
log.push(['Space·Esc', { 글자중Space후장면: s1, Esc후: await st() }]);

// 3) 모바일 터치로 넘기기
const mob = await browser.newPage({ viewport: { width: 960, height: 540 }, hasTouch: true });
mob.on('pageerror', (e) => errors.push(String(e)));
await mob.goto(BASE + '?title=1&touch=1');
await mob.waitForSelector('canvas');
await mob.waitForTimeout(1000);
const box = await mob.locator('canvas').boundingBox();
const sc = box.width / 960;
await mob.touchscreen.tap(box.x + 710 * sc, box.y + 290 * sc); // [게임 시작]
await mob.waitForTimeout(2200);
// 첫 터치는 글자가 아직 나오는 중이면 한 번에 다 보이기, 두 번째 터치에 다음 장면
await mob.touchscreen.tap(box.x + 480 * sc, box.y + 300 * sc);
await mob.waitForTimeout(300);
await mob.touchscreen.tap(box.x + 480 * sc, box.y + 300 * sc);
await mob.waitForTimeout(300);
log.push(['모바일 터치', await st(mob)]);

for (const [l, v] of log) console.log(l.padEnd(10), JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
