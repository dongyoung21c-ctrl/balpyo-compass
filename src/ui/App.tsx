import { useCallback, useEffect, useState } from 'preact/hooks';
import type { RunConfig } from '../domain/types';
import { useAppStore } from '../state/AppStore';
import { Board } from './board/Board';
import { Catalog } from './catalog/Catalog';
import { MethodDetail } from './catalog/MethodDetail';
import { RunSetup, type SetupRequest } from './catalog/RunSetup';
import { ClassView } from './classroom/ClassView';
import { Header } from './Header';
import { Recommend } from './Recommend';
import { parseRoute, routeToHash, TABS, type Route } from './route';
import { ToolsView } from './tools/ToolsView';

function useHashRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => window.scrollTo(0, 0), [route.tab]);
  const navigate = useCallback((r: Route) => {
    const hash = routeToHash(r);
    if (window.location.hash !== hash) window.location.hash = hash;
    setRoute(r);
  }, []);
  return [route, navigate];
}

export function App() {
  const { storageWarning } = useAppStore();
  const [route, navigate] = useHashRoute();
  const [setup, setSetup] = useState<SetupRequest | null>(null);
  const [run, setRun] = useState<RunConfig | null>(null);

  const openMethod = (methodId: string) => navigate({ ...route, tab: 'catalog', methodId });
  const closeMethod = () => navigate({ ...route, methodId: undefined });
  const startSetup = (req: SetupRequest) => {
    if (route.methodId) closeMethod();
    setSetup(req);
  };

  return (
    <div class="app">
      <Header />
      {storageWarning && <p class="banner" role="alert">{storageWarning}</p>}
      <nav class="tabs" aria-label="메뉴">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={routeToHash({ ...route, tab: t.id, methodId: undefined })}
            aria-current={route.tab === t.id ? 'page' : undefined}
            aria-label={t.label}
          >
            <span class="tab-long" aria-hidden="true">{t.label}</span>
            <span class="tab-short" aria-hidden="true">{t.short}</span>
          </a>
        ))}
      </nav>
      <main>
        {route.tab === 'catalog' && <Catalog onOpen={openMethod} onRunRecipe={(r) => setRun(r)} onEditRecipe={(r) => setSetup({ methodId: r.methodId, recipe: r })} />}
        {route.tab === 'recommend' && <Recommend onOpen={openMethod} onRun={(methodId) => setSetup({ methodId })} />}
        {route.tab === 'tools' && <ToolsView tool={route.tool} onTool={(tool) => navigate({ tab: 'tools', tool })} />}
        {route.tab === 'class' && <ClassView />}
      </main>
      <footer class="foot">
        명단과 기록은 이 브라우저에만 저장돼요. ·{' '}
        <a href="https://github.com/dongyoung21c-ctrl/balpyo-compass" target="_blank" rel="noopener">
          소스 코드
        </a>
      </footer>

      <MethodDetail
        methodId={route.tab === 'catalog' ? route.methodId : undefined}
        onClose={closeMethod}
        onRun={(methodId) => startSetup({ methodId })}
        onTool={(tool) => navigate({ tab: 'tools', tool })}
      />
      <RunSetup
        request={setup}
        onClose={() => setSetup(null)}
        onStart={(cfg) => {
          setSetup(null);
          setRun(cfg);
        }}
      />
      {run && <Board config={run} onClose={() => setRun(null)} />}
    </div>
  );
}
