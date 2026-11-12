import Phaser from 'phaser';
import { TEX } from '../assets/keys';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { CaughtReasonId } from '../data/caughtReasons';
import { APPROVAL } from '../data/approval';
import { Approval } from '../systems/Approval';
import { BLACKOUT } from '../data/blackout';
import { Blackout } from '../systems/Blackout';
import { RunStats } from '../systems/RunStats';
import { HrVisit } from '../systems/HrVisit';
import { HR_VISIT } from '../data/hrVisit';
import { INSA } from '../npc/patterns/insa';
import { ENDING_STORY, STORIES } from '../data/dialogue';
import type { MissionStep, MissionTask } from '../systems/MissionTask';
import { ITEM_RULES, ITEMS, type ItemId } from '../data/items';
import { nextStage, STAGES, type StageConfig } from '../data/stages';
import { TRASH, TRASH_MODE, applyTrashTexts } from '../data/trashMode';
import { MISSION_TIPS, TIP_BACK_SPOT, TIPS, TUTORIAL_TEXT, type TipId } from '../data/tutorial';
import { CAMERA, MINIMAP, POKE } from '../data/tuning';
import { Extras } from '../npc/Extras';
import { PatrolController } from '../npc/PatrolController';
import { TargetController } from '../npc/TargetController';
import { Player } from '../player/Player';
import { Controls } from '../systems/Controls';
import { DebugOverlay } from '../systems/DebugOverlay';
import { Hide } from '../systems/Hide';
import { Items } from '../systems/Items';
import { Life } from '../systems/Life';
import { DEPTH, OfficeMap } from '../systems/OfficeMap';
import { Poke } from '../systems/Poke';
import { Pranks } from '../systems/Pranks';
import { Score } from '../systems/Score';
import { Sfx } from '../systems/Sfx';
import { tipsSetting, Tutorial } from '../systems/Tutorial';
import { WorkClock } from '../systems/WorkClock';
import { CaughtCutin } from '../ui/CaughtCutin';
import { popWord } from '../ui/Popups';
import { GuideToast } from '../ui/GuideToast';
import { HUD } from '../ui/HUD';
import { ItemBar } from '../ui/ItemBar';
import { MiniMap } from '../ui/MiniMap';
import { Prompt } from '../ui/Prompt';
import { ResultPanel, type ResultKind } from '../ui/ResultPanel';
import { TargetArrow } from '../ui/TargetArrow';
import { TargetIntro } from '../ui/TargetIntro';
import { TipDialog, type TipSpot } from '../ui/TipDialog';
import { VisionCone } from '../ui/VisionCone';
import { TouchControls } from '../ui/TouchControls';

/** 안내 때문에 카메라가 비출 곳으로 갔다 오는 시간 (ms) */
const TIP_PAN_MS = 550;

/** 방귀 방석: 대표 반응을 보여 주는 시간 (카메라가 대표에게 머무는 시간, 성공 표시가 뜨기까지) */
const FART_LOOK_MS = 3000;

export class OfficeScene extends Phaser.Scene {
  /** 지금 스테이지 수치·대상 (data/stages.ts) */
  private stage!: StageConfig;
  private map!: OfficeMap;
  private player!: Player;
  private controls!: Controls;
  private debug!: DebugOverlay;
  private target!: TargetController;
  private targetBlocker!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private score!: Score;
  private poke!: Poke;
  private hud!: HUD;
  private prompt!: Prompt;
  private targetCone!: VisionCone;
  /** 순찰하는 방해 NPC (스테이지마다 data/stages.ts의 patrols). 걸을 때 바닥에 시야 부채꼴 */
  private patrols: PatrolController[] = [];
  private patrolCones: VisionCone[] = [];
  /** 대리에게 붙잡혀 있는 동안 남은 시간 원 */
  private grabRing!: Phaser.GameObjects.Graphics;
  private keyHint!: Phaser.GameObjects.Text;
  private touch!: TouchControls;
  private hide!: Hide;
  private goalAnnounced = false;
  /** 특별 미션 성공 */
  private missionDone = false;
  /** 클리어 화면이 떠 있음 */
  private cleared = false;
  private life!: Life;
  private clock!: WorkClock;
  private cutin!: CaughtCutin;
  /** 실패 화면(하트 0개·야근)이 떠 있음 */
  private failed = false;
  /** 결과 화면 (클리어·실패) */
  private result: ResultPanel | null = null;
  /** 이번 프레임에 화면을 터치했는가 (컷인 넘기기) */
  private tapped = false;
  private caughtCount = 0;
  /** 마지막으로 들킨 순간 (확인용): 누가, 왜, 어디서 */
  private lastCaught: { by: string; reason: string; player: { x: number; y: number }; who: { x: number; y: number }; facing: string; side: number } | null = null;
  private items!: Items;
  private pranks!: Pranks;
  /** STAGE 2 특별 미션 "전 직원 칼퇴 승인서" (그 스테이지에만) */
  private approval: Approval | null = null;
  private blackout: Blackout | null = null;
  /** STAGE 3 돌발 이벤트 인사팀 방문 */
  private hrVisit: HrVisit | null = null;
  /** E로 하는 특별 미션 (승인서·대정전). 없으면 null */
  private task: MissionTask | null = null;
  /** 시작 타깃 소개 (끝나면 null) */
  private intro: TargetIntro | null = null;
  private targetArrow!: TargetArrow;
  /** 첫 아이템을 주울 때까지 아이템 쪽을 가리키는 노란 화살표 */
  private itemArrow!: TargetArrow;
  /** 특별 미션 지금 단계의 목적지: 화면 밖이면 초록 화살표, 화면 안이면 바닥 위 ★ */
  private missionArrow!: TargetArrow;
  private missionStar!: Phaser.GameObjects.Text;
  private missionStep: MissionStep | null = null;
  private guide!: GuideToast;
  private extras!: Extras;
  /** STAGE 1 단계 안내 (상단 미션 칸) */
  private tutorial!: Tutorial;
  private sfx!: Sfx;
  private miniMap!: MiniMap;
  /** 처음 임시 점수가 생기면 내 자리를 가리키는 화살표(화면 밖)와 자리 위 표시(화면 안) */
  private seatArrow!: TargetArrow;
  private seatMark!: Phaser.GameObjects.Text;
  /** 동기가 처음 돌아보려 할 때 주인공 혼잣말 (한 번만) */
  private thought: Phaser.GameObjects.Text | null = null;
  private thoughtT = 0;
  private thoughtShown = false;
  /** 튜토리얼 안내창 (멈추고 설명). 꺼져 있으면 예전처럼 단계 칸·짧은 안내만 */
  private tipDialog!: TipDialog;
  /** 안내 때문에 카메라가 옮겨 가는 중('going')·가 있음('away')·돌아오는 중('back') */
  private tipPan: 'going' | 'away' | 'back' | null = null;
  /** 처음 확정한 곳 (확정 안내가 비춘다) */
  private confirmSpot: { x: number; y: number } | null = null;
  private tipsOn = true;
  private readonly tipQueue: TipId[] = [];
  private readonly tipsShown = new Set<TipId>();
  /** 포스트잇을 들고 있을 때 동기 등 뒤 바닥 "여기서 Z!" */
  private backSpot!: Phaser.GameObjects.Container;

  constructor() {
    super('Office');
  }

  create(data?: { retry?: boolean; stage?: number }): void {
    this.stage = STAGES[data?.stage ?? 1] ?? STAGES[1];
    // scene.restart()는 생성자를 다시 부르지 않으므로 판마다 상태를 여기서 초기화한다
    this.intro = null;
    this.approval = null;
    this.blackout = null;
    this.task = null;
    this.hrVisit = null;
    this.failed = false;
    this.result = null;
    this.tapped = false;
    this.caughtCount = 0;
    this.lastCaught = null;
    this.goalAnnounced = false;
    this.missionDone = false;
    this.cleared = false;
    this.thought = null;
    this.thoughtT = 0;
    const params = new URLSearchParams(location.search);
    // 튜토리얼 안내창: "다시 안 보기"를 안 눌렀으면 다시 도전해도 나온다.
    // Playwright 확인 스크립트는 바로 플레이해야 하므로 끈다 (?tips=1이면 보여줌)
    // STAGE 2부터는 첫 돌아봄 혼잣말 없이, 시작할 때 특별 미션 안내창만
    this.tipsOn = !tipsSetting.off && !(navigator.webdriver && !params.has('tips'));
    this.tipQueue.length = 0;
    this.tipPan = null;
    this.confirmSpot = null;
    this.tipsShown.clear();
    // 안내창이 꺼져 있을 때: 다시 도전이면 혼잣말은 이미 봤으니 생략
    this.thoughtShown = (!!data?.retry && !this.tipsOn) || !this.stage.tutorial;

    this.map = new OfficeMap(this, this.stage.id, this.stage.floor);
    this.touch = new TouchControls(this);
    this.controls = new Controls(this, this.touch);
    this.player = new Player(this, this.stage.floor.playerStart.x, this.stage.floor.playerStart.y);
    this.physics.add.collider(this.player.feet, this.map.colliders);

    const desk = this.map.desks.find((d) => d.owner === this.stage.target.id)!;
    this.target = new TargetController(this, this.stage.target, desk);
    // 플레이어가 NPC 몸을 통과하지 않게 발밑에 막는 상자를 붙인다
    this.targetBlocker = this.physics.add.image(this.target.x, this.target.y, '__WHITE').setVisible(false).setImmovable(true);
    // 의자 등받이까지 막아서, 등 뒤에 선 플레이어와 그림이 너무 겹치지 않게 한다
    this.targetBlocker.setBodySize(34, 60);
    this.physics.add.collider(this.player.feet, this.targetBlocker);

    // 회색 엑스트라 직원: 빈자리에 앉아 있거나 돌아다니고, 플레이어를 가로막는다
    this.extras = new Extras(this, this.map.desks, this.stage.floor.extras);
    this.physics.add.collider(this.player.feet, this.extras.blockers);

    // 방해 NPC (STAGE 1 대리 김카페, STAGE 2 + 차장 오의심): 자리 ↔ 목적지 왕복, 걸을 때 바닥에 시야 부채꼴
    this.patrols = this.stage.patrols.map((p) => new PatrolController(this, p, this.map.desks.find((d) => d.owner === p.id)!));
    // STAGE 3 인사팀: 평소엔 숨어 있다가 방문 때만 나타나는 순찰 NPC (들킴·시야·미니맵은 다른 순찰과 같이)
    if (this.stage.hrVisit) {
      const others = [...this.patrols];
      const hr = new PatrolController(this, INSA, HR_VISIT.desk);
      this.patrols.push(hr);
      this.hrVisit = new HrVisit(this, hr, others, () => this.player);
      this.hrVisit.on('ding', () => this.guide.show(HR_VISIT.lines.dingToast, 3));
    }

    this.score = new Score();
    this.poke = new Poke(this, this.score);
    this.hide = new Hide(this, this.score);
    // 쓰레기통 버전 (?mode=trash): 어디서든 쓰레기통을 뒤집어쓰고 숨기 (대상 곁에선 못 씀)
    applyTrashTexts();
    this.hide.trashMode = TRASH_MODE;
    this.hide.tooClose = (x, y) => Phaser.Math.Distance.Between(x, y, this.target.x, this.target.y) < TRASH.minTargetDist;
    this.score.on('change', () => this.announceGoal());
    this.items = new Items(this, this.stage.floor.itemSpawns, this.stage.items);
    this.items.canPlace = (x, y, spot) => {
      const room = this.map.roomAt(x, y);
      if (!room || room !== this.map.roomAt(spot.x, spot.y) || this.map.isLocked(room)) return false;
      // 벽·책상·소품과 겹치지 않게 (주인공 발 크기 정도 여유)
      return this.physics.overlapRect(x - 24, y - 16, 48, 32, false, true).length === 0;
    };
    this.pranks = new Pranks(this, this.score, this.items, this.target);
    this.pranks.laughFrom = (x, y) => this.extras.nearestTo(x, y, 320);
    if (this.stage.mission.id === 'parade') this.pranks.on('parade', () => this.completeMission());
    if (this.stage.mission.id === 'approval') this.setupApproval();
    if (this.stage.mission.id === 'blackout') this.setupBlackout();
    new ItemBar(this, this.items, this.touch);
    // 아이템 안내: 첫 아이템이 생기면 한 번, 종류마다 처음 주우면 사용법 한 번.
    // STAGE 1에서 스포트라이트 안내가 켜져 있으면 같은 내용(첫 포스트잇·포스트잇 사용법)은 스포트라이트가 하므로 생략 (11/10)
    this.guide = new GuideToast(this);
    const spotlit = () => this.stage.tutorial && this.tipsOn;
    this.items.once('spawned', () => !spotlit() && this.guide.show('아이템이 생겼다! 지나가면 주워요'));
    const taught = new Set<ItemId>();
    this.items.on('picked', (id: ItemId) => {
      if (taught.has(id)) return;
      taught.add(id);
      if (id === 'postit' && spotlit()) return;
      this.guide.show(ITEMS[id].howTo.replace('{key}', this.controls.isTouch ? '[아이템] 버튼' : 'Z').replace('{who}', this.stage.target.appearance.rank), 4);
    });
    this.life = new Life();
    this.setupSfx();
    this.clock = new WorkClock(this.stage);
    this.clock.once('timeout', () => this.showFail('overtime'));
    this.hud = new HUD(this, this.score, this.life, this.clock);
    this.setupTutorial();
    this.setupTips();
    this.cutin = new CaughtCutin(this);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => (this.tapped = true));
    this.prompt = new Prompt(this);
    this.targetCone = new VisionCone(this);
    this.patrolCones = this.patrols.map((p) => new VisionCone(this, p.pattern.coneColor));
    this.grabRing = this.add.graphics().setDepth(DEPTH.label + 6);
    const seat = this.map.mySeat;
    this.seatMark = this.add
      .text(seat.x, seat.y - 70, this.controls.isTouch ? '▼ [숨기] 꾹!' : '▼ E 꾹!', {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#ffffff',
        stroke: '#e0457b',
        strokeThickness: 6,
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.label + 4)
      .setScale(CAMERA.textScale)
      .setVisible(false);
    this.tweens.add({ targets: this.seatMark, y: seat.y - 84, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // 물리 계산이 끝난 뒤 그림 위치를 맞춘다
    const sync = () => this.player.syncView();
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, sync);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.POST_UPDATE, sync));
    this.player.syncView();

    this.targetArrow = new TargetArrow(this);
    this.seatArrow = new TargetArrow(this, { color: 0xf06292, icon: TEX.chair, iconScale: 0.55 });
    this.itemArrow = new TargetArrow(this, { color: 0xf9a825, icon: ITEMS.postit.icon });
    this.missionArrow = new TargetArrow(this, { color: 0x43c47f });
    this.missionStar = this.add
      .text(0, 0, '★', { fontFamily: FONT, fontSize: '30px', color: '#ffeb3b', stroke: '#2e9e6b', strokeThickness: 6 })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.label + 4)
      .setScale(CAMERA.textScale)
      .setVisible(false);
    this.tweens.add({ targets: this.missionStar, scale: CAMERA.textScale * 1.2, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.setupCamera();
    this.miniMap = new MiniMap(this, this.map, this.touch, this.controls.isTouch, this.stage.target.appearance.rank, this.stage.mission.id !== 'parade');
    this.setupDebug();
    // 쓰레기통 버전이면 어느 버전인지 작게 표시
    if (TRASH_MODE) {
      this.add
        .text(16, 82, TRASH.lines.badge, { fontFamily: FONT, fontSize: '14px', color: '#ffffff', backgroundColor: '#78909c', padding: { x: 8, y: 3 } })
        .setScrollFactor(0)
        .setDepth(DEPTH.label + 20);
    }
    // 시작 타깃 소개. 다시 도전(하트 0개·야근)이면 생략.
    // Playwright 확인 스크립트는 바로 플레이해야 하므로 생략한다 (?intro=1이면 보여줌)
    const skipIntro = data?.retry || params.has('overview') || (navigator.webdriver && !params.has('intro'));
    if (!skipIntro) {
      this.intro = new TargetIntro(
        this,
        this.target,
        STORIES[this.stage.id],
        () => this.player.cameraTarget,
        () => this.followPlayer(),
      );
    }
    if (import.meta.env.DEV) {
      // 개발 중 테스트용 (빌드에는 빠진다)
      window.__kingbatTest = {
        teleport: (x: number, y: number) => {
          this.player.feet.body.reset(x, y);
          this.cameras.main.centerOn(x, y);
        },
        setRemaining: (seconds: number) => this.clock.setRemaining(seconds),
        patrolGo: (id: string, route: number) => {
          const p = this.patrolById(id);
          p?.goNow(route);
          return !!p;
        },
        tipSpot: () => (this.tipDialog.current ? this.tipSpot(this.tipDialog.current as TipId) : null),
        canPlaceAt: (x: number, y: number) => this.items.canPlace(x, y, { id: 'probe', name: 'probe', x, y }),
        scatterSample: (n: number) => this.stage.floor.itemSpawns.map((sp) => ({ id: sp.id, x: sp.x, y: sp.y, pts: Array.from({ length: n }, () => this.items.sampleSpot(sp)) })),
        tipWorld: () => (this.tipDialog.current ? this.tipWorld(this.tipDialog.current as TipId) : null),
        cameraOnPlayer: () => {
          const follow = (this.cameras.main as unknown as { _follow: unknown })._follow;
          return this.tipPan === null && follow === this.player.cameraTarget;
        },
        giveItem: (id: string) => this.items.give(id as ItemId),
        forceGrab: () => {
          const d = this.patrolById('daeri');
          if (!d) return;
          d.grabChanceOverride = 1;
          d.grabCooldown = 0;
        },
        // 방해 NPC가 붙잡거나 세우지 않게 한다 (상관없는 확인이 우연히 막히지 않도록)
        calmDaeri: () => {
          for (const p of this.patrols) {
            p.grabCooldown = 1e9;
            p.stopCooldown = 1e9;
          }
        },
        addScore: (points: number) => this.score.addConfirmed(points),
        completeMission: () => this.completeMission(),
        hrNow: () => this.hrVisit?.startNow(),
        addTemp: (points: number) => this.score.addTemp(points),
        // 결과 화면 확인용: 하트를 다 잃은 것처럼
        loseAll: () => {
          this.life.lose('turned');
          this.life.lose('turned');
          this.life.lose('escaping');
          this.showFail('caught');
        },
      };
    }
    this.keyHint = this.add
      .text(8, GAME_HEIGHT - 8, ['방향키 이동   Space 꾹: 콕   Z: 아이템 쓰기', 'X: 아이템 바꾸기   E 꾹: 숨기·확정   M: 지도   ` 디버그'], {
        fontFamily: FONT,
        fontSize: '15px',
        color: '#ffffff',
        stroke: '#5a3a4a',
        strokeThickness: 4,
      })
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(DEPTH.label);
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    if (this.paused) {
      // 컷인·실패 화면: 게임은 멈추고 캐릭터 연출만 움직인다
      this.player.update(new Phaser.Math.Vector2(), dt);
      this.target.view.update(dt);
      for (const p of this.patrols) p.view.update(dt);
      this.extras.updateView(dt);
      this.cutin.update(dt, this.controls.justPressed('Space') || this.tapped);
      if (this.intro?.active && (this.controls.justPressed('Space') || this.tapped)) this.intro.skip();
      this.tipDialog.update(dt);
      for (const code of ['Space', 'Enter', 'KeyN']) if (this.controls.justPressed(code) && this.tipDialog.onKey(code)) break;
      if (this.result) {
        this.result.update(dt);
        for (const code of ['Space', 'Enter', 'Escape', 'KeyR']) if (this.controls.justPressed(code) && this.result.onKey(code)) break;
      }
    } else {
      // 대리: 빈손으로 시야에 들어오면 "뭐 해요?" 하고 세우고, 옆을 지나가면 가끔 커피 심부름으로 붙잡는다
      // (숨어 있거나 장난 중이면 안 붙잡음. 장난 중·임시 점수를 들고 보이면 들킴)
      const free = !this.hide.hidden && !this.poke.active && !this.pranks.active;
      // 한 번에 한 명만 붙잡는다
      let grabbed = this.patrols.some((p) => p.state === 'grab');
      for (const p of this.patrols) {
        if (grabbed) break;
        p.tryStop(this.player.x, this.player.y, free && this.score.temp === 0);
        p.tryGrab(this.player.x, this.player.y, free);
        grabbed = p.state === 'grab';
      }
      // 아이템을 붙이거나 서류를 끼우는 중: 움직일 수 없고 보이면 들킨다
      const sticking = this.pranks.active || !!this.task?.busy;
      const move = this.controls.getMove().clone();
      if (this.poke.active || grabbed || sticking) move.scale(grabbed || sticking ? 0 : POKE.moveMultiplier);
      this.player.update(move, dt, TRASH.speedMul);

      // 아이템: X(다음 칸) 또는 1/2/3으로 고르고 Z·F(모바일 [아이템])로 쓴다. Space(모바일 [콕])는 콕만
      const slot = this.controls.slotPressed;
      if (slot >= 0) this.items.select(slot);
      else if (this.controls.cyclePressed) this.items.cycle();
      const held = this.controls.actionHeld && !this.hide.hidden && !grabbed && !sticking;
      if (this.controls.itemPressed && !this.hide.hidden && !grabbed && !this.poke.active && !this.task?.busy) this.pranks.tryUse(this.player);
      this.items.update(dt, this.player);
      this.pranks.update(dt, this.player);

      // 숨어 있거나 붙잡혀 있는 동안은 찌를 수 없다
      this.poke.update(dt, held, this.player, this.target);
      // E는 특별 미션(서류·방석 줍기, 끼우기·깔기, 배전반)이 먼저 쓴다
      const eForMission = !!this.task && (this.task.busy || this.task.wantsE(this.player.x, this.player.y));
      this.task?.update(dt, this.controls.hideHeld && !grabbed, this.hide.hidden || grabbed || this.poke.active || this.pranks.active, this.player, (c) =>
        this.controls.justPressed(c),
      );
      this.hide.update(dt, this.controls.hideHeld && !grabbed, this.player, this.map, this.poke.active || this.pranks.active || eForMission);
      this.target.update(dt);
      for (const p of this.patrols) p.update(dt);
      this.hrVisit?.update(dt, (this.blackout?.dark ?? 0) > 0);
      this.extras.update(dt, this.player);
      this.checkCaught();
      // 컷인·실패 화면 동안은 퇴근 시계도 멈춘다
      if (!this.paused) this.clock.update(dt);
    }

    this.targetBlocker.body.reset(this.target.x, this.target.y - 26);
    // 뒤돌아본 동안에만 시야 부채꼴을 보여준다 (전조 단계에서는 안 보임)
    const t = this.target;
    const looking = t.state === 'look' || t.state === 'react';
    this.targetCone.update(dt, looking ? { x: t.x, y: t.y, dir: t.lookDir, ...t.pattern.look } : null);
    this.patrols.forEach((p, i) => this.patrolCones[i].update(dt, p.cone, p.coneColor));
    this.drawGrabRing();
    this.targetArrow.update(this.cameras.main, this.paused ? null : this.target, this.miniMap.rect);
    this.itemArrow.update(this.cameras.main, this.paused ? null : this.firstItemToFind(), this.miniMap.rect);
    this.updateMissionGuide();
    // 서류를 든 채 과장이 자리를 비우면: 지금이야!
    if (this.approval?.carrying && this.target.awayFromSeat) this.tip('apprAway');
    this.target.view.setAnger(this.score.total / this.score.goal);
    const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.target.x, this.target.y) < 110;
    this.target.view.setLabelFaded(near && this.player.y < this.target.y);
    const canPoke = !this.paused && !this.poke.active && this.target.pokeCheck(this.player.x, this.player.y, POKE.range) === 'ok';
    // 지금 이 자리에서 아이템을 쓸 수 있으면 발밑 원이 초록, 안내도 초록 바탕
    const canUse = !this.paused && !this.hide.hidden && !this.pranks.active && !!this.items.selectedItem && this.pranks.check(this.player.x, this.player.y).ok;
    this.target.view.setMarkerReady(canUse || canPoke);
    this.prompt.show(this.player.x, this.player.y - 122, this.promptText(canPoke), canUse);
    this.updateSeatGuide();
    this.updateBackSpot();
    this.updateThought(dt);
    this.flushTips();
    // [숨기] 버튼은 숨을 수 있는 곳 근처에서만 진하게
    this.touch.setDisabled('hide', !TRASH_MODE && !this.hide.nearby && !this.task?.wantsE(this.player.x, this.player.y) && !this.task?.busy);
    // 미션 물건 앞에선 [숨기] 대신 [끼우기]·[내리기]·[깔기]
    this.touch.setLabel('hide', this.task?.eVerb(this.player.x, this.player.y) ?? '숨기');
    this.touch.setDisabled('item', !this.items.selectedItem);
    this.keyHint.setVisible(!this.controls.isTouch);
    this.hud.update(dt);
    // 미니맵: 결과 화면·시작 소개 중엔 숨긴다. M을 누르고 있으면 크게
    this.miniMap.update(
      dt,
      {
        player: this.player,
        target: this.target,
        patrols: this.patrols.filter((p) => !p.hidden),
        // 미니맵 밑에 들어가면 흐려지게: 나·대상·방해 NPC
        people: [this.player, this.target, ...this.patrols.filter((p) => !p.hidden)],
        items: this.items.onMap,
        mission: this.missionStep?.at,
        view: this.cameras.main.worldView,
      },
      this.controls.isDown('KeyM'),
      !!this.result || !!this.intro?.active,
    );
    this.debug.update();
    window.__kingbat = {
      stage: this.stage.id,
      player: { x: Math.round(this.player.x), y: Math.round(this.player.y) },
      debug: this.debug.enabled,
      target: { state: this.target.state, x: Math.round(this.target.x), y: Math.round(this.target.y), side: this.target.lookSide, left: this.target.remaining, facing: this.target.facingName, hangup: this.target.hangingUp },
      score: { confirmed: this.score.confirmed, temp: this.score.temp },
      poking: this.poke.active,
      combo: this.poke.combo,
      caught: this.caughtCount,
      hidden: this.hide.hidden,
      /** 대상 시야에 내 자리가 들어 있는가 (확인용) */
      targetSees: this.target.canSee(this.player.x, this.player.y),
      hearts: this.life.hearts,
      cutin: this.cutin.active,
      intro: !!this.intro?.active,
      failed: this.failed,
      cleared: this.cleared,
      resultReady: !!this.result?.ready,
      mission: this.missionDone,
      approval: this.approval ? { phase: this.approval.phase, seq: [...this.approval.seq], index: this.approval.index } : null,
      blackout: this.blackout ? { phase: this.blackout.phase, dark: this.blackout.dark, round: this.blackout.round, swing: this.blackout.swing } : null,
      hr: this.hrVisit ? { phase: this.hrVisit.phase, timer: this.hrVisit.timer } : null,
      tutorial: { step: this.tutorial.current, line: this.hud.missionLine },
      thought: !!this.thought,
      tip: this.tipDialog.current,
      tipQueue: [...this.tipQueue],
      tipsShown: [...this.tipsShown],
      missionStep: this.missionStep,
      backSpot: this.backSpot.visible ? { x: Math.round(this.backSpot.x), y: Math.round(this.backSpot.y) } : null,
      minimap: { big: this.miniMap.isBig, opacity: Math.round(this.miniMap.opacity * 100) / 100, ...this.miniMap.rect },
      sfx: [...this.sfx.log],
      remaining: Math.round(this.clock.remaining * 10) / 10,
      daeri: this.patrolInfo(this.patrolById('daeri')),
      patrols: this.patrols.map((p) => ({ id: p.pattern.id, ...this.patrolInfo(p)! })),
      caughtBy: this.life.caughtBy,
      lastCaught: this.lastCaught,
      extras: this.extras.list.map((e) => ({ state: e.state, x: Math.round(e.pos.x), y: Math.round(e.pos.y), blocked: e.blockedT > 0 })),
      items: {
        slots: [...this.items.slots],
        selected: this.items.selected,
        onMap: this.items.onMap.map((m) => ({ id: m.id, spot: m.spot.id, x: m.x, y: m.y })),
        sticking: this.pranks.active,
        postit: this.pranks.postitOn,
        gum: this.pranks.gumOnBag,
        bag: this.pranks.bag,
        guide: this.guide.message,
      },
    };
    this.tapped = false;
  }

  /** 아직 아무것도 안 주웠으면 가장 가까운 맵 아이템 (노란 화살표용). 화살표는 몸통 기준이라 아래로 보정 */
  private firstItemToFind(): { x: number; y: number } | null {
    if (this.items.pickedAny || !this.items.onMap.length) return null;
    const p = this.player;
    const m = [...this.items.onMap].sort(
      (a, b) => Phaser.Math.Distance.Between(p.x, p.y, a.x, a.y) - Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y),
    )[0];
    this.itemArrow.setIcon(ITEMS[m.id].icon);
    return { x: m.x, y: m.y + 24 };
  }

  /** 시작 소개·컷인·실패 화면 때문에 게임이 멈춰 있음 */
  private get paused(): boolean {
    return !!this.intro?.active || this.cutin.active || this.failed || this.cleared || this.tipDialog.active || !!this.tipPan;
  }

  /** 머리 위 진행 원: 대리에게 붙잡혀 있는 동안 남은 시간(주황), 아이템 붙이는 중(분홍) */
  private drawGrabRing(): void {
    this.grabRing.clear();
    if (this.pranks.active) {
      const x = this.player.x;
      const y = this.player.y - 118;
      this.grabRing.fillStyle(0xffffff, 0.9).fillCircle(x, y, 15);
      this.grabRing.fillStyle(0xf06292).slice(x, y, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.pranks.progress, false).fillPath();
      this.grabRing.lineStyle(3, 0x5a3a4a).strokeCircle(x, y, 15);
      return;
    }
    const r = Math.max(0, ...this.patrols.map((p) => p.grabRatio));
    if (r <= 0) return;
    const x = this.player.x;
    const y = this.player.y - 118;
    this.grabRing.fillStyle(0xffffff, 0.9).fillCircle(x, y, 15);
    this.grabRing.fillStyle(0xffa000).slice(x, y, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * r, false).fillPath();
    this.grabRing.lineStyle(3, 0x5a3a4a).strokeCircle(x, y, 15);
  }

  private promptText(canPoke: boolean): string | null {
    if (this.paused || this.hide.hidden || this.pranks.active || this.task?.busy) return null;
    const touch = this.controls.isTouch;
    const mission = this.task?.prompt(this.player.x, this.player.y, touch);
    if (mission) return mission;
    const item = this.items.selectedItem;
    if (item && this.pranks.check(this.player.x, this.player.y).ok) {
      const use = touch ? `아이템 버튼: ${ITEMS[item].hint}` : `Z: ${ITEMS[item].hint}`;
      return canPoke ? [use, touch ? '콕 버튼 꾹: 콕' : 'Space 꾹: 콕'].join('\n') : use;
    }
    if (canPoke) return touch ? '콕 버튼 꾹!' : 'Space 꾹 → 콕!';
    if (TRASH_MODE && this.score.temp > 0 && !this.hide.nearby) return touch ? TRASH.lines.prompt.touch : TRASH.lines.prompt.pc;
    if (this.hide.nearby) {
      const what = this.hide.nearby.kind === 'seat' ? '일하는 척' : '숨기';
      return touch ? `숨기 버튼 꾹: ${what}` : `E 꾹: ${what}`;
    }
    return null;
  }

  /** 튜토리얼 안내창: 할 일이 바뀌는 순간 멈추고 설명 (시작 목표 → 줍기 → 붙이기·미션 → 돌아봄 → 임시 점수 → 확정) */
  private setupTips(): void {
    this.tipDialog = new TipDialog(this);
    this.items.on('picked', (id: ItemId) => id === 'postit' && this.tip('picked'));
    // STAGE 1 안내는 시작 목표·포스트잇 붙이기·첫 임시 점수 3개만 (11/10 "안내·시나리오는 간단히"). 특별 미션은 포스트잇 안내에 합쳤다
    // 시작 목표는 첫 포스트잇이 맵에 생기면 (1~2초 뒤) 그 포스트잇을 비추며
    if (this.stage.tutorial) {
      const onSpawn = (m: { id: ItemId }) => {
        if (m.id !== 'postit') return;
        this.items.off('spawned', onSpawn);
        this.tip('goal');
      };
      this.items.on('spawned', onSpawn);
    }
    else if (this.stage.mission.id !== 'parade') this.tip(this.stage.mission.id);
    const g = this.add.graphics();
    g.fillStyle(0xffeb3b, 0.45).fillEllipse(0, 0, 70, 30);
    g.lineStyle(3, 0xf57f17).strokeEllipse(0, 0, 70, 30);
    const label = this.add
      .text(0, -18, this.controls.isTouch ? '여기서 [아이템]!' : '여기서 Z!', { fontFamily: FONT, fontSize: '18px', color: '#ffffff', stroke: '#f57f17', strokeThickness: 5 })
      .setOrigin(0.5, 1)
      .setScale(CAMERA.textScale);
    this.backSpot = this.add.container(0, 0, [g, label]).setDepth(DEPTH.label + 2).setVisible(false);
    this.tweens.add({ targets: label, y: -28, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** 안내창 예약 (판마다 한 번씩). 다른 연출이 끝나 게임이 움직일 때 띄운다 */
  private tip(id: TipId): void {
    if (!this.tipsOn || this.tipsShown.has(id)) return;
    // STAGE 2·3은 특별 미션 단계 안내만 (동기 튜토리얼 안내는 STAGE 1에서만)
    if (!this.stage.tutorial && !MISSION_TIPS[this.stage.mission.id]?.includes(id)) return;
    this.tipsShown.add(id);
    this.tipQueue.push(id);
  }

  /** 비출 곳으로 카메라가 갔다가, 닫으면 나에게 돌아온다 */
  private flushTips(): void {
    if (!this.tipsOn || this.paused || !this.tipQueue.length) return;
    const id = this.tipQueue.shift()!;
    this.poke.cancel(this.target);
    const show = () => {
      this.guide.hide();
      this.tipDialog.current = id;
      this.tipDialog.show(TIPS[id], this.controls.isTouch, () => this.tipSpot(id), (off) => {
        this.tipPanBack();
        if (!off) return;
        tipsSetting.off = true;
        this.tipsOn = false;
        this.tipQueue.length = 0;
        this.refreshMission();
      });
    };
    // 비출 곳이 있으면 카메라가 그쪽을 가운데로 (가까우면 짧게). 시작 직후엔 카메라가 아직 나에게 오는 중일 수 있어 화면 안인지로 판단하지 않는다
    const w = this.tipWorld(id);
    if (!w) return show();
    const cam = this.cameras.main;
    const ms = Phaser.Math.Clamp(Phaser.Math.Distance.Between(cam.midPoint.x, cam.midPoint.y, w.x, w.y) / 1.6, 150, TIP_PAN_MS);
    this.tipPan = 'going';
    cam.stopFollow();
    cam.pan(w.x, w.y, ms, 'Sine.easeInOut', true, (_c: Phaser.Cameras.Scene2D.Camera, p: number) => {
      if (p < 1) return;
      this.tipPan = 'away';
      show();
    });
  }

  /** 카메라가 안내 때문에 옮겨 가 있었으면 나에게 돌아온다 */
  private tipPanBack(): void {
    if (this.tipPan !== 'away') return;
    this.tipPan = 'back';
    const p = this.player.cameraTarget;
    this.cameras.main.pan(p.x, p.y, TIP_PAN_MS, 'Sine.easeInOut', true, (_c: Phaser.Cameras.Scene2D.Camera, t: number) => {
      if (t < 1) return;
      this.tipPan = null;
      this.followPlayer();
    });
  }

  /** 안내가 비출 곳 (월드 좌표, 반지름). 화면에 고정된 곳(게이지)이면 null */
  private tipWorld(id: TipId): { x: number; y: number; r: number } | null {
    const t = this.target;
    switch (id) {
      case 'goal': {
        const m = this.items.onMap.find((i) => i.id === 'postit');
        return m ? { x: m.x, y: m.y - 10, r: 62 } : null;
      }
      case 'picked':
        return { x: t.x, y: t.y - TIP_BACK_SPOT - 10, r: 66 };
      case 'stuck':
      case 'tell':
        return { x: t.x, y: t.y - 50, r: 86 };
      case 'confirmed':
        // 처음 확정한 그 자리 (내 자리든 숨는 곳이든)
        return this.confirmSpot && { x: this.confirmSpot.x, y: this.confirmSpot.y - 40, r: 82 };
      case 'approval':
        return { x: APPROVAL.paper.x, y: APPROVAL.paper.y - 20, r: 66 };
      case 'blackout':
        return { x: BLACKOUT.cushion.x, y: BLACKOUT.cushion.y - 20, r: 66 };
      case 'apprPicked':
      case 'apprAway':
        return { x: APPROVAL.pile.x, y: APPROVAL.pile.y - 40, r: 80 };
      case 'boPicked':
        return { x: BLACKOUT.panel.x, y: BLACKOUT.panel.y - 72, r: 80 };
      case 'boDark':
        return { x: BLACKOUT.chair.x, y: BLACKOUT.chair.y - 30, r: 80 };
      case 'boPlaced':
        // 방석 깐 대표 의자 (숨기 설명은 STAGE 1에서 다 했다, 11/12)
        return { x: BLACKOUT.chair.x, y: BLACKOUT.chair.y - 30, r: 80 };
      default:
        return null;
    }
  }

  /** 안내가 비출 곳 (화면 좌표). 움직이는 동기·카메라 이동을 따라 매 프레임 다시 계산 */
  private tipSpot(id: TipId): TipSpot | null {
    if (id === 'temp') return this.hud.gaugeRect;
    const w = this.tipWorld(id);
    if (!w) return null;
    const cam = this.cameras.main;
    const v = cam.worldView;
    return { x: (w.x - v.x) * cam.zoom, y: (w.y - v.y) * cam.zoom, r: w.r * cam.zoom };
  }

  /** 포스트잇을 고르고 있고 동기가 자리에서 일하는 중이면 등 뒤 바닥에 "여기서 Z!" */
  private updateBackSpot(): void {
    const t = this.target;
    const x = t.x;
    const y = t.y - TIP_BACK_SPOT;
    const on =
      (!this.paused || this.tipDialog.current === 'picked') &&
      this.items.selectedItem === 'postit' &&
      !this.pranks.postitOn &&
      !this.pranks.active &&
      t.state === 'work' &&
      t.pokeCheck(x, y, 9999) === 'ok' &&
      // 이미 그 자리에 서 있으면 그림이 겹치니 숨긴다
      Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) > 40;
    this.backSpot.setVisible(on);
    if (on) this.backSpot.setPosition(x, y);
  }

  /** 특별 미션 성공: 점수 바로 확정 + 크게 알림. 킹받음도 100이면 클리어 */
  private completeMission(): void {
    if (this.missionDone || this.failed || this.cleared) return;
    this.missionDone = true;
    const m = this.stage.mission;
    this.tutorial.complete('parade');
    this.score.addConfirmed(m.points);
    const at = this.task ? this.task.anchor : this.target;
    const show = () => {
      popWord(this, at.x, at.y - 120, `미션 성공! +${m.points}`, { size: 30, color: '#2e7d5b' });
      this.banner(['특별 미션 성공!', `"${m.name}"`], '#2e9e6b');
      this.checkClear();
    };
    // 방귀 방석은 대표 반응(뿅·버둥·말풍선)을 다 보고 나서 성공 표시
    if (this.blackout) this.time.delayedCall(FART_LOOK_MS, show);
    else show();
  }

  /** STAGE 2 승인서 미션: 성공하면 바로 확정. 과장이 돌아와 서류를 들고 부장실 옆으로 가는 연출을 이어 붙인다 */
  private setupApproval(): void {
    this.approval = new Approval(this, this.target, this.touch);
    this.setupTask(this.approval, APPROVAL.lines.picked);
  }

  /** STAGE 3 대정전과 최후의 방석: 대표가 돌아와 앉으면 뿌우우욱 → 성공 */
  private setupBlackout(): void {
    this.blackout = new Blackout(this, this.target, this.patrolById('biseo'));
    this.setupTask(this.blackout, BLACKOUT.lines.picked);
  }

  /** E 미션 공통 연결: 성공·줍기·진행 소리, 대상 도착·착석 알림 */
  private setupTask(task: MissionTask, pickedLine: string): void {
    this.task = task;
    task.on('done', () => this.completeMission());
    task.on('picked', () => {
      this.sfx.play('pick');
      // 안내가 켜져 있으면 다음 목적지를 스포트라이트로 비춘다 (노란 한 줄은 겹치니 생략)
      if (this.approval) this.tip(this.target.awayFromSeat ? 'apprAway' : 'apprPicked');
      else if (this.blackout) this.tip('boPicked');
      if (!this.tipsOn) this.guide.show(pickedLine, 4);
    });
    task.on('dark', (on: boolean) => on && this.tip('boDark'));
    task.on('sheet', () => this.blackout?.phase === 'placed' && this.tip('boPlaced'));
    task.on('sheet', () => this.sfx.play('stick'));
    task.on('fart', (x: number, y: number) => {
      this.sfx.play('fart');
      // 숨어서 기다리던 곳이 멀어도 보이게: 카메라가 대표에게 갔다가 반응이 끝나면 돌아온다
      if (this.tipPan === null) {
        this.tipPan = 'going';
        this.cameras.main.stopFollow();
        this.cameras.main.pan(x, y - 40, 260, 'Sine.easeOut', true, (_c: Phaser.Cameras.Scene2D.Camera, t: number) => {
          if (t < 1) return;
          this.tipPan = 'away';
          this.time.delayedCall(FART_LOOK_MS, () => this.tipPanBack());
        });
      }
      // 근처 직원 (8층은 엑스트라가 없어서 대표실 앞 비서가 웃는다)
      const biseo = this.patrolById('biseo');
      const near = biseo && !biseo.hidden && Phaser.Math.Distance.Between(x, y, biseo.x, biseo.y) < 700 ? biseo : null;
      const who = this.extras.nearestTo(x, y, 420) ?? near;
      if (who) this.time.delayedCall(700, () => popWord(this, who.x, who.y - 100, BLACKOUT.lines.laugh, { color: '#8d7f99', size: 22 }));
    });
    // 대상 도착·착석 알림은 포스트잇·껌(Pranks)도 쓰므로 이어 붙인다
    const arrive = this.target.onArrive;
    this.target.onArrive = () => {
      arrive?.();
      task.onTargetArrived();
    };
    const seated = this.target.onSeatedBack;
    this.target.onSeatedBack = () => {
      seated?.();
      task.onTargetSeated();
    };
  }

  /** 효과음: 콕(임시 점수 오름)·확정(확정 점수 오름)·아이템 줍기·붙이기. 들킴·클리어·실패는 그 자리에서 */
  private setupSfx(): void {
    this.sfx = new Sfx(this);
    let temp = 0;
    let confirmed = 0;
    this.score.on('change', () => {
      // 콤보가 이어질수록 뽁 → 뾱 → 뿅 음이 올라간다
      if (this.score.temp > temp) this.sfx.play('poke', 1 + Math.min(this.poke.combo, 40) * 0.025);
      // 클리어 순간엔 클리어 소리만
      if (this.score.confirmed > confirmed && !this.cleared) this.sfx.play('confirm');
      temp = this.score.temp;
      confirmed = this.score.confirmed;
    });
    this.items.on('picked', () => this.sfx.play('pick'));
    this.pranks.on('used', (id: ItemId) => this.sfx.play(id === 'gum' ? 'gum' : 'stick'));
  }

  /** 단계 안내: 해낸 순간 체크하고 다음 할 일로 */
  private setupTutorial(): void {
    this.tutorial = new Tutorial();
    const t = this.tutorial;
    this.items.on('picked', (id: ItemId) => id === 'postit' && t.complete('pick'));
    this.pranks.on('used', (id: ItemId) => {
      if (id !== 'postit') return;
      t.complete('pick');
      t.complete('stick');
    });
    this.score.on('change', () => this.score.temp > 0 && t.complete('poke'));
    this.hide.onConfirm = () => {
      t.complete('confirm');
      if (!this.confirmSpot) this.confirmSpot = { x: this.player.x, y: this.player.y };
    };
    t.on('change', (id: string) => {
      this.refreshMission();
      if (t.finished || !this.stage.tutorial) return;
      popWord(this, this.player.x, this.player.y - 150, '✔ 좋아!', { color: '#2e9e6b', size: 24 });
      // 처음 콕으로 임시 점수가 생겼을 때: 확정하러 가는 법
      if (id === 'poke' && !t.done.has('confirm')) {
        if (this.tipsOn) return this.tip('temp');
        this.guide.show(TUTORIAL_TEXT.firstTemp[this.controls.isTouch ? 'touch' : 'pc'], 5);
      }
    });
    this.refreshMission();
  }

  private refreshMission(): void {
    const t = this.tutorial;
    const m = this.stage.mission;
    // 튜토리얼이 아닌 스테이지: 미션 칸엔 특별 미션만
    if (!this.stage.tutorial) {
      const st = this.missionStep;
      this.hud.setMission(this.missionDone ? `✔ ${m.name} 성공!` : st ? `★ 미션 ${st.text}` : `★ 특별 미션 "${m.name}": ${m.goal}`, this.missionDone);
      return;
    }
    // 스포트라이트 안내가 켜져 있으면 단계 설명은 안내가 맡고 미션 칸은 숨긴다 (11/10). 끄면 다시 보인다
    if (this.tipsOn) return this.hud.setMission('');
    const line = t.text(this.controls.isTouch);
    const all = t.finished && this.missionDone;
    this.hud.setMission(all ? `✔ ${this.stage.mission.name} 성공! · ${line}` : `★ ${line}`, all);
  }

  /** STAGE 2·3 특별 미션 단계: 상단 미션 칸 + 목적지 ★(화면 안) / 초록 화살표(화면 밖) + 미니맵 별 */
  private updateMissionGuide(): void {
    this.missionStep = this.task && !this.missionDone ? this.task.step(this.controls.isTouch) : null;
    if (!this.stage.tutorial) this.refreshMission();
    const at = this.paused ? null : (this.missionStep?.at ?? null);
    if (this.missionStep) this.missionArrow.setIcon(this.missionStep.icon, 28);
    this.missionArrow.update(this.cameras.main, at && { x: at.x, y: at.y + 30 }, this.miniMap.rect);
    // 바로 옆까지 오면 ★는 숨긴다 (E 안내와 겹치지 않게)
    const show = !!at && Phaser.Math.Distance.Between(this.player.x, this.player.y, at.x, at.y) > 110;
    this.missionStar.setVisible(show);
    if (at) this.missionStar.setPosition(at.x, at.y - 70);
  }

  /** 처음 임시 점수를 들고 있는 동안: 내 자리 위 "▼ E 꾹" + 화면 밖이면 가장자리 화살표 */
  private updateSeatGuide(): void {
    const t = this.tutorial;
    const on = !this.paused && t.done.has('poke') && !t.done.has('confirm') && this.score.temp > 0 && !this.hide.hidden;
    const seat = this.map.mySeat;
    this.seatMark.setVisible(on);
    this.seatArrow.update(this.cameras.main, on ? { x: seat.x, y: seat.y + 50 } : null, this.miniMap.rect);
  }

  /** 동기가 처음 돌아보려 할 때(의심 1단계) 가까이 있으면 주인공 혼잣말 한 번 */
  private updateThought(dt: number): void {
    const p = this.player;
    if (!this.thoughtShown && !this.paused && this.target.state === 'suspect') {
      const d = Phaser.Math.Distance.Between(p.x, p.y, this.target.x, this.target.y);
      if (d <= TUTORIAL_TEXT.firstTellRange) {
        this.thoughtShown = true;
        // 첫 돌아봄은 게임을 멈추지 않고 주인공 혼잣말로만
        this.thoughtT = TUTORIAL_TEXT.firstTellSeconds;
        this.thought = this.add
          .text(p.x, p.y, TUTORIAL_TEXT.firstTell, {
            fontFamily: FONT,
            fontSize: '16px',
            color: '#5a3a4a',
            backgroundColor: '#ffffff',
            padding: { x: 10, y: 5 },
          })
          .setOrigin(0.5, 1)
          .setDepth(DEPTH.label + 6)
          .setScale(CAMERA.textScale * 0.6);
        this.tweens.add({ targets: this.thought, scale: CAMERA.textScale, duration: 200, ease: 'Back.Out' });
      }
    }
    if (!this.thought) return;
    this.thought.setPosition(p.x, p.y - 140);
    if (!this.paused) this.thoughtT -= dt;
    if (this.thoughtT <= 0) {
      this.thought.destroy();
      this.thought = null;
    }
  }

  /** 클리어 조건: 킹받음 100 확정 + 특별 미션 성공 (목숨이 남아 있을 때) */
  private checkClear(): void {
    if (this.cleared || this.failed || !this.life.alive) return;
    if (this.missionDone && this.score.confirmed >= this.score.goal) this.showClear();
  }

  /** 확정 킹받음이 목표에 처음 닿았을 때: 미션이 남았으면 알려 준다 */
  private announceGoal(): void {
    if (this.goalAnnounced || this.score.confirmed < this.score.goal) return;
    this.goalAnnounced = true;
    if (this.missionDone) return this.checkClear();
    this.banner(['킹받음 100 달성!', `이제 특별 미션 "${this.stage.mission.name}"만!`], '#e0457b');
  }

  /** 화면 위쪽 큰 알림 (잠깐 떴다 사라짐) */
  private banner(lines: string[], stroke: string): void {
    const t = this.add
      .text(GAME_WIDTH / 2, 130, lines, {
        fontFamily: FONT,
        fontSize: '30px',
        color: '#ffffff',
        align: 'center',
        stroke,
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.label + 30)
      .setScale(0.5);
    this.tweens.add({ targets: t, scale: 1, duration: 250, ease: 'Back.Out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 2500, duration: 400, onComplete: () => t.destroy() });
  }

  /** 장난 중이거나 임시 점수를 들고 있을 때 돌아본 대상에게 보이면 들킨다 */
  private checkCaught(): void {
    // 쓰레기통 버전: 쓰레기통 안에서 움직이는 걸 보이면 들킨다 (가만히 있으면 안 보인다)
    if (this.hide.inTrash) {
      if (this.player.speed <= TRASH.movingSpeed) return;
      const { x, y } = this.player;
      if (this.target.isLooking && this.target.canSee(x, y)) return this.onCaught('trashMoved', 'target');
      const seen = this.patrols.find((p) => p.canSee(x, y));
      if (seen) this.onCaught('trashMoved', seen);
      return;
    }
    if (this.hide.hidden) return; // 숨어 있으면 안 보인다
    const filing = !!this.task?.busy;
    const sticking = this.pranks.active || filing;
    const guilty = this.poke.active || sticking || this.score.temp > 0;
    if (!guilty) return;
    const { x, y } = this.player;
    const t = this.target;
    const stickReason: CaughtReasonId = filing ? this.task!.caughtReason : 'sticking';
    if (t.isLooking && t.canSee(x, y)) return this.onCaught(sticking ? stickReason : 'turned', 'target');
    // 서류 끼우기·방석 깔기 중 대상이 자리로 돌아오면 (가까이 오거나 앉으면) 들킨다
    if (filing && (!t.awayFromSeat || (t.state === 'returning' && Phaser.Math.Distance.Between(x, y, t.x, t.y) <= this.task!.walkSeeRange))) {
      return this.onCaught(stickReason, 'target');
    }
    // 순찰 중인 방해 NPC 시야 (바닥 부채꼴)
    const seen = this.patrols.find((p) => p.canSee(x, y));
    // 비서에게 보이면 원인 문구도 비서 전용
    const seenReason: CaughtReasonId = seen?.pattern.id === 'biseo' ? 'secretary' : seen?.pattern.id === 'insa' ? 'hr' : 'escaping';
    if (seen) return this.onCaught(sticking ? stickReason : seenReason, seen);
  }

  /** 들킴: 임시 점수 소멸 → 컷인(하트 -1) → 하트가 없으면 실패 화면 */
  private onCaught(reason: CaughtReasonId, by: 'target' | PatrolController): void {
    this.caughtCount += 1;
    const w = by === 'target' ? this.target : by;
    this.lastCaught = {
      by: by === 'target' ? 'target' : by.pattern.id,
      reason,
      player: { x: Math.round(this.player.x), y: Math.round(this.player.y) },
      who: { x: Math.round(w.x), y: Math.round(w.y) },
      facing: this.target.facingName,
      side: this.target.lookSide,
    };
    this.poke.cancel(this.target);
    this.pranks.cancel();
    this.task?.onCaught();
    if (this.hide.inTrash) this.hide.forceExit(this.player);
    this.score.loseTemp();
    const who = w;
    if (by === 'target') this.target.onCaught();
    else by.onCaught(this.player.x, this.player.y);
    this.cutin.play({
      reason,
      targetId: this.stage.target.id,
      cause: { x: who.x, y: who.y - 70 },
      follow: this.player.cameraTarget,
      onHit: () => {
        this.sfx.play('caught');
        this.life.lose(reason);
      },
      onDone: () => {
        if (!this.life.alive) this.showFail('caught');
      },
    });
  }

  /** 실패 화면. caught = 하트 0개, overtime = 시간 초과(야근 확정) */
  private showFail(kind: 'caught' | 'overtime'): void {
    if (this.failed || this.cleared) return;
    this.failed = true;
    this.sfx.play('fail');
    this.showResult(kind);
  }

  /** 클리어 화면: 대상이 폭발하고 "공략 성공!" */
  private showClear(): void {
    if (this.failed || this.cleared) return;
    this.cleared = true;
    this.sfx.play('clear');
    this.target.view.setPose({ face: TEX.faceShock });
    this.target.view.say(this.stage.lines.clear, 3);
    RunStats.record({
      stage: this.stage.id,
      confirmed: this.score.confirmed,
      caught: this.caughtCount,
      caughtBy: { ...this.life.caughtBy },
      seconds: Math.round(this.stage.timeLimit - this.clock.remaining),
      hearts: this.life.hearts,
    });
    this.showResult('clear');
  }

  private showResult(kind: ResultKind): void {
    this.poke.cancel(this.target);
    this.pranks.cancel();
    this.task?.cancel();
    this.result = new ResultPanel(
      this,
      {
        kind,
        stage: this.stage,
        hearts: this.life.hearts,
        maxHearts: this.life.max,
        remaining: this.clock.remaining,
        caughtCount: this.caughtCount,
        caughtBy: this.life.caughtBy,
        confirmed: this.score.confirmed,
        goal: this.score.goal,
        missionDone: this.missionDone,
        touch: this.controls.isTouch,
      },
      () => this.retry(),
      () => this.scene.start('Title'),
      // 마지막 스테이지 다음은 엔딩 컷신
      () => {
        const next = nextStage(this.stage.id);
        this.scene.start('Story', { stage: next ?? ENDING_STORY });
      },
    );
  }

  /** 이 스테이지만 처음부터 다시 (도입 컷신은 없음) */
  private retry(): void {
    this.scene.restart({ retry: true, stage: this.stage.id });
  }

  private patrolById(id: string): PatrolController | undefined {
    return this.patrols.find((p) => p.pattern.id === id);
  }

  /** 확인용 방해 NPC 상태 */
  private patrolInfo(p: PatrolController | undefined) {
    if (!p) return undefined;
    return { kind: p.grabKind, state: p.state, x: Math.round(p.x), y: Math.round(p.y), route: p.routeIndex, hidden: p.hidden, range: p.vision.range };
  }

  private setupDebug(): void {
    this.debug = new DebugOverlay(this);
    this.debug.addInfo(() => {
      const p = this.player;
      const room = this.map.roomAt(p.x, p.y);
      const hide = this.map.hideSpotAt(p.x, p.y);
      return [
        `FPS ${Math.round(this.game.loop.actualFps)}   퇴근까지 ${this.clock.remaining.toFixed(0)}초 (${this.clock.clockText})   하트 ${this.life.hearts}`,
        `위치 (${Math.round(p.x)}, ${Math.round(p.y)})  속도 ${Math.round(p.speed)}  방향 ${p.facing}`,
        `구역 ${room ? room.name : '-'}`,
        `숨기 가능 ${hide ? hide.id : '-'}   숨는 중 ${this.hide.hidden ? `O ${this.hide.holdTime.toFixed(1)}초` : '-'}`,
      ];
    });
    this.debug.addInfo(() => {
      const t = this.target;
      const isCheck = ['suspect', 'fake', 'real', 'look'].includes(t.state);
      return [
        `── ${t.pattern.name}`,
        `상태 ${t.stateName}  남은 ${t.remaining.toFixed(1)}초`,
        `이번 의심 ${isCheck ? (t.isReal ? `진짜(${['왼쪽', '가운데', '오른쪽'][t.lookSide + 1]})` : '페이크') : '-'}   연속 페이크 ${t.consecutiveFakes}`,
        `자리 비우기까지 ${t.tripIn.toFixed(0)}초   짜증 ${t.irritated ? 'O' : '-'}   연타 잠금 ${t.pokeLocked ? 'O' : '-'}`,
        `콕 ${this.poke.active ? `중 ${this.poke.rate.toFixed(1)}회/초` : '-'}   배율 x${t.scoreMultiplier}   들킴 ${this.caughtCount}`,
      ];
    });
    this.debug.addInfo(() =>
      this.patrols.flatMap((d) => [
        `── ${d.pattern.name}`,
        `상태 ${d.stateName}(${d.routeName})  남은 ${d.remaining.toFixed(1)}초  시야 ${d.watching ? 'O' : '-'}  붙잡기 대기 ${d.grabCooldown.toFixed(0)}초  뭐해요 대기 ${d.stopCooldown.toFixed(0)}초${d.state === 'grab' ? `  (${d.grabKind === 'stop' ? '세움' : '붙잡음'})` : ''}`,
      ]),
    );
    this.debug.addInfo(() => {
      const it = this.items;
      const pr = this.pranks;
      const slots = it.slots.map((s, i) => (i === it.selected ? `[${s ? ITEMS[s].name : '빈칸'}]` : s ? ITEMS[s].name : '빈칸')).join(' ');
      const onMap = it.onMap.map((m) => `${ITEMS[m.id].name}@${m.spot.name}`).join(', ') || '-';
      const pending = it.pending.map((t) => `${t.toFixed(0)}초`).join(', ') || '-';
      return [
        '── 아이템',
        `슬롯 ${slots}   맵 ${onMap}`,
        `다시 생김 ${pending}   붙이는 중 ${pr.active ? `${(pr.progress * 100).toFixed(0)}%` : '-'}   포스트잇 ${pr.postitOn ? 'O' : '-'}   껌 ${pr.gumOnBag ? 'O' : '-'}`,
      ];
    });
    this.debug.addInfo(() => {
      const ex = this.extras;
      return ['── 엑스트라', `앉음 ${ex.list.length - ex.walkingCount}  돌아다님 ${ex.walkingCount}  빈자리 ${ex.seats.filter((s) => !s.taken).length}`];
    });
    this.debug.addWorldDrawer((g) => {
      this.map.drawDebug(g);
      this.extras.drawDebug(g);
      // 아이템 생성 지점(노랑)과 동기 가방 껌 범위(분홍)
      g.lineStyle(2, 0xf9a825, 0.9);
      for (const s of this.stage.floor.itemSpawns) g.strokeCircle(s.x, s.y, ITEM_RULES.pickupRadius);
      g.lineStyle(2, 0xec407a, 0.9).strokeCircle(this.pranks.bag.x, this.pranks.bag.y, ITEM_RULES.gumRange);
      const t = this.target;
      // 콕 찌르기 범위
      g.lineStyle(2, 0xff4f8b, 0.8).strokeCircle(t.x, t.y, POKE.range);
      // 확인 시야 (공략 대상의 시야는 화면에 안 보이고 디버그에서만)
      const L = t.pattern.look;
      const d = t.lookDir;
      const a = Math.atan2(d.y, d.x);
      const half = Phaser.Math.DegToRad(L.halfAngleDeg);
      g.fillStyle(t.isLooking ? 0xe53935 : 0xffb300, t.isLooking ? 0.3 : 0.12);
      g.slice(t.x, t.y, L.range, a - half, a + half, false).fillPath();
      g.fillCircle(t.x, t.y, L.nearRadius);
    });
  }

  private followPlayer(): void {
    this.cameras.main.startFollow(this.player.cameraTarget, true, CAMERA.lerp, CAMERA.lerp, 0, 40);
  }

  private setupCamera(): void {
    const cam = this.cameras.main;
    // 맵은 넓게(0.8배) 보고, HUD·버튼·컷인 글자(화면 고정 = scrollFactor 0)는 1배 카메라로 따로 그린다
    cam.setZoom(this.controls.isTouch ? CAMERA.zoomTouch : CAMERA.zoom);
    // 맵 맨 위(탕비실·동기 자리)에서도 머리 위 글자가 HUD 아래로 보이게 위쪽에 HUD 높이만큼 여유를 둔다.
    // 미니맵 쪽 끝(PC 아래, 모바일 위)에도 미니맵 높이만큼 여유를 둬서, 맵 끝에 서도 나·대상이 미니맵에 가리지 않게 한다 (11/9)
    const mapH = (this.stage.floor.world.height * MINIMAP.width) / this.stage.floor.world.width + MINIMAP.margin * 2;
    const topPx = this.controls.isTouch ? Math.max(CAMERA.hudTop, MINIMAP.touchTop + mapH) : CAMERA.hudTop;
    const bottomPx = this.controls.isTouch ? 0 : mapH;
    const top = topPx / cam.zoom;
    const bottom = bottomPx / cam.zoom;
    cam.setBounds(0, -top, this.map.width, this.map.height + top + bottom).setRoundPixels(true);
    const uiCam = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const split = () => {
      const ui: Phaser.GameObjects.GameObject[] = [];
      const world: Phaser.GameObjects.GameObject[] = [];
      for (const o of this.children.list) ((o as unknown as { scrollFactorX: number }).scrollFactorX === 0 ? ui : world).push(o);
      cam.ignore(ui);
      uiCam.ignore(world);
    };
    this.events.on(Phaser.Scenes.Events.PRE_RENDER, split);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.PRE_RENDER, split));
    this.followPlayer();
    cam.setDeadzone(CAMERA.deadzoneW, CAMERA.deadzoneH);

    // ?overview=1 : 맵 전체를 한 화면에 (맵 확인용)
    if (new URLSearchParams(location.search).has('overview')) {
      cam.stopFollow().removeBounds();
      cam.setZoom(Math.min(cam.width / this.map.width, cam.height / this.map.height));
      cam.centerOn(this.map.width / 2, this.map.height / 2);
    }
  }
}
