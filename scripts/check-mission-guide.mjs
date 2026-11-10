// 특별 미션 안내 확인 (11/10 "특별 미션 안내 부족"):
// STAGE 2·3 시작 안내창(?tips=1), 상단 미션 칸 단계 표시, 목적지 ★·초록 화살표·미니맵 별이 단계마다 옮겨 가는지.
// STAGE 1은 기존 튜토리얼 안내창('goal')이 그대로 뜨는지.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-mission-guide.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.GAME_URL ?? 'http://localhost:5173/';
mkdirSync('screenshots', { recursive: true });

const browser = await chromium.launch();
const errors = [];
const log = [];

async function open(q) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + q);
  await page.waitForFunction(() => !!window.__kingbatTest);
  await page.waitForTimeout(400);
  return page;
}
const k = (page) => page.evaluate(() => window.__kingbat);
const snap = async (page) => {
  const s = await k(page);
  return { 단계: s.missionStep?.text ?? null, 목적지: s.missionStep?.at ?? null, 미션칸: s.tutorial.line };
};
const tapE = async (page) => {
  await page.keyboard.down('KeyE');
  await page.waitForTimeout(120);
  await page.keyboard.up('KeyE');
  await page.waitForTimeout(250);
};
const tp = (page, x, y) => page.evaluate(([a, b]) => window.__kingbatTest.teleport(a, b), [x, y]);

/** 스크린샷 픽셀 밝기 (R+G+B)/3. 이미지 미리보기는 어두운 막을 밝게 보여줄 때가 있어 값으로 확인한다 */
const bright = async (p, pts) => {
  const buf = await p.screenshot();
  return p.evaluate(
    async ([d, pts]) => {
      const i = new Image();
      i.src = 'data:image/png;base64,' + d;
      await i.decode();
      const c = document.createElement('canvas');
      c.width = i.width;
      c.height = i.height;
      const x = c.getContext('2d');
      x.drawImage(i, 0, 0);
      return pts.map(([a, b]) => {
        const v = x.getImageData(Math.round(a), Math.round(b), 1, 1).data;
        return Math.round((v[0] + v[1] + v[2]) / 3);
      });
    },
    [buf.toString('base64'), pts],
  );
};

// 1) 시작 스포트라이트 안내: STAGE 1 = goal(포스트잇), STAGE 2 = approval(서류), STAGE 3 = blackout(방석).
// 비출 곳이 화면 밖이면 카메라가 갔다가 닫으면 돌아온다. 원 안은 밝고 바깥(화면 귀퉁이)은 어두운지 픽셀로 확인
const tips = {};
for (const n of [1, 2, 3]) {
  const p = await open(`?stage=${n}&tips=1`);
  const want = { 1: 'goal', 2: 'approval', 3: 'blackout' }[n];
  await p.waitForFunction((w) => window.__kingbat?.tip === w, want, { timeout: 10000 });
  await p.waitForTimeout(500);
  const spot = await p.evaluate(() => window.__kingbatTest.tipSpot());
  const [inside, corner] = await bright(p, [[spot.x, spot.y], [40, 200]]);
  await p.screenshot({ path: `screenshots/spot-tip-${n}.png` });
  await p.waitForTimeout(400);
  await p.keyboard.press('Space');
  await p.waitForTimeout(1500);
  const back = await p.evaluate(() => window.__kingbatTest.cameraOnPlayer());
  tips[n] = { 안내: want, 원안밝기: inside, 바깥밝기: corner, 닫힘: !(await p.evaluate(() => window.__kingbat.tip)), 카메라복귀: back };
  await p.close();
}
log.push(['안내창', tips]);

// 2) STAGE 2 단계: ① 서류 줍기 → ② 결재 더미
const p2 = await open('?stage=2');
await p2.evaluate(() => {
  window.__kingbatTest.setRemaining(999);
  window.__kingbatTest.calmDaeri();
});
const s2a = await snap(p2);
await p2.screenshot({ path: 'screenshots/mission-step2-1.png' });
await tp(p2, 2010, 1330);
await tapE(p2);
const s2b = await snap(p2);
await tp(p2, 1200, 1300);
await p2.waitForTimeout(300);
await p2.keyboard.down('KeyM');
await p2.waitForTimeout(300);
await p2.screenshot({ path: 'screenshots/mission-step2-2-map.png' });
await p2.keyboard.up('KeyM');
log.push(['STAGE 2', { 처음: s2a, 서류주운뒤: s2b }]);
await p2.close();

// 3) STAGE 3 단계: ① 방석 → ② 배전반 → ③ 대표 의자
const p3 = await open('?stage=3');
await p3.evaluate(() => {
  window.__kingbatTest.setRemaining(999);
  window.__kingbatTest.calmDaeri();
});
const s3a = await snap(p3);
await tp(p3, 360, 500);
await tapE(p3);
const s3b = await snap(p3);
await p3.screenshot({ path: 'screenshots/mission-step3-2.png' });
await tp(p3, 2300, 1140);
await tapE(p3);
await p3.waitForTimeout(300);
const s3c = await snap(p3);
await p3.screenshot({ path: 'screenshots/mission-step3-3.png' });
log.push(['STAGE 3', { 처음: s3a, 방석주운뒤: s3b, 정전뒤: s3c }]);
await p3.close();

for (const [l, v] of log) console.log(l.padEnd(8), JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
