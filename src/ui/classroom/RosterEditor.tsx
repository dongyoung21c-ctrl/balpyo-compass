import { useState } from 'preact/hooks';
import { duplicateNames, parseRoster } from '../../domain/roster';
import type { ClassRoom } from '../../domain/types';
import { useAppStore } from '../../state/AppStore';
import { josa } from '../josa';
import { useToast } from '../Toast';

interface Props {
  readonly classRoom: ClassRoom;
  readonly onNewClass: () => void;
}

export function RosterEditor({ classRoom: c, onNewClass }: Props) {
  const { dispatch } = useAppStore();
  const toast = useToast();
  const [name, setName] = useState(c.name);
  const [roster, setRoster] = useState(c.students.join('\n'));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const parsed = parseRoster(roster);
  const removed = c.students.filter((n) => !parsed.includes(n));
  const dirty = name.trim() !== c.name || parsed.join('\n') !== c.students.join('\n');

  return (
    <form
      class="panel"
      onSubmit={(e) => {
        e.preventDefault();
        dispatch({ type: 'updateClass', id: c.id, name, students: parsed });
        setRoster(parsed.join('\n'));
        toast(`명단을 저장했어요 · ${parsed.length}명`);
      }}
    >
      <div class="panel-head">
        <h2 class="label">반 정보</h2>
        <button type="button" class="btn small" onClick={onNewClass}>+ 새 반</button>
      </div>
      <label class="field">
        <span>반 이름</span>
        <input type="text" value={name} onInput={(e) => setName(e.currentTarget.value)} maxLength={60} required />
      </label>
      <label class="field">
        <span>학생 명단 <small class="muted">한 줄에 한 명 ({parsed.length}명)</small></span>
        <textarea value={roster} onInput={(e) => setRoster(e.currentTarget.value)} rows={12} />
      </label>
      {duplicateNames(roster).length > 0 && (
        <p class="small warn-text">같은 이름이 있어요({duplicateNames(roster).join(', ')}). 한 명으로 합쳐지니 “김민준A”, “김민준B”처럼 구분해 주세요.</p>
      )}
      {removed.length > 0 && (
        <p class="small warn-text">저장하면 명단에서 빠진 학생({removed.join(', ')})의 발표 기록도 지워져요.</p>
      )}
      <div class="row">
        <button type="submit" class="btn primary" disabled={!dirty}>{dirty ? '저장' : '저장됨'}</button>
        <button type="button" class="btn danger ghost" onClick={() => setConfirmDelete(true)}>이 반 삭제</button>
      </div>
      {confirmDelete && (
        <div class="confirm" role="alert">
          {josa(`“${c.name}”`, '과/와')} 발표 기록을 모두 지울까요?
          <button type="button" class="btn danger" onClick={() => { dispatch({ type: 'deleteClass', id: c.id }); toast(`${josa(`“${c.name}”`, '을/를')} 지웠어요`); }}>
            삭제
          </button>
          <button type="button" class="btn" onClick={() => setConfirmDelete(false)}>취소</button>
        </div>
      )}
    </form>
  );
}
