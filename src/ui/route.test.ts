import { parseRoute, routeToHash, DEFAULT_ROUTE } from './route';

describe('route', () => {
  it('빈 주소나 모르는 주소는 도감', () => {
    expect(parseRoute('')).toEqual(DEFAULT_ROUTE);
    expect(parseRoute('#/nope')).toEqual(DEFAULT_ROUTE);
  });

  it('도구 주소를 읽고, 모르는 도구는 공정 뽑기', () => {
    expect(parseRoute('#/tools/relay')).toEqual({ tab: 'tools', tool: 'relay' });
    expect(parseRoute('#/tools/zzz')).toEqual({ tab: 'tools', tool: 'pick' });
  });

  it('방법 상세 주소', () => {
    expect(parseRoute('#/catalog/worldcafe').methodId).toBe('worldcafe');
  });

  it('읽은 주소를 다시 만들 수 있다', () => {
    for (const h of ['#/catalog', '#/recommend', '#/timer', '#/class', '#/tools/beat', '#/catalog/2stay']) {
      expect(routeToHash(parseRoute(h))).toBe(h);
    }
  });
});
