// 테스트(Playwright)와 콘솔 디버깅용으로 노출하는 값
interface Window {
  __kingbat?: {
    stage?: number;
    player?: { x: number; y: number };
    debug?: boolean;
    target?: { state: string; x: number; y: number; side?: number; left?: number; facing?: string; hangup?: boolean };
    score?: { confirmed: number; temp: number };
    poking?: boolean;
    caught?: number;
    hidden?: boolean;
    hearts?: number;
    cutin?: boolean;
    intro?: boolean;
    failed?: boolean;
    cleared?: boolean;
    resultReady?: boolean;
    mission?: boolean;
    approval?: { phase: string; seq: string[]; index: number } | null;
    blackout?: { phase: string; dark: number; round: number; swing: number } | null;
    hr?: { phase: string; timer: number } | null;
    /** 단계 안내: 지금 단계 id(다 끝나면 null)와 미션 칸 글 */
    tutorial?: { step: string | null; line: string };
    thought?: boolean;
    tip?: string | null;
    missionStep?: { text: string; at: { x: number; y: number } | null } | null;
    backSpot?: { x: number; y: number } | null;
    minimap?: { big: boolean; opacity?: number; x: number; y: number; w: number; h: number };
    sfx?: string[];
    remaining?: number;
    daeri?: { kind?: string; state: string; x: number; y: number; route?: number };
    patrols?: { id: string; kind?: string; state: string; x: number; y: number; route?: number }[];
    caughtBy?: Record<string, number>;
    targetSees?: boolean;
    lastCaught?: { by: string; reason: string; player: { x: number; y: number }; who: { x: number; y: number }; facing: string; side: number } | null;
    extras?: { state: string; x: number; y: number; blocked: boolean }[];
    items?: {
      slots: (string | null)[];
      selected: number;
      onMap: { id: string; spot: string; x: number; y: number }[];
      sticking: boolean;
      postit: boolean;
      gum: boolean;
      bag: { x: number; y: number };
      guide?: string;
    };
  };
  __kingbatTest?: { teleport(x: number, y: number): void; setRemaining(seconds: number): void; forceGrab(): void; calmDaeri(): void; addScore(points: number): void; completeMission(): void; hrNow(): void; addTemp(points: number): void; loseAll(): void; giveItem(id: string): boolean; tipSpot(): { x: number; y: number } | null; cameraOnPlayer(): boolean; tipWorld(): { x: number; y: number } | null };
  __kingbatTexture?: (key: string) => string;
  __kingbatBgm?: { step: number; muted: boolean };
  __kingbatStory?: { step(): number; shot(): string | null; total: number; typing(): boolean };
  __kingbatTitle?: { howToOpen(): boolean; howToPage(): number; selected(): number; tipsOn(): boolean };
  /** STAGE 2 예고 화면이 떠 있음 */
  __kingbatComingSoon?: boolean;
  __kingbatEnding?: { total: number; caught: number; stars: number; records: number };
}
