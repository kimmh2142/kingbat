import Phaser from 'phaser';
import { POKE } from '../data/tuning';
import type { TargetController } from '../npc/TargetController';
import type { Player } from '../player/Player';
import { popWord } from '../ui/Popups';
import type { Score } from './Score';

/**
 * 콕 찌르기. Space를 꾹 누르는 동안 쌓이고, 오래 누를수록 빨라진다.
 * 대상이 돌아볼 때 누르고 있으면 들킨다 (판정은 Detection 쪽).
 */
export class Poke {
  /** 지금 실제로 찌르는 중 */
  active = false;
  /** 이번에 찌르기 시작한 뒤 흐른 시간 */
  pokeTime = 0;
  /** 이번 찌르기로 얻은 점수 */
  sessionPoints = 0;
  private holdTime = 0;
  private acc = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly score: Score,
  ) {}

  /** 지금 초당 콕 횟수 */
  get rate(): number {
    const t = Math.min(this.pokeTime / POKE.accelTime, 1);
    return Phaser.Math.Linear(POKE.rateStart, POKE.rateMax, t * t);
  }

  update(dt: number, held: boolean, player: Player, target: TargetController): void {
    if (!held) {
      this.holdTime = 0;
      this.stop(target);
      return;
    }
    this.holdTime += dt;
    if (this.holdTime < POKE.holdThreshold) return;

    if (!target.canBePokedFrom(player.x, player.y, POKE.range)) {
      this.stop(target);
      return;
    }

    if (!this.active) {
      this.active = true;
      this.pokeTime = 0;
      this.sessionPoints = 0;
      this.acc = 1; // 누르자마자 첫 콕
      target.setBeingPoked(true);
    }

    this.pokeTime += dt;
    this.acc += this.rate * dt;
    while (this.acc >= 1) {
      this.acc -= 1;
      this.pokeOnce(target);
    }
  }

  /** 들켰을 때 등 강제로 멈춤 */
  cancel(target: TargetController): void {
    this.holdTime = -999; // 손을 뗐다가 다시 눌러야 다시 찌른다
    this.stop(target);
  }

  private pokeOnce(target: TargetController): void {
    const fast = this.rate > (POKE.rateStart + POKE.rateMax) / 2;
    const bx = target.x;
    const by = target.y - 50;
    target.view.jolt();
    if (target.pokeLocked) {
      // 연타 방지: 같은 장난은 상대가 확인 사이클을 마칠 때까지 점수 없음
      popWord(this.scene, bx, by, '콕…', { color: '#b0a6b8', size: 20 });
      return;
    }
    const points = POKE.pointsPerPoke * target.scoreMultiplier;
    this.sessionPoints += points;
    this.score.addTemp(points);
    popWord(this.scene, bx, by, fast ? '콕콕!' : '콕!', { size: fast ? 30 : 26 });
  }

  private stop(target: TargetController): void {
    if (!this.active) return;
    this.active = false;
    target.setBeingPoked(false);
    if (this.sessionPoints > 0) target.onPokeScored();
  }
}
