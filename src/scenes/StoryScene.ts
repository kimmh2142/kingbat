import Phaser from 'phaser';
import { TEX } from '../assets/keys';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { SPEAKERS, STORIES, type StageStory, type StoryShot } from '../data/dialogue';
import { NpcView } from '../npc/NpcView';
import { DONGI } from '../npc/patterns/dongi';
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

  create(data?: { stage?: number }): void {
    this.stage = data?.stage ?? 1;
    const story = STORIES[this.stage];
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
    this.uiCam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Office', { stage: this.stage }));
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
      case 'vow':
        return this.vowSet();
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

  /** 내 자리: 나는 앉아 있고 동기가 옆에 서서 부탁한다 */
  private officeSet(papers: number, drop: boolean, sweat = false): void {
    const deskX = 545;
    const deskY = 345;
    this.desk(deskX, deskY, true);
    const me = this.me(deskX, deskY - 62);
    const dongi = new NpcView(this, { ...DONGI.appearance, rank: '' }, false);
    this.npcs.push(dongi);
    dongi.standAt(438, 336, 'right');
    dongi.setPose({ face: drop ? TEX.faceHappy : TEX.faceSuspicious, hands: 'side', tilt: -10 });
    // 손 모아 비는 듯 살랑살랑
    this.tweens.add({ targets: dongi.root, x: 442, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

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
      const cap = this.add
        .text(GAME_WIDTH / 2, 70, '30분 뒤…', { fontFamily: FONT, fontSize: '30px', color: '#ffffff', stroke: COLORS.text, strokeThickness: 6 })
        .setOrigin(0.5);
      this.shotUi.add(cap);
      this.tweens.add({ targets: cap, alpha: 0, delay: 1400, duration: 500 });
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

  /** 다짐 + 스테이지 이름 */
  private vowSet(): void {
    this.shoppingSet(false);
    this.shotUi.removeAll(true);
    const s = this.story;
    const card = this.add.container(GAME_WIDTH / 2, 150);
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.outline).fillRoundedRect(-230, -86 + 6, 460, 172, 24);
    bg.fillStyle(0xffffff).fillRoundedRect(-230, -86, 460, 172, 24);
    bg.lineStyle(5, COLORS.outline).strokeRoundedRect(-230, -86, 460, 172, 24);
    const t1 = this.add.text(0, -52, s.title, { fontFamily: FONT, fontSize: '24px', color: '#8d7f99' }).setOrigin(0.5);
    const t2 = this.add
      .text(0, 2, s.subtitle, { fontFamily: FONT, fontSize: '50px', color: '#ff4f8b', stroke: '#ffffff', strokeThickness: 8 })
      .setOrigin(0.5);
    const t3 = this.add.text(0, 54, s.quote, { fontFamily: FONT, fontSize: '22px', color: COLORS.text }).setOrigin(0.5);
    const icon = this.add.image(-t2.width / 2 - 26, 2, TEX.targetIcon).setScale(1.4);
    card.add([bg, t1, t2, t3, icon]);
    card.setScale(2.4).setAngle(-6).setAlpha(0);
    this.shotUi.add(card);
    this.tweens.add({ targets: card, scale: 1, alpha: 1, angle: -3, duration: 320, ease: 'Back.Out' });
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
