import Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { DEPTH } from '../systems/OfficeMap';

export type TouchButtonId = 'poke' | 'hide' | 'item';

interface ButtonDef {
  id: TouchButtonId;
  label: string;
  x: number;
  y: number;
  r: number;
  color: number;
}

const JOY_RADIUS = 56;
const JOY_DEADZONE = 0.18;
const BUTTONS: ButtonDef[] = [
  { id: 'poke', label: '콕', x: GAME_WIDTH - 86, y: GAME_HEIGHT - 86, r: 56, color: 0xffd54f },
  { id: 'hide', label: '숨기', x: GAME_WIDTH - 200, y: GAME_HEIGHT - 56, r: 40, color: 0x90caf9 },
  { id: 'item', label: '아이템', x: GAME_WIDTH - 66, y: GAME_HEIGHT - 196, r: 40, color: 0xf8bbd0 },
];

/**
 * 모바일 가로 모드 조작.
 * - 왼쪽 절반: 누른 자리에 조이스틱이 생긴다 (떼면 사라짐)
 * - 오른쪽 아래: 버튼. 여러 손가락을 동시에 쓸 수 있다.
 * 터치 기기에서만 보인다 (?touch=1 로 PC에서도 강제 표시).
 */
export class TouchControls {
  enabled: boolean;
  private readonly move = new Phaser.Math.Vector2();
  private joyPointer: number | null = null;
  private readonly joyBase: Phaser.GameObjects.Arc;
  private readonly joyKnob: Phaser.GameObjects.Arc;
  private readonly held = new Map<number, TouchButtonId>();
  private readonly views = new Map<TouchButtonId, Phaser.GameObjects.Container>();
  private readonly disabled = new Set<TouchButtonId>();
  /** 이번 프레임에 새로 누른 버튼 */
  private readonly pressed = new Set<TouchButtonId>();
  /** 누르면 바로 실행되는 영역 (아이템 칸 등). 조이스틱보다 먼저 본다 */
  private readonly zones: { x: number; y: number; w: number; h: number; onTap: () => void }[] = [];

  constructor(scene: Phaser.Scene) {
    const forced = new URLSearchParams(location.search).get('touch') === '1';
    this.enabled = forced || window.matchMedia('(pointer: coarse)').matches;

    const fixed = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T) =>
      o.setScrollFactor(0).setDepth(DEPTH.label + 40);

    this.joyBase = fixed(scene.add.circle(0, 0, JOY_RADIUS, 0xffffff, 0.25).setStrokeStyle(4, COLORS.outline, 0.5));
    this.joyKnob = fixed(scene.add.circle(0, 0, 26, 0xffffff, 0.85).setStrokeStyle(4, COLORS.outline));
    this.showJoystick(false);

    for (const b of BUTTONS) {
      const circle = scene.add.circle(0, 0, b.r, b.color, 0.9).setStrokeStyle(4, COLORS.outline);
      const text = scene.add
        .text(0, 0, b.label, { fontFamily: FONT, fontSize: b.r > 50 ? '28px' : '20px', color: COLORS.text })
        .setOrigin(0.5);
      this.views.set(b.id, fixed(scene.add.container(b.x, b.y, [circle, text])));
    }

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    const clearPressed = () => this.pressed.clear();
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, clearPressed);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.POST_UPDATE, clearPressed));
    this.refresh();
  }

  /** 조이스틱 방향 (길이 0~1). 안 쓰는 중이면 null */
  getMove(): Phaser.Math.Vector2 | null {
    return this.joyPointer === null ? null : this.move;
  }

  isDown(id: TouchButtonId): boolean {
    if (this.disabled.has(id)) return false;
    for (const b of this.held.values()) if (b === id) return true;
    return false;
  }

  /** 이번 프레임에 새로 눌렸는가 */
  justPressed(id: TouchButtonId): boolean {
    return this.pressed.has(id) && !this.disabled.has(id);
  }

  /** 화면 고정 좌표 영역을 누르면 onTap (마우스 클릭도 된다) */
  addTapZone(x: number, y: number, w: number, h: number, onTap: () => void): void {
    this.zones.push({ x, y, w, h, onTap });
  }

  /** 지금 쓸 수 없는 버튼은 흐리게 */
  setDisabled(id: TouchButtonId, off: boolean): void {
    if (off) this.disabled.add(id);
    else this.disabled.delete(id);
    this.refresh();
  }

  private onDown(p: Phaser.Input.Pointer): void {
    const zone = this.zones.find((z) => p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h);
    if (zone) {
      zone.onTap();
      return;
    }
    // 터치가 한 번이라도 들어오면 표시 (pointer: coarse를 못 잡는 기기 대비)
    if (p.wasTouch && !this.enabled) {
      this.enabled = true;
      this.refresh();
    }
    if (!this.enabled) return;

    const button = BUTTONS.find((b) => Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) <= b.r + 12);
    if (button) {
      this.held.set(p.id, button.id);
      this.pressed.add(button.id);
      this.refresh();
      return;
    }
    if (p.x < GAME_WIDTH / 2 && this.joyPointer === null) {
      this.joyPointer = p.id;
      this.joyBase.setPosition(p.x, p.y);
      this.joyKnob.setPosition(p.x, p.y);
      this.move.set(0, 0);
      this.showJoystick(true);
    }
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.joyPointer) return;
    const dx = p.x - this.joyBase.x;
    const dy = p.y - this.joyBase.y;
    const len = Math.hypot(dx, dy);
    const clamped = Math.min(len, JOY_RADIUS);
    const nx = len > 0 ? dx / len : 0;
    const ny = len > 0 ? dy / len : 0;
    this.joyKnob.setPosition(this.joyBase.x + nx * clamped, this.joyBase.y + ny * clamped);
    // 데드존 밖에서 0~1로 다시 맞춘다 (살짝 기울이면 천천히 걷기)
    const amount = Math.max(0, (clamped / JOY_RADIUS - JOY_DEADZONE) / (1 - JOY_DEADZONE));
    this.move.set(nx * amount, ny * amount);
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id === this.joyPointer) {
      this.joyPointer = null;
      this.move.set(0, 0);
      this.showJoystick(false);
    }
    if (this.held.delete(p.id)) this.refresh();
  }

  private showJoystick(on: boolean): void {
    this.joyBase.setVisible(on);
    this.joyKnob.setVisible(on);
  }

  private refresh(): void {
    for (const [id, view] of this.views) {
      view.setVisible(this.enabled);
      const pressed = this.isDown(id);
      view.setScale(pressed ? 0.9 : 1);
      view.setAlpha(this.disabled.has(id) ? 0.35 : pressed ? 1 : 0.85);
    }
  }
}
