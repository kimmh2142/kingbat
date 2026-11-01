import { TEX } from '../../assets/keys';
import type { PatrolPattern } from '../types';

// STAGE 1 방해 NPC 대리 김카페 (기준 문서 PART 3 STAGE 1 방해 요소).
// 커피를 들고 탕비실과 자리를 왕복한다. 시야 부채꼴 있음.
// 가끔 "커피 좀 사 올래?" 하며 주인공을 붙잡아 3초간 멈추게 한다.

export const DAERI: PatrolPattern = {
  id: 'daeri',
  name: '대리 김카페',
  appearance: {
    body: TEX.daeriBody,
    bodyBack: TEX.daeriBodyBack,
    headFront: TEX.daeriHeadFront,
    headBack: TEX.daeriHeadBack,
    rank: '대리',
    rankColor: 0x90a4ae, // 방해 NPC는 회색 계열
  },
  work: { duration: [5, 10], pose: { face: TEX.faceNormal, hands: 'keyboard', typing: 0.8 } },
  // 대리 자리(1384, 638)에서 탕비실 커피머신 앞까지 두 갈래. 어느 길로 올지 관찰해야 한다
  routes: [
    {
      // 가운데 가로 통로: 내 자리와 동기 자리 사이 (도망치는 길과 겹친다)
      name: '가운데 통로',
      weight: 1,
      path: [
        { x: 1384, y: 560 },
        { x: 1270, y: 500 },
        { x: 570, y: 500 },
        { x: 570, y: 340 },
        { x: 420, y: 340 },
        { x: 140, y: 245 },
      ],
    },
    {
      // 맨 위 통로: 동기 등 뒤(찌르는 자리)를 쓸고 지나간다
      name: '맨 위 통로',
      weight: 1,
      path: [
        { x: 1384, y: 560 },
        { x: 1300, y: 500 },
        { x: 1300, y: 215 },
        { x: 570, y: 215 },
        { x: 570, y: 340 },
        { x: 420, y: 340 },
        { x: 140, y: 245 },
      ],
    },
  ],
  speed: 95,
  walkPose: { face: TEX.faceHappy, hands: 'cup' },
  stay: { duration: [3, 5], facing: 'up', pose: { hands: 'side' } },
  vision: { range: 220, halfAngleDeg: 40, nearRadius: 40 },
  react: { duration: [1.2, 1.5], pose: { face: TEX.faceShock, hands: 'cup', bubble: '어머! 지금 뭐 했어요?' } },
  grab: { chance: 0.3, radius: 60, seconds: 3, cooldown: 25, line: '커피 좀 사 올래?', thanks: '고마워~' },
};
