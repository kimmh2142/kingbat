import Phaser from 'phaser';
import { CAMERA, POKE } from '../data/tuning';
import type { TargetController } from '../npc/TargetController';
import type { Player } from '../player/Player';
import { popWord } from '../ui/Popups';
import { FONT } from '../config';
import type { Score } from './Score';

/**
 * 콕 찌르기. Space를 꾹 누르는 동안 쌓이고, 오래 누를수록 빨라진다.
 * 대상이 돌아볼 때 누르고 있으면 들킨다 (판정은 Detection 쪽).
 * 콤보 (11/10): 한 번 꾹 누르는 동안 이어서 찌를수록 점수 배율이 오르고(×1.5, ×2), 대상이 움찔 → 꿈틀 → 빨개짐 → 김.
 */
export class Poke {
  /** 지금 실제로 찌르는 중 */
  active = false;
  /** 이번에 찌르기 시작한 뒤 흐른 시간 */
  pokeTime = 0;
  /** 이번 찌르기로 얻은 점수 */
  sessionPoints = 0;
  /** 이번에 꾹 누르는 동안 이어서 찌른 횟수 (콤보) */
  combo = 0;
  /** 콤보 숫자 (대상 머리 옆) */
  private readonly comboText: Phaser.GameObjects.Text;
  private holdTime = 0;
  private acc = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly score: Score,
  ) {
    this.comboText = scene.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '22px', color: '#ffeb3b', stroke: '#5a3a4a', strokeThickness: 6 })
      .setOrigin(0, 0.5)
      .setScale(CAMERA.textScale)
      .setVisible(false);
  }

  /** 지금 콤보 점수 배율 */
  get multiplier(): number {
    let m = 1;
    for (const [n, x] of POKE.combo.steps) if (this.combo >= n) m = x;
    return m;
  }

  /** 지금 초당 콕 횟수 */
  get rate(): number {
    const t = Math.min(this.pokeTime / POKE.accelTime, 1);
    return Phaser.Math.Linear(POKE.rateStart, POKE.rateMax, t * t);
  }

  /** 누르자마자 찌른다 (아이템은 F / [아이템]으로 따로 쓴다) */
  update(dt: number, held: boolean, player: Player, target: TargetController): void {
    if (!held) {
      this.holdTime = 0;
      this.stop(target);
      return;
    }
    const justPressed = this.holdTime === 0;
    this.holdTime += dt;

    const where = target.pokeCheck(player.x, player.y, POKE.range);
    if (where !== 'ok') {
      // 왜 안 되는지 알려준다 (누른 순간 한 번)
      if (justPressed && !this.active) {
        const rank = target.pattern.appearance.rank;
        const msg = where === 'front' ? '얼굴 쪽은 안 돼! 등 뒤로' : where === 'moving' ? `걷는 중엔 못 찔러! ${rank} 멈출 때 노리자` : `${rank} 등 뒤에서 꾹!`;
        popWord(this.scene, player.x, player.y - 110, msg, { color: '#5a3a4a', size: 18 });
      }
      this.stop(target);
      return;
    }

    if (!this.active) {
      this.active = true;
      this.pokeTime = 0;
      this.sessionPoints = 0;
      this.combo = 0;
      this.acc = 1; // 누르자마자 첫 콕
      target.setBeingPoked(true);
    }

    this.pokeTime += dt;
    this.acc += this.rate * dt;
    while (this.acc >= 1) {
      this.acc -= 1;
      this.pokeOnce(target);
    }
    // 콤보 숫자는 대상 머리 오른쪽에 따라다닌다
    this.comboText.setPosition(target.x + 36, target.y - 120).setDepth(target.y + 1000);
  }

  /** 들켰을 때 등 강제로 멈춤 */
  cancel(target: TargetController): void {
    this.holdTime = -999; // 손을 뗐다가 다시 눌러야 다시 찌른다
    this.stop(target);
  }

  private pokeOnce(target: TargetController): void {
    const bx = target.x;
    const by = target.y - 50;
    target.view.jolt();
    if (POKE.lockAfterScore && target.pokeLocked) {
      // 연타 방지: 같은 장난은 상대가 확인 사이클을 마칠 때까지 점수 없음
      popWord(this.scene, bx, by, '콕…', { color: '#b0a6b8', size: 20 });
      return;
    }
    const before = this.multiplier;
    this.combo++;
    const mult = this.multiplier;
    const points = POKE.pointsPerPoke * target.scoreMultiplier * mult;
    this.sessionPoints += points;
    this.score.addTemp(points);
    // 콤보가 오를수록 의성어가 커지고 길어진다
    const word = this.combo >= 30 ? '콕콕콕!!' : this.combo >= 12 ? '콕콕!' : '콕!';
    popWord(this.scene, bx + Phaser.Math.Between(-14, 14), by, word, { size: Math.min(24 + this.combo * 0.4, 40) });
    target.view.setPokeHeat(this.combo / POKE.combo.heatFull);
    const reaction = POKE.combo.reactions.find(([n]) => n === this.combo);
    if (reaction) popWord(this.scene, bx - 50, by - 50, reaction[1], { color: '#ec407a', size: 24 });
    if (mult > before) {
      popWord(this.scene, bx, by - 90, `콤보 ×${mult}!`, { color: '#ff9800', size: 34 });
      this.scene.cameras.main.shake(120, 0.004);
    }
    if (this.combo >= 5) this.comboText.setText(`${this.combo}콤보${mult > 1 ? ` ×${mult}` : ''}`).setVisible(true);
  }

  private stop(target: TargetController): void {
    if (!this.active) return;
    this.active = false;
    this.comboText.setVisible(false);
    target.setBeingPoked(false);
    if (this.sessionPoints > 0) target.onPokeScored();
  }
}
