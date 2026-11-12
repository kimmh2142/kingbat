import Phaser from 'phaser';
import { TEX } from '../assets/keys';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { HIGHLIGHTS, SPEAKERS, STORIES, type StageStory, type StoryShot } from '../data/dialogue';
import { ISA } from '../npc/patterns/isa';
import { NpcView } from '../npc/NpcView';
import { DONGI } from '../npc/patterns/dongi';
import { GWAJANG } from '../npc/patterns/gwajang';
import { BISEO } from '../npc/patterns/biseo';
import { DAEPYO } from '../npc/patterns/daepyo';
import { EXTRA_LOOKS } from '../data/extras';
import { STAGES } from '../data/stages';
import type { NpcLook } from '../npc/types';
import { popWord } from '../ui/Popups';

/** 컷신 무대 가운데 (월드 좌표). 카메라를 2배로 키워 캐릭터를 크게 보여준다 */
const CX = 490;
const CY = 290;
const ZOOM = 2;
const BOX_H = 132;
/** 한 글자 나오는 간격 (초) */
const TYPE_SPEED = 0.035;
/** 오프닝 독백: 천천히, 줄이 바뀔 때마다 잠깐 멈춘다 */
const MONO_SPEED = 0.07;
const MONO_LINE_PAUSE = 0.45;
/** 독백이 다 나온 뒤 정적 (초). 그다음 저절로 다음 장면으로 */
const MONO_HOLD = 1.4;
/** 독백 화면이 서서히 사라지는 시간 (ms) */
const MONO_FADE = 500;

/**
 * 스테이지 도입 컷신: 목표 대상이 왜 킹받게 했는지 짧은 장면 몇 개 + 대사창.
 * Space·Enter·터치로 넘기고(글자가 나오는 중이면 한 번에 다 보여줌), Esc·[건너뛰기]로 바로 게임.
 * 무대(캐릭터)는 2배 카메라, 대사창·자막은 1배 카메라로 그린다.
 */
export class StoryScene extends Phaser.Scene {
  private story!: StageStory;
  private step = 0;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private ui!: Phaser.GameObjects.Container;
  private shotUi!: Phaser.GameObjects.Container;
  private nameTag!: Phaser.GameObjects.Container;
  private nameBg!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private lineText!: Phaser.GameObjects.Text;
  /** 지금 글자가 찍히는 곳 (대사창 또는 독백) */
  private typeText!: Phaser.GameObjects.Text;
  private box!: Phaser.GameObjects.Graphics;
  private holdT = -1;
  /** 독백에서 넘어갈 때 서서히 사라지는 독백 화면 */
  private monoFade?: Phaser.GameObjects.Container;
  private nextMark!: Phaser.GameObjects.Text;
  private full = '';
  private shown = 0;
  private typeT = 0;
  private world: Phaser.GameObjects.GameObject[] = [];
  private npcs: NpcView[] = [];
  private done = false;
  private stage = 1;

  constructor() {
    super('Story');
  }

  /** 클리어 뒤 "오늘의 명장면": 게임 위에 띄웠다가 끝나면 게임 장면(결과 화면)으로 돌아간다 */
  private highlight = false;

  create(data?: { stage?: number; highlight?: boolean }): void {
    this.stage = data?.stage ?? 1;
    this.highlight = !!data?.highlight;
    const story = this.highlight ? HIGHLIGHTS[this.stage] : STORIES[this.stage];
    if (!story) {
      this.scene.start('Office', { stage: this.stage });
      return;
    }
    this.story = story;
    this.step = 0;
    this.done = false;
    this.world = [];
    this.npcs = [];

    const cam = this.cameras.main.setZoom(ZOOM).centerOn(CX, CY).setBackgroundColor('#3b2a33');
    this.add.tileSprite(CX - 400, CY - 300, 800, 600, TEX.floorOffice).setOrigin(0).setDepth(-1000);
    this.uiCam = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.makeUi();
    cam.ignore(this.ui);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') this.advance();
      else if (e.code === 'Escape') this.finish();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!over.length) this.advance();
    });
    window.__kingbatStory = { step: () => this.step, shot: () => this.story.steps[this.step]?.shot ?? null, total: this.story.steps.length, typing: () => this.shown < this.full.length };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', onKey);
      window.__kingbatStory = undefined;
    });

    this.cameras.main.fadeIn(300, 59, 42, 51);
    this.uiCam.fadeIn(300, 59, 42, 51);
    this.showStep();
  }

  update(_time: number, delta: number): void {
    // 새로 생긴 무대 물건(의성어 등)은 대사창 카메라에 안 보이게
    this.uiCam.ignore(this.children.list.filter((o) => o !== this.ui));
    for (const n of this.npcs) n.update(delta / 1000);
    const mono = this.story.steps[this.step].shot === 'monologue';
    if (this.shown < this.full.length) {
      this.typeT += delta / 1000;
      const wait = () => (!mono ? TYPE_SPEED : this.full[this.shown] === '\n' ? MONO_LINE_PAUSE : MONO_SPEED);
      while (this.shown < this.full.length && this.typeT >= wait()) {
        this.typeT -= wait();
        this.shown += 1;
      }
      this.typeText.setText(this.full.slice(0, this.shown));
      if (mono && this.shown >= this.full.length) this.holdT = MONO_HOLD;
    } else if (this.holdT > 0) {
      // 독백 뒤 정적이 끝나면 저절로 다음 장면
      this.holdT -= delta / 1000;
      if (this.holdT <= 0) this.advance();
    }
    this.nextMark.setVisible(this.shown >= this.full.length);
  }

  // ------------------------------------------------------------ 진행

  private advance(): void {
    if (this.done) return;
    if (this.shown < this.full.length) {
      this.shown = this.full.length;
      this.typeText.setText(this.full);
      if (this.story.steps[this.step].shot === 'monologue') this.holdT = MONO_HOLD;
      return;
    }
    this.holdT = -1;
    if (this.step >= this.story.steps.length - 1) return this.finish();
    // 독백 화면은 바로 지우지 않고 다음 장면 위에서 서서히 사라지게 한다
    const carry = this.story.steps[this.step].shot === 'monologue' ? [...this.shotUi.list] : [];
    this.shotUi.remove(carry);
    this.step += 1;
    this.showStep();
    if (carry.length) {
      const fade = (this.monoFade = this.add.container(0, 0, carry));
      this.ui.add(fade);
      this.tweens.add({ targets: fade, alpha: 0, duration: MONO_FADE, onComplete: () => fade.destroy() });
    }
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.cameras.main.fadeOut(300, 59, 42, 51);
    this.uiCam.fadeOut(300, 59, 42, 51);
    if (this.highlight) {
      // 명장면: 멈춰 둔 게임 장면으로 돌아가면 결과 화면이 뜬다 (OfficeScene RESUME)
      this.uiCam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.resume('Office');
        this.scene.stop();
      });
      return;
    }
    // 엔딩 컷신(STAGES에 없는 번호)이 끝나면 엔딩 결과 화면
    const next = STAGES[this.stage] ? 'Office' : 'Ending';
    this.uiCam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(next, { stage: this.stage }));
  }

  private showStep(): void {
    const s = this.story.steps[this.step];
    const sp = SPEAKERS[s.who];
    this.nameTag.setVisible(!!sp.name);
    if (sp.name) {
      this.nameText.setText(sp.name);
      const w = this.nameText.width + 28;
      this.nameBg.clear();
      this.nameBg.fillStyle(sp.color).fillRoundedRect(0, -18, w, 36, 18);
      this.nameBg.lineStyle(4, COLORS.outline).strokeRoundedRect(0, -18, w, 36, 18);
    }
    this.full = s.text;
    this.shown = 0;
    this.typeT = 0;
    this.holdT = -1;
    this.lineText.setText('');
    // 독백은 대사창 없이 검은 화면 가운데에 나온다
    const mono = s.shot === 'monologue';
    this.box.setVisible(!mono);
    this.lineText.setVisible(!mono);
    if (mono) this.nameTag.setVisible(false);
    this.typeText = this.lineText;
    this.shot(s.shot);
    if (s.caption) this.caption(s.caption);
  }

  // ------------------------------------------------------------ 대사창

  private makeUi(): void {
    const y = GAME_HEIGHT - BOX_H - 12;
    const box = (this.box = this.add.graphics());
    box.fillStyle(COLORS.outline).fillRoundedRect(16, y + 6, GAME_WIDTH - 32, BOX_H, 20);
    box.fillStyle(0xfffafc).fillRoundedRect(16, y, GAME_WIDTH - 32, BOX_H, 20);
    box.lineStyle(5, COLORS.outline).strokeRoundedRect(16, y, GAME_WIDTH - 32, BOX_H, 20);
    this.nameBg = this.add.graphics();
    this.nameText = this.add.text(14, 0, '', { fontFamily: FONT, fontSize: '20px', color: '#ffffff' }).setOrigin(0, 0.5);
    this.nameTag = this.add.container(40, y, [this.nameBg, this.nameText]);
    this.lineText = this.add.text(48, y + 34, '', {
      fontFamily: FONT,
      fontSize: '27px',
      color: COLORS.text,
      wordWrap: { width: GAME_WIDTH - 120 },
      lineSpacing: 6,
    });
    this.nextMark = this.add.text(GAME_WIDTH - 52, y + BOX_H - 16, '▼', { fontFamily: FONT, fontSize: '20px', color: '#ff4f8b' }).setOrigin(0.5, 1);
    this.tweens.add({ targets: this.nextMark, y: this.nextMark.y + 5, duration: 400, yoyo: true, repeat: -1 });

    const skipBg = this.add.graphics();
    skipBg.fillStyle(0xffffff, 0.9).fillRoundedRect(-62, -18, 124, 36, 18);
    skipBg.lineStyle(3, COLORS.outline).strokeRoundedRect(-62, -18, 124, 36, 18);
    const skipText = this.add.text(0, 0, '건너뛰기 ▶▶', { fontFamily: FONT, fontSize: '17px', color: COLORS.text }).setOrigin(0.5);
    const skip = this.add.container(GAME_WIDTH - 84, 30, [skipBg, skipText]).setSize(124, 36).setInteractive({ useHandCursor: true });
    skip.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.finish());

    this.shotUi = this.add.container(0, 0);
    this.ui = this.add.container(0, 0, [this.shotUi, box, this.nameTag, this.lineText, this.nextMark, skip]).setDepth(100000);
  }

  // ------------------------------------------------------------ 장면

  private clearShot(): void {
    for (const o of this.world) o.destroy();
    for (const n of this.npcs) n.destroy();
    this.world = [];
    this.npcs = [];
    this.shotUi.removeAll(true);
    this.monoFade?.destroy();
    this.monoFade = undefined;
    this.tweens.killAll();
    // 명장면 구경꾼 웃음처럼 장면 안에서 되풀이하던 예약도 같이 끈다
    this.time.removeAllEvents();
    this.nextMark.setY(GAME_HEIGHT - 28);
    this.tweens.add({ targets: this.nextMark, y: GAME_HEIGHT - 28 + 5, duration: 400, yoyo: true, repeat: -1 });
    this.cameras.main.setZoom(ZOOM).centerOn(CX, CY);
  }

  private keep<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.world.push(o);
    return o;
  }

  private shot(kind: StoryShot): void {
    this.clearShot();
    switch (kind) {
      case 'monologue':
        return this.monologueSet();
      case 'ask':
        return this.officeSet(0, false);
      case 'dump':
        return this.officeSet(3, true);
      case 'reply':
        return this.officeSet(3, false, true);
      case 'shopping':
        return this.shoppingSet(false);
      case 'angry':
        return this.shoppingSet(true);
      case 'pacing':
        return this.pacingSet(false);
      case 'pacingAngry':
        return this.pacingSet(true);
      case 'ceo':
        return this.ceoSet('read');
      case 'ceoReport':
        return this.ceoSet('report');
      case 'ceoLaugh':
        return this.ceoSet('laugh');
      case 'final':
      case 'finalMe':
      case 'finalOk':
        return this.finalSet(kind);
      case 'promoted':
      case 'cheer':
        return this.newBossSet(kind);
      case 'newbie':
      case 'poke':
      case 'pokeMe':
      case 'innocent':
        return this.newbieSet(kind);
      case 'vow':
        return this.vowSet();
      case 'paradeWalk':
        return this.paradeWalkSet();
      case 'paradeNote':
        return this.paradeNoteSet();
      case 'apprBoss':
        return this.apprBossSet();
      case 'apprStamp':
        return this.apprStampSet();
    }
  }

  /** 오프닝 독백: 검은 화면 가운데에 한 줄씩 진지하게 */
  private monologueSet(): void {
    const dark = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x111014).setOrigin(0);
    const text = this.add
      .text(GAME_WIDTH / 2, 0, this.full, { fontFamily: FONT, fontSize: '24px', color: '#f3eef1', align: 'center', lineSpacing: 10 })
      .setOrigin(0.5, 0);
    // 다 나왔을 때 기준으로 위치를 정해 두고 비운다 (글자가 늘어나도 줄이 흔들리지 않게)
    text.setY(GAME_HEIGHT / 2 - 8 - text.height / 2).setText('');
    this.shotUi.add([dark, text]);
    this.typeText = text;
  }

  /** 내 자리: 나는 앉아 있고 일을 떠넘기는 사람(동기·과장)이 옆에 서서 부탁한다 */
  private officeSet(papers: number, drop: boolean, sweat = false): void {
    const deskX = 545;
    const deskY = 345;
    this.desk(deskX, deskY, true);
    const me = this.me(deskX, deskY - 62);
    const gwajang = this.story.villain === 'gwajang';
    const v = new NpcView(this, { ...(gwajang ? GWAJANG : DONGI).appearance, rank: '' }, false);
    this.npcs.push(v);
    v.standAt(438, 336, 'right');
    if (gwajang) {
      // 과장: 한 손엔 전화, 싱글벙글. 통화 리듬에 맞춰 까딱까딱
      v.setPose({ face: TEX.faceHappy, hands: 'phone', tilt: drop ? 10 : -6 });
      this.tweens.add({ targets: v.root, y: 332, duration: 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      v.setPose({ face: drop ? TEX.faceHappy : TEX.faceSuspicious, hands: 'side', tilt: -10 });
      // 손 모아 비는 듯 살랑살랑
      this.tweens.add({ targets: v.root, x: 442, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    for (let i = 0; i < papers; i++) {
      // 책상 오른쪽 끝에 쌓는다 (내 얼굴을 가리지 않게)
      const x = deskX + 44 + (i % 2) * 3;
      const y = deskY - 26 - i * 10;
      const pile = this.keep(this.add.image(x, drop ? y - 160 : y, TEX.paperPile).setOrigin(0.5, 1).setDepth(deskY + 1 + i));
      if (drop) {
        this.tweens.add({
          targets: pile,
          y,
          delay: 250 + i * 280,
          duration: 260,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            popWord(this, x + 26, y - 30, i === papers - 1 ? '쿵!!' : '쿵!', { size: 22, color: '#5a3a4a' });
            this.cameras.main.shake(120, 0.006);
          },
        });
      }
    }
    if (sweat) {
      const drop1 = this.keep(this.add.ellipse(deskX + 24, deskY - 128, 8, 12, 0x90caf9).setStrokeStyle(2, COLORS.outline).setDepth(9000));
      this.tweens.add({ targets: drop1, y: deskY - 112, alpha: 0.3, duration: 700, repeat: -1 });
      this.tweens.add({ targets: me, x: deskX + 1.5, duration: 50, yoyo: true, repeat: -1 });
    }
  }

  /** 30분 뒤: 동기는 자기 자리에서 쇼핑몰, 나는 서류 더미를 안고 옆에서 본다 */
  private shoppingSet(angry: boolean): void {
    const deskX = 450;
    const deskY = 345;
    this.desk(deskX, deskY, false);
    const dongi = new NpcView(this, { ...DONGI.appearance, rank: '' }, false);
    this.npcs.push(dongi);
    dongi.sitAt(deskX, deskY - 62, deskY);
    dongi.setPose({ face: TEX.facePhone, hands: 'keyboard', typing: 0.25, tilt: 8, nod: !angry });
    // 동기 모니터를 화면 쪽으로 돌려서 보여준다
    this.monitorScreen(deskX - 18, deskY - 34);

    const meX = 585;
    const meY = 338;
    const me = this.me(meX, meY);
    // 떠넘겨 받은 서류를 품에 안고 있다 (얼굴은 보이게)
    this.keep(this.add.image(meX, meY + 8, TEX.paperPile).setOrigin(0.5, 1).setDepth(meY + 1).setScale(0.8));

    if (!angry) {
      this.caption('30분 뒤…');
      return;
    }
    // 나: 핏대가 커지고 부들부들, 카메라가 나를 당겨 본다
    const anger = this.keep(this.add.image(meX + 26, meY - 104, TEX.angerMark).setDepth(9000).setScale(0.5));
    this.tweens.add({ targets: anger, scale: 1.6, duration: 380, ease: 'Back.Out' });
    this.tweens.add({ targets: anger, angle: 12, duration: 120, yoyo: true, repeat: -1, delay: 380 });
    this.tweens.add({ targets: me, x: meX + 2, duration: 40, yoyo: true, repeat: -1 });
    this.cameras.main.pan(meX - 30, meY - 40, 450, 'Sine.easeOut');
    this.cameras.main.zoomTo(3, 450, 'Sine.easeOut');
  }

  /** 과장: 떠넘긴 뒤 전화하며 왔다 갔다. 나는 서류 더미를 안고 본다 */
  private pacingSet(angry: boolean): void {
    const walkY = 330;
    const v = new NpcView(this, { ...GWAJANG.appearance, rank: '' }, false);
    this.npcs.push(v);
    v.standAt(330, walkY, 'right');
    v.setPose({ face: TEX.faceHappy, hands: 'phone', tilt: 6 });
    // 왼쪽 끝 ↔ 가운데를 오가며 방향을 바꾼다
    this.tweens.add({
      targets: v.root,
      x: 470,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onYoyo: () => v.standAt(v.x, walkY, 'left'),
      onRepeat: () => v.standAt(v.x, walkY, 'right'),
    });
    // 걸음마다 통통
    this.tweens.add({ targets: v.root, y: walkY - 4, duration: 160, yoyo: true, repeat: -1 });
    const haha = this.keep(
      this.add.text(400, 236, '하하하!', { fontFamily: FONT, fontSize: '16px', color: '#ff9800', stroke: '#ffffff', strokeThickness: 4 }).setOrigin(0.5).setDepth(9000),
    );
    this.tweens.add({ targets: haha, x: { from: 340, to: 460 }, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: haha, scale: 1.2, duration: 220, yoyo: true, repeat: -1 });

    const meX = 600;
    const meY = 338;
    const me = this.me(meX, meY);
    this.keep(this.add.image(meX, meY + 8, TEX.paperPile).setOrigin(0.5, 1).setDepth(meY + 1).setScale(0.8));
    // 다 못 안아서 발밑에도 한 더미 (얼굴은 가리지 않게)
    this.keep(this.add.image(meX + 50, meY + 10, TEX.paperPile).setOrigin(0.5, 1).setDepth(meY + 2).setScale(0.7));
    if (!angry) return;
    const anger = this.keep(this.add.image(meX + 26, meY - 104, TEX.angerMark).setDepth(9000).setScale(0.5));
    this.tweens.add({ targets: anger, scale: 1.6, duration: 380, ease: 'Back.Out' });
    this.tweens.add({ targets: anger, angle: 12, duration: 120, yoyo: true, repeat: -1, delay: 380 });
    this.tweens.add({ targets: me, x: meX + 2, duration: 40, yoyo: true, repeat: -1 });
    this.cameras.main.pan(meX - 30, meY - 40, 450, 'Sine.easeOut');
    this.cameras.main.zoomTo(3, 450, 'Sine.easeOut');
  }

  /**
   * 8층 대표실: 대표는 큰 책상에서 신문, 비서가 옆에 서서 보고한다.
   * read = 신문 읽기, report = 신문을 내리고 듣기, laugh = 신문을 접고 허허, vow = 문 뒤에서 내가 엿본다
   */
  private ceoSet(mode: 'read' | 'report' | 'laugh' | 'vow'): void {
    const deskX = 470;
    const deskY = 345;
    this.keep(this.add.image(deskX, deskY - 62, TEX.chair).setOrigin(0.5, 1).setDepth(deskY - 62));
    this.keep(this.add.image(deskX, deskY, TEX.bossDesk).setOrigin(0.5, 1).setDepth(deskY));
    const boss = new NpcView(this, { ...DAEPYO.appearance, rank: '' }, false);
    this.npcs.push(boss);
    boss.sitAt(deskX, deskY - 62, deskY);
    if (mode === 'read') boss.setPose({ face: TEX.faceNormal, hands: 'newspaper' });
    else if (mode === 'report') boss.setPose({ face: TEX.faceSuspicious, hands: 'newspaperLow', tilt: 6 });
    else boss.setPose({ face: TEX.faceHappy, hands: 'folded', tilt: mode === 'laugh' ? -8 : 0 });

    const sec = new NpcView(this, { ...BISEO.appearance, rank: '' }, false);
    this.npcs.push(sec);
    sec.standAt(345, 338, 'right');
    sec.setPose({ face: mode === 'report' ? TEX.faceSuspicious : TEX.faceNormal, hands: 'side' });

    if (mode === 'laugh') {
      // 허허… 가 둥실둥실
      for (let i = 0; i < 3; i++) {
        const t = this.keep(
          this.add
            .text(deskX + 40 + i * 18, deskY - 140, '허', { fontFamily: FONT, fontSize: '16px', color: '#8e24aa', stroke: '#ffffff', strokeThickness: 4 })
            .setOrigin(0.5)
            .setDepth(9000)
            .setAlpha(0),
        );
        this.tweens.add({ targets: t, alpha: 1, y: t.y - 20, delay: i * 300, duration: 500, yoyo: true, hold: 300, repeat: -1, repeatDelay: 400 });
      }
      this.cameras.main.pan(deskX, deskY - 80, 450, 'Sine.easeOut');
      this.cameras.main.zoomTo(2.6, 450, 'Sine.easeOut');
    }
    if (mode === 'vow') {
      // 문틈으로 엿보는 나 (오른쪽 화분 뒤)
      const meX = 640;
      const meY = 338;
      this.me(meX, meY);
      this.keep(this.add.image(meX - 30, meY + 14, TEX.plantBig).setOrigin(0.5, 1).setDepth(meY + 2));
    }
  }

  // ------------------------------------------------------------ 엔딩

  /** 뿌우우욱 직후 대표실: 대표가 일어나 나를 본다. final = "…자네였군", finalMe = 나 식은땀, finalOk = 의자를 권한다 */
  private finalSet(kind: 'final' | 'finalMe' | 'finalOk'): void {
    const deskX = 470;
    const deskY = 300;
    this.keep(this.add.image(deskX, deskY - 62, TEX.chair).setOrigin(0.5, 1).setDepth(deskY - 62));
    this.keep(this.add.image(deskX, deskY, TEX.bossDesk).setOrigin(0.5, 1).setDepth(deskY));
    // 의자 위 납작해진 방석
    this.keep(this.add.image(deskX, deskY - 80, TEX.cushion).setScale(0.8, 0.5).setDepth(deskY - 61));
    const boss = new NpcView(this, { ...DAEPYO.appearance, rank: '' }, false);
    this.npcs.push(boss);
    boss.standAt(400, 352, 'right');
    const me = this.me(570, 352);
    if (kind === 'final') {
      boss.setPose({ face: TEX.faceSuspicious, hands: 'side', tilt: 8 });
      this.cameras.main.pan(485, 300, 500, 'Sine.easeOut');
      this.cameras.main.zoomTo(2.4, 500, 'Sine.easeOut');
    } else if (kind === 'finalMe') {
      boss.setPose({ face: TEX.faceSuspicious, hands: 'side' });
      const drop = this.keep(this.add.ellipse(596, 236, 8, 12, 0x90caf9).setStrokeStyle(2, COLORS.outline).setDepth(9000));
      this.tweens.add({ targets: drop, y: 252, alpha: 0.3, duration: 600, repeat: -1 });
      this.tweens.add({ targets: me, x: 571.5, duration: 45, yoyo: true, repeat: -1 });
    } else {
      // 허허 웃으며 손을 펴 자기 의자를 가리킨다
      boss.setPose({ face: TEX.faceHappy, hands: 'side', tilt: -6 });
      const arrow = this.keep(
        this.add.text(deskX, deskY - 150, '↓', { fontFamily: FONT, fontSize: '26px', color: '#8e24aa', stroke: '#ffffff', strokeThickness: 5 }).setOrigin(0.5).setDepth(9000),
      );
      this.tweens.add({ targets: arrow, y: arrow.y + 8, duration: 350, yoyo: true, repeat: -1 });
    }
  }

  /** 대표 자리에 앉은 나. promoted = 축하 문구와 꽃가루, cheer = 직원들이 박수 */
  private newBossSet(kind: 'promoted' | 'cheer'): void {
    const deskX = 490;
    const deskY = 345;
    this.keep(this.add.image(deskX, deskY - 62, TEX.chair).setOrigin(0.5, 1).setDepth(deskY - 62));
    this.me(deskX, deskY - 58);
    this.keep(this.add.image(deskX, deskY, TEX.bossDesk).setOrigin(0.5, 1).setDepth(deskY));
    // 금색 명패
    this.keep(this.add.rectangle(deskX, deskY - 40, 70, 16, 0xffd54f).setStrokeStyle(2, COLORS.outline).setDepth(deskY + 1));
    this.keep(this.add.text(deskX, deskY - 40, '대표', { fontFamily: FONT, fontSize: '12px', color: COLORS.text }).setOrigin(0.5).setDepth(deskY + 2));
    this.confetti();
    if (kind === 'promoted') {
      const card = this.add
        .text(GAME_WIDTH / 2, 120, '👑 새로운 대표 취임! 👑', { fontFamily: FONT, fontSize: '44px', color: '#ff3d6e', stroke: '#ffffff', strokeThickness: 10 })
        .setOrigin(0.5)
        .setScale(2.4)
        .setAlpha(0)
        .setAngle(-4);
      this.shotUi.add(card);
      this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 320, ease: 'Back.Out' });
      return;
    }
    // 회색 직원들이 양옆에서 박수
    [330, 395, 590, 655].forEach((x, i) => {
      const look: NpcLook = { ...EXTRA_LOOKS[i % EXTRA_LOOKS.length] };
      const v = new NpcView(this, look, false);
      this.npcs.push(v);
      v.standAt(x, 372, i < 2 ? 'right' : 'left');
      v.setPose({ face: TEX.faceHappy, hands: 'side' });
      this.tweens.add({ targets: v.root, y: 366, duration: 180, yoyo: true, repeat: -1, delay: i * 70 });
    });
    const clap = this.keep(
      this.add.text(GAME_WIDTH / 2 - 10, 220, '짝짝짝!', { fontFamily: FONT, fontSize: '18px', color: '#ff9800', stroke: '#ffffff', strokeThickness: 4 }).setOrigin(0.5).setDepth(9000),
    );
    this.tweens.add({ targets: clap, scale: 1.2, duration: 160, yoyo: true, repeat: -1 });
  }

  /**
   * 다음 날: 나는 대표 자리, 신입이 인사하러 온다.
   * newbie = 꾸벅 인사, poke = 내 등 뒤로 와서 콕!, pokeMe = 내가 두리번, innocent = 신입은 모른 척 타이핑 + 머리 위 킹받음 0→1
   */
  private newbieSet(kind: 'newbie' | 'poke' | 'pokeMe' | 'innocent'): void {
    const deskX = 490;
    const deskY = 345;
    this.keep(this.add.image(deskX, deskY - 62, TEX.chair).setOrigin(0.5, 1).setDepth(deskY - 62));
    const me = this.me(deskX, deskY - 58);
    this.keep(this.add.image(deskX, deskY, TEX.bossDesk).setOrigin(0.5, 1).setDepth(deskY));
    const nb = new NpcView(
      this,
      { body: TEX.newbieBody, bodyBack: TEX.newbieBodyBack, headFront: TEX.newbieHeadFront, headBack: TEX.newbieHeadBack, rank: '', rankColor: 0 },
      false,
    );
    this.npcs.push(nb);

    if (kind === 'newbie') {
      nb.standAt(360, 360, 'right');
      nb.setPose({ face: TEX.faceHappy, hands: 'side', tilt: 0 });
      // 꾸벅
      this.tweens.add({ targets: nb.root, angle: 14, duration: 300, yoyo: true, hold: 300, repeat: -1, repeatDelay: 700 });
      return;
    }
    if (kind === 'poke' || kind === 'pokeMe') {
      // 내 의자 뒤 (창문 쪽)에 몰래 서 있다
      nb.standAt(deskX + 52, deskY - 92, 'left');
      nb.setPose({ back: true, hands: 'side' });
      if (kind === 'poke') {
        this.time.delayedCall(250, () => {
          popWord(this, deskX + 20, deskY - 150, '콕!', { size: 40, color: '#ff3d6e' });
          this.tweens.add({ targets: me, x: deskX + 6, duration: 40, yoyo: true, repeat: 3 });
          this.cameras.main.shake(150, 0.008);
        });
      } else {
        const q = this.keep(
          this.add.text(deskX + 30, deskY - 150, '?!', { fontFamily: FONT, fontSize: '30px', color: '#e53935', stroke: '#ffffff', strokeThickness: 6 }).setOrigin(0.5).setDepth(9000),
        );
        this.tweens.add({ targets: q, angle: 12, duration: 120, yoyo: true, repeat: -1 });
        this.tweens.add({ targets: me, x: deskX + 4, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
      return;
    }
    // innocent: 신입은 옆 책상에서 모른 척 타닥타닥, 머리 위 킹받음 0 → 1. 나는 얼굴이 빨개지고 화면이 멈춘다
    const nx = 330;
    const ny = 360;
    this.keep(this.add.image(nx, ny - 62, TEX.chair).setOrigin(0.5, 1).setDepth(ny - 62));
    this.keep(this.add.image(nx, ny, TEX.desk).setOrigin(0.5, 1).setDepth(ny));
    this.keep(this.add.image(nx - 18, ny - 30, TEX.monitor).setOrigin(0.5, 1).setDepth(ny + 0.1));
    nb.sitAt(nx, ny - 62, ny);
    nb.setPose({ face: TEX.faceNormal, hands: 'keyboard', typing: 1 });
    const gauge = this.keep(
      this.add
        .text(nx, ny - 186, '킹받음 0', { fontFamily: FONT, fontSize: '14px', color: '#ffffff', backgroundColor: '#ff4f8b', padding: { x: 6, y: 3 } })
        .setOrigin(0.5)
        .setDepth(9000),
    );
    this.time.delayedCall(700, () => {
      gauge.setText('킹받음 1');
      this.tweens.add({ targets: gauge, scale: 1.4, duration: 150, yoyo: true });
    });
    // 내 얼굴이 빨개진다 + 핏대
    this.time.delayedCall(1100, () => {
      me.each((o: Phaser.GameObjects.GameObject) => (o as Phaser.GameObjects.Image).setTint?.(0xff8a80));
      const anger = this.keep(this.add.image(deskX + 26, deskY - 160, TEX.angerMark).setDepth(9000).setScale(0.5));
      this.tweens.add({ targets: anger, scale: 1.5, duration: 300, ease: 'Back.Out' });
      this.cameras.main.pan(deskX - 60, deskY - 90, 400, 'Sine.easeOut');
      this.cameras.main.zoomTo(2.6, 400, 'Sine.easeOut');
    });
  }

  /** 꽃가루 */
  private confetti(): void {
    const colors = [0xff4f8b, 0xffd54f, 0x81c784, 0x64b5f6, 0xba68c8];
    for (let i = 0; i < 40; i++) {
      const x = 260 + Math.random() * 460;
      const c = this.keep(this.add.rectangle(x, 120 - Math.random() * 120, 6, 10, colors[i % colors.length]).setDepth(9500));
      this.tweens.add({ targets: c, y: 470, angle: 360 * (Math.random() < 0.5 ? -1 : 1), duration: 1800 + Math.random() * 1400, repeat: -1, delay: Math.random() * 1500 });
    }
  }

  /** 장면 위 자막: 잠깐 보였다 사라진다 */
  private caption(text: string): void {
    const cap = this.add
      .text(GAME_WIDTH / 2, 70, text, { fontFamily: FONT, fontSize: '30px', color: '#ffffff', stroke: COLORS.text, strokeThickness: 6 })
      .setOrigin(0.5);
    this.shotUi.add(cap);
    this.tweens.add({ targets: cap, alpha: 0, delay: 1400, duration: 500 });
  }

  // ------------------------------------------------------------ 오늘의 명장면 (클리어 뒤, 11/12)

  /** 무대를 어둡게 (바닥 타일 위를 덮는다) */
  private stageDark(): void {
    this.keep(this.add.rectangle(CX, CY, 900, 700, 0x1a1020).setDepth(-900));
  }

  /** 핀 조명: 위에서 x 쪽 바닥으로 퍼지는 빛 + 바닥 동그라미 */
  private drawSpot(g: Phaser.GameObjects.Graphics, x: number, floorY: number, spread: number): void {
    g.clear();
    g.fillStyle(0xfff8e1, 0.14);
    g.fillTriangle(x - 18, CY - 140, x + 18, CY - 140, x + spread, floorY);
    g.fillTriangle(x - 18, CY - 140, x - spread, floorY, x + spread, floorY);
    g.fillStyle(0xfff8e1, 0.28).fillEllipse(x, floorY - 4, spread * 2, 26);
  }

  /** STAGE 1 명장면 ①: 레드카펫 위 핀 조명 아래로 등에 포스트잇 붙인 동기가 간식 들고 당당하게 걷는다. 양옆에서 킥킥 */
  private paradeWalkSet(): void {
    this.stageDark();
    const carpetY = 318;
    const g = this.keep(this.add.graphics().setDepth(-800));
    g.fillStyle(0xc62828).fillRect(240, carpetY - 22, 500, 44);
    g.fillStyle(0xffd54f).fillRect(240, carpetY - 24, 500, 3).fillRect(240, carpetY + 21, 500, 3);
    // 구경꾼 (뒷줄, 어둡게)
    const laughs = ['킥킥', '푸흡!', '크큭', '풉'];
    [320, 410, 570, 660].forEach((x, i) => {
      const v = new NpcView(this, { ...EXTRA_LOOKS[i % EXTRA_LOOKS.length], tint: 0x8a7f90 }, false);
      this.npcs.push(v);
      v.standAt(x, 266, 'down');
      v.setPose({ face: TEX.faceHappy, hands: 'side' });
      this.time.addEvent({ delay: 650 + i * 230, loop: true, callback: () => popWord(this, x, 172, laughs[i], { size: 14, color: '#ffe082' }) });
    });
    const dongi = new NpcView(this, { ...DONGI.appearance, rank: '' }, false);
    this.npcs.push(dongi);
    dongi.setPose({ face: TEX.faceHappy, hands: 'snack' });
    dongi.setBackNote(true);
    const spot = this.keep(this.add.graphics().setDepth(-700));
    const walk = { x: 270 };
    const place = () => {
      dongi.standAt(walk.x, carpetY + 6 - Math.abs(Math.sin(walk.x / 9)) * 3, 'right');
      this.drawSpot(spot, walk.x, carpetY + 14, 54);
    };
    place();
    this.tweens.add({ targets: walk, x: 650, duration: 4200, ease: 'Linear', onUpdate: place });
    this.time.addEvent({ delay: 500, loop: true, callback: () => popWord(this, Phaser.Math.Between(300, 680), Phaser.Math.Between(200, 240), '짝짝', { size: 12, color: '#ffffff' }) });
  }

  /** STAGE 1 명장면 ②: 동기 등짝 확대, 포스트잇이 쾅 */
  private paradeNoteSet(): void {
    const bg = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x2a1a24).setOrigin(0);
    const body = this.add.image(GAME_WIDTH / 2, 430, TEX.dongiBodyBack).setOrigin(0.5, 1).setScale(3.4);
    const head = this.add.image(GAME_WIDTH / 2, 210, TEX.dongiHeadBack).setOrigin(0.5, 1).setScale(3.4);
    const note = this.add.container(GAME_WIDTH / 2, 300).setAngle(-6);
    const ng = this.add.graphics();
    ng.fillStyle(0x000000, 0.25).fillRect(-112, -72, 236, 160);
    ng.fillStyle(0xfff176).fillRect(-118, -80, 236, 160);
    ng.lineStyle(4, COLORS.outline).strokeRect(-118, -80, 236, 160);
    ng.fillStyle(0xffffff, 0.6).fillRect(-40, -92, 80, 22);
    const nt = this.add
      .text(0, 2, '오늘도\n월급루팡', { fontFamily: FONT, fontSize: '44px', color: '#5a3a4a', align: 'center', lineSpacing: 4 })
      .setOrigin(0.5);
    note.add([ng, nt]);
    note.setScale(3).setAlpha(0);
    const bang = this.add.text(GAME_WIDTH / 2 + 190, 150, '쾅!', { fontFamily: FONT, fontSize: '46px', color: '#ff3d6e', stroke: '#ffffff', strokeThickness: 8 }).setOrigin(0.5).setAlpha(0);
    this.shotUi.add([bg, body, head, note, bang]);
    this.tweens.add({
      targets: note,
      scale: 1,
      alpha: 1,
      delay: 300,
      duration: 220,
      ease: 'Quad.In',
      onComplete: () => {
        this.uiCam.shake(220, 0.012);
        bang.setAlpha(1).setScale(0.4);
        this.tweens.add({ targets: bang, scale: 1.1, duration: 180, ease: 'Back.Out' });
        this.tweens.add({ targets: note, angle: -3, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      },
    });
  }

  /** STAGE 2 명장면 ①: 핀 조명 아래 부장 책상. 과장이 서 있고, 부장이 벌떡 일어나 "이게 뭐야아아!!" */
  private apprBossSet(): void {
    this.stageDark();
    const deskX = 490;
    const deskY = 300;
    const spot = this.keep(this.add.graphics().setDepth(-700));
    this.drawSpot(spot, deskX, deskY + 50, 130);
    this.keep(this.add.image(deskX, deskY - 62, TEX.chair).setOrigin(0.5, 1).setDepth(deskY - 62));
    this.keep(this.add.image(deskX, deskY, TEX.bossDesk).setOrigin(0.5, 1).setDepth(deskY));
    // 책상 위 분홍 가짜 서류
    this.keep(this.add.image(deskX - 34, deskY - 30, TEX.paperPile).setOrigin(0.5, 1).setScale(0.5).setTint(0xffd6e4).setDepth(deskY + 1));
    const boss = new NpcView(this, { ...ISA.appearance, rank: '' }, false);
    this.npcs.push(boss);
    boss.sitAt(deskX, deskY - 62, deskY);
    boss.setPose({ face: TEX.faceNormal, hands: 'folded' });
    const gw = new NpcView(this, { ...GWAJANG.appearance, rank: '' }, false);
    this.npcs.push(gw);
    gw.standAt(deskX - 44, deskY + 46, 'up');
    gw.setPose({ back: true, hands: 'side' });
    this.time.delayedCall(450, () => {
      boss.standAt(deskX, deskY - 62, 'down');
      boss.setPose({ face: TEX.faceShock, hands: 'side' });
      boss.boing();
      boss.setPokeHeat(1);
      popWord(this, deskX + 70, deskY - 150, '이게 뭐야아아!!', { size: 22, color: '#d32f2f' });
      this.cameras.main.shake(250, 0.01);
      // 과장은 부들부들
      this.tweens.add({ targets: gw.root, x: deskX - 41, duration: 40, yoyo: true, repeat: -1 });
    });
  }

  /** STAGE 2 명장면 ②: 승인서 확대, "반려!!" 도장이 쾅 */
  private apprStampSet(): void {
    const bg = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x2a1a24).setOrigin(0);
    const paper = this.add.container(GAME_WIDTH / 2, 218).setAngle(-3);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.25).fillRect(-164, -144, 340, 300);
    g.fillStyle(0xfffdf7).fillRect(-170, -150, 340, 300);
    g.lineStyle(4, COLORS.outline).strokeRect(-170, -150, 340, 300);
    g.lineStyle(2, COLORS.outline).strokeRect(50, 20, 100, 100);
    const t = (x: number, y: number, s: string, size: number, origin = 0) =>
      this.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color: COLORS.text }).setOrigin(origin, 0.5);
    paper.add([
      g,
      t(0, -112, '전 직원 칼퇴 승인서', 28, 0.5),
      t(-148, -62, '내용: 오늘부터 전 직원', 17),
      t(-148, -36, '6시 정각 칼퇴를 승인함', 17),
      t(-148, 40, '기안: 박과장', 19),
      t(100, 36, '부장', 15, 0.5),
    ]);
    const stamp = this.add.container(GAME_WIDTH / 2 + 96, 300).setAngle(-14);
    const sg = this.add.graphics();
    sg.lineStyle(6, 0xd32f2f).strokeRoundedRect(-82, -38, 164, 76, 14);
    const st = this.add.text(0, 0, '반려!!', { fontFamily: FONT, fontSize: '46px', color: '#d32f2f' }).setOrigin(0.5);
    stamp.add([sg, st]);
    stamp.setScale(3.5).setAlpha(0);
    this.shotUi.add([bg, paper, stamp]);
    this.tweens.add({
      targets: stamp,
      scale: 1,
      alpha: 1,
      delay: 400,
      duration: 220,
      ease: 'Quad.In',
      onComplete: () => this.uiCam.shake(240, 0.014),
    });
  }

  /** 다짐 */
  private vowSet(): void {
    if (this.story.villain === 'gwajang') this.pacingSet(false);
    else if (this.story.villain === 'daepyo') this.ceoSet('vow');
    else this.shoppingSet(false);
    // 스테이지 이름 카드는 게임 화면 시작 때 공략 대상을 비추며 띄운다 (11/10, ui/StageCard)
    this.shotUi.removeAll(true);
  }

  // ------------------------------------------------------------ 소품

  private desk(x: number, y: number, mine: boolean): void {
    this.keep(this.add.image(x, y - 62, TEX.chair).setOrigin(0.5, 1).setDepth(y - 62));
    this.keep(this.add.image(x, y, TEX.desk).setOrigin(0.5, 1).setDepth(y));
    if (mine) this.keep(this.add.image(x - 18, y - 30, TEX.monitor).setOrigin(0.5, 1).setDepth(y + 0.1));
  }

  /** 나 (앞모습). 앉았을 땐 책상이 아랫몸을 가린다 */
  private me(x: number, y: number): Phaser.GameObjects.Container {
    return this.keep(
      this.add
        .container(x, y, [
          this.add.image(0, 0, TEX.shadow),
          this.add.image(0, 2, TEX.playerBody).setOrigin(0.5, 1),
          this.add.image(0, -26, TEX.playerHeadFront).setOrigin(0.5, 1),
        ])
        .setDepth(y),
    );
  }

  /** 동기 모니터 화면: 쇼핑몰 특가 */
  private monitorScreen(x: number, y: number): void {
    const g = this.keep(this.add.graphics().setDepth(y + 400));
    g.fillStyle(0x5a3a4a).fillRoundedRect(x - 30, y - 44, 60, 42, 5);
    g.fillStyle(0xfff0f5).fillRect(x - 26, y - 40, 52, 34);
    g.fillStyle(0xff4f8b).fillRect(x - 26, y - 40, 52, 8);
    g.fillStyle(0xffb74d).fillRoundedRect(x - 22, y - 28, 18, 18, 4);
    g.fillStyle(0x5a3a4a).fillRect(x - 3, y - 2, 6, 6);
    const sale = this.keep(
      this.add.text(x + 12, y - 19, 'SALE\n70%', { fontFamily: FONT, fontSize: '9px', color: '#ff4f8b', align: 'center' }).setOrigin(0.5).setDepth(y + 401),
    );
    this.tweens.add({ targets: sale, scale: 1.15, duration: 300, yoyo: true, repeat: -1 });
    const heart = this.keep(this.add.text(x - 13, y - 52, '♥', { fontFamily: FONT, fontSize: '12px', color: '#ff4f8b' }).setOrigin(0.5).setDepth(y + 401));
    this.tweens.add({ targets: heart, y: y - 62, alpha: 0, duration: 900, repeat: -1 });
  }
}
