import Phaser from 'phaser';
import { TEX } from '../assets/keys';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { NpcView } from '../npc/NpcView';
import { DONGI } from '../npc/patterns/dongi';
import { popWord } from '../ui/Popups';
import { tipsSetting } from '../systems/Tutorial';
import { HowToPanel } from '../ui/HowToPanel';
import { RunStats } from '../systems/RunStats';
import { addSoundButton } from '../ui/SoundButton';
import { bgm } from '../systems/Bgm';

interface MenuButton {
  root: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  onPick: () => void;
}

const BTN_W = 240;
const BTN_H = 58;

/**
 * 처음 접속하면 나오는 타이틀 화면: 제목, 콕 찌르는 장면, [게임 시작]·[게임 방법].
 * 키보드는 ↑↓ + Space/Enter, 마우스·터치는 버튼을 누른다.
 * [게임 시작] → 스테이지 도입 컷신(StoryScene) → 게임. 오프닝 독백은 나중에 그 앞에 끼운다.
 */
export class TitleScene extends Phaser.Scene {
  private buttons: MenuButton[] = [];
  private selected = 0;
  private howTo!: HowToPanel;

  constructor() {
    super('Title');
  }

  create(): void {
    this.buttons = [];
    this.selected = 0;
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, TEX.floorOffice).setOrigin(0).setAlpha(0.9);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xfbe9ee, 0.45).setOrigin(0);

    this.makeLogo();
    bgm.setFast(false);
    addSoundButton(this, GAME_WIDTH - 30, 30, 100);
    this.makeScene();

    const touch = new URLSearchParams(location.search).get('touch') === '1' || window.matchMedia('(pointer: coarse)').matches;
    this.howTo = new HowToPanel(this, touch);
    this.addButton(0, '게임 시작', 0xffd54f, () => this.startGame());
    this.addButton(1, '게임 방법', 0xf8bbd0, () => this.howTo.open());
    this.refresh();
    this.makeTipsToggle(touch);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 14, '서강대학교 가상융합전문대학원 캡스톤', { fontFamily: FONT, fontSize: '14px', color: '#8d7f99' })
      .setOrigin(0.5, 1);

    // 한글 입력 상태에서도 되도록 물리 키 위치(event.code)로 읽는다
    const onKey = (e: KeyboardEvent) => {
      if (this.howTo.isOpen) return this.howTo.onKey(e.code);
      if (e.code === 'ArrowUp' || e.code === 'KeyW') this.move(-1);
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') this.move(1);
      else if (e.code === 'Space' || e.code === 'Enter') this.buttons[this.selected].onPick();
      else if (e.code === 'KeyT') this.toggleTips();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    // 확인 스크립트용 상태
    window.__kingbatTitle = { howToOpen: () => this.howTo.isOpen, howToPage: () => this.howTo.currentPage, selected: () => this.selected, tipsOn: () => !tipsSetting.off };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', onKey);
      window.__kingbatTitle = undefined;
    });
  }

  private tipsText!: Phaser.GameObjects.Text;
  private tipsTouch = false;

  /** 튜토리얼 안내창 켜기·끄기 (게임 중 "다시 안 보기"로 끈 걸 다시 켤 때). T 또는 글자 터치 */
  private makeTipsToggle(touch: boolean): void {
    this.tipsTouch = touch;
    this.tipsText = this.add
      .text(GAME_WIDTH - 250, 446, '', { fontFamily: FONT, fontSize: '17px', color: COLORS.text, backgroundColor: '#ffffffcc', padding: { x: 12, y: 6 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.tipsText.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => !this.howTo.isOpen && this.toggleTips());
    this.refreshTips();
  }

  private toggleTips(): void {
    tipsSetting.off = !tipsSetting.off;
    this.refreshTips();
  }

  private refreshTips(): void {
    const on = !tipsSetting.off;
    const how = this.tipsTouch ? '눌러서' : 'T로';
    this.tipsText.setText(on ? `튜토리얼 안내: 켜짐 ✔  (${how} 끄기)` : `튜토리얼 안내: 꺼짐  (${how} 다시 켜기)`);
    this.tipsText.setColor(on ? COLORS.text : '#e0457b');
  }

  private startGame(): void {
    // 도입 컷신 → 게임 (컷신에서 건너뛰기 가능). 새로 출근하니 기록은 처음부터
    RunStats.reset();
    this.scene.start('Story', { stage: 1 });
  }

  private makeLogo(): void {
    const title = this.add
      .text(GAME_WIDTH / 2, 92, '직장인 킹받게 하기', {
        fontFamily: FONT,
        fontSize: '64px',
        color: '#ff4f8b',
        stroke: '#ffffff',
        strokeThickness: 12,
      })
      .setOrigin(0.5)
      .setShadow(0, 6, '#5a3a4a', 0, true, true);
    this.add
      .text(GAME_WIDTH / 2, 152, '― 승진의 기술 ―', { fontFamily: FONT, fontSize: '28px', color: COLORS.text, stroke: '#ffffff', strokeThickness: 6 })
      .setOrigin(0.5);
    this.tweens.add({ targets: title, y: 86, angle: -1.5, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** 주인공이 목표 대상 등 뒤에서 콕 찌르는 장면 */
  private makeScene(): void {
    const cx = 300;
    const deskY = 420;
    this.add.image(cx, deskY - 62, TEX.chair).setOrigin(0.5, 1);
    const dongi = new NpcView(this, { ...DONGI.appearance, rank: '' }, false);
    dongi.sitAt(cx, deskY - 62, deskY);
    dongi.setPose({ face: TEX.faceSuspicious, hands: 'keyboard', typing: 0.6, tilt: 10 });
    this.add.image(cx, deskY, TEX.desk).setOrigin(0.5, 1).setDepth(deskY);
    this.add.image(cx - 18, deskY - 30, TEX.monitor).setOrigin(0.5, 1).setDepth(deskY + 0.1);

    // 주인공은 의자 뒤쪽(위)에서 손가락을 뻗는다
    const px = cx - 58;
    const py = deskY - 96;
    const player = this.add
      .container(px, py, [
        this.add.image(0, 0, TEX.shadow),
        this.add.image(0, 2, TEX.playerBody).setOrigin(0.5, 1),
        this.add.image(0, -26, TEX.playerHeadFront).setOrigin(0.5, 1),
      ])
      .setDepth(py);
    this.tweens.add({ targets: player, x: px + 8, duration: 220, yoyo: true, repeat: -1, repeatDelay: 380, ease: 'Quad.easeOut' });

    let anger = 0.2;
    this.time.addEvent({
      delay: 600,
      loop: true,
      callback: () => {
        popWord(this, cx - 22, deskY - 120, '콕!', { size: 30 });
        dongi.jolt();
        anger = anger >= 1 ? 0.2 : anger + 0.2;
        dongi.setAnger(anger);
      },
    });
    this.events.on(Phaser.Scenes.Events.UPDATE, (_t: number, d: number) => dongi.update(d / 1000));
  }

  private addButton(i: number, label: string, color: number, onPick: () => void): void {
    const x = GAME_WIDTH - 250;
    const y = 290 + i * 82;
    const bg = this.add.graphics();
    const text = this.add.text(0, 0, label, { fontFamily: FONT, fontSize: '28px', color: COLORS.text }).setOrigin(0.5);
    const root = this.add.container(x, y, [bg, text]).setSize(BTN_W, BTN_H).setInteractive({ useHandCursor: true });
    root.setData('color', color);
    root.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => {
      this.selected = i;
      this.refresh();
    });
    root.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      if (this.howTo.isOpen) return;
      this.selected = i;
      onPick();
    });
    this.buttons.push({ root, bg, onPick });
  }

  private move(d: number): void {
    this.selected = (this.selected + d + this.buttons.length) % this.buttons.length;
    this.refresh();
  }

  private refresh(): void {
    this.buttons.forEach((b, i) => {
      const sel = i === this.selected;
      const color = b.root.getData('color') as number;
      b.bg.clear();
      b.bg.fillStyle(COLORS.outline, 1).fillRoundedRect(-BTN_W / 2, -BTN_H / 2 + 5, BTN_W, BTN_H, 18);
      b.bg.fillStyle(sel ? color : 0xffffff, 1).fillRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, 18);
      b.bg.lineStyle(4, COLORS.outline).strokeRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, 18);
      b.root.setScale(sel ? 1.06 : 1);
    });
  }
}
