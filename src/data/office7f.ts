import { TEX, type TextureKey } from '../assets/keys';
import type { PropType } from './props';

// 7층 사무실 맵. 좌표 단위는 px, 원점은 왼쪽 위.
// 스테이지 1에서는 출입구·일반 직원석·탕비실·화장실 앞 복도만 열려 있다.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Room extends Rect {
  id: string;
  name: string;
  floor: TextureKey;
  /** 방 이름표 위치 (없으면 방 위쪽 가운데) */
  sign?: { x: number; y: number };
  /** 이 스테이지부터 들어갈 수 있다 (없으면 처음부터 열림) */
  unlockStage?: number;
}

export type DeskOwner = 'me' | 'dongi' | 'daeri' | 'coworker';

export interface Desk {
  id: string;
  x: number;
  y: number;
  owner?: DeskOwner;
}

export interface PropPlacement {
  type: PropType;
  x: number;
  y: number;
}

/** 벽에 붙은 장식 (충돌은 벽이 담당) */
export interface WallDecor {
  texture: TextureKey;
  x: number;
  y: number;
  label?: string;
}

export interface Barrier extends Rect {
  /** 이 스테이지가 되면 사라진다 */
  unlockStage: number;
}

export const WORLD = { width: 2400, height: 1440 };

/** 위쪽 창문 벽 높이 (그림), 충돌은 이보다 조금 낮게 잡아 벽에 바짝 붙을 수 있게 한다 */
export const WINDOW_WALL_H = 120;

export const WALLS: Rect[] = [
  // 바깥 벽
  { x: 0, y: 0, w: WORLD.width, h: 104 },
  { x: 0, y: 0, w: 24, h: WORLD.height },
  { x: WORLD.width - 24, y: 0, w: 24, h: WORLD.height },
  { x: 0, y: WORLD.height - 24, w: WORLD.width, h: 24 },
  // 탕비실 오른쪽 벽 (문 282~402)
  { x: 480, y: 104, w: 24, h: 178 },
  { x: 480, y: 402, w: 24, h: 142 },
  // 탕비실 아래 벽 (문 300~420)
  { x: 24, y: 520, w: 276, h: 24 },
  { x: 420, y: 520, w: 60, h: 24 },
  // 화장실 앞 복도와 출입구 사이 벽 (오른쪽이 트여 있음)
  { x: 24, y: 900, w: 280, h: 24 },
];

/** 잠긴 구역 경계. 해당 스테이지가 되면 열린다. */
export const BARRIERS: Barrier[] = [{ x: 1720, y: 104, w: 24, h: WORLD.height - 128, unlockStage: 2 }];

export const ROOMS: Room[] = [
  // 바닥은 벽·문틈 아래까지 깔리도록 방끼리 맞닿게 잡는다
  { id: 'pantry', name: '탕비실', floor: TEX.floorPantry, x: 24, y: 104, w: 480, h: 416, sign: { x: 252, y: 60 } },
  { id: 'hall', name: '화장실 앞 복도', floor: TEX.floorHall, x: 24, y: 520, w: 480, h: 380, sign: { x: 340, y: 600 } },
  { id: 'entrance', name: '출입구', floor: TEX.floorHall, x: 24, y: 900, w: 480, h: 516, sign: { x: 340, y: 1120 } },
  { id: 'office', name: '일반 직원석', floor: TEX.floorOffice, x: 504, y: 104, w: 1216, h: 1312 },
  { id: 'manager', name: '관리자 구역', floor: TEX.floorOffice, x: 1744, y: 104, w: 632, h: 1312, unlockStage: 2 },
];

/** 관리자 구역 안의 작은 방 이름표 (스테이지 2에서 실제 방으로 확장) */
export const SUB_ROOM_LABELS: (Rect & { name: string })[] = [
  { name: '회의실', x: 1768, y: 124, w: 300, h: 330 },
  { name: '부장실', x: 2092, y: 124, w: 264, h: 330 },
  { name: '복사실', x: 1768, y: 1090, w: 300, h: 300 },
];

// 일반 직원석: 2인 책상 묶음 3열 x 3줄. 앉는 사람은 책상 위쪽(북쪽) 의자에 앉아 아래를 본다.
const COLS = [600, 960, 1320]; // 묶음 왼쪽 끝
const ROWS = [360, 700, 1040]; // 책상 아래쪽 끝
const DESK_W = 128;

function owner(row: number, col: number, side: number): DeskOwner {
  if (row === 2 && col === 0 && side === 0) return 'me';
  if (row === 0 && col === 1 && side === 1) return 'dongi';
  if (row === 1 && col === 2 && side === 0) return 'daeri';
  return 'coworker';
}

export const DESKS: Desk[] = ROWS.flatMap((y, row) =>
  COLS.flatMap((left, col) =>
    [0, 1].map((side) => ({
      id: `desk-${row}-${col}-${side}`,
      x: left + DESK_W / 2 + side * DESK_W,
      y,
      owner: owner(row, col, side),
    })),
  ),
);

export const PROPS: PropPlacement[] = [
  // 탕비실
  { type: 'counter', x: 170, y: 190 },
  { type: 'coffee', x: 120, y: 152 },
  { type: 'water', x: 320, y: 196 },
  { type: 'fridge', x: 420, y: 214 },
  { type: 'snackTable', x: 240, y: 400 },
  // 화장실 앞 복도
  { type: 'plant', x: 450, y: 640 },
  { type: 'papers', x: 420, y: 870 },
  // 출입구
  { type: 'plant', x: 450, y: 1010 },
  { type: 'plant', x: 70, y: 1400 },
  // 일반 직원석 숨기 장소와 소품
  { type: 'plant', x: 545, y: 200 },
  { type: 'plant', x: 1670, y: 200 },
  { type: 'papers', x: 1660, y: 560 },
  { type: 'partition', x: 780, y: 1250 },
  { type: 'partition', x: 1260, y: 1250 },
  { type: 'plant', x: 1030, y: 1380 },
  { type: 'printer', x: 1620, y: 1380 },
  // 관리자 구역 (잠김, 스테이지 2에서 개방)
  { type: 'meetingTable', x: 1918, y: 360 },
  { type: 'bossDesk', x: 2224, y: 330 },
  { type: 'printer', x: 1918, y: 1300 },
];

// 벽 아래쪽에 서 있는 문들 (기준점 = 아래쪽 가운데)
export const WALL_DECOR: WallDecor[] = [
  { texture: TEX.toiletDoor, x: 90, y: 566, label: '화장실' },
  { texture: TEX.toiletDoor, x: 200, y: 566, label: '화장실' },
  { texture: TEX.elevator, x: 164, y: 984, label: '엘리베이터' },
];

/** 시작 위치: 내 자리 의자 */
export const PLAYER_START = { x: COLS[0] + DESK_W / 2, y: ROWS[2] - 76 };
