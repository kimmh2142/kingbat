// 스테이지 도입 컷신 대사. 장면(shot) 연출은 StoryScene이 하고, 글은 여기서 바꾼다.
// 하트 0개로 다시 시작할 때는 나오지 않는다 (확정 규칙: 재시작 시 도입 컷신 생략).

export type Speaker = 'dongi' | 'me' | 'none';

/** 장면 연출 종류 (StoryScene에 같은 이름의 연출이 있다) */
export type StoryShot = 'ask' | 'dump' | 'reply' | 'shopping' | 'angry' | 'vow';

export interface StoryStep {
  shot: StoryShot;
  who: Speaker;
  text: string;
}

export const SPEAKERS: Record<Speaker, { name: string; color: number }> = {
  dongi: { name: '동기 이동기', color: 0xf06292 },
  me: { name: '나', color: 0x9575cd },
  none: { name: '', color: 0 },
};

export interface StageStory {
  /** 마지막 장면에 크게 뜨는 스테이지 이름과 한마디 */
  title: string;
  subtitle: string;
  quote: string;
  steps: StoryStep[];
}

// STAGE 1 빌런 포인트 (기준 문서 PART 3): 일을 떠넘겨 놓고 몰래 쇼핑몰을 본다.
export const STORIES: Record<number, StageStory> = {
  1: {
    title: 'STAGE 1',
    subtitle: '동기 이동기',
    quote: '"야, 우리 동기잖아!"',
    steps: [
      { shot: 'ask', who: 'dongi', text: '저기… 나 오늘 진짜 너무 바빠서 그러는데 ㅠㅠ' },
      { shot: 'dump', who: 'dongi', text: '이것 좀 대신 처리해 줄 수 있을까? 우리 동기잖아~ ㅠㅠㅠ' },
      { shot: 'reply', who: 'me', text: '어… 어어, 그래… 줘 봐…' },
      { shot: 'shopping', who: 'dongi', text: '흐흐… 이 니트 예쁘다~ 장바구니 쏙!' },
      { shot: 'angry', who: 'me', text: '……바쁘다며?' },
      { shot: 'vow', who: 'me', text: '좋아. 퇴근 전까지, 제대로 킹받게 해 주지!' },
    ],
  },
};
