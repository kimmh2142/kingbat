import { TEX } from '../../assets/keys';
import type { PatrolPattern } from '../types';

// STAGE 3 돌발 방문 인사팀 (기준 문서 PART 3 STAGE 3 방해 요소 "인사팀 방문").
// 평소엔 맵에 없다. 방문 때 엘리베이터 앞(164, 1048)에 나타나 경로 하나를 걸어가 둘러보고, 엘리베이터로 돌아가 사라진다 (systems/HrVisit).
// 시야가 넓다. 빈손으로 시야에 들어가면 사원증 검사로 잠깐 세운다.

export const INSA: PatrolPattern = {
  id: 'insa',
  name: '인사팀',
  appearance: {
    body: TEX.insaBody,
    bodyBack: TEX.insaBodyBack,
    headFront: TEX.insaHeadFront,
    headBack: TEX.insaHeadBack,
    rank: '인사팀',
    rankColor: 0x78909c, // 방해 NPC는 회색 계열
  },
  // 엘리베이터 앞에서 "일"하는 시간은 쓰지 않는다 (나타나면 바로 출발, 돌아오면 사라짐)
  work: { duration: [999, 999], pose: { face: TEX.faceNormal, hands: 'side' } },
  routes: [
    {
      name: '이사석 점검',
      weight: 1,
      path: [
        { x: 300, y: 1048 },
        { x: 560, y: 1150 },
        { x: 1150, y: 1150 },
        { x: 1150, y: 640 },
      ],
    },
    {
      name: '라운지 점검',
      weight: 1,
      path: [
        { x: 300, y: 1048 },
        { x: 560, y: 1048 },
        { x: 560, y: 700 },
        { x: 360, y: 700 },
        { x: 360, y: 460 },
      ],
    },
  ],
  speed: 100,
  coneColor: 0xff7043,
  walkPose: { face: TEX.faceSuspicious, hands: 'side', bubble: '체크, 체크…' },
  stay: { duration: [4, 6], facing: 'up', pose: { face: TEX.faceSuspicious, hands: 'side', bubble: '흠… 다들 일하시나?' } },
  vision: { range: 230, halfAngleDeg: 36, nearRadius: 50 },
  react: { duration: [1.2, 1.5], pose: { face: TEX.faceShock, hands: 'side', bubble: '방금 그거 인사기록에 남깁니다!' } },
  stop: {
    seconds: 1.2,
    cooldown: 15,
    lines: ['사원증 좀 볼까요?', '근무 시간에 어디 가세요?', '근태 점검 중입니다~'],
  },
};
