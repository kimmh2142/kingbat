import Phaser from 'phaser';
import { TEX } from '../assets/keys';
import { COLORS, FONT, GAME_WIDTH } from '../config';
import { DEPTH } from '../systems/OfficeMap';
import type { Life } from '../systems/Life';
import type { Score } from '../systems/Score';
import type { WorkClock } from '../systems/WorkClock';

/** 특별 미션 칸 (상단 줄 바로 아래 왼쪽) */
const MISSION_Y = 58;

const BAR_W = 210;
const BAR_H = 18;
const CLOCK_X = 668;
/** 시계 바가 끝나는 x (하트 왼쪽) */
const CLOCK_BAR_END = 836;

/**
 * 상단 HUD 한 줄: 스테이지 · 킹받음 게이지(확정 + 임시 줄무늬) · 퇴근 시계 · 하트.
 * 일시정지 버튼은 이후 단계에서 붙인다.
 */
export class HUD {
  private readonly fill: Phaser.GameObjects.Graphics;
  private readonly temp: Phaser.GameObjects.TileSprite;
  private readonly value: Phaser.GameObjects.Text;
  private readonly barX: number;
  private readonly barY: number;
  private readonly hearts: Phaser.GameObjects.Image[] = [];
  private readonly clockText: Phaser.GameObjects.Text;
  private readonly clockBar: Phaser.GameObjects.Graphics;
  private readonly missionBg: Phaser.GameObjects.Graphics;
  private readonly missionText: Phaser.GameObjects.Text;
  private t = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly score: Score,
    life: Life,
    private readonly clock: WorkClock,
  ) {
    const fixed = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T) =>
      o.setScrollFactor(0).setDepth(DEPTH.label + 20);

    const bg = fixed(scene.add.graphics());
    bg.fillStyle(0xffffff, 0.92).fillRoundedRect(8, 6, GAME_WIDTH - 16, 36, 18);
    bg.lineStyle(3, COLORS.outline).strokeRoundedRect(8, 6, GAME_WIDTH - 16, 36, 18);

    fixed(scene.add.text(24, 24, clock.stage.label, { fontFamily: FONT, fontSize: '18px', color: COLORS.text }).setOrigin(0, 0.5));

    const label = fixed(scene.add.text(222, 24, '킹받음', { fontFamily: FONT, fontSize: '18px', color: '#e0457b' }).setOrigin(0, 0.5));
    this.barX = label.x + label.width + 10;
    this.barY = 24 - BAR_H / 2;

    const track = fixed(scene.add.graphics());
    track.fillStyle(0xf3e5ea).fillRoundedRect(this.barX, this.barY, BAR_W, BAR_H, 9);
    this.fill = fixed(scene.add.graphics());
    this.temp = fixed(scene.add.tileSprite(this.barX, this.barY, 1, BAR_H, TEX.stripe).setOrigin(0));
    const frame = fixed(scene.add.graphics());
    frame.lineStyle(3, COLORS.outline).strokeRoundedRect(this.barX, this.barY, BAR_W, BAR_H, 9);

    this.value = fixed(
      scene.add.text(this.barX + BAR_W + 8, 24, '', { fontFamily: FONT, fontSize: '15px', color: COLORS.text }).setOrigin(0, 0.5),
    );

    // 퇴근 시계: 시각 + 줄어드는 바
    this.clockText = fixed(
      scene.add.text(CLOCK_X, 24, '', { fontFamily: FONT, fontSize: '15px', color: COLORS.text }).setOrigin(0, 0.5),
    );
    this.clockBar = fixed(scene.add.graphics());

    for (let i = 0; i < life.max; i++) {
      const x = GAME_WIDTH - 36 - (life.max - 1 - i) * 32;
      this.hearts.push(fixed(scene.add.image(x, 24, i < life.hearts ? TEX.heartFull : TEX.heartEmpty)));
    }
    life.on('lose', (left: number) => this.breakHeart(left));

    score.on('change', () => this.refresh());
    this.refresh();

    const m = clock.stage.mission;
    this.missionBg = fixed(scene.add.graphics());
    this.missionText = fixed(
      scene.add.text(26, MISSION_Y, '', { fontFamily: FONT, fontSize: '15px', color: COLORS.text }).setOrigin(0, 0.5),
    );
    this.setMission(false, m.name, m.goal);
  }

  /** 미션 칸: 진행 중이면 할 일, 성공하면 체크 */
  setMission(done: boolean, name: string, goal: string): void {
    this.missionText.setText(done ? `✔ ${name} 성공!` : `★ ${name} · ${goal}`);
    this.missionText.setColor(done ? '#2e7d5b' : COLORS.text);
    const w = this.missionText.width + 28;
    this.missionBg.clear();
    this.missionBg.fillStyle(done ? 0xdff5e9 : 0xfff8d6, 0.95).fillRoundedRect(12, MISSION_Y - 13, w, 26, 13);
    this.missionBg.lineStyle(2, COLORS.outline).strokeRoundedRect(12, MISSION_Y - 13, w, 26, 13);
    if (done) {
      this.scene.tweens.add({ targets: [this.missionText], scale: { from: 1.25, to: 1 }, duration: 300, ease: 'Back.Out' });
    }
  }

  update(dt: number): void {
    this.t += dt;
    this.temp.tilePositionX -= dt * 20;
    this.updateClock();
  }

  private updateClock(): void {
    const c = this.clock;
    const urgent = c.urgent;
    if (this.clockText.text !== '⏰ ' + c.clockText) this.clockText.setText('⏰ ' + c.clockText);
    // 마지막 30초: 빨개지고 째깍째깍 흔들린다
    this.clockText.setColor(urgent ? '#e53935' : COLORS.text);
    this.clockText.setAngle(urgent ? Math.sin(this.t * 20) * 6 : 0);
    // 바는 시각 글자 바로 뒤부터 하트 앞까지 (글자 폭이 바뀌어도 겹치지 않게)
    const x = CLOCK_X + this.clockText.width + 6;
    const barW = Math.max(30, CLOCK_BAR_END - x);
    const y = 24 - 6;
    this.clockBar.clear();
    this.clockBar.fillStyle(0xf3e5ea).fillRoundedRect(x, y, barW, 12, 6);
    const w = barW * c.ratio;
    if (w > 1) this.clockBar.fillStyle(urgent ? 0xe53935 : 0x7986cb).fillRoundedRect(x, y, Math.max(w, 8), 12, 6);
    this.clockBar.lineStyle(2, COLORS.outline).strokeRoundedRect(x, y, barW, 12, 6);
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
