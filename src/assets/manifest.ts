import { TEX, type TextureKey } from './keys';

// 최종 그래픽 목록. public/assets/ 기준 경로.
// 팀원 에셋 64개(11/10) + 같은 스타일로 그린 나머지 36개(scripts/make-missing-art.mjs).
// 여기에 없는 키는 placeholderTextures.ts가 임시 그래픽을 만든다.
export const FINAL_ASSETS: Partial<Record<TextureKey, string>> = Object.fromEntries(
  Object.values(TEX).map((k) => [k, `final/${k}.png`]),
);

/** 최종 그래픽은 게임 속 크기의 2배로 그려져 있다. 불러온 뒤 이만큼 줄여서 같은 키로 쓴다 */
export const FINAL_SCALE = 2;
