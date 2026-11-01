import Phaser from 'phaser';
import { FONT } from '../config';
import { DEPTH } from '../systems/OfficeMap';

/** 맵 위에 튀어 오르는 의성어 ("콕!") */
export function popWord(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  opts: { color?: string; size?: number } = {},
): void {
  const t = scene.add
    .text(x + Phaser.Math.Between(-14, 14), y + Phaser.Math.Between(-8, 8), text, {
      fontFamily: FONT,
      fontSize: `${opts.size ?? 26}px`,
      color: opts.color ?? '#ff4f8b',
      stroke: '#ffffff',
      strokeThickness: 6,
    })
    .setOrigin(0.5)
    .setDepth(DEPTH.label + 10)
    .setAngle(Phaser.Math.Between(-15, 15))
    .setScale(0.4);
  scene.tweens.add({ targets: t, scale: 1, duration: 90, ease: 'Back.Out' });
  scene.tweens.add({ targets: t, y: t.y - 30, alpha: 0, delay: 220, duration: 380, onComplete: () => t.destroy() });
}
