import Phaser from 'phaser';
import { FONT } from '../config';
import { DEPTH } from './OfficeMap';

type InfoProvider = () => string[];
type WorldDrawer = (g: Phaser.GameObjects.Graphics) => void;

export const DEBUG_EVENT = 'debug-changed';

/**
 * 디버그 표시. ` 키(숫자 1 왼쪽)로 켜고 끈다. 주소 뒤에 ?debug=1 을 붙이면 켜진 채로 시작한다.
 * - 화면 왼쪽 위: 각 시스템이 addInfo로 등록한 상태 글자
 * - 맵 위: 충돌 상자(물리 디버그) + addWorldDrawer로 등록한 그림 (숨기 장소, NPC 시야 등)
 * NPC·판정 시스템은 만들 때 여기에 자기 정보를 등록한다.
 */
export class DebugOverlay {
  private on: boolean;
  private readonly infos: InfoProvider[] = [];
  private readonly drawers: WorldDrawer[] = [];
  private readonly world: Phaser.GameObjects.Graphics;
  private readonly panel: Phaser.GameObjects.Text;

  constructor(private readonly scene: Phaser.Scene) {
    this.on = new URLSearchParams(location.search).get('debug') === '1';

    this.world = scene.add.graphics().setDepth(DEPTH.label + 50);
    this.panel = scene.add
      .text(8, 50, '', {
        fontFamily: FONT,
        fontSize: '15px',
        color: '#ffffff',
        backgroundColor: '#3b2a33cc',
        padding: { x: 8, y: 6 },
        lineSpacing: 2,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.label + 100);

    const physics = scene.physics.world;
    if (!physics.debugGraphic) physics.createDebugGraphic();
    physics.debugGraphic.setDepth(DEPTH.label + 40);

    scene.input.keyboard!.on('keydown-BACKTICK', () => this.set(!this.on));
    this.set(this.on);
  }

  get enabled(): boolean {
    return this.on;
  }

  addInfo(fn: InfoProvider): void {
    this.infos.push(fn);
  }

  addWorldDrawer(fn: WorldDrawer): void {
    this.drawers.push(fn);
  }

  set(on: boolean): void {
    this.on = on;
    const physics = this.scene.physics.world;
    physics.drawDebug = on;
    physics.debugGraphic.clear().setVisible(on);
    this.world.clear().setVisible(on);
    this.panel.setVisible(on);
    this.scene.registry.set('debug', on);
    this.scene.events.emit(DEBUG_EVENT, on);
  }

  update(): void {
    if (!this.on) return;
    this.panel.setText(['[디버그]  ` 키로 끄기', ...this.infos.flatMap((f) => f())].join('\n'));
    this.world.clear();
    this.drawers.forEach((d) => d(this.world));
  }
}
