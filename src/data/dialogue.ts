// 오프닝 독백과 스테이지 도입 컷신 대사. 장면(shot) 연출은 StoryScene이 하고, 글은 여기서 바꾼다.
// 하트 0개로 다시 시작할 때는 나오지 않는다 (확정 규칙: 재시작 시 도입 컷신 생략).

export type Speaker = 'dongi' | 'gwajang' | 'bujang' | 'daepyo' | 'biseo' | 'newbie' | 'staff' | 'me' | 'none';

/** 장면 연출 종류 (StoryScene에 같은 이름의 연출이 있다) */
export type StoryShot = 'monologue' | 'ask' | 'dump' | 'reply' | 'shopping' | 'angry' | 'pacing' | 'pacingAngry' | 'ceo' | 'ceoReport' | 'ceoLaugh' | 'vow'
  | 'final' | 'finalMe' | 'finalOk' | 'promoted' | 'cheer' | 'newbie' | 'poke' | 'pokeMe' | 'innocent'
  | 'paradeWalk' | 'paradeNote' | 'apprBoss' | 'apprStamp';

export interface StoryStep {
  shot: StoryShot;
  who: Speaker;
  text: string;
  /** 장면 위에 잠깐 떴다 사라지는 자막 ("오후 5:55" 등) */
  caption?: string;
}

export const SPEAKERS: Record<Speaker, { name: string; color: number }> = {
  dongi: { name: '동기 이동기', color: 0xf06292 },
  gwajang: { name: '박과장', color: 0xff9800 },
  bujang: { name: '부장', color: 0x78909c },
  daepyo: { name: '대표 나대표', color: 0x8e24aa },
  biseo: { name: '비서 김비서', color: 0x5c6bc0 },
  newbie: { name: '신입', color: 0xffb300 },
  staff: { name: '직원들', color: 0x9e9e9e },
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
// 도입 컷신은 스테이지마다 2장면 (11/10 교수님 "시나리오는 간단히" → 11/12 3장면에서 더 줄임):
// 떠넘김 → 빌런 포인트 그림 위에 내 다짐
export const STORIES: Record<number, StageStory> = {
  1: {
    villain: 'dongi',
    title: 'STAGE 1',
    subtitle: '동기 이동기',
    quote: '"야, 우리 동기잖아!"',
    // 오프닝 독백("때리고만 싶다")은 2026-11-07 뺐다. 바로 동기 컷신부터
    steps: [
      { shot: 'dump', who: 'dongi', text: '나 오늘 너무 바빠서 ㅠㅠ 이것 좀 대신 해 줘~ 우리 동기잖아~' },
      { shot: 'shopping', who: 'me', text: '……바쁘다며? 쇼핑?! 퇴근 전까지 킹받게 해 주지!' },
    ],
  },
  // STAGE 2 빌런 포인트 (기준 문서 STAGE 2): 퇴근 5분 전에 일을 던지고, 통화하며 왔다 갔다 걷는다.
  2: {
    villain: 'gwajang',
    title: 'STAGE 2',
    subtitle: '박과장',
    quote: '"퇴근 5분 전에 이것만!"',
    steps: [
      { shot: 'dump', who: 'gwajang', caption: '오후 5:55 · 퇴근 5분 전', text: '자네! 퇴근 5분 전인데~ 이것만 좀! 금방 해, 금방~' },
      { shot: 'pacing', who: 'me', text: '(통화로) "제가 다 해 놨죠~"?! 과장님도 칼퇴 못 하게 해 주지!' },
    ],
  },
  // STAGE 3 도입 (기준 문서 STAGE 3): 대표실. 소문을 들은 대표가 흥미로워한다.
  3: {
    villain: 'daepyo',
    title: 'STAGE 3',
    subtitle: '대표 나대표',
    quote: '"최후의 킹받음"',
    steps: [
      { shot: 'ceo', who: 'daepyo', caption: '8층 · 대표실', text: '요즘 장난치는 녀석이 있다지?' },
      { shot: 'ceoLaugh', who: 'me', text: '여기까지 왔다. 마지막은 대표님이다!' },
    ],
  },
};

/** 엔딩 컷신 번호 (STAGES에 없는 번호라 끝나면 엔딩 결과 화면으로) */
export const ENDING_STORY = 4;

// 엔딩: 기준 문서 STAGE 3 최종 클리어 대사 → PART 4 "직장생활은 돌고 돈다". 마지막은 검은 화면 독백처럼
STORIES[ENDING_STORY] = {
  villain: 'daepyo',
  title: 'ENDING',
  subtitle: '직장생활은 돌고 돈다',
  quote: '',
  steps: [
    // 11/12 7장면 → 4장면
    { shot: 'finalOk', who: 'daepyo', text: '…자네였군. 이런 눈치라니… 내 자리에 앉아보게.' },
    { shot: 'promoted', who: 'none', text: '축하합니다! 당신이 새로운 대표가 되었습니다!' },
    { shot: 'poke', who: 'me', caption: '다음 날 아침', text: '어?! 누가 나 건드렸어?!' },
    { shot: 'monologue', who: 'none', text: '직장생활은 돌고 돈다.\n\n…이제 당신이 당할 차례입니다.' },
  ],
};

/**
 * 스테이지 클리어 뒤 결과 화면 전에 나오는 특별 미션 "오늘의 명장면" (11/12). 2장면: 무대 위 장면 → 확대 컷.
 * STAGE 3은 클리어하면 바로 엔딩 컷신이라 없다.
 */
export const HIGHLIGHTS: Record<number, StageStory> = {
  1: {
    villain: 'dongi',
    title: '',
    subtitle: '',
    quote: '',
    steps: [
      { shot: 'paradeWalk', who: 'none', caption: '★ 특별 미션 성공 ★', text: '오늘의 주인공 입장~ 월급루팡 퍼레이드!' },
      { shot: 'paradeNote', who: 'dongi', text: '냠냠~ 근데 다들 왜 웃지?' },
    ],
  },
  2: {
    villain: 'gwajang',
    title: '',
    subtitle: '',
    quote: '',
    steps: [
      { shot: 'apprBoss', who: 'bujang', caption: '★ 특별 미션 성공 ★', text: '이게 뭐야아아!! 전 직원 칼퇴?!' },
      { shot: 'apprStamp', who: 'gwajang', text: '제, 제가 올린 게 아닙니다!!' },
    ],
  },
};
