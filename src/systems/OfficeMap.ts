import Phaser from 'phaser';
import { TEX } from '../assets/keys';
import { COLORS, FONT } from '../config';
import {
  BARRIERS,
  DESKS,
  PROPS,
  ROOMS,
  SUB_ROOM_LABELS,
  WALL_DECOR,
  WALLS,
  WINDOW_WALL_H,
  WORLD,
  type Barrier,
  type Desk,
  type Rect,
  type Room,
} from '../data/office7f';
import { HIDE_RADIUS, PROP_DEFS, type PropType } from '../data/props';

export interface HideSpot {
  id: string;
  kind: PropType;
  x: number;
  y: number;
  r: number;
}

export interface SafeSpot {
  x: number;
  y: number;
  r: number;
}

/** 그리기 순서. 바닥에 닿는 y가 클수록 앞에 그린다. 이 값보다 큰 depth는 맵 위에 겹치는 표시용. */
export const DEPTH = {
  floor: -100,
  overlay: 10000,
  label: 10100,
} as const;

/**
 * 7층 사무실 맵을 그리고 충돌 영역·숨기 장소·안전 지점을 만든다.
 * 맵 모양은 data/office7f.ts, 소품 종류는 data/props.ts에 있다.
 */
export class OfficeMap {
  readonly colliders: Phaser.Physics.Arcade.StaticGroup;
  readonly hideSpots: HideSpot[] = [];
  readonly mySeat: SafeSpot;
  readonly desks = DESKS;
  private readonly barrierZones = new Map<Barrier, Phaser.GameObjects.Zone>();
  private readonly lockedViews: Phaser.GameObjects.GameObject[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly stage: number,
  ) {
    this.colliders = scene.physics.add.staticGroup();
    scene.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);

    this.drawFloors();
    this.drawWindowWall();
    WALLS.forEach((r) => this.addWall(r));
    this.drawWallDecor();
    DESKS.forEach((d) => this.addDesk(d));
    PROPS.forEach((p, i) => this.addProp(p.type, p.x, p.y, `${p.type}-${i}`));
    this.drawRoomSigns();
    this.drawLockedAreas();

    const me = DESKS.find((d) => d.owner === 'me')!;
    this.mySeat = { x: me.x, y: me.y - 76, r: 56 };
  }

  get width(): number {
    return WORLD.width;
  }

  get height(): number {
    return WORLD.height;
  }

  roomAt(x: number, y: number): Room | undefined {
    return ROOMS.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
  }

  isLocked(room: Room): boolean {
    return (room.unlockStage ?? 0) > this.stage;
  }

  hideSpotAt(x: number, y: number): HideSpot | undefined {
    return this.hideSpots.find((h) => Phaser.Math.Distance.Between(x, y, h.x, h.y) <= h.r);
  }

  isInMySeat(x: number, y: number): boolean {
    return Phaser.Math.Distance.Between(x, y, this.mySeat.x, this.mySeat.y) <= this.mySeat.r;
  }

  /** 디버그 표시: 방 경계, 숨기 장소, 내 자리, 잠긴 경계 */
  drawDebug(g: Phaser.GameObjects.Graphics): void {
    g.lineStyle(1, 0x3949ab, 0.6);
    ROOMS.forEach((r) => g.strokeRect(r.x, r.y, r.w, r.h));
    g.lineStyle(2, 0x2e7d32, 0.9);
    this.hideSpots.forEach((h) => g.strokeCircle(h.x, h.y, h.r));
    g.lineStyle(3, 0x1e88e5, 0.9).strokeCircle(this.mySeat.x, this.mySeat.y, this.mySeat.r);
    g.lineStyle(2, 0xe53935, 0.9);
    this.barrierZones.forEach((_, b) => g.strokeRect(b.x, b.y, b.w, b.h));
  }

  // ---------------------------------------------------------------- 그리기

  private drawFloors(): void {
    for (const r of ROOMS) {
      this.scene.add.tileSprite(r.x, r.y, r.w, r.h, r.floor).setOrigin(0).setDepth(DEPTH.floor);
    }
  }

  private drawWindowWall(): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.floor + 1);
    g.fillStyle(COLORS.wall).fillRect(0, 0, WORLD.width, WINDOW_WALL_H);
    // 창문 (탕비실 위 제외)
    for (let x = 540; x < WORLD.width - 140; x += 190) {
      g.fillStyle(COLORS.window).fillRoundedRect(x, 18, 150, 70, 6);
      g.fillStyle(0xa3c9e6);
      [14, 40, 70, 100, 124].forEach((dx, i) => g.fillRect(x + dx, 50 - (i % 3) * 10, 18, 38 + (i % 3) * 10));
      g.lineStyle(3, COLORS.outline).strokeRoundedRect(x, 18, 150, 70, 6);
      g.lineStyle(3, COLORS.outline).lineBetween(x + 75, 18, x + 75, 88);
    }
    // 탕비실 벽 타일
    g.fillStyle(0xd6efe2).fillRect(24, 0, 456, WINDOW_WALL_H);
    g.fillStyle(COLORS.wallTop).fillRect(0, WINDOW_WALL_H - 10, WORLD.width, 10);
    g.lineStyle(3, COLORS.outline).lineBetween(0, WINDOW_WALL_H, WORLD.width, WINDOW_WALL_H);
  }

  private addWall(r: Rect): void {
    this.addCollider(r);
    // 위쪽 창문 벽은 drawWindowWall이 그린다
    if (r.y === 0 && r.w === WORLD.width) return;
    const isOuter = r.x === 0 || r.y === 0 || r.x + r.w === WORLD.width || r.y + r.h === WORLD.height;
    const g = this.scene.add.graphics().setDepth(isOuter ? DEPTH.floor + 2 : r.y + r.h);
    g.fillStyle(isOuter ? COLORS.outline : COLORS.wall).fillRect(r.x, r.y, r.w, r.h);
    if (!isOuter) {
      g.fillStyle(COLORS.wallTop).fillRect(r.x, r.y, r.w, 8);
      g.lineStyle(3, COLORS.outline).strokeRect(r.x, r.y, r.w, r.h);
    }
  }

  private drawWallDecor(): void {
    for (const d of WALL_DECOR) {
      this.scene.add.image(d.x, d.y, d.texture).setOrigin(0.5, 1).setDepth(d.y);
      if (d.label) this.addSign(d.x, d.y - this.scene.textures.getFrame(d.texture).height - 14, d.label, 0x90caf9, d.y);
    }
  }

  private addDesk(d: Desk): void {
    const def = PROP_DEFS.desk;
    // 의자 → 책상 → 모니터 순으로 겹친다. 앉는 사람은 의자(북쪽)에서 아래를 본다.
    this.scene.add.image(d.x, d.y - 62, TEX.chair).setOrigin(0.5, 1).setDepth(d.y - 62);
    this.scene.add.image(d.x, d.y, def.texture).setOrigin(0.5, 1).setDepth(d.y);
    this.scene.add.image(d.x - 18, d.y - 30, TEX.monitor).setOrigin(0.5, 1).setDepth(d.y + 0.1);
    this.addCollider({ x: d.x - def.collider!.w / 2, y: d.y - def.collider!.h, ...def.collider! });
    if (d.owner === 'me') this.addSign(d.x, d.y - 12, '내 자리', COLORS.pink, d.y + 0.2);
  }

  private addProp(type: PropType, x: number, y: number, id: string): void {
    const def = PROP_DEFS[type];
    this.scene.add.image(x, y, def.texture).setOrigin(0.5, 1).setDepth(y);
    if (def.collider) this.addCollider({ x: x - def.collider.w / 2, y: y - def.collider.h, ...def.collider });
    if (def.hide) this.hideSpots.push({ id, kind: type, x, y: y - 10, r: HIDE_RADIUS });
  }

  private drawRoomSigns(): void {
    for (const r of ROOMS) {
      if (r.id === 'office' || r.id === 'manager') continue;
      const at = r.sign ?? { x: r.x + r.w / 2, y: r.y + 18 };
      this.addSign(at.x, at.y, r.name, 0xffffff, DEPTH.label - 1);
    }
  }

  private drawLockedAreas(): void {
    for (const r of ROOMS) {
      if (!this.isLocked(r)) continue;
      const g = this.scene.add.graphics().setDepth(DEPTH.overlay);
      g.fillStyle(0x3b2a33, 0.42).fillRect(r.x, r.y, r.w, r.h);
      g.lineStyle(3, 0xffffff, 0.5);
      SUB_ROOM_LABELS.forEach((s) => g.strokeRoundedRect(s.x, s.y, s.w, s.h, 10));
      this.lockedViews.push(g);
      SUB_ROOM_LABELS.forEach((s) =>
        this.lockedViews.push(this.addSign(s.x + s.w / 2, s.y + 24, s.name, 0xd1c4e9, DEPTH.overlay + 1)),
      );
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      this.lockedViews.push(this.scene.add.image(cx, cy - 20, TEX.lock).setDepth(DEPTH.overlay + 1).setScale(1.6));
      this.lockedViews.push(
        this.scene.add
          .text(cx, cy + 40, `${r.name}\nSTAGE ${r.unlockStage}에서 열려요`, {
            fontFamily: FONT,
            fontSize: '26px',
            color: '#ffffff',
            align: 'center',
            stroke: '#5a3a4a',
            strokeThickness: 6,
          })
          .setOrigin(0.5)
          .setDepth(DEPTH.overlay + 1),
      );
    }

    for (const b of BARRIERS) {
      if (b.unlockStage <= this.stage) continue;
      this.barrierZones.set(b, this.addCollider(b));
      const g = this.scene.add.graphics().setDepth(DEPTH.overlay + 2);
      g.fillStyle(0xbfe3f5, 0.85).fillRect(b.x, b.y, b.w, b.h);
      g.lineStyle(3, COLORS.outline).strokeRect(b.x, b.y, b.w, b.h);
      this.lockedViews.push(g);
    }
  }

  // ---------------------------------------------------------------- 도우미

  private addCollider(r: Rect): Phaser.GameObjects.Zone {
    const z = this.scene.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h);
    this.scene.physics.add.existing(z, true);
    this.colliders.add(z);
    return z;
  }

  private addSign(x: number, y: number, text: string, color: number, depth: number): Phaser.GameObjects.Container {
    const t = this.scene.add
      .text(0, 0, text, { fontFamily: FONT, fontSize: '17px', color: COLORS.text })
      .setOrigin(0.5);
    const w = t.width + 22;
    const h = t.height + 8;
    const bg = this.scene.add.graphics();
    bg.fillStyle(color).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    bg.lineStyle(3, COLORS.outline).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    return this.scene.add.container(x, y, [bg, t]).setDepth(depth);
  }
}
