import { fireEvent, screen, waitFor, within, act } from '@testing-library/preact';
import { vi } from 'vitest';
import { renderApp, dataWithClass, savedData } from '../../test-utils';
import { emptyData } from '../../storage/schema';
import { STORAGE_KEY } from '../../storage/repository';
import { toBackupJson } from '../../storage/backup';

vi.mock('../../audio/sounds');

describe('우리 반', () => {
  it('처음에는 반 만들기를 보여 주고, 붙여 넣은 명단으로 반을 만든다', () => {
    renderApp({ data: emptyData(), hash: '#/class' });
    expect(screen.getByText('먼저 우리 반을 만들어 주세요')).toBeTruthy();
    fireEvent.input(screen.getByLabelText('반 이름'), { target: { value: '6-1' } });
    fireEvent.input(screen.getByLabelText(/학생 명단/), { target: { value: '1. 김하나\n2. 이두리\n3. 박세찬' } });
    expect(screen.getByText(/\(3명\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '반 만들기' }));
    expect(savedData().classes[0]).toMatchObject({ name: '6-1', students: ['김하나', '이두리', '박세찬'] });
    expect(screen.getByText('“6-1”을 만들었어요 · 3명')).toBeTruthy();
    expect(screen.getByLabelText('지금 수업하는 반')).toBeTruthy();
  });

  it('예시 반으로 둘러볼 수 있다', () => {
    renderApp({ data: emptyData(), hash: '#/class' });
    fireEvent.click(screen.getByRole('button', { name: '예시 반으로 먼저 둘러보기' }));
    expect(savedData().classes[0]?.students).toHaveLength(24);
  });

  it('명단을 고치면 빠진 학생을 경고하고 저장한다', () => {
    renderApp({ data: dataWithClass(), hash: '#/class' });
    const save = screen.getByRole('button', { name: '저장됨' });
    expect((save as HTMLButtonElement).disabled).toBe(true);
    fireEvent.input(screen.getByLabelText(/학생 명단/), { target: { value: '가온\n나래\n마루' } });
    expect(screen.getByText(/빠진 학생\(다솜, 라온\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(savedData().classes[0]?.students).toEqual(['가온', '나래', '마루']);
  });

  it('새 반을 만들고 반을 바꾸고 지운다', () => {
    renderApp({ data: dataWithClass(), hash: '#/class' });
    fireEvent.click(screen.getByRole('button', { name: '+ 새 반' }));
    expect(screen.getByText('새 반 만들기')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    fireEvent.click(screen.getByRole('button', { name: '+ 새 반' }));
    fireEvent.input(screen.getByLabelText('반 이름'), { target: { value: '5-2' } });
    fireEvent.click(screen.getByRole('button', { name: '반 만들기' }));
    expect(savedData().currentClassId).not.toBe('c1');

    fireEvent.change(screen.getByLabelText('지금 수업하는 반'), { target: { value: 'c1' } });
    expect(savedData().currentClassId).toBe('c1');

    fireEvent.click(screen.getByRole('button', { name: '이 반 삭제' }));
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    fireEvent.click(screen.getByRole('button', { name: '이 반 삭제' }));
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(savedData().classes.map((c) => c.name)).toEqual(['5-2']);
  });

  it('발표 횟수를 고치고 초기화한다', () => {
    renderApp({ data: dataWithClass(), hash: '#/class' });
    fireEvent.click(screen.getByRole('button', { name: '라온 발표 1회 더하기' }));
    fireEvent.click(screen.getByRole('button', { name: '라온 발표 1회 더하기' }));
    fireEvent.click(screen.getByRole('button', { name: '라온 발표 1회 빼기' }));
    expect(savedData().classes[0]?.counts.라온).toBe(1);
    const summary = screen.getByText('총 발표').parentElement as HTMLElement;
    expect(within(summary).getByText('1')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '기록 초기화' }));
    fireEvent.click(screen.getByRole('button', { name: '지우기' }));
    expect(savedData().classes[0]?.counts).toEqual({});
  });

  it('백업 파일을 내려받는다', () => {
    const create = vi.fn(() => 'blob:x');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    renderApp({ data: dataWithClass(), hash: '#/class' });
    fireEvent.click(screen.getByRole('button', { name: '백업 파일 내려받기' }));
    expect(create).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it('백업 파일을 불러와 확인 뒤 바꾼다', async () => {
    renderApp({ data: dataWithClass(), hash: '#/class' });
    const backup = toBackupJson({ ...emptyData(), classes: [{ id: 'z', name: '백업반', students: ['하늘'], counts: {}, last: {} }], currentClassId: 'z' });
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File([backup], 'b.json', { type: 'application/json' })] } });
    });
    await waitFor(() => expect(screen.getByText(/반 1개, 레시피 0개/)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: '바꾸기' }));
    expect(savedData().classes[0]?.name).toBe('백업반');
  });

  it('잘못된 파일은 알려 준다', async () => {
    renderApp({ data: dataWithClass(), hash: '#/class' });
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File(['hello'], 'x.json')] } });
    });
    await waitFor(() => expect(screen.getByText(/JSON 파일이 아니에요/)).toBeTruthy());
  });
});

describe('저장소', () => {
  it('저장할 수 없는 브라우저면 경고를 띄운다', () => {
    renderApp({ store: null });
    expect(screen.getByRole('alert').textContent).toMatch(/저장할 수 없어요/);
  });

  it('저장 공간이 꽉 차면 경고한다', () => {
    const store = { getItem: () => null, setItem: () => { throw new Error('full'); } };
    renderApp({ store, hash: '#/class' });
    fireEvent.click(screen.getByRole('button', { name: '예시 반으로 먼저 둘러보기' }));
    expect(screen.getAllByRole('alert')[0]?.textContent).toMatch(/저장 공간이 부족/);
  });

  it('다른 탭에서 바뀐 내용을 받아 온다', () => {
    renderApp({ data: dataWithClass(), hash: '#/class' });
    const next = { ...dataWithClass(), classes: [{ id: 'c1', name: '다른탭반', students: ['하늘'], counts: {}, last: {} }] };
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: JSON.stringify(next) }));
    });
    expect((screen.getByLabelText('지금 수업하는 반') as HTMLSelectElement).selectedOptions[0]?.textContent).toMatch(/다른탭반/);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: '{broken' }));
    });
  });

  it('프로토타입에서 옮겨 온 데이터가 있으면 알려 준다', () => {
    localStorage.setItem('bn.classes', JSON.stringify([{ id: 'c7', name: '4-1', students: ['별'], counts: {}, last: {} }]));
    renderApp({ hash: '#/class' });
    expect(screen.getByText(/예전 버전\(프로토타입\)에서 쓰던/)).toBeTruthy();
  });
});
