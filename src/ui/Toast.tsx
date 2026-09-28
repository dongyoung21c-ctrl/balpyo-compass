import { createContext, type ComponentChildren } from 'preact';
import { useCallback, useContext, useEffect, useRef, useState } from 'preact/hooks';

const TOAST_MS = 2400;
const TOAST_WITH_ACTION_MS = 5000;

export interface ToastAction {
  readonly label: string;
  readonly run: () => void;
}

interface ToastState {
  readonly id: number;
  readonly message: string;
  readonly action?: ToastAction;
}

type ShowToast = (message: string, action?: ToastAction) => void;

const ToastContext = createContext<ShowToast>(() => undefined);

export const useToast = (): ShowToast => useContext(ToastContext);

export function ToastProvider({ children }: { children: ComponentChildren }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number>();

  const show = useCallback<ShowToast>((message, action) => {
    setToast({ id: Date.now(), message, action });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    timer.current = window.setTimeout(() => setToast(null), toast.action ? TOAST_WITH_ACTION_MS : TOAST_MS);
    return () => window.clearTimeout(timer.current);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div class="toast-region" role="status" aria-live="polite">
        {toast && (
          <div class="toast" key={toast.id}>
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                class="toast-action"
                onClick={() => {
                  toast.action?.run();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
