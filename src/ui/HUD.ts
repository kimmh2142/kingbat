import Phaser from 'phaser';
import { TEX } from '../assets/keys';
import { COLORS, FONT, GAME_WIDTH } from '../config';
import { DEPTH } from '../systems/OfficeMap';
import type { Life } from '../systems/Life';
import type { Score } from '../systems/Score';

const BAR_W = 300;
const BAR_H = 18;

/**
 * 상단 HUD: 스테이지 · 킹받음 게이지(확정 + 임시 줄무늬) · 하트.
 * 퇴근 시계·일시정지는 다음 단계에서 같은 줄에 붙인다.
 */
export class HUD {
  private readonly fill: Phaser.GameObjects.Graphics;
  private readonly temp: Phaser.GameObjects.TileSprite;
  private readonly value: Phaser.GameObjects.Text;
  private readonly barX: number;
  private readonly barY: number;
  private readonly hearts: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly score: Score,
    life: Life,
    stageLabel: string,
  ) {
    const fixed = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T) =>
      o.setScrollFactor(0).setDepth(DEPTH.label + 20);

    const bg = fixed(scene.add.graphics());
    bg.fillStyle(0xffffff, 0.92).fillRoundedRect(8, 6, GAME_WIDTH - 16, 36, 18);
    bg.lineStyle(3, COLORS.outline).strokeRoundedRect(8, 6, GAME_WIDTH - 16, 36, 18);

    fixed(scene.add.text(24, 24, stageLabel, { fontFamily: FONT, fontSize: '18px', color: COLORS.text }).setOrigin(0, 0.5));

    const label = fixed(scene.add.text(300, 24, '킹받음', { fontFamily: FONT, fontSize: '18px', color: '#e0457b' }).setOrigin(0, 0.5));
    this.barX = label.x + label.width + 10;
    this.barY = 24 - BAR_H / 2;

    const track = fixed(scene.add.graphics());
    track.fillStyle(0xf3e5ea).fillRoundedRect(this.barX, this.barY, BAR_W, BAR_H, 9);
    this.fill = fixed(scene.add.graphics());
    this.temp = fixed(scene.add.tileSprite(this.barX, this.barY, 1, BAR_H, TEX.stripe).setOrigin(0));
    const frame = fixed(scene.add.graphics());
    frame.lineStyle(3, COLORS.outline).strokeRoundedRect(this.barX, this.barY, BAR_W, BAR_H, 9);

    this.value = fixed(
      scene.add.text(this.barX + BAR_W + 10, 24, '', { fontFamily: FONT, fontSize: '16px', color: COLORS.text }).setOrigin(0, 0.5),
    );

    for (let i = 0; i < life.max; i++) {
      const x = GAME_WIDTH - 36 - (life.max - 1 - i) * 32;
      this.hearts.push(fixed(scene.add.image(x, 24, i < life.hearts ? TEX.heartFull : TEX.heartEmpty)));
    }
    life.on('lose', (left: number) => this.breakHeart(left));

    score.on('change', () => this.refresh());
    this.refresh();
  }

  update(dt: number): void {
    this.temp.tilePositionX -= dt * 20;
  }

  /** 하트 하나가 크게 튀었다가 깨진다 */
  private breakHeart(index: number): void {
    const h = this.hearts[index];
    if (!h) return;
    h.setDepth(DEPTH.label + 45); // 컷인 어둡게 깔린 화면 위로
    this.scene.tweens.add({
      targets: h,
      scale: 2.2,
      angle: { from: -15, to: 15 },
      duration: 160,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        h.setTexture(TEX.heartEmpty).setScale(1).setAngle(0).setDepth(DEPTH.label + 20);
        for (let i = 0; i < 6; i++) {
          const piece = this.scene.add
            .image(h.x, h.y, TEX.heartFull)
            .setScale(0.3)
            .setScrollFactor(0)
            .setDepth(DEPTH.label + 45);
          this.scene.tweens.add({
            targets: piece,
            x: h.x + Phaser.Math.Between(-40, 40),
            y: h.y + Phaser.Math.Between(10, 60),
            angle: Phaser.Math.Between(-180, 180),
            alpha: 0,
            duration: 500,
            onComplete: () => piece.destroy(),
          });
        }
      },
    });
  }

  private refresh(): void {
    const s = this.score;
    const cw = (s.confirmed / s.goal) * BAR_W;
    const tw = (Math.min(s.temp, s.goal - s.confirmed) / s.goal) * BAR_W;
    this.fill.clear();
    if (cw > 0) this.fill.fillStyle(0xf06292).fillRoundedRect(this.barX, this.barY, Math.max(cw, 10), BAR_H, 9);
    this.temp.setPosition(this.barX + cw, this.barY).setVisible(tw >= 1);
    this.temp.width = Math.max(1, tw);
    const tempText = s.temp > 0 ? ` + 임시 ${Math.floor(s.temp)}` : '';
    this.value.setText(`${Math.floor(s.confirmed)}${tempText} / ${s.goal}`);
  }
}
