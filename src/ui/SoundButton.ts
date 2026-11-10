import Phaser from 'phaser';
import { FONT } from '../config';
import { bgm } from '../systems/Bgm';

/** 소리 켜기·끄기 버튼 (🔊/🔇). 배경 음악과 효과음을 같이 끈다. 이 기기에 저장 */
export function addSoundButton(scene: Phaser.Scene, x: number, y: number, depth: number): Phaser.GameObjects.Text {
  const label = () => (bgm.muted ? '🔇' : '🔊');
  const btn = scene.add
    .text(x, y, label(), { fontFamily: FONT, fontSize: '20px', padding: { x: 6, y: 4 } })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(depth)
    .setInteractive({ useHandCursor: true });
  btn.on(Phaser.Input.Events.POINTER_DOWN, (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
    e.stopPropagation();
    bgm.toggleMute();
    btn.setText(label());
  });
  return btn;
}
