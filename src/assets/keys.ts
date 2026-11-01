// 모든 그림은 이 키로 불러온다.
// public/assets/final/에 같은 키의 이미지를 등록(manifest.ts)하면 임시 그래픽 대신 쓰인다.
export const TEX = {
  floorOffice: 'floor_office',
  floorPantry: 'floor_pantry',
  floorHall: 'floor_hall',

  desk: 'desk',
  monitor: 'monitor',
  chair: 'chair',
  plantBig: 'plant_big',
  partition: 'partition',
  paperPile: 'paper_pile',
  printer: 'printer',
  counter: 'counter',
  coffeeMachine: 'coffee_machine',
  water: 'water_dispenser',
  fridge: 'fridge',
  snackTable: 'snack_table',
  elevator: 'elevator',
  toiletDoor: 'toilet_door',
  meetingTable: 'meeting_table',
  bossDesk: 'boss_desk',
  lock: 'lock',

  shadow: 'shadow',
  playerBody: 'player_body',
  playerHeadFront: 'player_head_front',
  playerHeadBack: 'player_head_back',

  // 동기 이동기 (파츠)
  dongiBody: 'dongi_body',
  dongiBodyBack: 'dongi_body_back',
  dongiHeadFront: 'dongi_head_front',
  dongiHeadBack: 'dongi_head_back',
  dongiHairSpike: 'dongi_hair_spike',

  // NPC 공용 표정·소품 (얼굴 위에 겹친다)
  faceNormal: 'face_normal',
  faceSleepy: 'face_sleepy',
  faceSuspicious: 'face_suspicious',
  facePhone: 'face_phone',
  faceHappy: 'face_happy',
  faceShock: 'face_shock',
  hand: 'npc_hand',
  phone: 'phone',
  snack: 'snack',

  // 표시
  angerMark: 'anger_mark',
  targetIcon: 'target_icon',
  stripe: 'stripe',
  heartFull: 'heart_full',
  heartEmpty: 'heart_empty',
  cutinArrow: 'cutin_arrow',
} as const;

export type TextureKey = (typeof TEX)[keyof typeof TEX];
