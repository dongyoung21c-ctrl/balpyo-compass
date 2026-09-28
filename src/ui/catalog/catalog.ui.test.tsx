import { fireEvent, screen, within, waitFor } from '@testing-library/preact';
import { vi } from 'vitest';
import { renderApp, savedData, dataWithClass } from '../../test-utils';
import type { Recipe } from '../../domain/types';

vi.mock('../../audio/sounds');

const recipe: Recipe = { id: 'r1', name: '우리 반 TPS', methodId: 'tps', rounds: 1, secs: [30, 60, 90], autoNext: false, warn: true, sound: 'bell' };

describe('도감', () => {
  it('34개 방법을 보여 주고 필터·검색으로 좁힌다', () => {
    renderApp();
    expect(screen.getByText('34개 방법')).toBeTruthy();

    fireEvent.click(within(screen.getByRole('group', { name: '형태' })).getByRole('button', { name: '짝' }));
    const pairCount = screen.getAllByRole('listitem').length;
    expect(pairCount).toBeLessThan(34);

    fireEvent.click(screen.getByRole('button', { name: '조건 모두 지우기' }));
    fireEvent.input(screen.getByLabelText('방법 찾기'), { target: { value: '없는방법이름' } });
    expect(screen.getByText('조건에 맞는 방법이 없어요')).toBeTruthy();
  });

  it('카드를 누르면 상세가 열리고 주소가 바뀐다', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /월드카페/ }));
    expect(window.location.hash).toBe('#/catalog/worldcafe');
    const dialog = screen.getByRole('dialog', { name: '월드카페' });
    expect(within(dialog).getByText('테이블 대화')).toBeTruthy();
    expect(within(dialog).getByText(/기본 3라운드/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
    expect(window.location.hash).toBe('#/catalog');
  });

  it('상세에서 도구로 바로 간다', () => {
    renderApp({ hash: '#/catalog/relay' });
    fireEvent.click(screen.getByRole('button', { name: '릴레이 기록 도구 열기' }));
    expect(window.location.hash).toBe('#/tools/relay');
  });

  it('참고 블로그 링크가 새 창으로 열린다', () => {
    renderApp({ hash: '#/catalog/nunchi' });
    const link = screen.getByRole('link', { name: /citrusy97/ });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener');
  });
});

describe('초시계 설정', () => {
  const openSetup = () => {
    renderApp({ hash: '#/catalog/worldcafe' });
    fireEvent.click(screen.getByRole('button', { name: '▶ 초시계 맞추고 진행' }));
    return screen.getByRole('dialog', { name: '초시계 맞추기' });
  };

  it('라운드와 시간을 바꾸면 총 시간이 바뀐다', () => {
    const d = openSetup();
    expect(within(d).getByText('33:00')).toBeTruthy();
    fireEvent.click(within(d).getByRole('button', { name: '라운드 수 늘리기' }));
    expect(within(d).getByText('41:00')).toBeTruthy();
    fireEvent.click(within(d).getByRole('button', { name: '라운드 수 줄이기' }));
    fireEvent.click(within(d).getByRole('button', { name: '라운드 수 줄이기' }));
    fireEvent.click(within(d).getByRole('button', { name: '라운드 수 줄이기' }));
    expect((within(d).getByLabelText('라운드 수') as HTMLInputElement).value).toBe('1');

    const input = within(d).getByLabelText('주제·규칙 안내 시간') as HTMLInputElement;
    fireEvent.input(input, { target: { value: '5' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input.value).toBe('5:00');
    fireEvent.click(within(d).getByRole('button', { name: '주제·규칙 안내 시간 늘리기' }));
    expect(input.value).toBe('5:30');
    fireEvent.click(within(d).getByRole('button', { name: '기본 시간으로' }));
    expect(input.value).toBe('2:00');
  });

  it('잘못 적은 시간은 알려 주고 원래 값으로 돌린다', () => {
    const d = openSetup();
    const input = within(d).getByLabelText('자리 이동 시간') as HTMLInputElement;
    fireEvent.input(input, { target: { value: '한시간' } });
    fireEvent.blur(input);
    expect(input.value).toBe('1:00');
    expect(screen.getByText(/“3”이나 “1:30”처럼/)).toBeTruthy();
  });

  it('레시피로 저장하면 도감 위에 나오고, 바로 진행·고치기·삭제·되돌리기가 된다', () => {
    const d = openSetup();
    fireEvent.input(within(d).getByLabelText('레시피 이름'), { target: { value: '5-3 월카' } });
    fireEvent.click(within(d).getByRole('button', { name: '레시피로 저장' }));
    expect(savedData().recipes[0]).toMatchObject({ name: '5-3 월카', methodId: 'worldcafe', rounds: 3 });

    fireEvent.click(within(d).getByRole('button', { name: '닫기' }));
    const shelf = screen.getByRole('region', { name: '내 수업 레시피' });
    expect(within(shelf).getByText('5-3 월카')).toBeTruthy();

    fireEvent.click(within(shelf).getByRole('button', { name: '고치기' }));
    expect(screen.getByRole('button', { name: '레시피 고치기' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));

    fireEvent.click(within(shelf).getByRole('button', { name: '5-3 월카 레시피 삭제' }));
    expect(savedData().recipes).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));
    expect(savedData().recipes).toHaveLength(1);
  });

  it('이름 없이 저장하면 방법 이름과 라운드로 이름을 붙인다', () => {
    const d = openSetup();
    fireEvent.click(within(d).getByRole('button', { name: '레시피로 저장' }));
    expect(savedData().recipes[0]?.name).toBe('월드카페 3라운드');
  });

  it('저장한 레시피로 바로 진행 화면을 연다', () => {
    renderApp({ data: dataWithClass({ recipes: [recipe] }) });
    fireEvent.click(screen.getByRole('button', { name: '▶ 바로 진행' }));
    expect(screen.getByRole('dialog', { name: /생각-짝-나누기.*진행/ })).toBeTruthy();
    expect(screen.getByRole('timer').textContent).toBe('0:30');
  });

  it('시작하면 진행 화면이 열린다', async () => {
    const d = openSetup();
    fireEvent.submit(within(d).getByRole('button', { name: '▶ 시작' }).closest('form') as HTMLFormElement);
    await waitFor(() => expect(screen.getByRole('dialog', { name: '월드카페 진행' })).toBeTruthy());
  });
});

describe('추천받기', () => {
  it('답을 고르면 3개를 추천하고, 진행을 누르면 초시계 설정이 열린다', () => {
    renderApp({ hash: '#/recommend' });
    expect(screen.queryByText('이런 방법은 어떠세요?')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '발표를 어려워해요' }));
    fireEvent.click(screen.getByRole('button', { name: '짝' }));
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(within(items[0] as HTMLElement).getByText(/맞는 조건: 짝, 부담 낮음/)).toBeTruthy();
    fireEvent.click(within(items[0] as HTMLElement).getByRole('button', { name: '▶ 진행' }));
    expect(screen.getByRole('dialog', { name: '초시계 맞추기' })).toBeTruthy();
  });

  it('같은 답을 다시 누르면 풀린다', () => {
    renderApp({ hash: '#/recommend' });
    const chip = screen.getByRole('button', { name: '20분 이상' });
    fireEvent.click(chip);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(chip);
    expect(screen.queryByText('이런 방법은 어떠세요?')).toBeNull();
  });

  it('자세히를 누르면 도감 상세로 간다', () => {
    renderApp({ hash: '#/recommend' });
    fireEvent.click(screen.getByRole('button', { name: '모둠' }));
    fireEvent.click(screen.getAllByRole('button', { name: '자세히' })[0] as HTMLElement);
    expect(window.location.hash).toMatch(/^#\/catalog\/.+/);
  });
});
