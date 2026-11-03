import Phaser from 'phaser';
import { TEX, type TextureKey } from '../assets/keys';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { DEPTH } from '../systems/OfficeMap';

const W = 720;
const H = 420;

interface Page {
  title: string;
  lines: string[];
  icons: TextureKey[];
}

/** 조작은 접속한 기기에 맞는 것만 보여준다 */
const CONTROLS = {
  pc: ['WASD · 방향키  이동', 'Space 꾹  콕 찌르기 (오래 누를수록 빨라짐)', 'F  아이템 쓰기   ·   1 · 2 · 3  아이템 고르기', 'Shift 꾹  숨기 · 일하는 척 (점수 확정)'],
  touch: ['왼쪽 조이스틱  이동', '[콕] 꾹  콕 찌르기 (오래 누를수록 빨라짐)', '[아이템]  아이템 쓰기   ·   아래 칸 눌러서 고르기', '[숨기] 꾹  숨기 · 일하는 척 (점수 확정)'],
};

/**
 * 게임 방법 창 (4쪽). ←→ 또는 ◀▶ 버튼으로 넘기고, Esc 또는 X로 닫는다.
 * 스테이지마다 목표 대상이 바뀌므로 특정 캐릭터 이름 대신 "목표 대상"이라고 쓴다.
 */
export class HowToPanel {
  isOpen = false;
  private page = 0;
  private readonly root: Phaser.GameObjects.Container;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly icons: Phaser.GameObjects.Container;
  private readonly dots: Phaser.GameObjects.Graphics;
  private readonly pages: Page[];

  constructor(
    private readonly scene: Phaser.Scene,
    touch: boolean,
  ) {
    this.pages = [
      {
        title: '목표',
        lines: ['퇴근 시계가 6시를 가리키기 전에', '목표 대상의 킹받음을 100까지 채우자!', '', '사무실을 돌아다니며 상대를 관찰하고,', '몰래 장난친 뒤 들키지 않고 도망치면 된다.'],
        icons: [TEX.targetIcon, TEX.angerMark],
      },
      { title: '조작', lines: touch ? CONTROLS.touch : CONTROLS.pc, icons: [] },
      {
        title: 'Hit & Run',
        lines: ['콕 찌르기로 얻은 점수는 아직 임시 점수(줄무늬).', '내 자리나 숨는 곳에서 일하는 척해야 확정된다!', '', '아이템 장난은 성공하면 바로 확정.', '맵에 반짝이는 아이템은 지나가면 줍는다.'],
        icons: [TEX.stripe, TEX.itemPostit, TEX.itemGum],
      },
      {
        title: '들키지 않기',
        lines: ['목표 대상은 돌아보기 전에 꼭 티를 낸다.', '타이핑이 멈추거나, 머리카락이 쭈뼛!', '', '돌아다니는 방해꾼의 바닥 시야(부채꼴)도 피하자.', '하트 3개를 다 잃으면 이 스테이지를 처음부터.'],
        icons: [TEX.heartFull, TEX.heartFull, TEX.heartFull],
      },
    ];

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const dim = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x2a1d24, 0.6).setOrigin(0).setInteractive();
    const box = scene.add.graphics();
    box.fillStyle(COLORS.outline).fillRoundedRect(cx - W / 2, cy - H / 2 + 6, W, H, 24);
    box.fillStyle(0xfffafc).fillRoundedRect(cx - W / 2, cy - H / 2, W, H, 24);
    box.lineStyle(5, COLORS.outline).strokeRoundedRect(cx - W / 2, cy - H / 2, W, H, 24);
    this.title = scene.add
      .text(cx, cy - H / 2 + 42, '', { fontFamily: FONT, fontSize: '34px', color: '#ff4f8b', stroke: '#ffffff', strokeThickness: 6 })
      .setOrigin(0.5);
    this.icons = scene.add.container(cx, cy - H / 2 + 96);
    this.body = scene.add
      .text(cx, cy + 26, '', { fontFamily: FONT, fontSize: '22px', color: COLORS.text, align: 'center', lineSpacing: 8 })
      .setOrigin(0.5);
    this.dots = scene.add.graphics();

    const close = this.button(cx + W / 2 - 34, cy - H / 2 + 34, '✕', () => this.close());
    const prev = this.button(cx - W / 2 + 40, cy + H / 2 - 40, '◀', () => this.go(-1));
    const next = this.button(cx + W / 2 - 40, cy + H / 2 - 40, '▶', () => this.go(1));
    const hint = scene.add
      .text(cx, cy + H / 2 + 14, touch ? '◀ ▶ 눌러서 넘기기' : '← → 넘기기   Esc 닫기', { fontFamily: FONT, fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5);

    this.root = scene.add
      .container(0, 0, [dim, box, this.title, this.icons, this.body, this.dots, close, prev, next, hint])
      .setDepth(DEPTH.label + 1000)
      .setVisible(false);
  }

  open(): void {
    this.isOpen = true;
    this.page = 0;
    this.root.setVisible(true);
    this.render();
  }

  close(): void {
    this.isOpen = false;
    this.root.setVisible(false);
  }

  /** 키 입력 (event.code) */
  onKey(code: string): void {
    if (code === 'Escape') this.close();
    else if (code === 'ArrowLeft' || code === 'KeyA') this.go(-1);
    else if (code === 'ArrowRight' || code === 'KeyD' || code === 'Space' || code === 'Enter') {
      // 마지막 쪽에서 한 번 더 넘기면 닫힌다
      if (this.page === this.pages.length - 1 && code !== 'ArrowRight' && code !== 'KeyD') this.close();
      else this.go(1);
    }
  }

  get currentPage(): number {
    return this.page;
  }

  private go(d: number): void {
    this.page = Phaser.Math.Clamp(this.page + d, 0, this.pages.length - 1);
    this.render();
  }

  private render(): void {
    const p = this.pages[this.page];
    this.title.setText(`${this.page + 1}. ${p.title}`);
    this.body.setText(p.lines.join('\n'));
    this.icons.removeAll(true);
    p.icons.forEach((key, i) => {
      const x = (i - (p.icons.length - 1) / 2) * 52;
      this.icons.add(this.scene.add.image(x, 0, key).setScale(1.3));
    });
    const cx = GAME_WIDTH / 2;
    const y = GAME_HEIGHT / 2 + H / 2 - 40;
    this.dots.clear();
    this.pages.forEach((_, i) => {
      const x = cx + (i - (this.pages.length - 1) / 2) * 24;
      this.dots.fillStyle(i === this.page ? 0xff4f8b : 0xe0d4dc).fillCircle(x, y, 7);
    });
  }

  private button(x: number, y: number, label: string, onTap: () => void): Phaser.GameObjects.Container {
    const bg = this.scene.add.circle(0, 0, 24, 0xffd54f).setStrokeStyle(4, COLORS.outline);
    const t = this.scene.add.text(0, 0, label, { fontFamily: FONT, fontSize: '22px', color: COLORS.text }).setOrigin(0.5);
    const c = this.scene.add.container(x, y, [bg, t]).setSize(52, 52).setInteractive({ useHandCursor: true });
    c.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, onTap);
    return c;
  }
}
