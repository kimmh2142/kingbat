import Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { DESKS, ROOMS, WORLD } from '../data/office7f';
import { MINIMAP } from '../data/tuning';
import { DEPTH, type OfficeMap } from '../systems/OfficeMap';
import type { TouchControls } from './TouchControls';

/** 미니맵에 찍을 위치들 (월드 좌표) */
export interface MiniMapMarks {
  player: { x: number; y: number };
  target: { x: number; y: number };
  /** 방해 NPC (순찰) */
  patrols: { x: number; y: number }[];
  items: { x: number; y: number }[];
  /** 이 사람들이 작은 미니맵 밑에 들어가면 미니맵을 흐리게 한다 (월드 좌표, 발 위치) */
  people: { x: number; y: number }[];
  view: Phaser.Geom.Rectangle;
}

const ROOM_COLORS: Record<string, number> = {
  pantry: 0xd6efe2,
  hall: 0xeee6f0,
  entrance: 0xeee6f0,
  office: 0xfde7ef,
};

/**
 * 미니맵: PC는 오른쪽 아래, 모바일은 버튼을 피해 오른쪽 위.
 * 나·동기(공략 대상)·대리·내 자리·주울 수 있는 아이템·지금 보이는 화면을 점으로 보여준다.
 * 동기가 어디를 보는지·의심 중인지는 보여주지 않는다 (전조는 캐릭터 행동으로만).
 * M을 누르고 있는 동안(모바일은 미니맵 터치로 열고 닫기) 화면 가운데에 크게 보인다. 게임은 멈추지 않는다.
 */
export class MiniMap {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly dim: Phaser.GameObjects.Rectangle;
  /** 크게 볼 때만 보이는 글자 (방 이름·범례) */
  private readonly bigTexts: Phaser.GameObjects.Text[] = [];
  private readonly small: { x: number; y: number; s: number };
  private readonly big: { x: number; y: number; s: number };
  private t = 0;
  /** 작은 미니맵 진하기 (밑에 사람이 있으면 흐려진다) */
  private alpha = 1;
  /** 모바일: 터치로 연 상태 */
  private toggled = false;
  /** 지금 크게 보이는가 */
  isBig = false;

  constructor(
    scene: Phaser.Scene,
    private readonly map: OfficeMap,
    touch: TouchControls,
    isTouch: boolean,
    targetRank: string,
  ) {
    const sw = MINIMAP.width;
    const ss = sw / WORLD.width;
    const sh = WORLD.height * ss;
    this.small = isTouch
      ? { x: GAME_WIDTH - sw - MINIMAP.margin, y: MINIMAP.touchTop, s: ss }
      : { x: GAME_WIDTH - sw - MINIMAP.margin, y: GAME_HEIGHT - sh - MINIMAP.margin, s: ss };
    const bs = MINIMAP.bigWidth / WORLD.width;
    this.big = { x: (GAME_WIDTH - MINIMAP.bigWidth) / 2, y: (GAME_HEIGHT - WORLD.height * bs) / 2 + 14, s: bs };

    this.dim = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x3b2a33, 0.45)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.label + 34)
      .setVisible(false);
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.label + 18);

    // 크게 볼 때 글자
    const b = this.big;
    const text = (x: number, y: number, s: string, size: number, color: string = COLORS.text) => {
      const t = scene.add
        .text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color, align: 'center', stroke: '#ffffff', strokeThickness: 4 })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.label + 36)
        .setVisible(false);
      this.bigTexts.push(t);
      return t;
    };
    for (const r of ROOMS) {
      const locked = map.isLocked(r);
      text(b.x + (r.x + r.w / 2) * b.s, b.y + (r.y + r.h / 2) * b.s, locked ? `${r.name}\n(STAGE ${r.unlockStage})` : r.name, 16, locked ? '#757575' : COLORS.text);
    }
    const seat = map.mySeat;
    text(b.x + seat.x * b.s, b.y + seat.y * b.s - 18, '내 자리', 14, '#e0457b');
    text(GAME_WIDTH / 2, b.y - 16, isTouch ? '전체 지도 · 화면을 누르면 닫혀요' : '전체 지도 · M에서 손을 떼면 닫혀요', 18);
    // 범례 (점 색과 같은 글자색)
    const legend: [string, string][] = [['● 나', '#ff4f8b'], [`● ${targetRank}`, '#e53935'], ['● 방해 NPC', '#ffa000'], ['◆ 아이템', '#f9a825'], ['■ 내 자리', '#f06292']];
    legend.forEach(([s, c], i) => text(GAME_WIDTH / 2 + (i - (legend.length - 1) / 2) * 104, b.y + WORLD.height * b.s + 16, s, 16, c));

    // 모바일: 미니맵을 누르면 크게, 크게 보는 중엔 아무 데나 누르면 닫힘
    const sm = this.small;
    touch.addTapZone(sm.x, sm.y, sw, sh, () => (this.toggled = !this.toggled), () => !this.toggled);
    touch.addTapZone(0, 0, GAME_WIDTH, GAME_HEIGHT, () => (this.toggled = false), () => this.toggled);
  }

  /** 미니맵 영역 (테스트·겹침 확인용) */
  get rect(): { x: number; y: number; w: number; h: number } {
    const m = this.isBig ? this.big : this.small;
    return { x: m.x, y: m.y, w: WORLD.width * m.s, h: WORLD.height * m.s };
  }

  /** @param holdBig M을 누르고 있는가 */
  update(dt: number, marks: MiniMapMarks, holdBig: boolean, hidden: boolean): void {
    this.t += dt;
    this.isBig = !hidden && (holdBig || this.toggled);
    if (hidden) this.toggled = false;
    this.dim.setVisible(this.isBig);
    for (const t of this.bigTexts) t.setVisible(this.isBig);
    this.g.setDepth(this.isBig ? DEPTH.label + 35 : DEPTH.label + 18).setVisible(!hidden);
    if (hidden) return;
    const want = !this.isBig && this.covers(marks) ? MINIMAP.coveredAlpha : 1;
    this.alpha += (want - this.alpha) * Math.min(1, dt * 10);
    this.g.setAlpha(this.isBig ? 1 : this.alpha);
    this.draw(this.isBig ? this.big : this.small, marks, this.isBig);
  }

  /** 나·대상·방해 NPC 중 누가 작은 미니맵 밑(화면 좌표)에 들어가 있는가. 몸(발 위로 약 110px)까지 본다 */
  private covers(k: MiniMapMarks): boolean {
    const v = k.view;
    const zoom = GAME_WIDTH / v.width;
    const r = this.rect;
    const pad = 8;
    return k.people.some((p) => {
      const sx = (p.x - v.x) * zoom;
      const top = (p.y - 110 - v.y) * zoom;
      const bottom = (p.y - v.y) * zoom;
      return sx > r.x - 24 - pad && sx < r.x + r.w + 24 + pad && bottom > r.y - pad && top < r.y + r.h + pad;
    });
  }

  /** 미니맵 진하기 (확인용) */
  get opacity(): number {
    return this.g.alpha;
  }

  private draw(m: { x: number; y: number; s: number }, k: MiniMapMarks, big: boolean): void {
    const g = this.g;
    const { s } = m;
    const X = (x: number) => m.x + x * s;
    const Y = (y: number) => m.y + y * s;
    const w = WORLD.width * s;
    const h = WORLD.height * s;
    g.clear();
    // 바탕
    g.fillStyle(0xffffff, big ? 1 : 0.88).fillRoundedRect(m.x - 4, m.y - 4, w + 8, h + 8, 8);
    // 벽 (방이 아닌 곳)
    g.fillStyle(0xe6d7de).fillRect(X(0), Y(0), w, h);
    // 방 (안 열린 곳은 회색)
    for (const r of ROOMS) {
      const locked = this.map.isLocked(r);
      g.fillStyle(locked ? 0xbdbdbd : (ROOM_COLORS[r.id] ?? 0xf5f5f5), locked ? 0.7 : 1).fillRect(X(r.x), Y(r.y), r.w * s, r.h * s);
    }
    // 책상 (길 찾기용)
    g.fillStyle(0xd7b98e);
    for (const d of DESKS) g.fillRect(X(d.x - 62), Y(d.y - 56), 124 * s, 56 * s);
    // 내 자리 (확정하러 가는 곳)
    const seat = this.map.mySeat;
    const sr = big ? 9 : 4;
    g.fillStyle(0xf06292).fillRoundedRect(X(seat.x) - sr, Y(seat.y) - sr, sr * 2, sr * 2, 2);
    g.lineStyle(big ? 3 : 1.5, 0xffffff).strokeRoundedRect(X(seat.x) - sr, Y(seat.y) - sr, sr * 2, sr * 2, 2);
    // 지금 보이는 화면
    const v = k.view;
    g.lineStyle(big ? 2 : 1.5, COLORS.outline, 0.55).strokeRect(X(Math.max(0, v.x)), Y(Math.max(0, v.y)), Math.min(v.width, WORLD.width) * s, Math.min(v.height, WORLD.height) * s);
    // 아이템: 노란 마름모 반짝 (대리 주황 점과 헷갈리지 않게 모양을 다르게)
    const pulse = 0.6 + Math.abs(Math.sin(this.t * 5)) * 0.4;
    for (const it of k.items) {
      const r = (big ? 11 : 6) * (0.85 + pulse * 0.3);
      const cx = X(it.x);
      const cy = Y(it.y);
      const pts = [new Phaser.Math.Vector2(cx, cy - r), new Phaser.Math.Vector2(cx + r * 0.7, cy), new Phaser.Math.Vector2(cx, cy + r), new Phaser.Math.Vector2(cx - r * 0.7, cy)];
      g.fillStyle(0xfff176, pulse).fillPoints(pts, true);
      g.lineStyle(big ? 2 : 1.5, 0xf57f17).strokePoints(pts, true);
    }
    const dot = (p: { x: number; y: number }, color: number, r: number) => {
      g.fillStyle(color).fillCircle(X(p.x), Y(p.y), r);
      g.lineStyle(big ? 3 : 1.5, 0xffffff).strokeCircle(X(p.x), Y(p.y), r);
    };
    for (const p of k.patrols) dot(p, 0xffa000, big ? 8 : 3.5);
    dot(k.target, 0xe53935, big ? 9 : 4);
    dot(k.player, 0xff4f8b, big ? 10 : 5);
    // 테두리
    g.lineStyle(3, COLORS.outline).strokeRoundedRect(m.x - 4, m.y - 4, w + 8, h + 8, 8);
  }
}
