import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { DEPTH } from '../systems/OfficeMap';

/** 아이템 칸 바로 위에 잠깐 뜨는 안내 한 줄 (첫 아이템, 처음 주운 아이템 사용법) */
export class GuideToast {
  private readonly text: Phaser.GameObjects.Text;
  private tween?: Phaser.Tweens.Tween;

  constructor(private readonly scene: Phaser.Scene) {
    this.text = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 92, '', {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#5a3a4a',
        backgroundColor: '#fff8d6',
        padding: { x: 14, y: 6 },
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(DEPTH.label + 30)
      .setVisible(false);
  }

  get message(): string {
    return this.text.visible ? this.text.text : '';
  }

  hide(): void {
    this.tween?.remove();
    this.text.setVisible(false);
  }

  show(message: string, seconds = 3.5): void {
    this.tween?.remove();
    this.text.setText(message).setVisible(true).setAlpha(1).setScale(0.6);
    this.scene.tweens.add({ targets: this.text, scale: 1, duration: 200, ease: 'Back.Out' });
    this.tween = this.scene.tweens.add({
      targets: this.text,
      alpha: 0,
      delay: seconds * 1000,
      duration: 400,
      onComplete: () => this.text.setVisible(false),
    });
  }
}
