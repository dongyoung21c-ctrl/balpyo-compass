import { useState } from 'preact/hooks';
import type { AppData } from '../../domain/types';
import { useAppStore } from '../../state/AppStore';
import { backupFileName, MAX_BACKUP_BYTES, parseBackup, toBackupJson } from '../../storage/backup';
import { useToast } from '../Toast';

function download(text: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function BackupPanel() {
  const { data, dispatch } = useAppStore();
  const toast = useToast();
  const [pending, setPending] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setError('파일이 너무 커요. 발표나침반 백업 파일이 맞는지 확인하세요.');
      return;
    }
    try {
      const result = parseBackup(await file.text());
      if (result.ok) setPending(result.data);
      else setError(result.error);
    } catch {
      setError('파일을 읽지 못했어요. 다시 골라 주세요.');
    }
  };

  return (
    <div class="panel backup">
      <h2 class="label">백업</h2>
      <p class="small muted">
        명단과 기록은 이 브라우저에만 있어요. 브라우저 기록을 지우거나 다른 컴퓨터로 옮길 때는 백업 파일을 내려받아 두세요.
      </p>
      <div class="row">
        <button type="button" class="btn" disabled={data.classes.length === 0 && data.recipes.length === 0} onClick={() => { download(toBackupJson(data), backupFileName()); toast('백업 파일을 내려받았어요'); }}>
          백업 파일 내려받기
        </button>
        <label class="btn file-btn">
          백업 파일 불러오기
          <input type="file" accept="application/json,.json" onChange={(e) => { void onFile(e.currentTarget.files?.[0]); e.currentTarget.value = ''; }} />
        </label>
      </div>
      {error && <p class="small danger-text" role="alert">{error}</p>}
      {pending && (
        <div class="confirm" role="alert">
          반 {pending.classes.length}개, 레시피 {pending.recipes.length}개가 든 파일이에요. 지금 데이터를 이 파일로 바꿀까요?
          <button type="button" class="btn danger" onClick={() => { dispatch({ type: 'replaceAll', data: pending }); setPending(null); toast('백업을 불러왔어요'); }}>
            바꾸기
          </button>
          <button type="button" class="btn" onClick={() => setPending(null)}>취소</button>
        </div>
      )}
    </div>
  );
}
