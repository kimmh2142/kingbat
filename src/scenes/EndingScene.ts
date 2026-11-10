import Phaser from 'phaser';
import { TEX } from '../assets/keys';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { CAUGHT_REASONS, type CaughtReasonId } from '../data/caughtReasons';
import { RunStats } from '../systems/RunStats';

/** 결과 화면이 뜨고 이만큼(초) 지나야 버튼·키가 먹는다 (컷신에서 누르던 Space가 바로 넘기지 않게) */
const INPUT_DELAY = 0.8;

/**
 * 엔딩 결과 화면 (기준 문서 PART 4): 최종 직급 / 총 킹받음 / 들킨 횟수 / 남은 목숨 / 클리어 시간 / 별점 / 가장 많이 들킨 원인.
 * 이번 출근에서 깬 스테이지 기록(RunStats)을 모아 보여 준다. 다시 출근하기(STAGE 1부터) / 타이틀로.
 * 아이템·콤보 통계와 스테이지 선택·친구 랭킹은 아직 없다.
 */
export class EndingScene extends Phaser.Scene {
  private t = 0;

  constructor() {
    super('Ending');
  }

  create(): void {
    this.t = 0;
    const recs = RunStats.all();
    const total = recs.reduce((s, r) => s + r.confirmed, 0);
    const caught = recs.reduce((s, r) => s + r.caught, 0);
    const seconds = recs.reduce((s, r) => s + r.seconds, 0);
    const hearts = recs.length ? recs[recs.length - 1].hearts : 0;
    const by: Partial<Record<CaughtReasonId, number>> = {};
    for (const r of recs) for (const [k, n] of Object.entries(r.caughtBy) as [CaughtReasonId, number][]) by[k] = (by[k] ?? 0) + n;
    const top = (Object.entries(by) as [CaughtReasonId, number][]).sort((a, b) => b[1] - a[1])[0];
    // 별점: 안 들킬수록 많이
    const stars = caught === 0 ? 3 : caught <= 3 ? 2 : 1;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xffd6e4).setOrigin(0);
    const rays = this.add.graphics({ x: 250, y: 330 });
    rays.fillStyle(0xffffff, 0.45);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rays.slice(0, 0, 900, a, a + Math.PI / 24, false).fillPath();
    }
    this.tweens.add({ targets: rays, angle: 360, duration: 30000, repeat: -1 });

    // 왼쪽: 왕관 쓴 나
    const me = this.add.container(250, 430, [
      this.add.image(0, 0, TEX.shadow).setScale(1.4),
      this.add.image(0, 2, TEX.playerBody).setOrigin(0.5, 1),
      this.add.image(0, -26, TEX.playerHeadFront).setOrigin(0.5, 1),
      this.add.text(0, -86, '👑', { fontSize: '30px' }).setOrigin(0.5),
    ]);
    me.setScale(2.6);
    this.tweens.add({ targets: me, y: 420, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.add
      .text(250, 120, '직장생활 완전 정복!', { fontFamily: FONT, fontSize: '34px', color: '#ff3d6e', stroke: '#ffffff', strokeThickness: 8 })
      .setOrigin(0.5)
      .setAngle(-4);

    // 오른쪽: 기록 카드
    const cx = 660;
    const g = this.add.graphics();
    g.fillStyle(COLORS.outline).fillRoundedRect(cx - 250, 46, 500, 430, 22);
    g.fillStyle(0xffffff).fillRoundedRect(cx - 250, 40, 500, 430, 22);
    g.lineStyle(5, COLORS.outline).strokeRoundedRect(cx - 250, 40, 500, 430, 22);
    const text = (x: number, y: number, s: string, size: number, color: string = COLORS.text, origin = 0.5) =>
      this.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color, align: 'center' }).setOrigin(origin, 0.5);
    text(cx, 78, '최종 인사 기록', 26, '#8d6fb0');
    const rows: [string, string][] = [
      ['최종 직급', '대표 👑'],
      ['총 킹받음', recs.length ? `${total}` : '-'],
      ['들킨 횟수', recs.length ? `${caught}번` : '-'],
      ['남은 목숨', recs.length ? '♥'.repeat(hearts) || '-' : '-'],
      ['클리어 시간', recs.length ? `${Math.floor(seconds / 60)}분 ${String(seconds % 60).padStart(2, '0')}초` : '-'],
    ];
    rows.forEach(([k, v], i) => {
      const y = 124 + i * 40;
      text(cx - 200, y, k, 20, '#8d7f99', 0);
      text(cx + 200, y, v, 22, k === '남은 목숨' ? '#ff4f8b' : COLORS.text, 1);
    });
    const starText = text(cx, 334, '★'.repeat(stars) + '☆'.repeat(3 - stars), 44, '#f9a825');
    starText.setScale(0.3);
    this.tweens.add({ targets: starText, scale: 1, duration: 400, delay: 300, ease: 'Back.Out' });
    const reason = !recs.length
      ? '기록 없음 (중간부터 시작했어요)'
      : top
        ? `당신은 "${CAUGHT_REASONS[top[0]].text}"로 ${top[1]}번 들켰습니다`
        : '한 번도 안 들킨 전설의 사원!';
    text(cx, 386, reason, 18, '#8d6fb0');

    this.button(cx - 115, 436, '다시 출근하기', 0xffd54f, () => this.again());
    this.button(cx + 115, 436, '타이틀로', 0xe1d5f5, () => this.toTitle());
    if (!this.sys.game.device.input.touch) text(cx, GAME_HEIGHT - 30, 'Space: 다시 출근하기   ·   Esc: 타이틀로', 15, '#8d6fb0');

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') this.again();
      else if (e.code === 'Escape') this.toTitle();
    });
    window.__kingbatEnding = { total, caught, stars, records: recs.length };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => (window.__kingbatEnding = undefined));
    this.cameras.main.fadeIn(400, 255, 214, 228);
  }

  update(_time: number, delta: number): void {
    this.t += delta / 1000;
  }

  private again(): void {
    if (this.t < INPUT_DELAY) return;
    RunStats.reset();
    this.scene.start('Story', { stage: 1 });
  }

  private toTitle(): void {
    if (this.t < INPUT_DELAY) return;
    this.scene.start('Title');
  }

  private button(x: number, y: number, label: string, color: number, onTap: () => void): void {
    const t = this.add.text(0, 0, label, { fontFamily: FONT, fontSize: '22px', color: COLORS.text }).setOrigin(0.5);
    const w = t.width + 40;
    const h = 48;
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.outline).fillRoundedRect(-w / 2, -h / 2 + 4, w, h, h / 2);
    bg.fillStyle(color).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    bg.lineStyle(4, COLORS.outline).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    const c = this.add.container(x, y, [bg, t]).setSize(w, h).setInteractive({ useHandCursor: true });
    c.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, onTap);
  }
}
