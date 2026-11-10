// 모든 그림은 이 키로 불러온다.
// public/assets/final/에 같은 키의 이미지를 등록(manifest.ts)하면 임시 그래픽 대신 쓰인다.
export const TEX = {
  floorOffice: 'floor_office',
  floorPantry: 'floor_pantry',
  floorHall: 'floor_hall',
  floorCarpet: 'floor_carpet',

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
  powerPanel: 'power_panel',
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

  // 과장 박통화 (STAGE 2 공략 대상)
  gwajangBody: 'gwajang_body',
  gwajangBodyBack: 'gwajang_body_back',
  gwajangHeadFront: 'gwajang_head_front',
  gwajangHeadBack: 'gwajang_head_back',

  // 대표 나대표 (STAGE 3 공략 대상)
  daepyoBody: 'daepyo_body',
  daepyoBodyBack: 'daepyo_body_back',
  daepyoHeadFront: 'daepyo_head_front',
  daepyoHeadBack: 'daepyo_head_back',

  // 비서 김비서 (STAGE 3 방해 NPC)
  biseoBody: 'biseo_body',
  biseoBodyBack: 'biseo_body_back',
  biseoHeadFront: 'biseo_head_front',
  biseoHeadBack: 'biseo_head_back',

  // 신입 (엔딩)
  newbieBody: 'newbie_body',
  newbieBodyBack: 'newbie_body_back',
  newbieHeadFront: 'newbie_head_front',
  newbieHeadBack: 'newbie_head_back',

  // 차장 오의심 (STAGE 2 방해 NPC)
  chajangBody: 'chajang_body',
  chajangBodyBack: 'chajang_body_back',
  chajangHeadFront: 'chajang_head_front',
  chajangHeadBack: 'chajang_head_back',

  // 대리 김카페 (방해 NPC)
  daeriBody: 'daeri_body',
  daeriBodyBack: 'daeri_body_back',
  daeriHeadFront: 'daeri_head_front',
  daeriHeadBack: 'daeri_head_back',
  coffeeCup: 'coffee_cup',

  // 회색 엑스트라 직원 (배경 인물, 몸은 공용 + 머리 3종)
  extraBody: 'extra_body',
  extraBodyBack: 'extra_body_back',
  extraHeadA: 'extra_head_a',
  extraHeadABack: 'extra_head_a_back',
  extraHeadB: 'extra_head_b',
  extraHeadBBack: 'extra_head_b_back',
  extraHeadC: 'extra_head_c',
  extraHeadCBack: 'extra_head_c_back',
  extraHand: 'extra_hand',

  // NPC 공용 표정·소품 (얼굴 위에 겹친다)
  faceNormal: 'face_normal',
  faceSleepy: 'face_sleepy',
  faceSuspicious: 'face_suspicious',
  facePhone: 'face_phone',
  faceHappy: 'face_happy',
  faceShock: 'face_shock',
  hand: 'npc_hand',
  phone: 'phone',
  newspaper: 'newspaper',
  newspaperFolded: 'newspaper_folded',
  putter: 'putter',
  cushion: 'whoopee_cushion',
  snack: 'snack',

  // 아이템과 장난 흔적
  itemPostit: 'item_postit',
  itemGum: 'item_gum',
  parcel: 'parcel',
  postitNote: 'postit_note',
  gumBlob: 'gum_blob',
  dongiBag: 'dongi_bag',

  // 표시
  angerMark: 'anger_mark',
  targetIcon: 'target_icon',
  stripe: 'stripe',
  heartFull: 'heart_full',
  heartEmpty: 'heart_empty',
  cutinArrow: 'cutin_arrow',
} as const;

export type TextureKey = (typeof TEX)[keyof typeof TEX];
