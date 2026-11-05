// 테스트(Playwright)와 콘솔 디버깅용으로 노출하는 값
interface Window {
  __kingbat?: {
    player?: { x: number; y: number };
    debug?: boolean;
    target?: { state: string; x: number; y: number; side?: number; left?: number };
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
    /** 단계 안내: 지금 단계 id(다 끝나면 null)와 미션 칸 글 */
    tutorial?: { step: string | null; line: string };
    thought?: boolean;
    minimap?: { big: boolean; x: number; y: number; w: number; h: number };
    remaining?: number;
    daeri?: { kind?: string; state: string; x: number; y: number; route?: number };
    caughtBy?: Record<string, number>;
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
  __kingbatTest?: { teleport(x: number, y: number): void; setRemaining(seconds: number): void; forceGrab(): void; calmDaeri(): void; addScore(points: number): void; loseAll(): void; giveItem(id: string): boolean };
  __kingbatTexture?: (key: string) => string;
  __kingbatStory?: { step(): number; total: number; typing(): boolean };
  __kingbatTitle?: { howToOpen(): boolean; howToPage(): number; selected(): number };
}
