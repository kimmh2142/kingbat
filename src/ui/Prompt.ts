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

  constructor(scene: Phaser.Scene) {
    this.bg = scene.add.graphics();
    this.text = scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: '15px', color: COLORS.text }).setOrigin(0.5);
    this.box = scene.add.container(0, 0, [this.bg, this.text]).setDepth(DEPTH.label + 5).setVisible(false).setScale(CAMERA.textScale);
  }

  show(x: number, y: number, message: string | null): void {
    this.box.setVisible(!!message);
    if (!message) return;
    this.box.setPosition(x, y);
    if (message === this.current) return;
    this.current = message;
    this.text.setText(message);
    const w = this.text.width + 18;
    const h = this.text.height + 8;
    this.bg.clear();
    this.bg.fillStyle(0xfff59d).fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    this.bg.lineStyle(2, COLORS.outline).strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
  }
}
