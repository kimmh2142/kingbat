import Phaser from 'phaser';
import { TEX } from '../assets/keys';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';

/** STAGE 1 클리어 뒤 "다음 스테이지": 아직 만드는 중이라 STAGE 2 예고만 보여 주고 타이틀로 */
const INPUT_DELAY = 0.8;

export class ComingSoonScene extends Phaser.Scene {
  private t = 0;

  constructor() {
    super('ComingSoon');
  }

  create(): void {
    this.t = 0;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xffd6e4).setOrigin(0);
    // 뒤에서 도는 햇살
    const rays = this.add.graphics({ x: 300, y: 300 });
    rays.fillStyle(0xffffff, 0.45);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rays.slice(0, 0, 900, a, a + Math.PI / 24, false).fillPath();
    }
    this.tweens.add({ targets: rays, angle: 360, duration: 30000, repeat: -1 });

    // 왼쪽: 정체를 숨긴 과장 실루엣 + 통화 말풍선
    const boss = this.add.container(300, 420, [
      this.add.image(0, 0, TEX.shadow).setScale(1.4),
      this.add.image(0, 2, TEX.daeriBody).setOrigin(0.5, 1),
      this.add.image(0, -26, TEX.daeriHeadFront).setOrigin(0.5, 1),
    ]);
    boss.setScale(2.4).iterate((o: Phaser.GameObjects.Image) => o.setTint(0x3b2a33));
    this.tweens.add({ targets: boss, x: 330, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.add.text(300, 250, '?', { fontFamily: FONT, fontSize: '72px', color: '#ffffff', stroke: COLORS.text, strokeThickness: 8 }).setOrigin(0.5);
    const bubble = this.add
      .text(300, 140, '네~ 사장님~ 📞', { fontFamily: FONT, fontSize: '24px', color: COLORS.text, backgroundColor: '#ffffff', padding: { x: 14, y: 8 } })
      .setOrigin(0.5);
    this.tweens.add({ targets: bubble, y: 132, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // 오른쪽: 예고 글
    const rx = 660;
    const stamp = this.add
      .text(rx, 80, 'NEXT STAGE', { fontFamily: FONT, fontSize: '54px', color: '#ff3d6e', stroke: '#ffffff', strokeThickness: 10 })
      .setOrigin(0.5)
      .setAngle(-5)
      .setScale(2.4)
      .setAlpha(0);
    this.tweens.add({ targets: stamp, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' });
    const text = (y: number, s: string, size: number, color: string = COLORS.text) =>
      this.add.text(rx, y, s, { fontFamily: FONT, fontSize: `${size}px`, color, align: 'center' }).setOrigin(0.5);
    text(150, 'STAGE 2 · 과장 박통화', 32);
    text(190, '"퇴근 5분 전에 이것만!"', 22, '#8d6fb0');
    text(262, ['🔓 7층 관리자 구역 개방', '📞 통화하며 돌아다니는 과장', '👀 순찰하는 차장 · 💢 부장 폭발', '📄 특별 미션: 전 직원 칼퇴 승인서'].join('\n'), 19).setLineSpacing(6);
    const soon = text(364, 'COMING SOON', 40, '#ffffff').setStroke('#ff4f8b', 8);
    this.tweens.add({ targets: soon, scale: 1.08, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    text(410, '최종 버전에서 만나요!', 20);
    text(GAME_HEIGHT - 40, this.sys.game.device.input.touch ? '화면을 누르면 타이틀로' : 'Space / Enter / Esc: 타이틀로', 16, '#8d6fb0');

    const go = () => this.t >= INPUT_DELAY && this.scene.start('Title');
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => ['Space', 'Enter', 'Escape'].includes(e.code) && go());
    this.input.on(Phaser.Input.Events.POINTER_UP, go);
    window.__kingbatComingSoon = true;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => (window.__kingbatComingSoon = undefined));
  }

  update(_time: number, delta: number): void {
    this.t += delta / 1000;
  }
}
