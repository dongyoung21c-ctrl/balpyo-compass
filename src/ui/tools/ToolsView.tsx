import { SOURCES, TOOL_IDS, TOOLS } from '../../data/labels';
import type { ToolId } from '../../domain/types';
import { useAppStore } from '../../state/AppStore';
import { BeatTool, GroupsTool, PassTool, RelayTool } from './RosterTools';
import { GroupPickTool } from './GroupPickTool';
import { ArrowTool, LoveTool, PickTool, RpsTool } from './PickTools';

interface Props {
  readonly tool: ToolId;
  readonly onTool: (t: ToolId) => void;
}

/** 명단이 있어야 쓸 수 있는 도구 */
const NEEDS_ROSTER: ReadonlySet<ToolId> = new Set(['pick', 'arrow', 'beat', 'pass', 'relay', 'groups']);

export function ToolsView({ tool, onTool }: Props) {
  const { current } = useAppStore();
  const noRoster = NEEDS_ROSTER.has(tool) && (current?.students.length ?? 0) === 0;
  return (
    <section aria-label="발표자 정하기 도구">
      <div class="toolnav" role="tablist" aria-label="도구">
        {TOOL_IDS.map((id) => (
          <button key={id} type="button" role="tab" aria-selected={id === tool} onClick={() => onTool(id)}>
            <b>{TOOLS[id].name}</b>
            <span>{TOOLS[id].sub}</span>
          </button>
        ))}
      </div>
      <div class="stage" role="tabpanel" aria-label={TOOLS[tool].name}>
        {noRoster ? (
          <>
            <p class="mid">명단이 필요해요</p>
            <p class="hint">
              {current ? `${current.name}에 학생이 없어요.` : '아직 반이 없어요.'} <a href="#/class">우리 반</a> 탭에서 명단을 붙여 넣으세요.
            </p>
          </>
        ) : (
          <ToolBody tool={tool} />
        )}
      </div>
      <Coaching />
    </section>
  );
}

function ToolBody({ tool }: { tool: ToolId }) {
  switch (tool) {
    case 'pick': return <PickTool />;
    case 'rps': return <RpsTool />;
    case 'love': return <LoveTool />;
    case 'arrow': return <ArrowTool />;
    case 'beat': return <BeatTool />;
    case 'pass': return <PassTool />;
    case 'relay': return <RelayTool />;
    case 'groups': return <GroupsTool />;
    case 'grouppick': return <GroupPickTool />;
  }
}

function Coaching() {
  return (
    <aside class="panel coach">
      <h2>발표 코칭 팁</h2>
      <ul>
        <li><b>기다려 주세요.</b> 교사가 질문하고 답을 기다리는 시간은 평균 2초라고 해요. 공정 뽑기의 “생각하는 시간”을 5~10초로 두세요.</li>
        <li><b>복창하지 마세요.</b> 교사가 학생 발표를 매끄럽게 다시 말해 주면, 학생들은 친구 발표를 듣지 않게 돼요.</li>
        <li><b>연결하는 발문을 쓰세요.</b> “철수야, 영희의 발표에 어떤 생각이 들었니?”, “영희가 말한 내용은 교과서 몇 쪽에서 찾을 수 있을까?”</li>
        <li><b>먼저 떠올린 친구의 답을 칠판에 적게 하면</b> 나머지 친구들이 힌트를 얻어요.</li>
      </ul>
      <p class="small src">
        참고: <a href={SOURCES.teacher0325.url} target="_blank" rel="noopener">{SOURCES.teacher0325.name}</a>
      </p>
    </aside>
  );
}
