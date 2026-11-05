// 타깃 안내 확인: 시작 타깃 소개(?intro=1, 시계 멈춤·Space로 넘기기·다시 도전 땐 생략),
// 화면 밖 타깃 화살표, 모바일 조이스틱 항상 표시 캡처,
// 대리 "뭐 해요?"(빈손으로 시야에 들어가면 잠깐 붙잡힘), 첫 아이템 안내(노란 화살표·사용법 한 줄).
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-guide.mjs
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
const waitFor = async (fn, ms = 10000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (fn(await k())) return true;
    await page.waitForTimeout(60);
  }
  return false;
};
const log = [];

// 1) 시작 타깃 소개: 도는 동안 시계가 멈추고, 끝나면 풀린다
await page.goto(BASE + '?intro=1');
await page.waitForSelector('canvas');
await waitFor((s) => s.intro);
const r0 = (await k()).remaining;
await page.waitForTimeout(1800);
await page.screenshot({ path: 'screenshots/guide-intro.png' });
const mid = await k();
const ended = await waitFor((s) => !s.intro, 8000);
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/guide-intro-end.png' });
log.push(['타깃 소개', { 시작: r0, 소개중시계: mid.remaining, 소개중: mid.intro, 끝남: ended }]);

// 2) Space로 넘기기
await page.goto(BASE + '?intro=1');
await page.waitForSelector('canvas');
await waitFor((s) => s.intro);
await page.waitForTimeout(500);
await page.keyboard.press('Space');
const skipped = await waitFor((s) => !s.intro, 1000);
log.push(['Space 넘기기', skipped]);

// 3) 다시 도전이면 소개 생략 (야근 → Space)
await page.evaluate(() => window.__kingbatTest.setRemaining(0.1));
await waitFor((s) => s.failed && s.resultReady, 15000); // 결과 창은 뜬 직후 잠깐 입력을 막는다
await page.keyboard.press('Space');
await page.waitForTimeout(800);
const re = await k();
log.push(['다시 도전', { 실패화면: re.failed, 소개: re.intro }]);

// 4) 화면 밖 화살표: 동기에게서 멀리 떨어진 곳
await page.evaluate(() => window.__kingbatTest.teleport(300, 1210));
await page.waitForTimeout(800);
await page.screenshot({ path: 'screenshots/guide-arrow.png' });

// 5) 대리 "뭐 해요?": 빈손으로 걷는 대리 바로 앞에 서면 1.5초 붙잡히고 하트는 그대로
await page.goto(BASE);
await page.waitForSelector('canvas');
// 캔버스가 생겨도 게임 장면이 아직 안 만들어졌을 수 있다
await page.waitForFunction(() => !!window.__kingbatTest, null, { timeout: 15000 });
await page.evaluate(() => window.__kingbatTest.setRemaining(999));
await waitFor((s) => s.daeri.state === 'go', 60000);
const d = (await k()).daeri;
await page.evaluate(([x, y]) => window.__kingbatTest.teleport(x, y + 20), [d.x, d.y]);
const stopped = await waitFor((s) => s.daeri.state === 'grab' && s.daeri.kind === 'stop', 1000);
await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshots/guide-daeri-stop.png' });
const p0 = (await k()).player;
await page.keyboard.down('KeyA');
await page.waitForTimeout(500);
const p1 = (await k()).player;
const released = await waitFor((s) => s.daeri.state !== 'grab', 3000);
await page.waitForTimeout(300);
const p2 = (await k()).player;
await page.keyboard.up('KeyA');
const st = await k();
log.push(['대리 뭐해요', { 붙잡힘: stopped, 붙잡힌동안이동: p1.x - p0.x, 풀림: released, 풀린뒤이동: p2.x - p1.x, 하트: st.hearts, 컷인: st.cutin }]);

// 6) 첫 아이템 안내: 생기면 한 줄 + 노란 화살표, 주우면 사용법 한 줄
await page.goto(BASE);
await page.waitForSelector('canvas');
await page.evaluate(() => window.__kingbatTest.setRemaining(999));
await waitFor((s) => s.items.onMap.length >= 1);
const g1 = (await k()).items.guide;
await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshots/guide-item-first.png' });
const it = (await k()).items.onMap[0];
await page.evaluate(([x, y]) => window.__kingbatTest.teleport(x, y + 70), [it.x, it.y]);
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/guide-item-glow.png' });
await page.evaluate(([x, y]) => window.__kingbatTest.teleport(x, y), [it.x, it.y]);
await page.waitForTimeout(150);
await page.screenshot({ path: 'screenshots/guide-item-fly.png' });
const g2 = (await k()).items.guide;
log.push(['아이템 안내', { 생겼을때: g1, 주웠을때: g2 }]);

// 7) 모바일: 조이스틱이 늘 보인다
const mob = await browser.newPage({ viewport: { width: 960, height: 540 }, hasTouch: true });
mob.on('pageerror', (e) => errors.push(String(e)));
await mob.goto(BASE + '?touch=1');
await mob.waitForSelector('canvas');
await mob.waitForTimeout(1000);
await mob.screenshot({ path: 'screenshots/guide-joystick.png' });

for (const [l, v] of log) console.log(l.padEnd(12), JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
