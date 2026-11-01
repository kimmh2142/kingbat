import Phaser from 'phaser';
import { DEPTH } from '../systems/OfficeMap';

export interface ConeShape {
  x: number;
  y: number;
  dir: { x: number; y: number };
  range: number;
  halfAngleDeg: number;
  /** 방향과 상관없이 보이는 몸 주변 반경 */
  nearRadius: number;
}

/**
 * 바닥에 그리는 시야 부채꼴.
 * 공략 대상은 실제로 뒤돌아본 동안에만 보여준다 (전조 단계에서는 절대 그리지 않음).
 */
export class VisionCone {
  private readonly g: Phaser.GameObjects.Graphics;
  private alpha = 0;
  private last?: ConeShape;

  constructor(
    scene: Phaser.Scene,
    private readonly color = 0xe53935,
  ) {
    this.g = scene.add.graphics().setDepth(DEPTH.floor + 6);
  }

  /** shape가 null이면 서서히 사라진다 */
  update(dt: number, shape: ConeShape | null): void {
    if (shape) this.last = shape;
    // 켜질 땐 빠르게, 꺼질 땐 조금 남았다가 사라지게
    this.alpha = Phaser.Math.Linear(this.alpha, shape ? 1 : 0, Math.min(1, dt * (shape ? 18 : 8)));
    this.g.clear();
    if (this.alpha < 0.02 || !this.last) return;

    const s = this.last;
    const angle = Math.atan2(s.dir.y, s.dir.x);
    const half = Phaser.Math.DegToRad(s.halfAngleDeg);
    this.g.fillStyle(this.color, 0.22 * this.alpha);
    this.g.slice(s.x, s.y, s.range, angle - half, angle + half, false).fillPath();
    this.g.fillCircle(s.x, s.y, s.nearRadius);
    this.g.lineStyle(3, this.color, 0.6 * this.alpha);
    this.g.slice(s.x, s.y, s.range, angle - half, angle + half, false).strokePath();
  }
}
