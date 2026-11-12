import { TIPS, TUTORIAL_STEPS, TUTORIAL_TEXT } from './tutorial';

// 쓰레기통 버전 (11/10 비교 플레이용으로 시작, 11/12부터 기본). 팀원 피드백 "왜 콕 찌르고 자리까지 가서 숨어야 해?"에서 나왔다.
// 예전 버전(내 자리·숨는 곳에서만 확정)은 ?mode=normal.
// 주인공이 쓰레기통을 늘 들고 다니다가, 어디서든 E 꾹 → 뒤집어쓰고 숨는다 (숨으면 임시 점수 확정).
// 쓰레기통 안에선 뒤뚱뒤뚱 느리게 걸을 수 있지만, 움직이는 걸 들키면 "쓰레기통이 움직였다!".
// 대상 바로 곁에선 못 쓴다 (콕 하고 그 자리에서 확정하는 건 막는다). 나머지 규칙은 기본 버전과 같다.

const MODE = new URLSearchParams(location.search).get('mode');
/** 쓰레기통 버전인가. 주소에 mode가 없으면 쓰레기통 버전. Playwright 확인 스크립트는 예전 버전 기준으로 짜여 있어서
 *  mode가 없으면 예전 버전으로 돈다 (쓰레기통은 scripts/check-trash.mjs가 ?mode=trash로 확인) */
export const TRASH_MODE = MODE === 'trash' || (MODE !== 'normal' && !navigator.webdriver);

export const TRASH = {
  /** 쓰레기통 안에서 걷는 빠르기 (평소 대비) */
  speedMul: 0.35,
  /** 대상과 이 거리(px)보다 가까우면 못 쓴다 */
  minTargetDist: 170,
  /** 이 빠르기(px/s)보다 빠르면 "움직이는 중" (보이면 들킨다) */
  movingSpeed: 8,
  lines: {
    tooClose: '여기선 너무 수상해! 조금 떨어지자',
    enter: '쏙!',
    /** 예전 버전(?mode=normal)일 때만 왼쪽 위에 작게 */
    normalBadge: '📍 숨는 곳 버전',
  },
};

let applied = false;

/** 쓰레기통 버전이면 안내 문구를 바꾼다 (한 번만) */
export function applyTrashTexts(): void {
  if (!TRASH_MODE || applied) return;
  applied = true;
  const confirm = TUTORIAL_STEPS.find((s) => s.id === 'confirm');
  if (confirm) {
    confirm.pc = '⑤ 조금 떨어져서 E 꾹! 쓰레기통 쓰고 점수 확정';
    confirm.touch = '⑤ 조금 떨어져서 [숨기] 꾹! 쓰레기통 쓰고 점수 확정';
  }
  TUTORIAL_TEXT.firstTemp = {
    pc: '임시 점수! 조금 떨어져서 E 꾹 → 쓰레기통 쓰면 확정 (들키면 날아가요)',
    touch: '임시 점수! 조금 떨어져서 [숨기] 꾹 → 쓰레기통 쓰면 확정 (들키면 날아가요)',
  };
  TUTORIAL_TEXT.done = {
    pc: '이제 킹받음 100 채우기! 콕 → 떨어져서 E 꾹 쓰레기통 확정',
    touch: '이제 킹받음 100 채우기! 콕 → 떨어져서 [숨기] 꾹 쓰레기통 확정',
  };
  TIPS.temp = {
    title: '줄무늬 = 아직 내 점수 아님!',
    // 쓰레기통 설명은 시작 때가 아니라 여기서 (숨을 이유가 생기는 순간, 11/12). STAGE 2·3은 다시 설명하지 않는다
    pc: '들키면 날아간다! E 누르면 어디서든 바로 쓰레기통 쏙, 계속 누르면 확정!\n대상 바로 옆에선 안 되고, 안에서 움직이다 보이면 들켜요.',
    touch: '들키면 날아간다! [숨기] 누르면 어디서든 바로 쓰레기통 쏙, 계속 누르면 확정!\n대상 바로 옆에선 안 되고, 안에서 움직이다 보이면 들켜요.',
  };
  TIPS.confirmed = {
    title: '확정! 완벽한 쓰레기통',
    pc: '콕 → 떨어져서 E 꾹 쓰레기통을 반복해서 킹받음 100!\n특별 미션도 잊지 말고. 오늘 칼퇴 가자!',
    touch: '콕 → 떨어져서 [숨기] 꾹 쓰레기통을 반복해서 킹받음 100!\n특별 미션도 잊지 말고. 오늘 칼퇴 가자!',
  };
}
