import type { TextureKey } from './keys';

// 최종 그래픽 목록. public/assets/ 기준 경로.
// 예: [TEX.desk]: 'final/desk.png'
// 여기에 없는 키는 placeholderTextures.ts가 임시 그래픽을 만든다.
export const FINAL_ASSETS: Partial<Record<TextureKey, string>> = {};
