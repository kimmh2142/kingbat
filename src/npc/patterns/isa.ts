import { TEX } from '../../assets/keys';
import type { PatrolPattern } from '../types';

// STAGE 3 방해 NPC 이사 엄감시 (기준 문서 PART 3 STAGE 3 방해 요소): 비서와 다른 방향을 본다.
// 이사석 의자 (1040, 358). 비서가 대표실 문 쪽(왼쪽)을 지키는 동안, 이사는 반대로
//  - 배전반 길: 배전반 복도 입구(1500, 1200~1416) 앞에 서서 오른쪽을 본다
//  - 이사석 순찰: 이사석 가운데에서 대표실 쪽(오른쪽)을 본다
//  - 라운지 쪽: 라운지 문 앞까지 와서 이사석 쪽을 본다 (방석 가지러 가는 길)
// 두 감시자의 시야를 모두 피해야 한다. 빈손이면 잠깐 세운다.

export const ISA: PatrolPattern = {
  id: 'isa',
  name: '이사 엄감시',
  appearance: {
    body: TEX.isaBody,
    bodyBack: TEX.isaBodyBack,
    headFront: TEX.isaHeadFront,
    headBack: TEX.isaHeadBack,
    rank: '이사',
    rankColor: 0x78909c, // 방해 NPC는 회색 계열
  },
  work: { duration: [6, 11], pose: { face: TEX.faceSuspicious, hands: 'keyboard', typing: 0.4 } },
  routes: [
    {
      name: '배전반 길',
      weight: 2,
      path: [
        { x: 1150, y: 358 },
        { x: 1150, y: 1300 },
        { x: 1330, y: 1300 },
      ],
    },
    {
      name: '이사석 순찰',
      weight: 1,
      path: [
        { x: 1150, y: 358 },
        { x: 1150, y: 760 },
        { x: 760, y: 760 },
      ],
    },
    {
      name: '라운지 쪽',
      weight: 1,
      path: [
        { x: 1150, y: 358 },
        { x: 1150, y: 520 },
        { x: 600, y: 520 },
        { x: 600, y: 340 },
      ],
    },
  ],
  speed: 80,
  coneColor: 0x26a69a,
  walkPose: { face: TEX.faceSuspicious, hands: 'side' },
  stay: { duration: [4, 7], facing: 'right', pose: { face: TEX.faceSuspicious, hands: 'side', bubble: '음… 수상한데.' } },
  vision: { range: 190, halfAngleDeg: 30, nearRadius: 42 },
  react: { duration: [1.2, 1.5], pose: { face: TEX.faceShock, hands: 'side', bubble: '자네! 지금 뭐 하는 건가!' } },
  stop: {
    seconds: 1.2,
    cooldown: 14,
    lines: ['자네, 소속이 어디인가?', '임원층엔 무슨 일로?', '넥타이가 삐뚤어졌군.', '보고서는 두 장 이내로.'],
  },
};
