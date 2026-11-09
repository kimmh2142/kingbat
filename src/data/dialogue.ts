// 오프닝 독백과 스테이지 도입 컷신 대사. 장면(shot) 연출은 StoryScene이 하고, 글은 여기서 바꾼다.
// 하트 0개로 다시 시작할 때는 나오지 않는다 (확정 규칙: 재시작 시 도입 컷신 생략).

export type Speaker = 'dongi' | 'gwajang' | 'daepyo' | 'biseo' | 'me' | 'none';

/** 장면 연출 종류 (StoryScene에 같은 이름의 연출이 있다) */
export type StoryShot = 'monologue' | 'ask' | 'dump' | 'reply' | 'shopping' | 'angry' | 'pacing' | 'pacingAngry' | 'ceo' | 'ceoReport' | 'ceoLaugh' | 'vow';

export interface StoryStep {
  shot: StoryShot;
  who: Speaker;
  text: string;
  /** 장면 위에 잠깐 떴다 사라지는 자막 ("오후 5:55" 등) */
  caption?: string;
}

export const SPEAKERS: Record<Speaker, { name: string; color: number }> = {
  dongi: { name: '동기 이동기', color: 0xf06292 },
  gwajang: { name: '과장 박통화', color: 0xff9800 },
  daepyo: { name: '대표 나대표', color: 0x8e24aa },
  biseo: { name: '비서 김비서', color: 0x5c6bc0 },
  me: { name: '나', color: 0x9575cd },
  none: { name: '', color: 0 },
};

export interface StageStory {
  /** 내 자리에 찾아와 일을 떠넘기는 사람 (ask·dump·reply 장면) */
  villain: 'dongi' | 'gwajang' | 'daepyo';
  /** 마지막 장면에 크게 뜨는 스테이지 이름과 한마디 */
  title: string;
  subtitle: string;
  quote: string;
  steps: StoryStep[];
}

/**
 * 오프닝 독백 (reference/ 오프닝 독백 원문). 2026-11-07 빼기로 해서 지금은 안 나온다 (다시 넣으려면 STORIES 1의 맨 앞에 monologue 장면 추가). 검은 화면에 한 줄씩 진지하게 나온 뒤,
 * 서서히 밝아지며 동기 컷신으로 이어진다.
 * 원문/순화본은 팀 확인 중이라 글만 바꾸면 되게 따로 둔다. 순화본 예:
 *   나, / 조금도 혼나고 싶지 않다. / 나, / 오로지 킹받게만 하고 싶다. //
 *   그저 찌르고 또 찌르고, / 그러고도 또 찌르고만 싶다. //
 *   모두를 킹받게 할 수만 있다면, / 한 번도 들키지 않고 그런 것이 허락되는 지금이 / 오늘 내게 와준다면.
 */
export const MONOLOGUE = [
  '나,',
  '조금도 맞고 싶지 않다.',
  '나,',
  '오로지 패고만 싶다.',
  '',
  '그저 때리고 또 때리고,',
  '그러고도 또 때리고만 싶다.',
  '',
  '모두를 쥐어팰 수만 있다면,',
  '한 대도 맞지 않고 그런 것이 허락되는 지금이',
  '오늘 내게 와준다면.',
].join('\n');

// STAGE 1 빌런 포인트 (기준 문서 PART 3): 일을 떠넘겨 놓고 몰래 쇼핑몰을 본다.
export const STORIES: Record<number, StageStory> = {
  1: {
    villain: 'dongi',
    title: 'STAGE 1',
    subtitle: '동기 이동기',
    quote: '"야, 우리 동기잖아!"',
    // 오프닝 독백("때리고만 싶다")은 2026-11-07 뺐다. 바로 동기 컷신부터
    steps: [
      { shot: 'ask', who: 'dongi', text: '저기… 나 오늘 진짜 너무 바빠서 그러는데 ㅠㅠ' },
      { shot: 'dump', who: 'dongi', text: '이것 좀 대신 처리해 줄 수 있을까? 우리 동기잖아~ ㅠㅠㅠ' },
      { shot: 'reply', who: 'me', text: '어… 어어, 그래… 줘 봐…' },
      { shot: 'shopping', who: 'dongi', text: '흐흐… 이 니트 예쁘다~ 장바구니 쏙!' },
      { shot: 'angry', who: 'me', text: '……바쁘다며?' },
      { shot: 'vow', who: 'me', text: '좋아. 퇴근 전까지, 제대로 킹받게 해 주지!' },
    ],
  },
  // STAGE 2 빌런 포인트 (기준 문서 STAGE 2): 퇴근 5분 전에 일을 던지고, 통화하며 왔다 갔다 걷는다.
  2: {
    villain: 'gwajang',
    title: 'STAGE 2',
    subtitle: '과장 박통화',
    quote: '"퇴근 5분 전에 이것만!"',
    steps: [
      { shot: 'ask', who: 'gwajang', caption: '오후 5:55 · 퇴근 5분 전', text: '네~ 사장님~ …아, 자네! 마침 잘 있었네~' },
      { shot: 'dump', who: 'gwajang', text: '퇴근 5분 전인데~ 이것만 좀! 금방 해, 금방~' },
      { shot: 'reply', who: 'me', text: '…5분 전인데요?' },
      { shot: 'pacing', who: 'gwajang', text: '네~ 사장님~ 하하하! 그 자료요? 제가 다 해 놨죠~' },
      { shot: 'pacingAngry', who: 'me', text: '……"제가 다 해 놨죠"?' },
      { shot: 'vow', who: 'me', text: '좋아. 오늘은 과장님도 칼퇴 못 하게 해 주지!' },
    ],
  },
  // STAGE 3 도입 (기준 문서 STAGE 3): 대표실. 소문을 들은 대표가 흥미로워한다.
  3: {
    villain: 'daepyo',
    title: 'STAGE 3',
    subtitle: '대표 나대표',
    quote: '"최후의 킹받음"',
    steps: [
      { shot: 'ceo', who: 'daepyo', caption: '8층 · 대표실', text: '요즘 회사에 이상한 소문이 돌더군.' },
      { shot: 'ceoReport', who: 'biseo', text: '누군가 직원들에게 계속 장난을 친다고 합니다.' },
      { shot: 'ceoLaugh', who: 'daepyo', text: '허허… 재미있는 친구군.' },
      { shot: 'vow', who: 'me', text: '여기까지 왔는데… 마지막까지 가야지!' },
    ],
  },
};
