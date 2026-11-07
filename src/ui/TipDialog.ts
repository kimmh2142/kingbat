import Phaser from 'phaser';
import { TEX } from '../assets/keys';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { TipDef } from '../data/tutorial';
import { DEPTH } from '../systems/OfficeMap';

/** 뜬 직후 이 시간(초)은 입력을 안 받는다 (콕 하던 Space에 바로 닫히지 않게) */
const INPUT_DELAY = 0.45;
const W = 620;
const H = 236;
/** 버튼 너비 (두 개가 창 안에 들어가게) */
const BTN_W = 196;

/**
 * 튜토리얼 안내창: 주인공 얼굴 + 제목 + 설명 + [알겠어!] [다시 안 보기].
 * 떠 있는 동안 게임은 멈춘다 (OfficeScene.paused). 화면은 어둡게 하되 HUD는 그 위에 남겨 가리킬 수 있게 한다.
 * focus(화면 좌표)를 주면 그 자리에 깜빡이는 원을 그린다.
 */
export class TipDialog {
  active = false;
  private t = 0;
  private readonly dim: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Container;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly okBtn: { root: Phaser.GameObjects.Container; label: Phaser.GameObjects.Text };
  private readonly offBtn: { root: Phaser.GameObjects.Container; label: Phaser.GameObjects.Text };
  private readonly ring: Phaser.GameObjects.Graphics;
  private onClose: ((off: boolean) => void) | null = null;
  /** 지금 떠 있는 안내 (확인용) */
  current: string | null = null;

  constructor(scene: Phaser.Scene) {
    this.dim = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x3b2a33, 0.5)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.label + 19)
      .setVisible(false);
    this.ring = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.label + 21).setVisible(false);
    scene.tweens.add({ targets: this.ring, alpha: 0.35, duration: 420, yoyo: true, repeat: -1 });

    const bg = scene.add.graphics();
    bg.fillStyle(COLORS.outline).fillRoundedRect(-W / 2, -H / 2 + 6, W, H, 22);
    bg.fillStyle(0xfffaf3).fillRoundedRect(-W / 2, -H / 2, W, H, 22);
    bg.lineStyle(4, COLORS.outline).strokeRoundedRect(-W / 2, -H / 2, W, H, 22);
    // 주인공 얼굴 (속마음)
    const faceBg = scene.add.circle(-W / 2 + 70, -H / 2 + 74, 50, 0xffd6e4).setStrokeStyle(4, COLORS.outline);
    const face = scene.add.image(-W / 2 + 70, -H / 2 + 112, TEX.playerHeadFront).setOrigin(0.5, 1).setScale(1.25);
    const me = scene.add.text(-W / 2 + 70, -H / 2 + 140, '나 (속마음)', { fontFamily: FONT, fontSize: '14px', color: '#8d6fb0' }).setOrigin(0.5);
    const tx = -W / 2 + 140;
    this.title = scene.add.text(tx, -H / 2 + 22, '', { fontFamily: FONT, fontSize: '25px', color: '#e0457b' });
    this.body = scene.add.text(tx, -H / 2 + 64, '', {
      fontFamily: FONT,
      fontSize: '17px',
      color: COLORS.text,
      lineSpacing: 7,
      wordWrap: { width: W - 160, useAdvancedWrap: true },
    });
    // 버튼은 글 영역(얼굴 오른쪽) 가운데에 두 개 나란히. 키는 버튼 글자에 같이 적는다 (모바일은 키 없이)
    const bx = (tx + W / 2) / 2;
    this.okBtn = this.button(scene, bx - BTN_W / 2 - 8, H / 2 - 34, BTN_W, 0xffd54f, () => this.close(false));
    this.offBtn = this.button(scene, bx + BTN_W / 2 + 8, H / 2 - 34, BTN_W, 0xffffff, () => this.close(true));
    this.panel = scene.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, [bg, faceBg, face, me, this.title, this.body, this.okBtn.root, this.offBtn.root])
      .setScrollFactor(0)
      .setDepth(DEPTH.label + 40)
      .setVisible(false);
  }

  /** @param focus 가리킬 화면 좌표 (없으면 null) */
  show(tip: TipDef, touch: boolean, focus: { x: number; y: number } | null, onClose: (off: boolean) => void): void {
    this.active = true;
    this.t = 0;
    this.onClose = onClose;
    this.title.setText(tip.title);
    this.body.setText(touch ? tip.touch : tip.pc);
    this.okBtn.label.setText(touch ? '알겠어!' : '알겠어! (Space)');
    this.offBtn.label.setText(touch ? '다시 안 보기' : '다시 안 보기 (N)');
    this.dim.setVisible(true);
    this.panel.setVisible(true).setScale(0.6).setAlpha(0);
    this.panel.scene.tweens.add({ targets: this.panel, scale: 1, alpha: 1, duration: 220, ease: 'Back.Out' });
    this.ring.clear().setVisible(!!focus);
    if (focus) {
      this.ring.lineStyle(6, 0xffeb3b).strokeCircle(focus.x, focus.y, 40);
      this.ring.lineStyle(3, 0xffffff).strokeCircle(focus.x, focus.y, 47);
    }
  }

  update(dt: number): void {
    if (this.active) this.t += dt;
  }

  /** 키 입력 (event.code). 처리했으면 true */
  onKey(code: string): boolean {
    if (!this.active || this.t < INPUT_DELAY) return false;
    if (code === 'Space' || code === 'Enter') this.close(false);
    else if (code === 'KeyN') this.close(true);
    else return false;
    return true;
  }

  private close(off: boolean): void {
    if (!this.active || this.t < INPUT_DELAY) return;
    this.active = false;
    this.current = null;
    this.dim.setVisible(false);
    this.panel.setVisible(false);
    this.ring.setVisible(false);
    const cb = this.onClose;
    this.onClose = null;
    cb?.(off);
  }

  private button(scene: Phaser.Scene, x: number, y: number, w: number, color: number, onTap: () => void): { root: Phaser.GameObjects.Container; label: Phaser.GameObjects.Text } {
    const h = 44;
    const bg = scene.add.graphics();
    bg.fillStyle(COLORS.outline).fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 22);
    bg.fillStyle(color).fillRoundedRect(-w / 2, -h / 2, w, h, 22);
    bg.lineStyle(3, COLORS.outline).strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
    const t = scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: '18px', color: COLORS.text }).setOrigin(0.5);
    const c = scene.add.container(x, y, [bg, t]).setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, onTap);
    return { root: c, label: t };
  }
}
