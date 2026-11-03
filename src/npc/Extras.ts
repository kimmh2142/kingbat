import Phaser from 'phaser';
import {
  AISLES,
  EXTRA_LINKS,
  EXTRA_LOOKS,
  EXTRA_PLACES,
  EXTRA_RULES,
  EXTRA_SEATED,
  EXTRA_TINTS,
  EXTRA_WALK_POSE,
} from '../data/extras';
import type { Desk } from '../data/office7f';
import type { Player } from '../player/Player';
import { NpcView } from './NpcView';
import type { Facing, Point, Range } from './types';

const rand = (r: Range) => Phaser.Math.FloatBetween(r[0], r[1]);
const key = (p: Point) => `${p.x},${p.y}`;

interface Seat {
  desk: Desk;
  at: Point;
  /** 앉은 사람이나 앉으러 가는 사람 */
  taken: Extra | null;
}

type ExtraState = 'sit' | 'walk' | 'stay';

/** 엑스트라 한 명 */
interface Extra {
  view: NpcView;
  blocker: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  state: ExtraState;
  pos: Point;
  dir: Point;
  timer: number;
  path: Point[];
  /** 걷는 중이면 도착해서 할 일 (자리 또는 들르는 곳) */
  goal: { seat: Seat } | { place: (typeof EXTRA_PLACES)[number] } | null;
  seat: Seat | null;
  /** 플레이어에게 막혀 있는 시간 (0 = 안 막힘) */
  blockedT: number;
  nagged: boolean;
}

/**
 * 회색 엑스트라 직원들. 빈 직원석에 앉아 일하다가 가끔 일어나 탕비실·화장실·엘리베이터·프린터에 들렀다가
 * 빈자리에 다시 앉는다. 플레이어는 이들을 통과할 수 없고, 걷다가 플레이어에게 막히면 멈춰서 기다린다.
 * 플레이어를 보지 않는다 (들킴·점수와 관계없는 배경 인물).
 */
export class Extras {
  readonly list: Extra[] = [];
  readonly seats: Seat[];
  readonly blockers: Phaser.Physics.Arcade.Group;
  /** 통로 그래프: 점 → 이웃 점들 */
  private readonly graph = new Map<string, { p: Point; next: Point[] }>();

  constructor(scene: Phaser.Scene, desks: Desk[]) {
    this.seats = desks.filter((d) => d.owner === 'coworker').map((desk) => ({ desk, at: { x: desk.x, y: desk.y - 62 }, taken: null }));
    this.buildGraph();
    this.blockers = scene.physics.add.group({ immovable: true, allowGravity: false });

    const total = EXTRA_RULES.seated + EXTRA_RULES.walking;
    const seats = Phaser.Utils.Array.Shuffle([...this.seats]);
    const places = Phaser.Utils.Array.Shuffle([...EXTRA_PLACES]);
    for (let i = 0; i < total; i++) {
      const look = { ...EXTRA_LOOKS[i % EXTRA_LOOKS.length], tint: EXTRA_TINTS[Math.floor(i / EXTRA_LOOKS.length) % EXTRA_TINTS.length] };
      const view = new NpcView(scene, look, false);
      const blocker = this.blockers.create(0, 0, '__WHITE') as Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
      blocker.setVisible(false).setImmovable(true);
      const e: Extra = { view, blocker, state: 'sit', pos: { x: 0, y: 0 }, dir: { x: 0, y: 1 }, timer: 0, path: [], goal: null, seat: null, blockedT: 0, nagged: false };
      this.list.push(e);
      if (i < EXTRA_RULES.seated) {
        this.sit(e, seats[i]);
        // 모두 같은 때 일어나지 않게 흩뜨린다
        e.timer = rand([5, EXTRA_RULES.sitTime[1]]);
      } else {
        const place = places[(i - EXTRA_RULES.seated) % places.length];
        e.pos = { ...place.at };
        this.stay(e, place);
        e.timer = rand([1, EXTRA_RULES.stayTime[1]]);
      }
    }
  }

  get walkingCount(): number {
    return this.list.filter((e) => e.state !== 'sit').length;
  }

  /** 포스트잇 "킥킥"을 띄울 사람: 대상에서 가장 가까운 엑스트라 (멀면 null) */
  nearestTo(x: number, y: number, within: number): Point | null {
    let best: Point | null = null;
    let bestD = within;
    for (const e of this.list) {
      const d = Phaser.Math.Distance.Between(x, y, e.pos.x, e.pos.y);
      if (d < bestD) {
        bestD = d;
        best = e.pos;
      }
    }
    return best;
  }

  /** 게임이 멈춘 동안 (컷인 등): 그림만 움직인다 */
  updateView(dt: number): void {
    for (const e of this.list) e.view.update(dt);
  }

  update(dt: number, player: Player): void {
    for (const e of this.list) {
      e.timer -= dt;
      if (e.state === 'walk') this.walk(e, dt, player);
      else if (e.timer <= 0) {
        if (e.state === 'sit') this.standUp(e);
        else this.leavePlace(e);
      }
      e.view.update(dt);
      // 앉은 사람은 의자 쪽, 서 있는 사람은 발밑을 막는다
      if (e.state === 'sit') e.blocker.body.reset(e.pos.x, e.pos.y - 8);
      else e.blocker.body.reset(e.pos.x, e.pos.y - 4);
    }
  }

  // ------------------------------------------------------------ 행동

  private sit(e: Extra, seat: Seat): void {
    e.state = 'sit';
    e.seat = seat;
    seat.taken = e;
    e.pos = { ...seat.at };
    e.timer = rand(EXTRA_RULES.sitTime);
    e.view.sitAt(seat.at.x, seat.at.y, seat.desk.y);
    this.pickActivity(e);
    e.blocker.setBodySize(30, 22);
  }

  private pickActivity(e: Extra): void {
    const total = EXTRA_SEATED.reduce((s, a) => s + a.weight, 0);
    let r = Math.random() * total;
    const a = EXTRA_SEATED.find((x) => (r -= x.weight) < 0) ?? EXTRA_SEATED[0];
    e.view.setPose(a.pose);
  }

  private standUp(e: Extra): void {
    // 돌아다니는 사람이 많으면 조금 더 앉아 있는다 (그 사이 하는 일만 바꾼다)
    if (this.walkingCount >= EXTRA_RULES.maxWalking) {
      e.timer = rand(EXTRA_RULES.activityTime);
      this.pickActivity(e);
      return;
    }
    const seat = e.seat!;
    seat.taken = null;
    e.seat = null;
    const place = Phaser.Utils.Array.GetRandom(EXTRA_PLACES);
    this.goTo(e, place.at, { place });
  }

  private stay(e: Extra, place: (typeof EXTRA_PLACES)[number]): void {
    e.state = 'stay';
    e.timer = rand(EXTRA_RULES.stayTime);
    e.view.standAt(e.pos.x, e.pos.y, place.facing);
    e.view.setPose(place.pose);
    e.blocker.setBodySize(28, 14);
  }

  /** 들른 곳에서 볼일을 마치면 빈자리로 (빈자리가 없으면 다른 곳에 들른다) */
  private leavePlace(e: Extra): void {
    const free = this.seats.filter((s) => !s.taken);
    if (free.length) {
      const seat = Phaser.Utils.Array.GetRandom(free);
      seat.taken = e;
      this.goTo(e, seat.at, { seat });
      return;
    }
    const place = Phaser.Utils.Array.GetRandom(EXTRA_PLACES);
    this.goTo(e, place.at, { place });
  }

  private goTo(e: Extra, to: Point, goal: NonNullable<Extra['goal']>): void {
    e.state = 'walk';
    e.goal = goal;
    e.path = this.route(e.pos, to);
    e.blockedT = 0;
    e.nagged = false;
    e.view.setPose(EXTRA_WALK_POSE);
    e.blocker.setBodySize(28, 14);
  }

  private walk(e: Extra, dt: number, player: Player): void {
    const target = e.path[0];
    if (!target) return this.arrive(e);
    const dx = target.x - e.pos.x;
    const dy = target.y - e.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.01) e.dir = { x: dx / dist, y: dy / dist };

    // 앞에 플레이어가 있으면 멈춰서 기다린다 (밀고 지나가지 않는다)
    const px = player.x - e.pos.x;
    const py = player.y - e.pos.y;
    const pd = Math.hypot(px, py);
    if (pd < EXTRA_RULES.blockDistance && (px * e.dir.x + py * e.dir.y) / (pd || 1) > 0.7) {
      if (e.blockedT === 0) e.view.say(EXTRA_RULES.lines.blocked, 1.4);
      e.blockedT += dt;
      if (!e.nagged && e.blockedT > EXTRA_RULES.nagAfter) {
        e.nagged = true;
        e.view.say(EXTRA_RULES.lines.nag, 1.4);
      }
      e.view.standAt(e.pos.x, e.pos.y, this.facingOf(e.dir));
      return;
    }
    e.blockedT = 0;
    e.nagged = false;

    const step = EXTRA_RULES.speed * dt;
    if (dist <= step) {
      e.pos = { ...target };
      e.path.shift();
    } else {
      e.pos = { x: e.pos.x + e.dir.x * step, y: e.pos.y + e.dir.y * step };
    }
    e.view.standAt(e.pos.x, e.pos.y, this.facingOf(e.dir));
  }

  private arrive(e: Extra): void {
    const goal = e.goal;
    e.goal = null;
    if (goal && 'seat' in goal) this.sit(e, goal.seat);
    else if (goal) this.stay(e, goal.place);
  }

  private facingOf(d: Point): Facing {
    return Math.abs(d.x) > Math.abs(d.y) ? (d.x < 0 ? 'left' : 'right') : d.y < 0 ? 'up' : 'down';
  }

  // ------------------------------------------------------------ 길찾기

  /** 통로 선 위의 점들을 잇고, 자리·들르는 곳으로 가는 길을 붙인다 */
  private buildGraph(): void {
    const { rows, rowX, cols, colY } = AISLES;
    const points: Point[] = [];
    for (const y of rows) for (const x of cols) points.push({ x, y });
    // 자리 → 바로 위 통로로 나가는 점
    const exits = this.seats.map((s) => ({ seat: s.at, exit: { x: s.at.x, y: Math.max(...rows.filter((y) => y < s.at.y)) } }));
    for (const { exit } of exits) points.push(exit);
    for (const [a] of EXTRA_LINKS) points.push(a);
    for (const p of points) this.node(p);

    // 같은 가로줄·세로줄 위의 점들을 차례로 잇는다
    for (const y of rows) this.chain(points.filter((p) => p.y === y && p.x >= rowX[0] && p.x <= rowX[1]).sort((a, b) => a.x - b.x));
    for (const x of cols) this.chain(points.filter((p) => p.x === x && p.y >= colY[0] && p.y <= colY[1]).sort((a, b) => a.y - b.y));
    for (const { seat, exit } of exits) this.link(seat, exit);
    for (const [a, b] of EXTRA_LINKS) this.link(a, b);
  }

  private node(p: Point): { p: Point; next: Point[] } {
    let n = this.graph.get(key(p));
    if (!n) {
      n = { p, next: [] };
      this.graph.set(key(p), n);
    }
    return n;
  }

  private link(a: Point, b: Point): void {
    const na = this.node(a);
    const nb = this.node(b);
    if (!na.next.some((p) => key(p) === key(b))) na.next.push(nb.p);
    if (!nb.next.some((p) => key(p) === key(a))) nb.next.push(na.p);
  }

  private chain(line: Point[]): void {
    for (let i = 1; i < line.length; i++) if (key(line[i - 1]) !== key(line[i])) this.link(line[i - 1], line[i]);
  }

  /** 가장 짧은 길 (다익스트라). 출발점은 그래프 위의 점이어야 한다 */
  private route(from: Point, to: Point): Point[] {
    const dist = new Map<string, number>([[key(from), 0]]);
    const prev = new Map<string, Point>();
    const open = new Set<string>([key(from)]);
    while (open.size) {
      let cur = '';
      let best = Infinity;
      for (const k of open) {
        const d = dist.get(k)!;
        if (d < best) {
          best = d;
          cur = k;
        }
      }
      open.delete(cur);
      if (cur === key(to)) break;
      const n = this.graph.get(cur);
      if (!n) continue;
      for (const q of n.next) {
        const d = best + Phaser.Math.Distance.Between(n.p.x, n.p.y, q.x, q.y);
        if (d < (dist.get(key(q)) ?? Infinity)) {
          dist.set(key(q), d);
          prev.set(key(q), n.p);
          open.add(key(q));
        }
      }
    }
    const path: Point[] = [];
    for (let p: Point | undefined = to; p && key(p) !== key(from); p = prev.get(key(p))) path.unshift(p);
    return prev.has(key(to)) ? path : [to];
  }

  /** 디버그: 통로 그래프 */
  drawDebug(g: Phaser.GameObjects.Graphics): void {
    g.lineStyle(1, 0x9575cd, 0.6);
    for (const n of this.graph.values()) for (const q of n.next) g.lineBetween(n.p.x, n.p.y, q.x, q.y);
    for (const e of this.list) {
      if (e.state !== 'walk') continue;
      g.lineStyle(2, 0x7e57c2, 0.9).beginPath().moveTo(e.pos.x, e.pos.y);
      for (const p of e.path) g.lineTo(p.x, p.y);
      g.strokePath();
    }
  }
}

