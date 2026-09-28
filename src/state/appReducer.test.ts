import { appReducer, currentClass, newId } from './appReducer';
import { emptyData } from '../storage/schema';
import type { AppData, Recipe } from '../domain/types';

const withClasses = (): AppData =>
  appReducer(
    appReducer(emptyData(), { type: 'addClass', id: 'a', name: '5-3', students: ['가', '나'] }),
    { type: 'addClass', id: 'b', name: '6-1', students: ['다'] },
  );

describe('appReducer', () => {
  it('반을 만들면 그 반이 선택된다', () => {
    const d = withClasses();
    expect(d.classes.map((c) => c.id)).toEqual(['a', 'b']);
    expect(d.currentClassId).toBe('b');
  });

  it('이름 없이 만들면 새 반', () => {
    const d = appReducer(emptyData(), { type: 'addClass', id: 'x', name: ' ', students: [] });
    expect(d.classes[0]?.name).toBe('새 반');
  });

  it('없는 반은 선택하지 않는다', () => {
    const d = withClasses();
    expect(appReducer(d, { type: 'selectClass', id: 'zz' })).toBe(d);
    expect(appReducer(d, { type: 'selectClass', id: 'a' }).currentClassId).toBe('a');
  });

  it('선택한 반을 지우면 남은 첫 반을 고른다', () => {
    const d = appReducer(withClasses(), { type: 'deleteClass', id: 'b' });
    expect(d.currentClassId).toBe('a');
    const none = appReducer(d, { type: 'deleteClass', id: 'a' });
    expect(none.currentClassId).toBeNull();
    expect(currentClass(none)).toBeUndefined();
  });

  it('다른 반을 지우면 선택은 그대로', () => {
    expect(appReducer(withClasses(), { type: 'deleteClass', id: 'a' }).currentClassId).toBe('b');
  });

  it('반 정보를 고친다', () => {
    const d = appReducer(withClasses(), { type: 'updateClass', id: 'a', name: '5-4', students: ['가', '라'] });
    expect(d.classes[0]).toMatchObject({ name: '5-4', students: ['가', '라'] });
  });

  it('현재 반에 발표를 기록하고 되돌린다', () => {
    let d = appReducer(withClasses(), { type: 'selectClass', id: 'a' });
    d = appReducer(d, { type: 'recordTalk', name: '가', now: 5 });
    d = appReducer(d, { type: 'recordTalk', name: '가', now: 9 });
    expect(currentClass(d)?.counts.가).toBe(2);
    d = appReducer(d, { type: 'undoTalk', classId: 'a', name: '가', prevLast: 5 });
    expect(currentClass(d)).toMatchObject({ counts: { 가: 1 }, last: { 가: 5 } });
    d = appReducer(d, { type: 'undoTalk', classId: 'a', name: '가', prevLast: undefined });
    expect(currentClass(d)).toMatchObject({ counts: { 가: 0 }, last: {} });
  });

  it('명단에 없는 이름은 기록하지 않는다', () => {
    const d = withClasses();
    expect(appReducer(d, { type: 'recordTalk', name: '없음', now: 1 })).toEqual(d);
  });

  it('반이 없으면 기록 관련 동작은 무시한다', () => {
    const d = emptyData();
    expect(appReducer(d, { type: 'resetCounts' })).toBe(d);
  });

  it('횟수 조정과 초기화', () => {
    let d = appReducer(withClasses(), { type: 'adjustCount', name: '다', delta: 3 });
    expect(currentClass(d)?.counts.다).toBe(3);
    d = appReducer(d, { type: 'resetCounts' });
    expect(currentClass(d)?.counts).toEqual({});
  });

  it('레시피를 추가·수정·삭제한다', () => {
    const r: Recipe = { id: 'r', name: 'a', methodId: 'tps', rounds: 1, secs: [1, 2, 3], autoNext: false, warn: true, sound: 'bell' };
    let d = appReducer(emptyData(), { type: 'saveRecipe', recipe: r });
    d = appReducer(d, { type: 'saveRecipe', recipe: { ...r, name: 'b' } });
    expect(d.recipes).toEqual([{ ...r, name: 'b' }]);
    d = appReducer(d, { type: 'deleteRecipe', id: 'r' });
    expect(d.recipes).toEqual([]);
  });

  it('조건 목록과 전체 교체', () => {
    const d = appReducer(emptyData(), { type: 'setLoveConditions', list: ['x'] });
    expect(d.loveConditions).toEqual(['x']);
    const other = withClasses();
    expect(appReducer(d, { type: 'replaceAll', data: other })).toBe(other);
  });

  it('newId는 접두어로 시작하고 겹치지 않는다', () => {
    expect(newId('c', 1)).toMatch(/^c1/);
    expect(new Set(Array.from({ length: 50 }, () => newId('c'))).size).toBe(50);
  });
});
