import { GROUP_LABELS, SOURCES, TOOLS } from '../../data/labels';
import { findMethod } from '../../data/methods';
import { estimateMinutes } from '../../domain/sequence';
import { formatClock } from '../../domain/time';
import type { ToolId } from '../../domain/types';
import { BurdenDots, CategoryLabel } from '../common';
import { Dialog } from '../Dialog';

interface Props {
  readonly methodId: string | undefined;
  readonly onClose: () => void;
  readonly onRun: (methodId: string) => void;
  readonly onTool: (tool: ToolId) => void;
}

const REPEAT_LABEL = { once: '', each: '반복', between: '라운드 사이' } as const;

export function MethodDetail({ methodId, onClose, onRun, onTool }: Props) {
  const m = methodId ? findMethod(methodId) : undefined;
  return (
    <Dialog open={Boolean(m)} onClose={onClose} label={m?.name ?? '발표 방법'}>
      {m && (
        <article>
          <CategoryLabel cat={m.cat} />
          <h2>{m.name}</h2>
          <p class="lead">{m.summary}</p>
          <p class="meta plain">
            <span>{GROUP_LABELS[m.group]}</span>
            <span>약 {estimateMinutes(m)}분</span>
            <span>
              부담 <BurdenDots level={m.burden} />
            </span>
            <span>{m.stages.join(' · ')}</span>
          </p>
          <ol class="steps">
            {m.steps.map((s, i) => (
              <li key={i}>
                <span class="step-no" aria-hidden="true">{i + 1}</span>
                <span class="step-text">
                  <b>{s.title}</b>
                  {s.repeat !== 'once' && <span class="loopmark">{REPEAT_LABEL[s.repeat]}</span>}
                  {s.desc && <span class="step-desc">{s.desc}</span>}
                </span>
                <span class="step-sec">{s.sec ? formatClock(s.sec) : '수동'}</span>
              </li>
            ))}
          </ol>
          {m.rounds && (
            <p class="small muted">
              <span class="loopmark">반복</span> 표시 단계는 라운드 수만큼 되풀이돼요. 기본 {m.rounds}라운드이고, 진행 전에 바꿀 수 있어요.
            </p>
          )}
          {m.tip && (
            <p class="tip">
              <b>선생님 팁</b> · {m.tip}
            </p>
          )}
          {m.sources && (
            <p class="small src">
              참고:{' '}
              {m.sources.map((k, i) => (
                <span key={k}>
                  {i > 0 && ' · '}
                  <a href={SOURCES[k].url} target="_blank" rel="noopener">
                    {SOURCES[k].name}
                  </a>
                </span>
              ))}
            </p>
          )}
          <div class="row actions">
            <button type="button" class="btn primary big" onClick={() => onRun(m.id)}>
              ▶ 초시계 맞추고 진행
            </button>
            {m.tool && (
              <button type="button" class="btn big" onClick={() => onTool(m.tool as ToolId)}>
                {TOOLS[m.tool].name} 도구 열기
              </button>
            )}
          </div>
        </article>
      )}
    </Dialog>
  );
}
