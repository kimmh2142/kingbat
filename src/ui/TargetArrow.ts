import Phaser from 'phaser';
import { TEX, type TextureKey } from '../assets/keys';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { TARGET_ARROW } from '../data/tuning';
import { DEPTH } from '../systems/OfficeMap';

/**
 * 공략 대상이 화면 밖에 있을 때 화면 가장자리에서 그쪽을 가리키는 표시 (타깃 아이콘 + 화살표).
 * 화면 안에 들어오면 사라진다. 거리는 보여주지 않는다.
 * 첫 아이템 안내에도 쓴다 (노란 화살표 + 아이템 아이콘).
 */
export class TargetArrow {
  private readonly root: Phaser.GameObjects.Container;
  private readonly arrow: Phaser.GameObjects.Graphics;
  private readonly icon: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, opts: { color?: number; icon?: TextureKey } = {}) {
    this.arrow = scene.add.graphics();
    this.arrow.fillStyle(opts.color ?? 0xe53935).lineStyle(3, COLORS.outline);
    this.arrow.beginPath();
    this.arrow.moveTo(34, 0);
    this.arrow.lineTo(20, -10);
    this.arrow.lineTo(20, 10);
    this.arrow.closePath();
    this.arrow.fillPath().strokePath();
    const bg = scene.add.circle(0, 0, 18, 0xffffff, 0.92).setStrokeStyle(3, COLORS.outline);
    this.icon = scene.add.image(0, 0, opts.icon ?? TEX.targetIcon);
    this.root = scene.add.container(0, 0, [this.arrow, bg, this.icon]).setScrollFactor(0).setDepth(DEPTH.label + 15).setVisible(false);
    scene.tweens.add({ targets: this.root, scale: 1.12, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  setIcon(key: TextureKey): void {
    if (this.icon.texture.key !== key) this.icon.setTexture(key);
  }

  /** 대상 위치(월드)를 넣으면 화면 밖일 때만 보인다. null이면 숨긴다 */
  update(cam: Phaser.Cameras.Scene2D.Camera, target: { x: number; y: number } | null): void {
    if (!target) {
      this.root.setVisible(false);
      return;
    }
    const v = cam.worldView;
    // 몸통 가운데 기준
    const sx = target.x - v.x;
    const sy = target.y - 50 - v.y;
    const { marginX, marginTop, marginBottom } = TARGET_ARROW;
    const left = marginX;
    const right = GAME_WIDTH - marginX;
    const top = marginTop;
    const bottom = GAME_HEIGHT - marginBottom;
    if (sx >= 0 && sx <= GAME_WIDTH && sy >= 0 && sy <= GAME_HEIGHT) {
      this.root.setVisible(false);
      return;
    }
    // 화면 가운데에서 대상 쪽으로 그은 선이 안쪽 사각형과 만나는 곳에 둔다
    const cx = GAME_WIDTH / 2;
    const cy = (top + bottom) / 2;
    const dx = sx - cx;
    const dy = sy - cy;
    const kx = dx !== 0 ? (dx > 0 ? right - cx : left - cx) / dx : Infinity;
    const ky = dy !== 0 ? (dy > 0 ? bottom - cy : top - cy) / dy : Infinity;
    const k = Math.min(kx, ky);
    this.root.setPosition(cx + dx * k, cy + dy * k).setVisible(true);
    this.arrow.setRotation(Math.atan2(dy, dx));
  }
}
