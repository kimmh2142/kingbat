import Phaser from 'phaser';
import { TEX } from '../assets/keys';
import { FONT, GAME_WIDTH } from '../config';
import { INTRO } from '../data/tuning';
import type { TargetController } from '../npc/TargetController';
import { DEPTH } from '../systems/OfficeMap';

/**
 * 스테이지 시작 타깃 소개: 카메라가 공략 대상으로 이동 → "오늘의 타깃" → 내 자리로 돌아온다.
 * 이 동안 게임(퇴근 시계 포함)은 멈춘다. Space·터치로 넘길 수 있다.
 * 하트 0개로 다시 시작할 때는 생략한다 (도입 컷신 생략 규칙).
 */
export class TargetIntro {
  active = true;
  private readonly banner: Phaser.GameObjects.Container;
  private readonly timers: Phaser.Time.TimerEvent[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    target: TargetController,
    private readonly backTo: () => { x: number; y: number },
    private readonly onDone: () => void,
  ) {
    const cam = scene.cameras.main;
    cam.stopFollow();

    const title = scene.add
      .text(0, -22, '오늘의 타깃!', { fontFamily: FONT, fontSize: '22px', color: '#ffffff', stroke: '#5a3a4a', strokeThickness: 6 })
      .setOrigin(0.5);
    const name = scene.add
      .text(16, 14, target.pattern.name, { fontFamily: FONT, fontSize: '40px', color: '#ff3d6e', stroke: '#ffffff', strokeThickness: 8 })
      .setOrigin(0.5);
    const icon = scene.add.image(name.x - name.width / 2 - 20, 14, TEX.targetIcon).setScale(1.4);
    this.banner = scene.add
      .container(GAME_WIDTH / 2, 120, [title, icon, name])
      .setScrollFactor(0)
      .setDepth(DEPTH.label + 45)
      .setVisible(false);

    const ms = (s: number) => s * 1000;
    this.later(INTRO.delay, () => {
      cam.pan(target.x, target.y - 40, ms(INTRO.panTo), 'Sine.easeInOut', false, (_c, p) => {
        if (p < 1 || !this.active) return;
        this.showBanner();
        target.view.jolt();
        this.later(INTRO.hold, () => {
          this.banner.setVisible(false);
          const b = this.backTo();
          cam.pan(b.x, b.y, ms(INTRO.panBack), 'Sine.easeInOut', false, (_c2, p2) => {
            if (p2 >= 1) this.finish();
          });
        });
      });
    });
  }

  /** Space·터치로 넘기기 */
  skip(): void {
    if (!this.active) return;
    this.scene.cameras.main.panEffect.reset();
    this.finish();
  }

  private showBanner(): void {
    this.banner.setVisible(true).setScale(0.3);
    this.scene.tweens.add({ targets: this.banner, scale: 1, duration: 260, ease: 'Back.Out' });
  }

  private later(seconds: number, fn: () => void): void {
    this.timers.push(this.scene.time.delayedCall(seconds * 1000, fn));
  }

  private finish(): void {
    if (!this.active) return;
    this.active = false;
    for (const t of this.timers) t.remove();
    this.banner.destroy();
    this.onDone();
  }
}
