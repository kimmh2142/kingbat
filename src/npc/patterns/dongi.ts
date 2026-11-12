import { TEX } from '../../assets/keys';
import type { TargetPattern } from '../types';

// STAGE 1 동기 이동기: "야, 우리 동기잖아!"
// 기준 문서 PART 3 STAGE 1 행동 패턴.
//  - 평소: 타이핑하며 꾸벅꾸벅 졸기, 몰래 휴대폰 보기
//  - 페이크: "흐음?" 갸웃하지만 손은 키보드 위 → 다시 타이핑
//  - 진짜: 손을 무릎에 내리고 머리카락이 쭈뼛 → 의자를 돌려 뒤돌아봄
//  - 이동: 30~40초마다 탕비실 간식 털기
//  - 방심 타임: 휴대폰을 떨어뜨려 줍는 동안 (다시 일어나는 타이밍은 랜덤)

export const DONGI: TargetPattern = {
  id: 'dongi',
  name: '동기 이동기',
  appearance: {
    body: TEX.dongiBody,
    bodyBack: TEX.dongiBodyBack,
    headFront: TEX.dongiHeadFront,
    headBack: TEX.dongiHeadBack,
    spike: TEX.dongiHairSpike,
    rank: '동기',
    rankColor: 0xf06292,
  },

  work: {
    duration: [3.5, 7.5],
    activities: [
      { weight: 5, pose: { face: TEX.faceNormal, hands: 'keyboard', typing: 1 } },
      { weight: 3, pose: { face: TEX.faceSleepy, hands: 'keyboard', typing: 0.35, nod: true, bubble: 'Zz' } },
      { weight: 3, pose: { face: TEX.facePhone, hands: 'phone' } },
    ],
  },
  // 1단계: 타이핑이 멈추고 "흐음?" 하고 갸웃. 진짜와 페이크가 똑같다.
  suspect: {
    duration: [0.8, 1.2],
    pose: { face: TEX.faceSuspicious, hands: 'keyboard', typing: 0, tilt: 14, bubble: '흐음?' },
  },
  // 2단계 페이크: 손이 키보드 위에서 다시 움직인다
  fake: {
    duration: [0.6, 0.9],
    pose: { face: TEX.faceNormal, hands: 'keyboard', typing: 1, tilt: 4 },
  },
  // 2단계 진짜: 손이 키보드에서 사라지고(무릎으로) 머리카락이 쭈뼛. 이때 손을 떼면 산다.
  real: {
    duration: [0.9, 1.3],
    pose: { face: TEX.faceSuspicious, hands: 'knees', spike: true, tilt: 0 },
  },
  look: {
    duration: [1.4, 2.2],
    pose: { back: true, spike: true },
    range: 300,
    halfAngleDeg: 55,
    nearRadius: 70,
    // 앉아만 있고 책상이 앞을 막으니 사방 판정 (STAGE 1 그대로)
    nearArc: 'all',
    // 진짜 전조(손이 사라지고 머리 쭈뼛) 때 흘깃 보는 쪽으로 부채꼴이 치우친다
    sideWeights: { left: 2, center: 1, right: 2 },
    skewDeg: 30,
  },
  back: {
    duration: [0.5, 0.8],
    pose: { face: TEX.faceNormal, hands: 'keyboard', typing: 0.5 },
    posePuzzled: { face: TEX.faceSuspicious, hands: 'keyboard', typing: 0.5, bubble: '…뭐야' },
  },
  react: {
    duration: [1.2, 1.5],
    pose: { back: true, spike: true, bubble: '야!!' },
  },

  fakeChance: 0.5,
  fakeChanceIrritated: 0.25,
  maxConsecutiveFakes: 2,

  distracted: {
    chance: 0.22,
    duration: [2, 4.5],
    pose: { face: TEX.faceShock, hands: 'hidden', bend: 24, bubble: '어디 갔지…' },
    startBubble: '앗 폰!',
    scoreMultiplier: 1.5,
  },

  trip: {
    interval: [30, 40],
    stay: [4, 6],
    speed: 115,
    path: [
      { x: 1152, y: 228 },
      { x: 570, y: 228 },
      { x: 570, y: 340 },
      { x: 420, y: 340 },
      { x: 250, y: 345 },
    ],
    stayFacing: 'down',
    walkPose: { hands: 'side', face: TEX.faceHappy },
    stayPose: { hands: 'snack', face: TEX.faceHappy, bubble: '냠냠' },
  },

  pokeSpeedup: 1.8,
  // 지난번 진짜로 돌아본 뒤로 4초 넘게 찔렀으면 다음 갸웃은 진짜 (11/12 "너무 안 돌아본다")
  greedPokeSeconds: 4,
  alertToSuspect: 0.6,
};
