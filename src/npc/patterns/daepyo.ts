import { TEX } from '../../assets/keys';
import type { TargetPattern } from '../types';

// STAGE 3 대표 나대표: "허허, 재미있는 친구군." (최종 보스)
// 기준 문서 PART 3 STAGE 3 행동 패턴.
//  - 평소: 신문 읽기 (신문이 얼굴 아래를 가림)
//  - 1단계 (진짜·페이크 같음): 신문을 반쯤 내림
//  - 페이크: 신문을 다시 올림 "흠."
//  - 진짜: 신문을 완전히 접어 책상에 내려놓음 → 의자를 돌림
//  - 이동: 퍼팅 연습(대표실 안), 창밖 바라보기(창가, 등을 보임), 순시(대표실 밖 이사석까지)
//  - 대표실 문은 왼쪽 벽 하나 (비서 데스크 앞). 대표 등 뒤 = 창문 쪽
// 8층 좌표: 대표 의자 (1940, 398), 대표실 문 (1512, 420~540)

export const DAEPYO: TargetPattern = {
  id: 'daepyo',
  name: '대표 나대표',
  appearance: {
    body: TEX.daepyoBody,
    bodyBack: TEX.daepyoBodyBack,
    headFront: TEX.daepyoHeadFront,
    headBack: TEX.daepyoHeadBack,
    rank: '대표',
    rankColor: 0x8e24aa,
  },

  work: {
    duration: [3, 7],
    activities: [
      { weight: 5, pose: { face: TEX.faceNormal, hands: 'newspaper', bubble: '흠흠…' } },
      { weight: 3, pose: { face: TEX.faceHappy, hands: 'newspaper', bubble: '허허…' } },
      { weight: 2, pose: { face: TEX.faceSleepy, hands: 'newspaper', nod: true, bubble: 'Zz' } },
    ],
  },
  // 1단계: 신문을 반쯤 내린다. 진짜와 페이크가 똑같다.
  suspect: {
    duration: [0.9, 1.3],
    pose: { face: TEX.faceSuspicious, hands: 'newspaperLow', bubble: '…' },
  },
  // 2단계 페이크: 다시 올린다
  fake: {
    duration: [0.6, 0.9],
    pose: { face: TEX.faceNormal, hands: 'newspaper', bubble: '흠.' },
  },
  // 2단계 진짜: 신문을 접어 책상에 탁 내려놓는다
  real: {
    duration: [0.9, 1.2],
    pose: { face: TEX.faceSuspicious, hands: 'folded', bubble: '탁.' },
  },
  look: {
    duration: [1.6, 2.2],
    pose: { back: true },
    range: 320,
    halfAngleDeg: 55,
    nearRadius: 80,
    nearArc: 'all',
    sideWeights: { left: 2, center: 1, right: 2 },
    skewDeg: 30,
  },
  back: {
    duration: [0.6, 0.9],
    pose: { face: TEX.faceNormal, hands: 'newspaper', bubble: '허허.' },
    posePuzzled: { face: TEX.faceSuspicious, hands: 'newspaperLow', bubble: '…기분 탓인가.' },
  },
  react: {
    duration: [1.3, 1.6],
    pose: { back: true, bubble: '허허… 재미있는 친구군.' },
  },

  fakeChance: 0.5,
  fakeChanceIrritated: 0.3,
  maxConsecutiveFakes: 2,

  // 방심 타임: 꾸벅꾸벅 졸다가 코를 곤다
  distracted: {
    chance: 0.2,
    duration: [2, 4],
    pose: { face: TEX.faceSleepy, hands: 'newspaperLow', nod: true, bubble: '드르렁~' },
    startBubble: '하암~',
    scoreMultiplier: 1.5,
  },

  trip: {
    interval: [10, 16],
    stay: [6, 10],
    speed: 90,
    path: [],
    stayFacing: 'down',
    routes: [
      {
        name: '퍼팅 연습',
        weight: 2,
        stayFacing: 'right',
        stayPose: { hands: 'putter', face: TEX.faceHappy, bubble: '허허, 들어가라~' },
        path: [
          { x: 2080, y: 398 },
          { x: 2080, y: 620 },
          { x: 2180, y: 620 },
        ],
      },
      {
        name: '창밖 보기',
        weight: 2,
        stayFacing: 'up',
        stayPose: { hands: 'side', face: TEX.faceNormal, bubble: '허허… 날씨 좋군.' },
        path: [
          { x: 1800, y: 398 },
          { x: 1800, y: 190 },
        ],
      },
      {
        name: '순시',
        weight: 1,
        stayFacing: 'down',
        path: [
          { x: 1800, y: 398 },
          { x: 1800, y: 480 },
          { x: 1440, y: 480 },
          { x: 1440, y: 760 },
          { x: 1150, y: 760 },
        ],
      },
      // 정전 때만 (STAGE 3 미션이 forceTrip으로 보낸다): 비서 데스크 앞까지 나와 상황을 묻는다
      {
        name: '정전 확인',
        weight: 0,
        stayFacing: 'left',
        stayPose: { hands: 'side', face: TEX.faceShock, bubble: '김비서! 이게 무슨 일인가!' },
        path: [
          { x: 1800, y: 398 },
          { x: 1800, y: 480 },
          { x: 1440, y: 480 },
          { x: 1440, y: 720 },
        ],
      },
    ],
    checksWhileAway: true,
    walkPose: { hands: 'side', face: TEX.faceNormal, bubble: '흠~' },
    stayPose: { hands: 'side', face: TEX.faceSuspicious, bubble: '다들 열심히 하는군…' },
  },

  pokeSpeedup: 1.8,
  // 지난번 진짜로 돌아본 뒤로 4초 넘게 찔렀으면 다음 갸웃은 진짜 (11/12 "너무 안 돌아본다")
  greedPokeSeconds: 4,
  alertToSuspect: 0.6,
};
