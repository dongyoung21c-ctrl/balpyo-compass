import { useAppStore } from '../state/AppStore';
import { CompassMark } from './common';

export function Header() {
  const { data, current, dispatch } = useAppStore();
  return (
    <header class="top">
      <div class="brand">
        <CompassMark />
        <div>
          <h1>발표나침반</h1>
          <p>교실 발표 방법 도감 · 진행 도우미</p>
        </div>
      </div>
      {data.classes.length > 0 && current && (
        <label class="classpick">
          <span>지금 수업하는 반</span>
          <select value={current.id} onChange={(e) => dispatch({ type: 'selectClass', id: e.currentTarget.value })}>
            {data.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.students.length}명
              </option>
            ))}
          </select>
        </label>
      )}
    </header>
  );
}
