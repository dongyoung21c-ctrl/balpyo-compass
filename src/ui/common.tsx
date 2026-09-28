import type { ComponentChildren } from 'preact';
import type { Burden, CategoryId } from '../domain/types';
import { CATEGORIES } from '../data/labels';

export function BurdenDots({ level }: { level: Burden }) {
  return (
    <span class="burden" aria-label={`발표 부담 ${['', '낮음', '보통', '높음'][level]}`}>
      <span aria-hidden="true">
        {'●'.repeat(level)}
        <span class="burden-off">{'○'.repeat(3 - level)}</span>
      </span>
    </span>
  );
}

export function CategoryLabel({ cat }: { cat: CategoryId }) {
  return (
    <span class="cat" style={{ '--cc': `var(--c-${cat})` }}>
      {CATEGORIES[cat]}
    </span>
  );
}

interface ChipOption<T> {
  readonly value: T;
  readonly label: string;
}

interface ChipsProps<T> {
  readonly label: string;
  readonly options: readonly ChipOption<T>[];
  readonly value: T | undefined;
  /** 같은 칩을 다시 누르면 undefined로 풀린다 */
  readonly onChange: (v: T | undefined) => void;
}

export function Chips<T extends string | number>({ label, options, value, onChange }: ChipsProps<T>) {
  return (
    <div class="chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          type="button"
          key={String(o.value)}
          class="chip"
          aria-pressed={value === o.value}
          onClick={() => onChange(value === o.value ? undefined : o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CompassMark({ size = 44 }: { size?: number }) {
  return (
    <svg class="mark" width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r="20" fill="var(--accent)" />
      <circle cx="22" cy="22" r="15" fill="none" stroke="var(--accent-ink)" stroke-opacity=".35" stroke-width="1.5" />
      <path d="M22 7 L27 22 L22 37 L17 22 Z" fill="var(--accent-ink)" />
      <path d="M22 7 L27 22 L17 22 Z" fill="var(--hi)" />
      <circle cx="22" cy="22" r="2.4" fill="var(--accent)" />
    </svg>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ComponentChildren }) {
  return (
    <div class="empty">
      <p class="empty-title">{title}</p>
      {children}
    </div>
  );
}
