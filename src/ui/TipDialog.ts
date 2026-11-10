import Phaser from 'phaser';
import { TEX } from '../assets/keys';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { TipDef } from '../data/tutorial';
import { DEPTH } from '../systems/OfficeMap';

/** 뜬 직후 이 시간(초)은 입력을 안 받는다 (콕 하던 Space에 바로 닫히지 않게) */
const INPUT_DELAY = 0.45;
/** 어두운 바탕 (정전 막과 같은 색, 더 진하게) */
const DARK = { color: 0x0b0820, alpha: 0.78 };
/** 글 묶음 최대 폭 */
const TEXT_W = 560;
const SOFT_KEY = 'tip_spot_soft';
const SOFT_SIZE = 256;

/** 밝게 비출 곳 (화면 좌표). 원(r) 또는 둥근 사각형(w·h) */
export type TipSpot = { x: number; y: number; r: number } | { x: number; y: number; w: number; h: number };

/**
 * 튜토리얼 안내 (스포트라이트): 화면 전체를 어둡게 하고 비출 곳만 동그랗게 밝힌 뒤,
 * 그 옆 어두운 바탕에 주인공 속마음 글을 바로 띄운다 (상자 없음). 11/10 팀원 피드백.
 * 떠 있는 동안 게임은 멈춘다 (OfficeScene.paused).
 * 비출 곳은 매 프레임 spot()으로 다시 받아서, 움직이는 대상·카메라 이동을 따라간다.
 * 닫기: Space·Enter·화면 누르기 / 다시 안 보기: N·[다시 안 보기] 버튼
 */
export class TipDialog {
  active = false;
  private t = 0;
  private readonly dark: Phaser.GameObjects.RenderTexture;
  private readonly brush: Phaser.GameObjects.Image;
  private readonly rectBrush: Phaser.GameObjects.Graphics;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly block: Phaser.GameObjects.Container;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly offBtn: Phaser.GameObjects.Text;
  private spot: (() => TipSpot | null) | null = null;
  private onClose: ((off: boolean) => void) | null = null;
  /** 지금 떠 있는 안내 (확인용) */
  current: string | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    if (!scene.textures.exists(SOFT_KEY)) {
      // 가운데는 완전히, 가장자리로 갈수록 덜 지우는 둥근 붓 (부드러운 테두리)
      const c = scene.textures.createCanvas(SOFT_KEY, SOFT_SIZE, SOFT_SIZE)!;
      const ctx = c.getContext();
      const h = SOFT_SIZE / 2;
      const g = ctx.createRadialGradient(h, h, 0, h, h, h);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.72, 'rgba(255,255,255,1)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, SOFT_SIZE, SOFT_SIZE);
      c.refresh();
    }
    const depth = DEPTH.label + 38;
    this.dark = scene.add.renderTexture(0, 0, GAME_WIDTH, GAME_HEIGHT).setOrigin(0).setScrollFactor(0).setDepth(depth).setVisible(false);
    this.brush = scene.make.image({ key: SOFT_KEY, add: false });
    this.rectBrush = scene.make.graphics({}, false);
    this.ring = scene.add.graphics().setScrollFactor(0).setDepth(depth + 1).setVisible(false);

    // 글 묶음: [얼굴] 제목 / 설명
    const faceBg = scene.add.circle(0, 0, 26, 0xffd6e4).setStrokeStyle(3, 0xffffff);
    const face = scene.add.image(0, 20, TEX.playerHeadFront).setOrigin(0.5, 1).setScale(0.62);
    const faceBox = scene.add.container(-TEXT_W / 2 + 26, 4, [faceBg, face]);
    this.title = scene.add.text(-TEXT_W / 2 + 64, 4, '', { fontFamily: FONT, fontSize: '26px', color: '#ffeb3b', stroke: '#0b0820', strokeThickness: 6 }).setOrigin(0, 0.5);
    this.body = scene.add.text(-TEXT_W / 2 + 4, 40, '', {
      fontFamily: FONT,
      fontSize: '19px',
      color: '#ffffff',
      stroke: '#0b0820',
      strokeThickness: 5,
      lineSpacing: 8,
      wordWrap: { width: TEXT_W - 8, useAdvancedWrap: true },
    });
    this.block = scene.add.container(0, 0, [faceBox, this.title, this.body]).setScrollFactor(0).setDepth(depth + 2).setVisible(false);

    this.hint = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 18, '', { fontFamily: FONT, fontSize: '16px', color: '#d1c4e9', stroke: '#0b0820', strokeThickness: 4 })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(depth + 2)
      .setVisible(false);
    this.offBtn = scene.add
      .text(GAME_WIDTH - 16, 56, '다시 안 보기', { fontFamily: FONT, fontSize: '17px', color: '#ffffff', backgroundColor: '#5a4a66', padding: { x: 12, y: 7 } })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(depth + 2)
      .setVisible(false);
    scene.tweens.add({ targets: this.ring, alpha: 0.35, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // 화면 아무 데나 누르면 계속, [다시 안 보기] 위면 끄기
    scene.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
      if (!this.active) return;
      this.close(this.offBtn.getBounds().contains(p.x, p.y));
    });
  }

  /**
   * @param spot 비출 곳(화면 좌표)을 매 프레임 돌려주는 함수. null이면 비출 곳 없이 가운데에 글만
   */
  show(tip: TipDef, touch: boolean, spot: (() => TipSpot | null) | null, onClose: (off: boolean) => void): void {
    this.active = true;
    this.t = 0;
    this.spot = spot;
    this.onClose = onClose;
    this.title.setText(tip.title);
    this.body.setText(touch ? tip.touch : tip.pc);
    this.hint.setText(touch ? '화면을 누르면 계속' : 'Space · 화면 누르기: 계속     N: 다시 안 보기');
    this.offBtn.setText(touch ? '다시 안 보기' : '다시 안 보기 (N)');
    for (const o of [this.dark, this.block, this.hint, this.offBtn]) o.setVisible(true);
    this.dark.setAlpha(0);
    this.scene.tweens.add({ targets: this.dark, alpha: 1, duration: 220 });
    this.block.setAlpha(0);
    this.scene.tweens.add({ targets: this.block, alpha: 1, duration: 260, delay: 120 });
    this.draw();
  }

  update(dt: number): void {
    if (!this.active) return;
    this.t += dt;
    this.draw();
  }

  /** 키 입력 (event.code). 처리했으면 true */
  onKey(code: string): boolean {
    if (!this.active || this.t < INPUT_DELAY) return false;
    if (code === 'Space' || code === 'Enter') this.close(false);
    else if (code === 'KeyN') this.close(true);
    else return false;
    return true;
  }

  /** 어두운 막에 구멍을 뚫고, 테두리를 그리고, 글을 구멍 옆 빈 곳에 둔다 */
  private draw(): void {
    const s = this.spot?.() ?? null;
    this.dark.clear().fill(DARK.color, DARK.alpha);
    this.ring.clear().setVisible(!!s);
    let top = 0;
    let bottom = 0;
    if (s && 'r' in s) {
      this.brush.setScale((s.r * 2) / SOFT_SIZE / 0.86).setPosition(s.x, s.y);
      this.dark.erase(this.brush);
      this.ring.lineStyle(5, 0xffeb3b).strokeCircle(s.x, s.y, s.r);
      top = s.y - s.r;
      bottom = s.y + s.r;
    } else if (s) {
      const pad = 10;
      this.rectBrush.clear().fillStyle(0xffffff).fillRoundedRect(s.x - s.w / 2 - pad, s.y - s.h / 2 - pad, s.w + pad * 2, s.h + pad * 2, 14);
      this.dark.erase(this.rectBrush);
      this.ring.lineStyle(5, 0xffeb3b).strokeRoundedRect(s.x - s.w / 2 - pad, s.y - s.h / 2 - pad, s.w + pad * 2, s.h + pad * 2, 14);
      top = s.y - s.h / 2 - pad;
      bottom = s.y + s.h / 2 + pad;
    }
    // 글 묶음: 구멍이 위쪽이면 아래에, 아래쪽이면 위에. 비출 곳이 없으면 가운데
    const h = 44 + this.body.height;
    const x = Phaser.Math.Clamp(s ? s.x : GAME_WIDTH / 2, TEXT_W / 2 + 20, GAME_WIDTH - TEXT_W / 2 - 20);
    let y: number;
    if (!s) y = (GAME_HEIGHT - h) / 2;
    else if ((top + bottom) / 2 < GAME_HEIGHT / 2) y = bottom + 24;
    else y = top - 24 - h;
    y = Phaser.Math.Clamp(y, 64, GAME_HEIGHT - 48 - h);
    this.block.setPosition(x, y + 18);
  }

  private close(off: boolean): void {
    if (!this.active || this.t < INPUT_DELAY) return;
    this.active = false;
    this.current = null;
    this.spot = null;
    for (const o of [this.dark, this.block, this.hint, this.offBtn, this.ring]) o.setVisible(false);
    const cb = this.onClose;
    this.onClose = null;
    cb?.(off);
  }
}
