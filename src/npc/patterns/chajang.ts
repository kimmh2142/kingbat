import { TEX } from '../../assets/keys';
import type { PatrolPattern } from '../types';

// STAGE 2 방해 NPC 차장 오의심: "난 다 보고 있어." (기준 문서 PART 3 STAGE 2 방해 요소)
// 관리자 구역 차장 자리(1850, 758)에서 세 갈래로 순찰한다. 시야 부채꼴 있음.
//  - 과장 자리 뒤: 과장 등 뒤(찌르는 자리)를 쓸고 지나간다
//  - 복사실 쪽: 과장이 복사기 앞에 서 있을 때 등 뒤를 내려다본다
//  - 일반 직원석 오른쪽 끝: 관리자 구역 → 내 자리로 도망치는 길을 지킨다
// 대리처럼 붙잡지는 않고, 빈손으로 시야에 들어오면 잠깐 세운다.

export const CHAJANG: PatrolPattern = {
  id: 'chajang',
  name: '차장 오의심',
  appearance: {
    body: TEX.chajangBody,
    bodyBack: TEX.chajangBodyBack,
    headFront: TEX.chajangHeadFront,
    headBack: TEX.chajangHeadBack,
    rank: '차장',
    rankColor: 0x78909c, // 방해 NPC는 회색 계열
  },
  work: { duration: [4, 8], pose: { face: TEX.faceSuspicious, hands: 'keyboard', typing: 0.5 } },
  routes: [
    {
      name: '과장 자리 뒤',
      weight: 2,
      path: [
        { x: 1850, y: 690 },
        { x: 2330, y: 690 },
      ],
    },
    {
      name: '복사실 쪽',
      weight: 1,
      path: [
        { x: 1850, y: 690 },
        { x: 1760, y: 690 },
        { x: 1760, y: 1010 },
        { x: 2010, y: 1010 },
      ],
    },
    {
      name: '일반 직원석 끝',
      weight: 1,
      path: [
        { x: 1850, y: 690 },
        { x: 1690, y: 690 },
        { x: 1690, y: 980 },
      ],
    },
  ],
  speed: 85,
  coneColor: 0x9575cd,
  walkPose: { face: TEX.faceSuspicious, hands: 'side' },
  stay: { duration: [3, 5], facing: 'down', pose: { face: TEX.faceSuspicious, hands: 'side', bubble: '흐음…' } },
  vision: { range: 230, halfAngleDeg: 38, nearRadius: 40 },
  react: { duration: [1.2, 1.5], pose: { face: TEX.faceShock, hands: 'side', bubble: '거기 너! 다 봤어!' } },
  stop: { seconds: 1.2, cooldown: 12, line: '난 다 보고 있어.' },
};
