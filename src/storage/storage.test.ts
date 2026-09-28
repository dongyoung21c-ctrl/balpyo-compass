import { loadData, saveData, migrateLegacy, STORAGE_KEY, type KeyValueStore } from './repository';
import { parseAppData, parseRecipe, emptyData } from './schema';
import { toBackupJson, parseBackup, backupFileName, MAX_BACKUP_BYTES } from './backup';
import type { AppData } from '../domain/types';
import { SAMPLE_STUDENTS } from '../data/labels';

function memoryStore(init: Record<string, unknown> = {}): KeyValueStore & { dump: Map<string, string> } {
  const dump = new Map(Object.entries(init).map(([k, v]) => [k, JSON.stringify(v)]));
  return {
    dump,
    getItem: (k) => dump.get(k) ?? null,
    setItem: (k, v) => void dump.set(k, v),
  };
}

const sample: AppData = {
  version: 2,
  classes: [{ id: 'a', name: '5-3', students: ['가', '나'], counts: { 가: 2 }, last: { 가: 10 } }],
  currentClassId: 'a',
  recipes: [{ id: 'r', name: '월카', methodId: 'worldcafe', rounds: 4, secs: [60, 300, 60, 120, 240], autoNext: true, warn: true, sound: 'xylo' }],
  loveConditions: ['안경'],
};

describe('저장과 불러오기', () => {
  it('저장한 그대로 불러온다', () => {
    const s = memoryStore();
    expect(saveData(s, sample)).toBe(true);
    expect(loadData(s)).toEqual({ data: sample, migrated: false });
  });

  it('처음이면 빈 데이터', () => {
    const r = loadData(memoryStore());
    expect(r.data.classes).toEqual([]);
    expect(r.data.loveConditions.length).toBeGreaterThan(5);
    expect(r.warning).toBeUndefined();
  });

  it('저장소가 없으면 경고와 함께 빈 데이터', () => {
    expect(loadData(null).warning).toMatch(/저장할 수 없어요/);
    expect(saveData(null, sample)).toBe(false);
  });

  it('망가진 데이터면 경고하고 새로 시작한다', () => {
    const s = memoryStore();
    s.dump.set(STORAGE_KEY, '{not json');
    expect(loadData(s).warning).toMatch(/읽지 못해/);
    s.dump.set(STORAGE_KEY, JSON.stringify({ version: 1 }));
    expect(loadData(s).warning).toMatch(/읽지 못해/);
  });

  it('저장 공간이 꽉 차면 false', () => {
    const s: KeyValueStore = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); } };
    expect(saveData(s, sample)).toBe(false);
  });
});

describe('프로토타입 데이터 옮기기', () => {
  it('예시 반·예시 레시피는 빼고 실제 반을 옮긴다', () => {
    const s = memoryStore({
      'bn.classes': [
        { id: 'c1', name: '5학년 3반 (예시)', students: SAMPLE_STUDENTS, counts: {}, last: {} },
        { id: 'c2', name: '6학년 1반 (예시)', students: ['진짜', '명단'], counts: { 진짜: 2 }, last: {} },
        { id: 'c9', name: '4-2', students: ['가', '나'], counts: { 가: 3, 없는학생: 9 }, last: {} },
      ],
      'bn.cur': 'c9',
      'bn.recipes': [
        { id: 'r1', name: '우리 반 월드카페 (예시)', mid: 'worldcafe', rounds: 4, secs: [1, 2, 3, 4, 5] },
        { id: 'r7', name: '내 TPS', mid: 'tps', rounds: 1, secs: [30, 60, 90], autoNext: true, warn: false, sound: 'dingdong' },
      ],
      'bn.love': ['조건1'],
    });
    const r = loadData(s);
    expect(r.migrated).toBe(true);
    expect(r.data.classes.map((c) => c.id)).toEqual(['c2', 'c9']);
    expect(r.data.classes[1]?.counts).toEqual({ 가: 3 });
    expect(r.data.currentClassId).toBe('c9');
    expect(r.data.recipes).toEqual([
      { id: 'r7', name: '내 TPS', methodId: 'tps', rounds: 1, secs: [30, 60, 90], autoNext: true, warn: false, sound: 'dingdong' },
    ]);
    expect(r.data.loveConditions).toEqual(['조건1']);
  });

  it('예전 데이터가 없으면 null', () => {
    expect(migrateLegacy(memoryStore())).toBeNull();
  });

  it('예시만 있었으면 옮긴 것으로 치지 않는다', () => {
    const s = memoryStore({ 'bn.classes': [{ id: 'c1', name: '5학년 3반 (예시)', students: SAMPLE_STUDENTS, counts: {}, last: {} }] });
    expect(loadData(s).migrated).toBe(false);
  });
});

describe('검증', () => {
  it('잘못된 반·레시피는 버리고 중복 id는 하나만 남긴다', () => {
    const d = parseAppData({
      version: 2,
      classes: [sample.classes[0], sample.classes[0], { id: '', name: 'x' }, 'junk'],
      recipes: [{ id: 'q', name: 'q', methodId: 'nope', secs: [] }],
      currentClassId: 'missing',
      loveConditions: ['a', 'a', 3],
    });
    expect(d?.classes).toHaveLength(1);
    expect(d?.recipes).toEqual([]);
    expect(d?.currentClassId).toBe('a');
    expect(d?.loveConditions).toEqual(['a']);
  });

  it('레시피 시간·라운드·소리를 안전한 값으로 고친다', () => {
    const r = parseRecipe({ id: 'x', name: 'x', methodId: 'worldcafe', rounds: 99, secs: [-5, 'a', 99999], sound: 'boom' });
    expect(r?.rounds).toBe(12);
    expect(r?.secs).toEqual([0, 420, 5940, 180, 300]);
    expect(r?.sound).toBe('bell');
    expect(r?.warn).toBe(true);
  });

  it('반이 없으면 현재 반도 없다', () => {
    expect(parseAppData(emptyData())?.currentClassId).toBeNull();
  });
});

describe('백업 파일', () => {
  it('내보낸 파일을 다시 읽을 수 있다', () => {
    const r = parseBackup(toBackupJson(sample, new Date('2026-09-28T00:00:00Z')));
    expect(r).toEqual({ ok: true, data: sample });
  });

  it('JSON이 아니거나 형식이 다르면 알려 준다', () => {
    expect(parseBackup('hello')).toMatchObject({ ok: false, error: expect.stringMatching(/JSON/) });
    expect(parseBackup('{"a":1}')).toMatchObject({ ok: false, error: expect.stringMatching(/형식/) });
    expect(parseBackup('x'.repeat(MAX_BACKUP_BYTES + 1))).toMatchObject({ ok: false });
  });

  it('파일 이름에 날짜가 들어간다', () => {
    expect(backupFileName(new Date(2026, 8, 28))).toBe('발표나침반-백업-20260928.json');
  });
});
