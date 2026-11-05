import Phaser from 'phaser';
import { TUTORIAL_STEPS, TUTORIAL_TEXT, type TutorialStepId } from '../data/tutorial';

/**
 * STAGE 1 단계 안내 진행 상태. 단계는 순서와 상관없이 해낸 순간 완료된다.
 * 이벤트: 'change'(방금 끝낸 단계)
 */
export class Tutorial extends Phaser.Events.EventEmitter {
  readonly done = new Set<TutorialStepId>();

  complete(id: TutorialStepId): void {
    if (this.done.has(id)) return;
    this.done.add(id);
    this.emit('change', id);
  }

  /** 아직 안 끝난 첫 단계 (다 끝났으면 null) */
  get current(): TutorialStepId | null {
    return TUTORIAL_STEPS.find((s) => !this.done.has(s.id))?.id ?? null;
  }

  get finished(): boolean {
    return this.current === null;
  }

  /** 미션 칸에 보여줄 한 줄 */
  text(touch: boolean): string {
    const key = touch ? 'touch' : 'pc';
    const cur = this.current;
    if (!cur) return TUTORIAL_TEXT.done[key];
    const pending = TUTORIAL_STEPS.filter((s) => !this.done.has(s.id));
    // ③은 기다리기만 하면 되니까, 뒤 단계(콕·확정)가 남았으면 같이 보여준다
    if (cur === 'parade' && pending.length > 1) return `${TUTORIAL_TEXT.waiting} ${pending[1][key]}`;
    return pending[0][key];
  }
}
