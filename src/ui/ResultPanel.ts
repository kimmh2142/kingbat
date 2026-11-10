import Phaser from 'phaser';
import { TEX } from '../assets/keys';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { CAUGHT_REASONS, caughtTip, type CaughtReasonId } from '../data/caughtReasons';
import { nextStage, type StageConfig } from '../data/stages';
import { DEPTH } from '../systems/OfficeMap';

export type ResultKind = 'clear' | 'overtime' | 'caught';

export interface ResultInfo {
  kind: ResultKind;
  stage: StageConfig;
  hearts: number;
  maxHearts: number;
  /** 남은 시간 (초) */
  remaining: number;
  caughtCount: number;
  caughtBy: Partial<Record<CaughtReasonId, number>>;
  confirmed: number;
  goal: number;
  missionDone: boolean;
  touch: boolean;
}

/** 결과 창이 뜬 뒤 이 시간(초)이 지나야 키·터치를 받는다 (콕 하던 Space가 바로 눌리지 않게) */
const INPUT_DELAY = 0.9;
const D = DEPTH.label + 50;

/**
 * 스테이지 결과 화면 (게임은 멈춘 채 위에 뜬다).
 * - clear: 대상의 분노 + "공략 성공!" + 별점(남은 하트) · 남은 시간 · 들킨 횟수
 * - overtime: 불 꺼진 사무실, 모니터 불빛만. 무엇이 모자랐는지
 * - caught: 대상이 "야! 너였구나!" + 가장 많이 들킨 원인
 * 실패: Space·Enter = 다시 도전, Esc = 타이틀로 (또는 버튼).
 * 클리어: Space·Enter = 다음 스테이지, R = 다시 하기, Esc = 타이틀로.
 */
export class ResultPanel {
  private t = 0;
  private readonly parts: Phaser.GameObjects.GameObject[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly info: ResultInfo,
    private readonly onRetry: () => void,
    private readonly onTitle: () => void,
    private readonly onNext: () => void = onTitle,
  ) {
    if (info.kind === 'clear') this.clear();
    else if (info.kind === 'overtime') this.overtime();
    else this.caught();
  }

  /** 입력을 받을 수 있는가 (뜬 직후 잠깐은 막는다) */
  get ready(): boolean {
    return this.t >= INPUT_DELAY;
  }

  /** 키 입력 (event.code). 처리했으면 true */
  onKey(code: string): boolean {
    if (this.t < INPUT_DELAY) return false;
    const clear = this.info.kind === 'clear';
    if (code === 'Space' || code === 'Enter') (clear ? this.onNext : this.onRetry)();
    else if (code === 'KeyR' && clear) this.onRetry();
    else if (code === 'Escape') this.onTitle();
    else return false;
    return true;
  }

  update(dt: number): void {
    this.t += dt;
  }

  // ------------------------------------------------------------ 종류별

  private clear(): void {
    const s = this.scene;
    const info = this.info;
    const stage = info.stage;
    this.add(s.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xffd6e4, 0.82).setOrigin(0));
    this.rays(0xffffff, 0.45);

    // 킹받은 대상 얼굴 (크게, 부들부들)
    const face = this.targetFace(stage, 250, 250, TEX.faceShock, true);
    this.bubble(250, 96, stage.lines.clear);
    s.tweens.add({ targets: face, x: face.x + 3, duration: 45, yoyo: true, repeat: -1 });

    // 오른쪽: 성공 도장 + 결과
    const cx = 640;
    // "동기 공략 성공! 다음 타깃: 과장" → 도장 "동기 공략 성공!" + 아래 줄 "다음 타깃: 과장"
    const [head, ...rest] = stage.lines.next.split('! ');
    this.stamp(cx, 118, rest.length ? head + '!' : stage.lines.next, '#ff3d6e', -6);
    if (rest.length) this.text(cx, 180, rest.join('! '), 24, COLORS.text);
    this.stars(cx, 232, info.hearts, info.maxHearts);
    this.text(cx, 284, `남은 시간 ${fmt(info.remaining)}   ·   들킨 횟수 ${info.caughtCount}번`, 20, COLORS.text);
    this.text(cx, 330, `나: "${stage.lines.clearMe}"`, 20, '#8d6fb0');
    const last = nextStage(stage.id) === null;
    this.button(cx - 110, 410, last ? '엔딩 보기' : '다음 스테이지', 0xffd54f, this.onNext);
    this.button(cx + 110, 410, '다시 하기', 0xffffff, this.onRetry);
    if (!info.touch) this.text(cx, 456, `Space: ${last ? '엔딩 보기' : '다음 스테이지'}   ·   R: 다시 하기   ·   Esc: 타이틀로`, 15, COLORS.text);
  }

  private overtime(): void {
    const s = this.scene;
    const info = this.info;
    this.add(s.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0d0a14, 0.9).setOrigin(0));
    // 불 꺼진 사무실: 내 자리 모니터 불빛만 (모니터는 옆으로 비켜서 얼굴이 불빛을 받게)
    const cx = GAME_WIDTH / 2;
    const glow = this.add(s.add.ellipse(cx - 40, 230, 320, 210, 0x7fb3ff, 0.16));
    s.tweens.add({ targets: glow, alpha: 0.6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.add(s.add.image(cx, 262, TEX.chair).setOrigin(0.5, 1).setScale(1.6).setTint(0x5b6a8c));
    const me = this.add(
      s.add.container(cx, 252, [
        s.add.image(0, 2, TEX.playerBody).setOrigin(0.5, 1),
        s.add.image(0, -26, TEX.playerHeadFront).setOrigin(0.5, 1),
      ]),
    ) as Phaser.GameObjects.Container;
    me.setScale(1.6).iterate((o: Phaser.GameObjects.Image) => o.setTint(0xa9b8dc));
    this.add(s.add.image(cx, 330, TEX.desk).setOrigin(0.5, 1).setScale(1.6).setTint(0x5b6a8c));
    this.add(s.add.image(cx - 86, 282, TEX.monitor).setOrigin(0.5, 1).setScale(1.6).setTint(0xcfe3ff));
    // 한숨
    const sigh = this.text(cx + 70, 150, '하아…', 20, '#a9b4d6');
    s.tweens.add({ targets: sigh, y: 136, alpha: 0.3, duration: 1400, yoyo: true, repeat: -1 });

    this.stamp(cx, 70, '야근 확정…', '#7fa6ff', -4);
    const lack: string[] = [];
    if (info.confirmed < info.goal) lack.push(`킹받음 ${Math.floor(info.confirmed)} / ${info.goal}`);
    if (!info.missionDone) lack.push(`특별 미션 "${info.stage.mission.name}" 실패`);
    this.text(cx, 374, '퇴근 시계가 6시를 넘겼다…', 22, '#e8ecff');
    this.text(cx, 408, lack.join('   ·   ') || '조금만 더 빨랐다면!', 19, '#ffd54f');
    this.buttons(cx, 470, '다시 도전');
  }

  private caught(): void {
    const s = this.scene;
    const info = this.info;
    this.add(s.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x2a1d24, 0.78).setOrigin(0));
    this.rays(0xff3d6e, 0.18);
    this.targetFace(info.stage, 270, 270, TEX.faceSuspicious, false);
    this.bubble(270, 110, info.stage.lines.caught);
    const cx = 650;
    this.stamp(cx, 140, '딱 걸렸다!', '#ff3d6e', -8);
    const top = Object.entries(info.caughtBy).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0];
    if (top) {
      const r = CAUGHT_REASONS[top[0] as CaughtReasonId];
      this.text(cx, 222, `가장 많이 들킨 원인`, 18, '#f3d9e3');
      this.text(cx, 256, `"${r.text}" ${top[1]}번`, 26, '#ffffff');
      this.text(cx, 298, `TIP  ${caughtTip(top[0] as CaughtReasonId, info.stage.target.id)}`, 18, COLORS.text).setBackgroundColor('#fff59d').setPadding(12, 6, 12, 6);
    }
    this.text(cx, 346, `킹받음 ${Math.floor(info.confirmed)} / ${info.goal}   ·   남은 시간 ${fmt(info.remaining)}`, 18, '#f3d9e3');
    this.buttons(cx, 420, '다시 도전');
  }

  // ------------------------------------------------------------ 조각

  private add<T extends Phaser.GameObjects.GameObject>(o: T): T {
    const any = o as unknown as Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth;
    any.setScrollFactor?.(0);
    any.setDepth?.(D + this.parts.length * 0.01);
    this.parts.push(o);
    return o;
  }

  private text(x: number, y: number, str: string, size: number, color: string): Phaser.GameObjects.Text {
    return this.add(this.scene.add.text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, align: 'center' }).setOrigin(0.5));
  }

  /** 도장처럼 쾅 찍히는 큰 글자 */
  private stamp(x: number, y: number, str: string, color: string, angle: number): void {
    const t = this.add(
      this.scene.add
        .text(x, y, str, { fontFamily: FONT, fontSize: '60px', color, stroke: '#ffffff', strokeThickness: 10 })
        .setOrigin(0.5)
        .setAngle(angle)
        .setScale(2.6)
        .setAlpha(0),
    );
    this.scene.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' });
  }

  /** 그 스테이지 공략 대상 크게 (몸 + 머리 + 표정 + 분노 마크) */
  private targetFace(stage: StageConfig, x: number, y: number, face: string, angry: boolean): Phaser.GameObjects.Container {
    const s = this.scene;
    const look = stage.target.appearance;
    const c = this.add(
      s.add.container(x, y, [
        s.add.image(0, 60, look.body).setOrigin(0.5, 1),
        s.add.image(0, 30, look.headFront).setOrigin(0.5, 1),
        s.add.image(0, 6, face),
      ]),
    ) as Phaser.GameObjects.Container;
    c.setScale(0.5);
    s.tweens.add({ targets: c, scale: 2.6, duration: 320, ease: 'Back.Out' });
    if (angry) {
      const mark = s.add.image(46, -40, TEX.angerMark).setScale(0.6);
      c.add(mark);
      s.tweens.add({ targets: mark, scale: 1, angle: 12, duration: 140, yoyo: true, repeat: -1 });
      // 머리 위 김
      for (let i = 0; i < 3; i++) {
        const puff = s.add.circle(-16 + i * 16, -30, 6, 0xffffff, 0.9);
        c.add(puff);
        s.tweens.add({ targets: puff, y: -60, alpha: 0, scale: 1.6, duration: 700, delay: i * 200, repeat: -1 });
      }
    }
    return c;
  }

  private bubble(x: number, y: number, str: string): void {
    const s = this.scene;
    const t = s.add.text(0, 0, str, { fontFamily: FONT, fontSize: '24px', color: COLORS.text }).setOrigin(0.5);
    const w = t.width + 36;
    const g = s.add.graphics();
    g.fillStyle(0xffffff).fillRoundedRect(-w / 2, -26, w, 52, 22);
    g.fillTriangle(-12, 24, 12, 24, 0, 42);
    g.lineStyle(4, COLORS.outline).strokeRoundedRect(-w / 2, -26, w, 52, 22);
    const c = this.add(s.add.container(x, y, [g, t]).setScale(0)) as Phaser.GameObjects.Container;
    s.tweens.add({ targets: c, scale: 1, duration: 220, delay: 250, ease: 'Back.Out' });
  }

  /** 별점: 남은 하트 수만큼 채운 별 */
  private stars(x: number, y: number, filled: number, max: number): void {
    for (let i = 0; i < max; i++) {
      const on = i < filled;
      const st = this.text(x + (i - (max - 1) / 2) * 58, y, '★', 54, on ? '#ffc93c' : '#e9d9e0');
      st.setStroke(COLORS.text, 6).setScale(0);
      this.scene.tweens.add({ targets: st, scale: 1, duration: 240, delay: 300 + i * 160, ease: 'Back.Out' });
    }
  }

  /** 배경에 천천히 도는 빛줄기 */
  private rays(color: number, alpha: number): void {
    const g = this.add(this.scene.add.graphics({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 }));
    g.fillStyle(color, alpha);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.slice(0, 0, 900, a, a + Math.PI / 24, false).fillPath();
    }
    this.scene.tweens.add({ targets: g, angle: 360, duration: 30000, repeat: -1 });
  }

  private buttons(cx: number, y: number, retryLabel: string): void {
    this.button(cx - 110, y, retryLabel, 0xffd54f, this.onRetry);
    this.button(cx + 110, y, '타이틀로', 0xffffff, this.onTitle);
    const hint = this.info.touch ? '' : 'Space / Enter: ' + retryLabel + '   ·   Esc: 타이틀로';
    if (hint) this.text(cx, y + 46, hint, 15, this.info.kind === 'clear' ? COLORS.text : '#ffffff');
  }

  private button(x: number, y: number, label: string, color: number, onTap: () => void): void {
    const s = this.scene;
    const bg = s.add.graphics();
    bg.fillStyle(COLORS.outline).fillRoundedRect(-96, -26 + 5, 192, 52, 26);
    bg.fillStyle(color).fillRoundedRect(-96, -26, 192, 52, 26);
    bg.lineStyle(4, COLORS.outline).strokeRoundedRect(-96, -26, 192, 52, 26);
    const t = s.add.text(0, 0, label, { fontFamily: FONT, fontSize: '24px', color: COLORS.text }).setOrigin(0.5);
    const c = this.add(s.add.container(x, y, [bg, t]).setSize(192, 52)) as Phaser.GameObjects.Container;
    c.setInteractive({ useHandCursor: true });
    c.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      if (this.t >= INPUT_DELAY) onTap();
    });
  }
}

function fmt(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
