// 빌드한 dist/index.html을 실제 브라우저(설치된 Chrome)로 열어 핵심 흐름을 확인한다.
// 사용: npm run build && npm run e2e   (SCREENSHOTS=폴더 를 주면 화면을 저장한다)
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const url = pathToFileURL(resolve('dist/index.html')).href;
const shots = process.env.SCREENSHOTS;
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });
const errors = [];
const nav = (page, name) => page.getByRole('navigation', { name: '메뉴' }).getByRole('link', { name });

async function shot(page, name) {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: false });
}

async function step(name, fn) {
  process.stdout.write(`- ${name} … `);
  await fn();
  console.log('ok');
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !m.text().includes('fonts.g') && errors.push(m.text()));
  await page.goto(url);

  await step('도감에 34개 방법이 보인다', async () => {
    await page.getByText('34개 방법').waitFor();
    assert.equal(await page.locator('.grid .card').count(), 34);
    await shot(page, '1-catalog');
  });

  await step('검색과 필터', async () => {
    await page.getByLabel('방법 찾기').fill('월드 카페');
    assert.equal(await page.locator('.grid .card').count(), 1);
    await page.getByRole('button', { name: '조건 모두 지우기' }).click();
    await page.getByRole('group', { name: '형태' }).getByRole('button', { name: '모둠' }).click();
    assert.ok((await page.locator('.grid .card').count()) < 34);
    await page.getByRole('group', { name: '형태' }).getByRole('button', { name: '모둠' }).click();
  });

  await step('방법 상세 → 초시계 설정 → 진행 화면', async () => {
    await page.locator('.card', { hasText: '월드카페' }).click();
    await page.getByRole('dialog', { name: '월드카페' }).waitFor();
    assert.match(page.url(), /#\/catalog\/worldcafe$/);
    await shot(page, '2-detail');
    await page.getByRole('button', { name: '▶ 초시계 맞추고 진행' }).click();
    await page.getByRole('dialog', { name: '초시계 맞추기' }).waitFor();
    await page.getByRole('button', { name: '라운드 수 늘리기' }).click();
    assert.equal(await page.getByLabel('라운드 수', { exact: true }).inputValue(), '4');
    const first = page.getByLabel('주제·규칙 안내 시간', { exact: true });
    await first.fill('1:30');
    await first.press('Enter');
    assert.equal(await first.inputValue(), '1:30');
    await shot(page, '3-setup');
    await page.getByPlaceholder('레시피 이름').fill('5-3 월드카페');
    await page.getByRole('button', { name: '레시피로 저장' }).click();
    await page.getByRole('button', { name: '▶ 시작' }).click();
    await page.getByRole('dialog', { name: '월드카페 진행' }).waitFor();
    await page.getByRole('timer').waitFor();
    assert.match(await page.getByRole('timer').innerText(), /^1:(30|29|28)$/);
    await shot(page, '4-board');
  });

  await step('진행 화면 조작: 멈춤, 다음, 끝내기 확인', async () => {
    await page.keyboard.press('Space');
    await page.getByRole('button', { name: '계속 ▶' }).waitFor();
    await page.keyboard.press('ArrowRight');
    assert.match(await page.locator('.board-title').innerText(), /테이블 대화/);
    assert.match(await page.locator('.board-round').innerText(), /라운드 1 \/ 4/);
    await page.keyboard.press('Escape');
    await page.getByText('진행을 끝낼까요?').waitFor();
    await page.getByRole('button', { name: '끝내기', exact: true }).click();
    assert.equal(await page.locator('.board').count(), 0);
  });

  await step('저장한 레시피가 도감 위에 나온다', async () => {
    await page.goto(`${url}#/catalog`);
    await page.getByText('5-3 월드카페', { exact: true }).waitFor();
  });

  await step('명단 없이 도구를 열면 안내가 나온다', async () => {
    await nav(page, '발표자 정하기').click();
    await page.getByText('명단이 필요해요').waitFor();
  });

  await step('반 만들기(예시 반)와 공정 뽑기·기록', async () => {
    await nav(page, '우리 반').click();
    await shot(page, '5-onboarding');
    await page.getByRole('button', { name: '예시 반으로 먼저 둘러보기' }).click();
    await page.getByLabel('지금 수업하는 반').waitFor();
    await nav(page, '발표자 정하기').click();
    await page.getByLabel('생각하는 시간').selectOption('0');
    await page.getByRole('button', { name: '뽑기', exact: true }).click();
    await page.getByRole('button', { name: '발표함 ✓ 기록' }).click();
    await page.getByRole('button', { name: '되돌리기' }).waitFor();
    await shot(page, '6-pick');
    await nav(page, '우리 반').click();
    assert.equal(await page.locator('.summary dd').first().innerText(), '1');
    await shot(page, '7-class');
  });

  await step('새로고침해도 기록이 남는다', async () => {
    await page.reload();
    assert.equal(await page.locator('.summary dd').first().innerText(), '1');
  });

  await step('휴대폰 너비에서 가로 스크롤이 없다', async () => {
    await page.setViewportSize({ width: 375, height: 800 });
    for (const hash of ['#/catalog', '#/tools/relay', '#/class', '#/recommend']) {
      await page.goto(`${url}${hash}`);
      await page.waitForTimeout(100);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 0, `${hash} 가로 넘침 ${overflow}px`);
    }
    await shot(page, '8-mobile');
  });

  assert.deepEqual(errors, [], '콘솔 오류가 없어야 한다');
  console.log('\n모든 흐름 통과');
} finally {
  await browser.close();
}
