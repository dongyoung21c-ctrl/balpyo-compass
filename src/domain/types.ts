export type CategoryId = 'pick' | 'all' | 'low' | 'group' | 'discuss' | 'act' | 'formal';
export type GroupForm = '개인' | '짝' | '모둠' | '전체';
export type LessonStage = '도입' | '전개' | '정리';
export type Burden = 1 | 2 | 3;
export type SourceId = 'citrusy97' | 'urimilssam' | 'teacher0325';
export type ToolId = 'pick' | 'rps' | 'love' | 'arrow' | 'beat' | 'pass' | 'relay' | 'groups';

/** once: 한 번만, each: 라운드마다 반복, between: 라운드 사이에만(마지막 라운드 뒤에는 생략) */
export type Repeat = 'once' | 'each' | 'between';

export interface Step {
  readonly title: string;
  /** 0이면 교사가 직접 넘기는 단계 */
  readonly sec: number;
  readonly desc: string;
  readonly repeat: Repeat;
}

export interface Method {
  readonly id: string;
  readonly name: string;
  readonly cat: CategoryId;
  readonly group: GroupForm;
  readonly burden: Burden;
  readonly stages: readonly LessonStage[];
  readonly summary: string;
  readonly steps: readonly Step[];
  /** 수동 단계뿐이라 시간을 계산할 수 없을 때 보여 줄 대략적인 분 */
  readonly minutes?: number;
  readonly rounds?: number;
  readonly tool?: ToolId;
  readonly tip?: string;
  readonly sources?: readonly SourceId[];
}

export type SoundId = 'bell' | 'dingdong' | 'xylo' | 'none';

/** 초시계 진행 설정. 레시피로 저장할 수 있다. */
export interface RunConfig {
  readonly methodId: string;
  readonly rounds: number;
  readonly secs: readonly number[];
  readonly autoNext: boolean;
  readonly warn: boolean;
  readonly sound: SoundId;
}

export interface Recipe extends RunConfig {
  readonly id: string;
  readonly name: string;
}

export interface ClassRoom {
  readonly id: string;
  readonly name: string;
  readonly students: readonly string[];
  /** 학생 이름 → 발표 횟수 */
  readonly counts: Readonly<Record<string, number>>;
  /** 학생 이름 → 마지막 발표 시각(ms) */
  readonly last: Readonly<Record<string, number>>;
}

export interface AppData {
  readonly version: 2;
  readonly classes: readonly ClassRoom[];
  readonly currentClassId: string | null;
  readonly recipes: readonly Recipe[];
  readonly loveConditions: readonly string[];
}
