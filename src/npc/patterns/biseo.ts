import { TEX } from '../../assets/keys';
import type { PatrolPattern } from '../types';

// STAGE 3 방해 NPC 비서 김비서: 대표실 문 앞을 지킨다 (기준 문서 PART 3 STAGE 3 방해 요소).
// 비서 데스크 의자 (1330, 578). 대표실 문은 바로 오른쪽 (1512, 420~540).
//  - 문 앞 지키기: 문 옆에 서서 이사석 쪽(왼쪽)을 내려다본다. 이때 문으로 들어가면 보인다
//  - 복사기: 이사석 아래 복사기까지 다녀온다. 이때가 문이 비는 틈
//  - 대표님께 보고 (11/12): 앞문으로 들어가 대표 책상 앞에서 대표 쪽(오른쪽)을 보고 선다. 대표실 안에서도 비서를 살펴야 한다.
//    시야는 책상 앞쪽만 덮고 창가(대표 등 뒤)는 비워 둔다
// 자리에서 일하는 동안엔 시야가 없다 (서류 정리에 집중). 빈손으로 시야에 들어오면 잠깐 세운다.
// 정전 중 손전등 시야는 미션을 만들 때 붙인다.

export const BISEO: PatrolPattern = {
  id: 'biseo',
  name: '비서 김비서',
  appearance: {
    body: TEX.biseoBody,
    bodyBack: TEX.biseoBodyBack,
    headFront: TEX.biseoHeadFront,
    headBack: TEX.biseoHeadBack,
    rank: '비서',
    rankColor: 0x78909c, // 방해 NPC는 회색 계열
  },
  work: { duration: [5, 9], pose: { face: TEX.faceNormal, hands: 'keyboard', typing: 0.8 } },
  routes: [
    {
      name: '문 앞 지키기',
      weight: 2,
      path: [
        { x: 1330, y: 540 },
        { x: 1440, y: 540 },
        { x: 1440, y: 480 },
      ],
    },
    {
      name: '복사기',
      weight: 1,
      path: [
        { x: 1330, y: 540 },
        { x: 1440, y: 540 },
        { x: 1440, y: 1290 },
      ],
    },
    {
      name: '대표님께 보고',
      weight: 1,
      path: [
        { x: 1330, y: 540 },
        { x: 1440, y: 540 },
        { x: 1440, y: 480 },
        { x: 1600, y: 480 },
        { x: 1760, y: 560 },
      ],
      stayFacing: 'right',
      stayPose: { face: TEX.faceNormal, hands: 'side', bubble: '대표님, 오후 일정 보고드립니다~' },
    },
  ],
  speed: 95,
  coneColor: 0x5c6bc0,
  walkPose: { face: TEX.faceNormal, hands: 'side' },
  stay: { duration: [4, 7], facing: 'left', pose: { face: TEX.faceSuspicious, hands: 'side', bubble: '대표님 일정 확인 중…' } },
  vision: { range: 200, halfAngleDeg: 32, nearRadius: 45 },
  react: { duration: [1.2, 1.5], pose: { face: TEX.faceShock, hands: 'side', bubble: '거기! 대표님 방에 뭐 하세요?!' } },
  stop: {
    seconds: 1.2,
    cooldown: 12,
    lines: ['대표님 지금 바쁘세요.', '약속 잡고 오셨어요?', '결재는 저 통해서요~', '보고는 대기석에서 기다리세요.'],
  },
};
