import { render } from '@testing-library/preact';
import type { AppData } from './domain/types';
import { AppStoreProvider } from './state/AppStore';
import { SessionProvider } from './state/session';
import { STORAGE_KEY, type KeyValueStore } from './storage/repository';
import { emptyData } from './storage/schema';
import { App } from './ui/App';
import { ToastProvider } from './ui/Toast';

export const STUDENTS = ['가온', '나래', '다솜', '라온'];

export function dataWithClass(extra: Partial<AppData> = {}): AppData {
  return {
    ...emptyData(),
    classes: [{ id: 'c1', name: '5-3', students: STUDENTS, counts: {}, last: {} }],
    currentClassId: 'c1',
    ...extra,
  };
}

/** 앱 전체를 그린다. data를 주면 저장소에 미리 넣어 둔다. */
export function renderApp(options: { data?: AppData; hash?: string; store?: KeyValueStore | null } = {}) {
  if (options.data) localStorage.setItem(STORAGE_KEY, JSON.stringify(options.data));
  window.location.hash = options.hash ?? '#/catalog';
  const store = options.store === undefined ? localStorage : options.store;
  return render(
    <ToastProvider>
      <AppStoreProvider store={store}>
        <SessionProvider>
          <App />
        </SessionProvider>
      </AppStoreProvider>
    </ToastProvider>,
  );
}

export function savedData(): AppData {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as AppData;
}
