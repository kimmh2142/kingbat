import Phaser from 'phaser';
import { TEX } from '../assets/keys';
import { COLORS, FONT } from '../config';
import { DEPTH } from '../systems/OfficeMap';
import type { Facing, NpcLook, Pose } from './types';

// 파츠 기준 좌표 (컨테이너 원점 = 발이 닿는 바닥, 앉았을 땐 의자 위치)
const HEAD_Y = -30;
const FACE_Y = HEAD_Y - 24;
const BUBBLE_Y = -104;
const LABEL_Y = -124;

/**
 * NPC 그림. 머리·몸통·손·표정을 따로 두고 Pose로 바꾼다.
 * 앉아 있을 때 손은 책상보다 앞에 그려야 하므로 hands를 별도 컨테이너로 둔다.
 */
export class NpcView {
  readonly root: Phaser.GameObjects.Container;
  private readonly parts: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Image;
  private readonly head: Phaser.GameObjects.Image;
  private readonly face: Phaser.GameObjects.Image;
  private readonly spike?: Phaser.GameObjects.Image;
  private readonly hands: Phaser.GameObjects.Container;
  private readonly handL: Phaser.GameObjects.Image;
  private readonly handR: Phaser.GameObjects.Image;
  private readonly prop: Phaser.GameObjects.Image;
  private readonly bubble: Phaser.GameObjects.Container;
  private readonly bubbleText: Phaser.GameObjects.Text;
  private readonly bubbleBg: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Container;
  private readonly anger: Phaser.GameObjects.Image;
  private readonly marker?: Phaser.GameObjects.Graphics;

  private pose: Pose = {};
  private facing: Facing = 'down';
  private seated = false;
  private deskY = 0;
  private t = 0;
  private joltT = 0;
  private bubbleOverride?: { text: string; until: number };

  constructor(
    scene: Phaser.Scene,
    private readonly look: NpcLook,
    isTarget: boolean,
  ) {
    const shadow = scene.add.image(0, 0, TEX.shadow);
    this.body = scene.add.image(0, 0, look.body).setOrigin(0.5, 1);
    this.head = scene.add.image(0, HEAD_Y, look.headFront).setOrigin(0.5, 1);
    this.face = scene.add.image(0, FACE_Y, TEX.faceNormal);
    const partList: Phaser.GameObjects.GameObject[] = [this.body, this.head, this.face];
    if (look.spike) {
      this.spike = scene.add.image(0, HEAD_Y - 44, look.spike).setOrigin(0.5, 1).setVisible(false);
      partList.push(this.spike);
    }
    this.parts = scene.add.container(0, 0, partList);

    this.bubbleBg = scene.add.graphics();
    this.bubbleText = scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: '15px', color: COLORS.text }).setOrigin(0.5);
    this.bubble = scene.add.container(16, BUBBLE_Y, [this.bubbleBg, this.bubbleText]).setVisible(false);

    this.root = scene.add.container(0, 0, [shadow, this.parts, this.bubble]);

    this.handL = scene.add.image(-14, 0, TEX.hand);
    this.handR = scene.add.image(14, 0, TEX.hand);
    this.prop = scene.add.image(0, -10, TEX.phone).setVisible(false);
    this.hands = scene.add.container(0, 0, [this.prop, this.handL, this.handR]);

    // 직급 라벨 (+ 공략 대상이면 타깃 아이콘)
    const name = scene.add.text(0, 0, look.rank, { fontFamily: FONT, fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
    const w = name.width + 22;
    const h = name.height + 6;
    const pill = scene.add.graphics();
    pill.fillStyle(look.rankColor).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    pill.lineStyle(3, COLORS.outline).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    const labelParts: Phaser.GameObjects.GameObject[] = [pill, name];
    if (isTarget) labelParts.push(scene.add.image(-w / 2 - 12, 0, TEX.targetIcon));
    this.label = scene.add.container(0, LABEL_Y, labelParts).setDepth(DEPTH.label - 2);

    this.anger = scene.add.image(0, 0, TEX.angerMark).setDepth(DEPTH.label - 1).setVisible(false);

    if (isTarget) {
      // 발밑 점선 원
      this.marker = scene.add.graphics().setDepth(DEPTH.floor + 5);
      this.marker.lineStyle(3, 0xe53935, 0.8);
      const n = 16;
      for (let i = 0; i < n; i += 1) {
        if (i % 2) continue;
        const a0 = (i / n) * Math.PI * 2;
        const a1 = ((i + 1) / n) * Math.PI * 2;
        this.marker.beginPath();
        for (let k = 0; k <= 4; k++) {
          const a = a0 + ((a1 - a0) * k) / 4;
          const px = Math.cos(a) * 34;
          const py = Math.sin(a) * 14;
          if (k === 0) this.marker.moveTo(px, py);
          else this.marker.lineTo(px, py);
        }
        this.marker.strokePath();
      }
    }
  }

  get x(): number {
    return this.root.x;
  }

  get y(): number {
    return this.root.y;
  }

  /** 앉기: 의자 위치 + 책상 아래쪽 y (손을 책상 앞에 그리기 위해) */
  sitAt(x: number, y: number, deskY: number): void {
    this.seated = true;
    this.deskY = deskY;
    this.facing = 'down';
    this.root.setPosition(x, y);
  }

  standAt(x: number, y: number, facing: Facing): void {
    this.seated = false;
    this.facing = facing;
    this.root.setPosition(x, y);
  }

  setPose(pose: Pose): void {
    this.pose = pose;
  }

  /** 잠깐 다른 말풍선을 띄운다 (자세 말풍선보다 우선) */
  say(text: string, seconds = 1.2): void {
    this.bubbleOverride = { text, until: this.t + seconds };
  }

  /** 콕 찔릴 때 움찔 */
  jolt(): void {
    this.joltT = 0.12;
  }

  /** 플레이어가 바로 뒤에 있을 때 라벨이 얼굴을 가리지 않게 옅게 */
  setLabelFaded(faded: boolean): void {
    this.label.setAlpha(faded ? 0.3 : 1);
  }

  /** 킹받음 0~1 → 머리 위 핏대 크기 */
  setAnger(ratio: number): void {
    this.anger.setVisible(ratio > 0.01);
    this.anger.setScale(0.45 + Math.min(ratio, 1) * 1.1);
  }

  update(dt: number): void {
    this.t += dt;
    const p = this.pose;
    const back = p.back ?? this.facing === 'up';

    // 몸통·머리
    this.body.setTexture(back ? this.look.bodyBack : this.look.body);
    this.head.setTexture(back ? this.look.headBack : this.look.headFront);
    this.face.setVisible(!back).setTexture(p.face ?? TEX.faceNormal);
    this.parts.scaleX = this.facing === 'left' ? -1 : 1;

    const nod = p.nod ? Math.max(0, Math.sin(this.t * 2.2)) * 7 : 0;
    const bend = p.bend ?? 0;
    // 흘깃: 앞모습이면 눈동자·고개가 그쪽으로, 뒷모습이면 그쪽 어깨 너머로 몸을 비튼다
    const glance = p.glance ?? 0;
    const tilt = (p.tilt ?? 0) + (p.nod ? Math.sin(this.t * 2.2) * 6 : 0) + glance * (back ? 14 : 10);
    this.head.setAngle(tilt);
    this.face.setAngle(tilt);
    this.head.x = glance * (back ? 7 : 3);
    this.face.x = glance * 7;
    this.body.setAngle(back ? glance * 7 : 0);
    this.head.y = HEAD_Y + nod;
    this.face.y = FACE_Y + nod;
    this.parts.y = bend;
    if (this.spike) {
      this.spike.setVisible(!!p.spike);
      this.spike.y = HEAD_Y - 44 + nod;
      this.spike.scaleY = 1 + Math.sin(this.t * 30) * 0.08;
    }

    // 움찔
    if (this.joltT > 0) this.joltT -= dt;
    this.parts.x = this.joltT > 0 ? Math.sin(this.joltT * 120) * 3 : 0;

    this.updateHands(p, back);
    this.updateBubble(p);

    // 그리기 순서와 머리 위 표시
    const x = this.root.x;
    const y = this.root.y;
    this.root.setDepth(this.seated ? y + 1 : y);
    this.hands.setPosition(x, y + bend).setDepth(this.seated ? this.deskY + 0.3 : y + 0.01);
    this.label.setPosition(x, y + LABEL_Y + bend * 0.5);
    this.anger.setPosition(x + 30, y + HEAD_Y - 52 + nod + bend);
    this.anger.angle = Math.sin(this.t * 6) * 8;
    this.marker?.setPosition(x, y);
  }

  private updateHands(p: Pose, back: boolean): void {
    const hands = back ? 'hidden' : (p.hands ?? (this.seated ? 'keyboard' : 'side'));
    this.hands.setVisible(hands !== 'hidden' && hands !== 'knees');
    this.prop.setVisible(hands === 'phone' || hands === 'snack');
    const type = p.typing ?? 0;
    switch (hands) {
      case 'keyboard': {
        const a = type ? Math.sin(this.t * 18 * type) * 2.5 : 0;
        this.handL.setPosition(-13, -2 + a);
        this.handR.setPosition(13, -2 - a);
        break;
      }
      case 'phone':
        this.prop.setTexture(TEX.phone).setPosition(0, -24);
        this.handL.setPosition(-8, -18);
        this.handR.setPosition(8, -18);
        break;
      case 'snack':
        this.prop.setTexture(TEX.snack).setPosition(4, -40 + Math.abs(Math.sin(this.t * 5)) * 8);
        this.handL.setPosition(-16, -20);
        this.handR.setPosition(6, -34 + Math.abs(Math.sin(this.t * 5)) * 8);
        break;
      case 'side': {
        const swing = Math.sin(this.t * 10) * 3;
        this.handL.setPosition(-20, -14 + swing);
        this.handR.setPosition(20, -14 - swing);
        break;
      }
      default:
        break;
    }
  }

  private updateBubble(p: Pose): void {
    let text = p.bubble;
    if (this.bubbleOverride) {
      if (this.t < this.bubbleOverride.until) text = this.bubbleOverride.text;
      else this.bubbleOverride = undefined;
    }
    this.bubble.setVisible(!!text);
    if (!text || this.bubbleText.text === text) return;
    this.bubbleText.setText(text);
    const w = this.bubbleText.width + 16;
    const h = this.bubbleText.height + 8;
    this.bubbleBg.clear();
    this.bubbleBg.fillStyle(0xffffff).fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    this.bubbleBg.fillTriangle(-10, h / 2 - 1, -2, h / 2 - 1, -12, h / 2 + 7);
    this.bubbleBg.lineStyle(2, COLORS.outline).strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
  }
}
