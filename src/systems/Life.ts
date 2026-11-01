import Phaser from 'phaser';
import { LIFE } from '../data/tuning';
import type { CaughtReasonId } from '../data/caughtReasons';

/**
 * 목숨(하트). 장난 중이거나 임시 점수를 들고 있을 때 보이면 -1.
 * 들킨 원인별 횟수도 세서, 나중에 결과 화면("모니터에 3번 비쳤습니다")에 쓴다.
 */
export class Life extends Phaser.Events.EventEmitter {
  hearts = LIFE.hearts;
  readonly max = LIFE.hearts;
  readonly caughtBy: Partial<Record<CaughtReasonId, number>> = {};

  get alive(): boolean {
    return this.hearts > 0;
  }

  lose(reason: CaughtReasonId): number {
    this.hearts = Math.max(0, this.hearts - 1);
    this.caughtBy[reason] = (this.caughtBy[reason] ?? 0) + 1;
    this.emit('lose', this.hearts);
    return this.hearts;
  }
}
