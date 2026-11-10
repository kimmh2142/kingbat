// 엔딩 확인: STAGE 3 클리어 → 결과 화면 [엔딩 보기](Space) → 엔딩 컷신(최종 클리어 대사 → 새 대표 → 신입이 콕 → "직장생활은 돌고 돈다")
// → 엔딩 결과 화면(이번 출근 기록, 별점). 장면마다 캡처. 결과 화면에서 Space = 다시 출근(STAGE 1 컷신), Esc = 타이틀.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-ending.mjs
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

// 1) STAGE 3 클리어 → 결과 화면
await page.goto(BASE + '?stage=3');
await page.waitForFunction(() => !!window.__kingbatTest);
await page.evaluate(() => {
  window.__kingbatTest.setRemaining(200);
  window.__kingbatTest.completeMission();
  window.__kingbatTest.addScore(100);
});
const ready = await waitFor(() => window.__kingbat.resultReady, 15000);
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/ending-0-result.png' });
await page.keyboard.press('Space');
const story = await waitFor(() => !!window.__kingbatStory, 8000);
log.push(['STAGE 3 클리어', { 결과화면: ready, 엔딩컷신: story }]);

// 2) 엔딩 컷신 끝까지 (마지막 검은 화면은 저절로 넘어간다)
const total = await page.evaluate(() => window.__kingbatStory.total);
const shots = [];
for (let i = 0; i < total; i++) {
  await page.waitForTimeout(1900);
  await page.screenshot({ path: `screenshots/ending-${i + 1}.png` });
  shots.push(await page.evaluate(() => window.__kingbatStory?.shot() ?? null));
  if (i === total - 1) break;
  if (await page.evaluate(() => window.__kingbatStory.typing())) await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await page.waitForTimeout(80);
}
const ending = await waitFor(() => !!window.__kingbatEnding, 15000);
await page.waitForTimeout(900);
await page.screenshot({ path: 'screenshots/ending-result.png' });
log.push(['엔딩 컷신', { 장면수: total, 장면: shots, 결과화면: ending, 기록: await page.evaluate(() => window.__kingbatEnding) }]);

// 3) 다시 출근하기 → STAGE 1 도입 컷신
await page.keyboard.press('Space');
const again = await waitFor(() => !!window.__kingbatStory && window.__kingbatStory.shot() === 'ask', 8000);
log.push(['다시 출근', { 'STAGE 1 컷신': again }]);

// 4) ?ending=result 로 바로 결과 화면 (기록 없음) → Esc = 타이틀
await page.goto(BASE + '?ending=result');
const direct = await waitFor(() => !!window.__kingbatEnding, 8000);
// 결과 화면은 0.8초 뒤부터 키를 받는다 (헤드리스는 프레임이 느려 넉넉히)
await page.waitForTimeout(1500);
await page.keyboard.press('Escape');
const title = await waitFor(() => !!window.__kingbatTitle, 8000);
log.push(['바로 결과', { 결과화면: direct, Esc후타이틀: title }]);

for (const [l, v] of log) console.log(l.padEnd(10), JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
