import Phaser from 'phaser';
import type { Desk } from '../data/office7f';
import type { ConeShape } from '../ui/VisionCone';
import { NpcView } from './NpcView';
import type { Facing, PatrolPattern, Point, Range } from './types';

export type PatrolState =
  | 'work' // 자리에서 일하는 중 (시야 없음)
  | 'go' // 목적지로 가는 중
  | 'stay' // 목적지에서 머무는 중
  | 'return' // 자리로 돌아오는 중
  | 'react' // 플레이어를 발견
  | 'grab'; // 플레이어를 붙잡는 중

const STATE_NAMES: Record<PatrolState, string> = {
  work: '자리에서 업무',
  go: '탕비실로 가는 중',
  stay: '커피 타는 중',
  return: '자리로 돌아가는 중',
  react: '발견!',
  grab: '붙잡는 중',
};

/** 붙잡은 이유: 시야에 들어와서(뭐 해요?) / 옆을 지나가다(커피 심부름) */
export type GrabKind = 'stop' | 'coffee';

const FACING_VEC: Record<Facing, Point> = {
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const rand = (r: Range) => Phaser.Math.FloatBetween(r[0], r[1]);

/**
 * 방해 NPC 순찰: 자리에서 일하다가 경로를 따라 목적지에 다녀온다.
 * 걷거나 서 있는 동안은 바라보는 방향으로 시야가 있고, 바닥에 부채꼴로 보인다 (순찰 NPC 예외 규칙).
 */
export class PatrolController {
  readonly view: NpcView;
  state: PatrolState = 'work';
  private timer = 0;
  private pos: Point;
  private dir: Point = { x: 0, y: 1 };
  private path: Point[] = [];
  private pathIndex = 0;
  private readonly seat: Point;
  private lastStopLine = '';
  /** 발견·붙잡기가 끝나면 돌아갈 상태 */
  private resume: PatrolState = 'work';
  /** 멈췄을 때 하던 일의 남은 시간 (커피 타다가 멈추면 이어서) */
  private resumeTimer = 0;
  /** 지금 붙잡은 이유 */
  grabKind: GrabKind = 'coffee';
  /** "뭐 해요?" 재사용 대기 시간 */
  stopCooldown = 0;
  /** 이번 왕복에 고른 경로 */
  routeIndex = 0;
  /** 개발 테스트용: 붙잡기 확률 덮어쓰기 */
  grabChanceOverride?: number;
  /** 붙잡기 재사용 대기 시간 */
  grabCooldown = 0;
  /** 이번에 옆을 지나가며 이미 붙잡을지 굴려 봤는가 (한 번 지나갈 때 한 번만) */
  private grabRolled = false;

  constructor(
    scene: Phaser.Scene,
    readonly pattern: PatrolPattern,
    private readonly desk: Desk,
  ) {
    this.view = new NpcView(scene, pattern.appearance, false);
    this.seat = { x: desk.x, y: desk.y - 62 };
    this.pos = { ...this.seat };
    this.enter('work');
    // 시작하자마자 모두 같은 타이밍에 움직이지 않게 첫 업무 시간을 흩뜨린다
    this.timer = rand([2, this.pattern.work.duration[1]]);
  }

  get x(): number {
    return this.pos.x;
  }

  get y(): number {
    return this.pos.y;
  }

  get stateName(): string {
    return STATE_NAMES[this.state];
  }

  get remaining(): number {
    return Math.max(0, this.timer);
  }

  /** 지금 시야가 있는가 (자리에서 일할 땐 없음) */
  get watching(): boolean {
    return this.state === 'go' || this.state === 'stay' || this.state === 'return';
  }

  /** 바닥에 그릴 시야. 시야가 없으면 null */
  get cone(): ConeShape | null {
    if (!this.watching && this.state !== 'react') return null;
    return { x: this.pos.x, y: this.pos.y, dir: this.dir, ...this.pattern.vision };
  }

  canSee(x: number, y: number): boolean {
    if (!this.watching) return false;
    const V = this.pattern.vision;
    const dx = x - this.pos.x;
    const dy = y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= V.nearRadius) return true;
    if (dist > V.range) return false;
    const cos = (dx * this.dir.x + dy * this.dir.y) / dist;
    return cos >= Math.cos(Phaser.Math.DegToRad(V.halfAngleDeg));
  }

  /** 플레이어를 발견해 들켰을 때: 그쪽을 보고 잠깐 멈춘다 */
  onCaught(px: number, py: number): void {
    this.lookAt(px, py);
    if (this.state !== 'react' && this.state !== 'grab') this.pause();
    this.state = 'react';
    this.timer = rand(this.pattern.react.duration);
    this.view.setPose(this.pattern.react.pose);
  }

  /** 붙잡는 중이면 남은 비율 1 → 0 */
  get grabRatio(): number {
    const total = this.grabKind === 'stop' ? this.pattern.stop?.seconds : this.pattern.grab?.seconds;
    return this.state === 'grab' && total ? this.timer / total : 0;
  }

  /**
   * 걷다가 플레이어 바로 옆을 지나가면 가끔 붙잡는다 ("커피 좀 사 올래?").
   * 한 번 지나갈 때 한 번만 확률을 굴리고, 붙잡은 뒤엔 cooldown 동안 쉰다.
   * @returns 지금 붙잡기 시작했는가
   */
  tryGrab(px: number, py: number, canBeGrabbed: boolean): boolean {
    const G = this.pattern.grab;
    if (!G || (this.state !== 'go' && this.state !== 'return')) return false;
    const dist = Phaser.Math.Distance.Between(px, py, this.pos.x, this.pos.y);
    if (dist > G.radius * 1.6) this.grabRolled = false;
    if (dist > G.radius || this.grabRolled || this.grabCooldown > 0 || !canBeGrabbed) return false;
    this.grabRolled = true;
    if (Math.random() >= (this.grabChanceOverride ?? G.chance)) return false;
    this.pause();
    this.grabKind = 'coffee';
    this.state = 'grab';
    this.timer = G.seconds;
    this.grabCooldown = G.cooldown;
    this.lookAt(px, py);
    this.view.setPose({ ...this.pattern.walkPose, bubble: G.line });
    return true;
  }

  /**
   * 빈손인 플레이어가 시야에 들어오면 멈춰 세운다 ("뭐 해요?"). 하트·점수는 그대로, 시간만 뺏긴다.
   * 장난 중이거나 임시 점수를 들고 있으면 이게 아니라 들킴이다 (OfficeScene.checkCaught).
   * @returns 지금 붙잡기 시작했는가
   */
  tryStop(px: number, py: number, innocent: boolean): boolean {
    const S = this.pattern.stop;
    if (!S || !innocent || this.stopCooldown > 0 || !this.canSee(px, py)) return false;
    this.pause();
    this.grabKind = 'stop';
    this.state = 'grab';
    this.timer = S.seconds;
    this.stopCooldown = S.seconds + S.cooldown;
    this.lookAt(px, py);
    this.view.setPose({ ...this.pattern.walkPose, face: S.face ?? this.pattern.react.pose.face, bubble: this.pickStopLine(S.lines) });
    return true;
  }

  /** 세울 때 대사: 매번 바뀌게 바로 전 대사는 빼고 고른다 */
  private pickStopLine(lines: string[]): string {
    const pool = lines.length > 1 ? lines.filter((l) => l !== this.lastStopLine) : lines;
    this.lastStopLine = Phaser.Utils.Array.GetRandom(pool);
    return this.lastStopLine;
  }

  /** 하던 일을 잠깐 멈춘다 (발견·붙잡기 뒤 이어서 하려고) */
  private pause(): void {
    this.resume = this.state;
    this.resumeTimer = this.timer;
  }

  update(dt: number): void {
    this.grabCooldown = Math.max(0, this.grabCooldown - dt);
    this.stopCooldown = Math.max(0, this.stopCooldown - dt);
    if (this.state === 'go' || this.state === 'return') {
      this.walk(dt);
    } else {
      this.timer -= dt;
      if (this.timer <= 0) this.next();
    }
    this.view.update(dt);
  }

  private next(): void {
    switch (this.state) {
      case 'work':
        return this.enter('go');
      case 'stay':
        return this.enter('return');
      case 'grab':
        if (this.grabKind === 'coffee') this.view.say(this.pattern.grab?.thanks ?? '', 1.2);
        return this.enter(this.resume, true);
      case 'react':
        return this.enter(this.resume, true);
      default:
        return;
    }
  }

  /** @param resuming 발견·붙잡기 뒤 하던 일로 돌아가는 중 (걷던 경로를 이어서) */
  protected enter(state: PatrolState, resuming = false): void {
    const P = this.pattern;
    this.state = state;
    const v = this.view;
    switch (state) {
      case 'work':
        this.timer = rand(P.work.duration);
        this.pos = { ...this.seat };
        this.dir = { x: 0, y: 1 };
        v.sitAt(this.seat.x, this.seat.y, this.desk.y);
        v.setPose(P.work.pose);
        break;
      case 'go':
        if (!resuming) {
          this.routeIndex = this.pickRoute();
          this.path = [this.seat, ...P.routes[this.routeIndex].path];
          this.pathIndex = 1;
        }
        v.setPose(P.walkPose);
        break;
      case 'return':
        if (!resuming) {
          this.path = [...P.routes[this.routeIndex].path].reverse().concat([this.seat]);
          this.pathIndex = 1;
        }
        v.setPose(P.walkPose);
        break;
      case 'stay':
        this.timer = resuming ? this.resumeTimer : rand(P.stay.duration);
        this.dir = FACING_VEC[P.stay.facing];
        v.standAt(this.pos.x, this.pos.y, P.stay.facing);
        v.setPose(P.stay.pose);
        break;
      default:
        break;
    }
  }

  private walk(dt: number): void {
    const target = this.path[this.pathIndex];
    if (!target) {
      this.enter(this.state === 'go' ? 'stay' : 'work');
      return;
    }
    const dx = target.x - this.pos.x;
    const dy = target.y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    const step = this.pattern.speed * dt;
    if (dist <= step) {
      this.pos = { ...target };
      this.pathIndex += 1;
    } else {
      this.dir = { x: dx / dist, y: dy / dist };
      this.pos = { x: this.pos.x + this.dir.x * step, y: this.pos.y + this.dir.y * step };
    }
    this.view.standAt(this.pos.x, this.pos.y, this.facingOf(this.dir));
  }

  get routeName(): string {
    return this.pattern.routes[this.routeIndex].name;
  }

  private pickRoute(): number {
    const routes = this.pattern.routes;
    let r = Math.random() * routes.reduce((s, x) => s + x.weight, 0);
    for (let i = 0; i < routes.length; i++) {
      r -= routes[i].weight;
      if (r < 0) return i;
    }
    return 0;
  }

  protected lookAt(px: number, py: number): void {
    const dx = px - this.pos.x;
    const dy = py - this.pos.y;
    const d = Math.hypot(dx, dy) || 1;
    this.dir = { x: dx / d, y: dy / d };
    this.view.standAt(this.pos.x, this.pos.y, this.facingOf(this.dir));
  }

  private facingOf(d: Point): Facing {
    return Math.abs(d.x) > Math.abs(d.y) ? (d.x < 0 ? 'left' : 'right') : d.y < 0 ? 'up' : 'down';
  }
}
