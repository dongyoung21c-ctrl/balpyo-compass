import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

interface Props {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly label: string;
  readonly children: ComponentChildren;
  readonly wide?: boolean;
}

/**
 * 브라우저 기본 <dialog>를 쓴다. 포커스 가두기, Esc 닫기, 뒤 화면 가리기를 브라우저가 처리하고,
 * 닫으면 열기 전에 누른 버튼으로 포커스가 돌아간다.
 */
export function Dialog({ open, onClose, label, children, wide }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      if (typeof el.showModal === 'function') el.showModal();
      else el.setAttribute('open', '');
      el.scrollTop = 0;
    } else if (!open && el.open) {
      if (typeof el.close === 'function') el.close();
      else el.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      class={`sheet${wide ? ' wide' : ''}`}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // 바깥 어두운 부분을 누르면 닫는다
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div class="sheet-body">
          <button type="button" class="sheet-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
          {children}
        </div>
      )}
    </dialog>
  );
}
