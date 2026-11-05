import Phaser from 'phaser';
import { COLORS, FONT } from '../config';
import { DEPTH } from '../systems/OfficeMap';
import { CAMERA } from '../data/tuning';

/** 플레이어 머리 위 행동 안내 ("Space 꾹 콕 찌르기") */
export class Prompt {
  private readonly box: Phaser.GameObjects.Container;
  private readonly text: Phaser.GameObjects.Text;
  private readonly bg: Phaser.GameObjects.Graphics;
  private current = '';
  private currentHot = false;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.bg = scene.add.graphics();
    this.text = scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: '15px', color: COLORS.text }).setOrigin(0.5);
    this.box = scene.add.container(0, 0, [this.bg, this.text]).setDepth(DEPTH.label + 5).setVisible(false).setScale(CAMERA.textScale);
  }

  /** @param hot 지금 바로 장난칠 수 있다는 안내 (초록 바탕) */
  show(x: number, y: number, message: string | null, hot = false): void {
    this.box.setVisible(!!message);
    if (!message) {
      this.current = '';
      return;
    }
    this.box.setPosition(x, y);
    if (message === this.current && hot === this.currentHot) return;
    this.current = message;
    this.currentHot = hot;
    this.text.setText(message);
    const w = this.text.width + 18;
    const h = this.text.height + 8;
    this.bg.clear();
    this.bg.fillStyle(hot ? 0xb9f6ca : 0xfff59d).fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    // 새 안내가 뜨면 통 튄다
    this.scene.tweens.killTweensOf(this.box);
    this.scene.tweens.add({ targets: this.box, scale: { from: CAMERA.textScale * 0.6, to: CAMERA.textScale }, duration: 220, ease: 'Back.Out' });
    this.bg.lineStyle(2, COLORS.outline).strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
  }
}
