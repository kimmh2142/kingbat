import type Phaser from 'phaser';
import type { TextureKey } from '../assets/keys';
import type { CaughtReasonId } from '../data/caughtReasons';
import type { Player } from '../player/Player';

export interface MissionStep {
  text: string;
  /** 가야 할 곳 (월드 좌표, 바닥). 기다리는 단계면 null */
  at: { x: number; y: number } | null;
  /** 화면 밖 화살표에 넣을 그림 */
  icon: TextureKey;
}

/** 단계 문구의 {e}를 키 이름으로 */
export const stepKey = (text: string, touch: boolean) => text.replace('{e}', touch ? '[숨기]' : 'E');

/**
 * E로 하는 특별 미션 (STAGE 2 승인서, STAGE 3 대정전과 방석)이 OfficeScene에 연결되는 모양.
 * 이벤트: 'done'(미션 성공), 'picked'(미션 물건 줍기), 'sheet'(한 단계 진행)
 */
export interface MissionTask extends Phaser.Events.EventEmitter {
  /** 미션 동작 중 (움직일 수 없고, 보이면 들킨다) */
  readonly busy: boolean;
  /** 동작 중 들켰을 때 컷인 원인 */
  readonly caughtReason: CaughtReasonId;
  /** 동작 중 대상이 자리로 돌아오는 길이면 이 거리 안에서 들킨다 */
  readonly walkSeeRange: number;
  /** 미션 성공 문구를 띄울 곳 */
  readonly anchor: { x: number; y: number };
  /** 이 자리에서 E가 이 미션에 쓰이는가 (숨기와 겹치지 않게) */
  wantsE(x: number, y: number): boolean;
  /** 안내 문구 (없으면 null) */
  prompt(x: number, y: number, touch: boolean): string | null;
  /** 지금 할 단계: 상단 미션 칸 문구와 ★ 화살표·미니맵이 가리킬 곳 (끝났으면 null) */
  step(touch: boolean): MissionStep | null;
  update(dt: number, eHeld: boolean, blocked: boolean, player: Player, justPressed: (code: string) => boolean): void;
  /** 들켰을 때 (동작 중이던 물건을 되돌린다) */
  onCaught(): void;
  /** 결과 화면 등으로 멈출 때 */
  cancel(): void;
  /** 공략 대상이 자리로 돌아와 앉았을 때 / 목적지에 도착했을 때 */
  onTargetSeated(): void;
  onTargetArrived(): void;
}
