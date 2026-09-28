import { useState } from 'preact/hooks';
import { classStats } from '../../domain/classroom';
import type { ClassRoom } from '../../domain/types';
import { useAppStore } from '../../state/AppStore';

export function RecordsPanel({ classRoom }: { classRoom: ClassRoom }) {
  const { dispatch } = useAppStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const s = classStats(classRoom);

  return (
    <div class="panel">
      <h2 class="label">발표 기록</h2>
      <dl class="summary">
        <div><dt>총 발표</dt><dd>{s.total}</dd></div>
        <div><dt>아직 0회</dt><dd class="danger-text">{s.neverSpoke}</dd></div>
        <div><dt>1인 평균</dt><dd>{s.average.toFixed(1)}</dd></div>
      </dl>
      <p class="small muted">적게 발표한 친구가 위에 있어요. 도구에서 “발표함”을 누르면 쌓이고, ＋/－로 직접 고칠 수도 있어요.</p>
      {s.rows.length === 0 ? (
        <p class="muted">명단이 비어 있어요.</p>
      ) : (
        <ul class="bars">
          {s.rows.map(({ name, count }) => (
            <li key={name} class="bar-row">
              <span class={count ? '' : 'danger-text'}>{name}</span>
              <span class="track" aria-hidden="true"><i style={{ width: `${(100 * count) / s.max}%` }} /></span>
              <span class="n">{count}</span>
              <span class="adj">
                <button type="button" aria-label={`${name} 발표 1회 빼기`} disabled={count === 0} onClick={() => dispatch({ type: 'adjustCount', name, delta: -1 })}>－</button>
                <button type="button" aria-label={`${name} 발표 1회 더하기`} onClick={() => dispatch({ type: 'recordTalk', name, now: Date.now() })}>＋</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div class="row">
        <button type="button" class="btn ghost" disabled={s.total === 0} onClick={() => setConfirmReset(true)}>기록 초기화</button>
      </div>
      {confirmReset && (
        <div class="confirm" role="alert">
          {classRoom.name}의 발표 기록을 모두 지울까요?
          <button type="button" class="btn danger" onClick={() => { dispatch({ type: 'resetCounts' }); setConfirmReset(false); }}>지우기</button>
          <button type="button" class="btn" onClick={() => setConfirmReset(false)}>취소</button>
        </div>
      )}
    </div>
  );
}
