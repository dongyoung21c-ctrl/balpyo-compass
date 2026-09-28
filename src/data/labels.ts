import type { CategoryId, GroupForm, SoundId, SourceId, ToolId } from '../domain/types';

export const CATEGORIES: Readonly<Record<CategoryId, string>> = {
  pick: '발표자 정하기',
  all: '전원 참여',
  low: '부담 낮춤',
  group: '모둠 공유',
  discuss: '토의·토론',
  act: '표현·연기',
  formal: '정식 발표',
};

export const GROUP_LABELS: Readonly<Record<GroupForm, string>> = {
  개인: '개인',
  짝: '짝',
  모둠: '모둠',
  전체: '반 전체',
};

export interface ToolInfo {
  readonly name: string;
  readonly sub: string;
}

export const TOOLS: Readonly<Record<ToolId, ToolInfo>> = {
  pick: { name: '공정 뽑기', sub: '적게 한 친구 먼저' },
  rps: { name: '텔레파시 가위바위보', sub: '선생님 손 대신' },
  love: { name: '이웃을 사랑하십니까', sub: '조건 카드 뽑기' },
  arrow: { name: '발표 화살표', sub: '시작 친구와 숫자' },
  beat: { name: '번개 박자', sub: '번개 발표 짝짝 박자' },
  pass: { name: '줄줄이·패스 명단', sub: '통과한 친구 챙기기' },
  relay: { name: '릴레이 기록', sub: '호명 순서 기록' },
  groups: { name: '모둠 편성', sub: '무작위 모둠' },
};

export const TOOL_IDS = Object.keys(TOOLS) as ToolId[];

export const SOUND_LABELS: Readonly<Record<SoundId, string>> = {
  bell: '종소리',
  dingdong: '딩동',
  xylo: '실로폰',
  none: '소리 없음',
};

export interface Source {
  readonly name: string;
  readonly url: string;
}

export const SOURCES: Readonly<Record<SourceId, Source>> = {
  citrusy97: { name: 'citrusy97 블로그 · 눈치게임 발표', url: 'https://blog.naver.com/citrusy97/224332741215' },
  urimilssam: { name: 'urimilssam 블로그 · 수업 친구 모임', url: 'https://blog.naver.com/urimilssam/224217182273' },
  teacher0325: { name: 'teacher0325 블로그 · 재밌는 발표 시간', url: 'https://blog.naver.com/teacher0325/221499339498' },
};

export const DEFAULT_LOVE_CONDITIONS: readonly string[] = [
  '안경을 쓴 친구', '오늘 아침밥을 먹은 친구', '동생이 있는 친구', '생일이 여름인 친구',
  '반려동물을 키우는 친구', '운동화 끈이 있는 친구', '이름에 ㅇ이 들어가는 친구', '선생님을 사랑하는 친구',
  '어제 책을 읽은 친구', '줄무늬 옷을 입은 친구', '매운 음식을 잘 먹는 친구', '오늘 기분이 좋은 친구',
];

export const SAMPLE_CLASS_NAME = '예시 반';
export const SAMPLE_STUDENTS: readonly string[] = (
  '김민준 이서연 박도윤 최하윤 정시우 강지아 조하준 윤서아 장은우 임지유 한예준 오수아 ' +
  '서지호 신채원 권유준 황다은 안주원 송하린 전건우 홍예린 문우진 양소율 배시윤 백나은'
).split(' ');
