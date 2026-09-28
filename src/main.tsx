import { render } from 'preact';
import { browserStore } from './storage/repository';
import { AppStoreProvider } from './state/AppStore';
import { SessionProvider } from './state/session';
import { App } from './ui/App';
import { ToastProvider } from './ui/Toast';
import './styles/tokens.css';
import './styles/base.css';
import './styles/views.css';
import './styles/board.css';

const root = document.getElementById('app');
if (root) {
  render(
    <ToastProvider>
      <AppStoreProvider store={browserStore()}>
        <SessionProvider>
          <App />
        </SessionProvider>
      </AppStoreProvider>
    </ToastProvider>,
    root,
  );
}
