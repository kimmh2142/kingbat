// STAGE 1 단계 안내 (처음 하는 사람도 장난 한 번은 성공해 보게). 상단 미션 칸에 지금 할 일 한 줄만 보여준다.
// 순서대로 보여주지만 먼저 해 버린 단계는 그대로 완료로 친다.

export type TutorialStepId = 'pick' | 'stick' | 'parade' | 'poke' | 'confirm';

export interface TutorialStep {
  id: TutorialStepId;
  pc: string;
  touch: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  { id: 'pick', pc: '① 노란 화살표 쪽 포스트잇 줍기', touch: '① 노란 화살표 쪽 포스트잇 줍기' },
  { id: 'stick', pc: '② 동기 등 뒤로 가서 Z! 포스트잇 붙이기', touch: '② 동기 등 뒤로 가서 [아이템]! 포스트잇 붙이기' },
  { id: 'parade', pc: '③ 동기가 포스트잇 붙인 채 탕비실 가면 미션 성공!', touch: '③ 동기가 포스트잇 붙인 채 탕비실 가면 미션 성공!' },
  { id: 'poke', pc: '④ 동기 등 뒤에서 Space 꾹! 콕 찌르기', touch: '④ 동기 등 뒤에서 [콕] 꾹! 콕 찌르기' },
  { id: 'confirm', pc: '⑤ 내 자리·숨는 곳에서 E 꾹! 점수 확정', touch: '⑤ 내 자리·숨는 곳에서 [숨기] 꾹! 점수 확정' },
];

export const TUTORIAL_TEXT = {
  /** ③(동기가 탕비실 갈 때까지)을 기다리는 동안 뒤 단계를 같이 보여줄 때 */
  waiting: '③ 동기가 탕비실 갈 때까지 기다리기 · 그동안',
  /** 다 끝나면 */
  done: {
    pc: '이제 킹받음 100 채우기! 콕 → 도망 → E 꾹 확정',
    touch: '이제 킹받음 100 채우기! 콕 → 도망 → [숨기] 꾹 확정',
  },
  /** 처음 임시 점수가 생겼을 때 아래 안내 */
  firstTemp: {
    pc: '임시 점수! 도망쳐서 내 자리·숨는 곳에서 E 꾹 (들키면 날아가요)',
    touch: '임시 점수! 도망쳐서 내 자리·숨는 곳에서 [숨기] 꾹 (들키면 날아가요)',
  },
  /** 동기가 처음 돌아보려 할 때(의심 1단계) 주인공 혼잣말. 근처에 있을 때 한 번만 */
  firstTell: '어? 타이핑 멈췄다…! 손 떼고 지켜보자',
  /** 혼잣말을 띄울 거리(px). 멀리 있으면 다음 의심 때 */
  firstTellRange: 320,
  firstTellSeconds: 2.8,
};
