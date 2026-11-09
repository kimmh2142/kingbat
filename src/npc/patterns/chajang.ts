import { TEX } from '../../assets/keys';
import type { PatrolPattern } from '../types';

// STAGE 2 방해 NPC 차장 오의심: "난 다 보고 있어." (기준 문서 PART 3 STAGE 2 방해 요소)
// 관리자 구역 차장 자리(1850, 758)에서 세 갈래로 순찰한다. 시야 부채꼴 있음.
//  - 과장 자리 뒤: 과장 등 뒤(찌르는 자리)를 쓸고 지나간다
//  - 복사실 쪽: 과장이 복사기 앞에 서 있을 때 등 뒤를 내려다본다
//  - 일반 직원석 오른쪽 끝: 관리자 구역 → 내 자리로 도망치는 길을 지킨다
// 대리처럼 붙잡지는 않고, 빈손으로 시야에 들어오면 잠깐 세워서 일을 던진다 (대사는 매번 다르게, 11/9).

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
  // 난이도 조정 (11/9 플레이 "어려워졌다"): 자리 4~8초 → 8~14초, 시야 230px·38° → 180px·30°, 과장 자리 뒤 비중 2 → 1
  work: { duration: [8, 14], pose: { face: TEX.faceSuspicious, hands: 'keyboard', typing: 0.5 } },
  routes: [
    {
      name: '과장 자리 뒤',
      weight: 1,
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
  vision: { range: 180, halfAngleDeg: 30, nearRadius: 40 },
  react: { duration: [1.2, 1.5], pose: { face: TEX.faceShock, hands: 'side', bubble: '거기 너! 다 봤어!' } },
  stop: {
    seconds: 1.2,
    cooldown: 12,
    face: TEX.faceHappy,
    lines: [
      '아까 줬던 보고서 말인데~',
      '이거 내일 아침까지 되지?',
      '엑셀 셀 병합 좀 다 풀어 줄래?',
      '회의록에 오타 하나 있더라~',
      'PPT 폰트 궁서체로 바꿔 봐',
      '주간 보고 양식 또 바뀌었어~',
      '복사 50부만 부탁해~',
      '그거 그냥 처음부터 다시 하자',
    ],
  },
};
