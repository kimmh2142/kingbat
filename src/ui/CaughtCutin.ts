import Phaser from 'phaser';
import { TEX } from '../assets/keys';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { CAUGHT_REASONS, type CaughtReasonId } from '../data/caughtReasons';
import { CAMERA, CAUGHT } from '../data/tuning';
import { DEPTH } from '../systems/OfficeMap';

interface Point {
  x: number;
  y: number;
}

export interface CutinOptions {
  reason: CaughtReasonId;
  /** 원인 지점 (돌아본 사람 머리 등) — 카메라가 비추고 화살표가 가리킨다 */
  cause: Point;
  /** 끝나고 카메라가 돌아갈 대상 */
  follow: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject;
  /** 하트가 깨지는 순간 */
  onHit: () => void;
  /** 다 끝났을 때 */
  onDone: () => void;
}

/**
 * 들킴 원인 컷인 (단간론파 스타일).
 * 화면 정지 → 원인 지점으로 카메라 → 화살표 → 유리 깨지듯 원인 문구 → 하트 깨짐 → 한 줄 팁.
 * skipAfter초 뒤부터는 Space·터치로 넘길 수 있다.
 */
export class CaughtCutin {
  active = false;
  private elapsed = 0;
  private opts?: CutinOptions;
  private readonly parts: Phaser.GameObjects.GameObject[] = [];
  private readonly timers: Phaser.Time.TimerEvent[] = [];
  private hitDone = false;
  private ending = false;

  constructor(private readonly scene: Phaser.Scene) {}

  get canSkip(): boolean {
    return this.active && !this.ending && this.elapsed >= CAUGHT.skipAfter;
  }

  play(opts: CutinOptions): void {
    this.active = true;
    this.ending = false;
    this.hitDone = false;
    this.elapsed = 0;
    this.opts = opts;
    const s = this.scene;
    const cam = s.cameras.main;
    const reason = CAUGHT_REASONS[opts.reason];

    // 1) 화면이 멈추고 어두워진다. 카메라가 원인 지점으로
    cam.stopFollow();
    cam.pan(opts.cause.x, opts.cause.y + 40, 280, 'Sine.easeOut');
    cam.shake(160, 0.008);
    const dim = this.fixed(s.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x2a1d24, 0).setOrigin(0), DEPTH.label + 15);
    s.tweens.add({ targets: dim, fillAlpha: 0.45, duration: 150 });

    // 2) 원인 지점을 가리키는 화살표 (월드 좌표, 통통 튄다)
    this.later(0.22, () => {
      const arrow = s.add
        .image(opts.cause.x, opts.cause.y - 70, TEX.cutinArrow)
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.label + 16)
        .setScale(0.2);
      this.parts.push(arrow);
      s.tweens.add({ targets: arrow, scale: 1, duration: 180, ease: 'Back.Out' });
      s.tweens.add({ targets: arrow, y: arrow.y - 14, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 180 });
    });

    // 3) 유리가 깨지듯 원인 문구가 튀어나온다
    this.later(0.36, () => this.shatter(reason.text));

    // 4) 하트가 깨진다
    this.later(0.75, () => this.hit());

    // 5) 한 줄 팁
    this.later(0.95, () => {
      const tip = this.fixed(
        s.add
          .text(GAME_WIDTH / 2, GAME_HEIGHT - 42, `TIP  ${reason.tip}`, {
            fontFamily: FONT,
            fontSize: '22px',
            color: COLORS.text,
            backgroundColor: '#fff59d',
            padding: { x: 16, y: 8 },
          })
          .setOrigin(0.5),
        DEPTH.label + 32,
      );
      tip.y += 40;
      tip.alpha = 0;
      s.tweens.add({ targets: tip, y: tip.y - 40, alpha: 1, duration: 220, ease: 'Back.Out' });
    });

    this.later(CAUGHT.cutinSeconds, () => this.finish());
  }

  update(dt: number, skipPressed: boolean): void {
    if (!this.active) return;
    this.elapsed += dt;
    if (skipPressed && this.canSkip) this.finish();
  }

  private hit(): void {
    if (this.hitDone) return;
    this.hitDone = true;
    this.opts?.onHit();
  }

  private finish(): void {
    if (this.ending || !this.opts) return;
    this.ending = true;
    this.hit(); // 넘겨도 하트는 깎인다
    this.timers.forEach((t) => t.remove(false));
    this.timers.length = 0;
    const s = this.scene;
    const cam = s.cameras.main;
    const opts = this.opts;
    s.tweens.add({ targets: this.parts, alpha: 0, duration: 180 });
    cam.pan(opts.follow.x, opts.follow.y - 40, 220, 'Sine.easeInOut', false, (_c, progress) => {
      if (progress < 1) return;
      this.parts.forEach((p) => p.destroy());
      this.parts.length = 0;
      cam.startFollow(opts.follow, true, CAMERA.lerp, CAMERA.lerp, 0, 40);
      this.active = false;
      opts.onDone();
    });
  }

  /** 유리 깨지는 효과 + 원인 문구 */
  private shatter(text: string): void {
    const s = this.scene;
    const cx = GAME_WIDTH / 2;
    // 원인 지점(화면 가운데 위쪽)을 가리지 않게 문구는 아래쪽에
    const cy = GAME_HEIGHT / 2 + 95;

    const flash = this.fixed(s.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0.85).setOrigin(0), DEPTH.label + 29);
    s.tweens.add({ targets: flash, fillAlpha: 0, duration: 200 });

    // 금 간 선
    const crack = this.fixed(s.add.graphics(), DEPTH.label + 30);
    crack.lineStyle(3, 0xffffff, 0.9);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2);
      let x = cx;
      let y = cy;
      crack.beginPath().moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        const len = Phaser.Math.Between(40, 90);
        const ja = a + Phaser.Math.FloatBetween(-0.35, 0.35);
        x += Math.cos(ja) * len;
        y += Math.sin(ja) * len;
        crack.lineTo(x, y);
      }
      crack.strokePath();
    }
    s.tweens.add({ targets: crack, alpha: 0, delay: 250, duration: 400 });

    // 파편
    for (let i = 0; i < 14; i++) {
      const g = this.fixed(s.add.graphics(), DEPTH.label + 31);
      const r = Phaser.Math.Between(10, 26);
      g.fillStyle(0xffffff, 0.9).fillTriangle(0, -r, r * 0.8, r * 0.6, -r * 0.7, r * 0.5);
      g.lineStyle(2, 0xbfe3f5).strokeTriangle(0, -r, r * 0.8, r * 0.6, -r * 0.7, r * 0.5);
      g.setPosition(cx, cy);
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const d = Phaser.Math.Between(180, 420);
      s.tweens.add({
        targets: g,
        x: cx + Math.cos(a) * d,
        y: cy + Math.sin(a) * d,
        angle: Phaser.Math.Between(-360, 360),
        alpha: 0,
        duration: 650,
        ease: 'Quad.Out',
      });
    }

    // 원인 문구: 들쭉날쭉한 판 위에 큼직하게
    const title = s.add
      .text(0, 0, text, { fontFamily: FONT, fontSize: '58px', color: '#ffffff', stroke: '#e0457b', strokeThickness: 12 })
      .setOrigin(0.5);
    const w = title.width + 70;
    const h = title.height + 40;
    const plate = s.add.graphics();
    const pts: Phaser.Types.Math.Vector2Like[] = [];
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = i % 2 ? 0.86 : 1.06;
      pts.push({ x: (Math.cos(a) * w * k) / 2, y: (Math.sin(a) * h * k) / 2 });
    }
    plate.fillStyle(0x3b2a33, 0.92).fillPoints(pts, true);
    plate.lineStyle(5, 0xffffff).strokePoints(pts, true);
    const box = this.fixed(s.add.container(cx, cy, [plate, title]), DEPTH.label + 32);
    box.setScale(2.4).setAngle(-8).setAlpha(0);
    s.tweens.add({ targets: box, scale: 1, alpha: 1, angle: -4, duration: 200, ease: 'Back.Out' });
  }

  private fixed<T extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(
    o: T,
    depth: number,
  ): T {
    o.setScrollFactor(0).setDepth(depth);
    this.parts.push(o);
    return o;
  }

  private later(seconds: number, fn: () => void): void {
    this.timers.push(this.scene.time.delayedCall(seconds * 1000, fn));
  }
}
