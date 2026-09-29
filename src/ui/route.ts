import { TOOL_IDS } from '../data/labels';
import type { ToolId } from '../domain/types';

export type Tab = 'catalog' | 'recommend' | 'tools' | 'timer' | 'class';
/** short는 휴대폰처럼 좁은 화면에서 쓰는 이름 */
export const TABS: readonly { id: Tab; label: string; short: string }[] = [
  { id: 'catalog', label: '발표 방법 도감', short: '방법 도감' },
  { id: 'recommend', label: '추천받기', short: '추천' },
  { id: 'tools', label: '발표자 정하기', short: '발표자 뽑기' },
  { id: 'timer', label: '타이머', short: '타이머' },
  { id: 'class', label: '우리 반', short: '우리 반' },
];

export interface Route {
  readonly tab: Tab;
  readonly tool: ToolId;
  /** 도감에서 열어 둔 방법 */
  readonly methodId?: string;
}

export const DEFAULT_ROUTE: Route = { tab: 'catalog', tool: 'pick' };

/** "#/tools/relay", "#/catalog/worldcafe" 같은 주소를 읽는다. 모르는 주소는 기본값. */
export function parseRoute(hash: string): Route {
  const [tab, sub] = hash.replace(/^#\/?/, '').split('/');
  if (tab === 'tools') {
    const tool = TOOL_IDS.includes(sub as ToolId) ? (sub as ToolId) : 'pick';
    return { tab: 'tools', tool };
  }
  if (tab === 'catalog' && sub) return { ...DEFAULT_ROUTE, methodId: decodeURIComponent(sub) };
  if (tab === 'recommend' || tab === 'timer' || tab === 'class') return { ...DEFAULT_ROUTE, tab };
  return DEFAULT_ROUTE;
}

export function routeToHash(r: Route): string {
  if (r.tab === 'tools') return `#/tools/${r.tool}`;
  if (r.tab === 'catalog' && r.methodId) return `#/catalog/${encodeURIComponent(r.methodId)}`;
  return `#/${r.tab}`;
}
