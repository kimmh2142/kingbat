import { TEX } from '../../assets/keys';
import type { TargetPattern } from '../types';

// STAGE 2 과장 박과장: "퇴근 5분 전에 이것만!"
// 기준 문서 PART 3 STAGE 2 행동 패턴.
//  - 평소: "네~ 사장님~" 큰 소리로 통화. 자리와 복사실 앞·회의실 앞을 왔다 갔다 한다
//  - 페이크: "…네?" 말이 뚝 끊김 → "아~ 하하하! 그렇죠!" 다시 웃으며 통화
//  - 진짜: "…네?" → "잠깐만요." 수화기를 손으로 막음 → 돌아봄
//  - 통화 종료: "네, 그럼 이따 뵙겠습니다!" → 곧바로 돌아봄 (인사말이 전조, 반응 시간 0.8초쯤)
//  - 걷는 동안엔 콕을 못 한다. 멈춰 선 곳(자리·복사실 앞·회의실 앞)에서 등 뒤를 잡아야 한다 (11/9 결정)
// 관리자 구역 좌표: 과장 자리 의자 (2200, 758), 복사기 (1918, 1300), 회의실 탁자 (1918, 360)

export const GWAJANG: TargetPattern = {
  id: 'gwajang',
  name: '박과장',
  appearance: {
    body: TEX.gwajangBody,
    bodyBack: TEX.gwajangBodyBack,
    headFront: TEX.gwajangHeadFront,
    headBack: TEX.gwajangHeadBack,
    rank: '과장',
    rankColor: 0xff9800,
  },

  work: {
    duration: [3, 6],
    activities: [
      { weight: 5, pose: { face: TEX.faceHappy, hands: 'phone', bubble: '네~ 사장님~' } },
      { weight: 3, pose: { face: TEX.faceHappy, hands: 'phone', bubble: '하하하! 그럼요~' } },
      { weight: 2, pose: { face: TEX.facePhone, hands: 'phone', bubble: '네네네네~' } },
    ],
  },
  // 1단계: 말이 뚝 끊긴다. 진짜와 페이크가 똑같다.
  suspect: {
    duration: [0.8, 1.2],
    pose: { face: TEX.faceSuspicious, hands: 'phone', tilt: 10, bubble: '…네?' },
  },
  // 2단계 페이크: 다시 웃으며 통화
  fake: {
    duration: [0.6, 0.9],
    pose: { face: TEX.faceHappy, hands: 'phone', tilt: 4, bubble: '아~ 하하하! 그렇죠!' },
  },
  // 2단계 진짜: 수화기를 손으로 막는다. 이때 손을 떼면 산다.
  real: {
    duration: [0.9, 1.2],
    pose: { face: TEX.faceSuspicious, hands: 'knees', tilt: 0, bubble: '잠깐만요.' },
  },
  look: {
    duration: [1.4, 2],
    pose: { back: true },
    range: 300,
    halfAngleDeg: 55,
    nearRadius: 70,
    // 서서 통화할 땐 앞이 트여 있다: 얼굴 쪽 바로 앞에 서 있다가 억울하게 걸리지 않게 돌아본 쪽 절반만 (11/9)
    nearArc: 'front',
    sideWeights: { left: 2, center: 1, right: 2 },
    skewDeg: 30,
  },
  back: {
    duration: [0.5, 0.8],
    pose: { face: TEX.faceHappy, hands: 'phone', bubble: '네~ 계속하세요~' },
    posePuzzled: { face: TEX.faceSuspicious, hands: 'phone', bubble: '…아 네, 아무것도요' },
  },
  react: {
    duration: [1.2, 1.5],
    pose: { back: true, bubble: '자네 지금 뭐 하나!' },
  },

  fakeChance: 0.5,
  fakeChanceIrritated: 0.25,
  maxConsecutiveFakes: 2,

  // 방심 타임: 통화에 신나서 크게 웃는다
  distracted: {
    chance: 0.2,
    duration: [2, 4],
    pose: { face: TEX.faceHappy, hands: 'phone', tilt: -8, bubble: '와하하하하!' },
    startBubble: '어머 사장님~',
    scoreMultiplier: 1.5,
  },

  trip: {
    // 동기(30~40초)보다 자주 움직인다
    interval: [8, 14],
    stay: [6, 10],
    speed: 105,
    path: [],
    stayFacing: 'down',
    routes: [
      {
        name: '복사실 앞',
        weight: 1,
        stayFacing: 'down',
        path: [
          { x: 2100, y: 758 },
          { x: 2100, y: 1180 },
          { x: 1918, y: 1180 },
        ],
      },
      {
        name: '회의실 앞',
        weight: 1,
        stayFacing: 'up',
        path: [
          { x: 2100, y: 758 },
          { x: 2100, y: 540 },
          { x: 1918, y: 540 },
        ],
      },
    ],
    checksWhileAway: true,
    hangup: { chance: 0.5, line: '네, 그럼 이따 뵙겠습니다!', duration: [0.8, 0.9] },
    walkPose: { hands: 'phone', face: TEX.faceHappy, bubble: '네네~' },
    stayPose: { hands: 'phone', face: TEX.faceHappy, bubble: '네~ 사장님~' },
  },
  pokeWhileWalking: false,

  pokeSpeedup: 1.8,
  alertToSuspect: 0.6,
};
