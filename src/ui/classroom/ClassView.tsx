import { useState } from 'preact/hooks';
import { SAMPLE_CLASS_NAME, SAMPLE_STUDENTS } from '../../data/labels';
import { duplicateNames, parseRoster } from '../../domain/roster';
import { newId } from '../../state/appReducer';
import { useAppStore } from '../../state/AppStore';
import { josa } from '../josa';
import { useToast } from '../Toast';
import { BackupPanel } from './BackupPanel';
import { RecordsPanel } from './RecordsPanel';
import { RosterEditor } from './RosterEditor';

export function ClassView() {
  const { data, current, migrated } = useAppStore();
  const [creating, setCreating] = useState(false);

  if (!current || creating) {
    return (
      <section aria-label="우리 반" class="class-view">
        <NewClassForm first={!current} onDone={() => setCreating(false)} />
        {data.classes.length === 0 && <BackupPanel />}
      </section>
    );
  }

  return (
    <section aria-label="우리 반" class="class-view">
      {migrated && <p class="banner info">예전 버전(프로토타입)에서 쓰던 명단과 레시피를 옮겨 왔어요.</p>}
      <div class="classgrid">
        <RosterEditor key={`${current.id}\n${current.name}\n${current.students.join('\n')}`} classRoom={current} onNewClass={() => setCreating(true)} />
        <RecordsPanel classRoom={current} />
      </div>
      <BackupPanel />
    </section>
  );
}

function NewClassForm({ first, onDone }: { first: boolean; onDone: () => void }) {
  const { dispatch } = useAppStore();
  const toast = useToast();
  const [name, setName] = useState('');
  const [roster, setRoster] = useState('');
  const count = parseRoster(roster).length;

  const create = (className: string, students: readonly string[]) => {
    dispatch({ type: 'addClass', id: newId('c'), name: className, students });
    toast(`${josa(`“${className.trim() || '새 반'}”`, '을/를')} 만들었어요 · ${students.length}명`);
    onDone();
  };

  return (
    <form
      class="panel new-class"
      onSubmit={(e) => {
        e.preventDefault();
        create(name, parseRoster(roster));
      }}
    >
      <h2>{first ? '먼저 우리 반을 만들어 주세요' : '새 반 만들기'}</h2>
      <p class="muted">
        공정 뽑기, 릴레이 기록 같은 도구는 명단이 있어야 쓸 수 있어요. 전담 선생님은 가르치는 반마다 하나씩 만드세요.
      </p>
      <label class="field">
        <span>반 이름</span>
        <input type="text" value={name} onInput={(e) => setName(e.currentTarget.value)} placeholder="예: 5학년 3반" maxLength={60} required />
      </label>
      <label class="field">
        <span>학생 명단 <small class="muted">— 나이스·엑셀에서 이름 열을 그대로 붙여 넣어도 돼요 ({count}명)</small></span>
        <textarea value={roster} onInput={(e) => setRoster(e.currentTarget.value)} placeholder={'김민준\n이서연\n박도윤'} rows={10} />
      </label>
      {duplicateNames(roster).length > 0 && (
        <p class="small warn-text">같은 이름이 있어요({duplicateNames(roster).join(', ')}). 한 명으로 합쳐지니 “김민준A”, “김민준B”처럼 구분해 주세요.</p>
      )}
      <div class="row">
        <button type="submit" class="btn primary big">반 만들기</button>
        {first ? (
          <button type="button" class="btn" onClick={() => create(SAMPLE_CLASS_NAME, SAMPLE_STUDENTS)}>
            예시 반으로 먼저 둘러보기
          </button>
        ) : (
          <button type="button" class="btn" onClick={onDone}>취소</button>
        )}
      </div>
    </form>
  );
}
