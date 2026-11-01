import Phaser from 'phaser';
import { SCORE } from '../data/tuning';

/**
 * 킹받음 점수. 장난으로 얻은 점수는 임시(temp)이고,
 * 내 자리·숨기 장소에서 일하는 척해야 확정(confirmed)된다. (Hit & Run)
 */
export class Score extends Phaser.Events.EventEmitter {
  confirmed = 0;
  temp = 0;
  readonly goal = SCORE.goal;

  get total(): number {
    return Math.min(this.goal, this.confirmed + this.temp);
  }

  addTemp(points: number): void {
    // 확정 + 임시가 목표를 넘지 않게
    this.temp = Math.max(0, Math.min(points + this.temp, this.goal - this.confirmed));
    this.emit('change');
  }

  confirm(): number {
    const gained = this.temp;
    this.confirmed = Math.min(this.goal, this.confirmed + this.temp);
    this.temp = 0;
    this.emit('change');
    return gained;
  }

  loseTemp(): number {
    const lost = this.temp;
    this.temp = 0;
    this.emit('change');
    return lost;
  }
}
