// 타깃 안내 확인: 시작 타깃 소개(?intro=1, 시계 멈춤·Space로 넘기기·다시 도전 땐 생략),
// 화면 밖 타깃 화살표, 모바일 조이스틱 항상 표시 캡처.
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
await waitFor((s) => s.failed, 3000);
await page.keyboard.press('Space');
await page.waitForTimeout(800);
const re = await k();
log.push(['다시 도전', { 실패화면: re.failed, 소개: re.intro }]);

// 4) 화면 밖 화살표: 동기에게서 멀리 떨어진 곳
await page.evaluate(() => window.__kingbatTest.teleport(300, 1210));
await page.waitForTimeout(800);
await page.screenshot({ path: 'screenshots/guide-arrow.png' });

// 5) 모바일: 조이스틱이 늘 보인다
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
