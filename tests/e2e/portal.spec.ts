import { test, expect } from '@playwright/test';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';

// Derive the inventory from content, so adding a tool does not require editing test counts.
const inventory = readdirSync('src/content/tools').filter(file => file.endsWith('.json'))
  .map(file => JSON.parse(readFileSync(`src/content/tools/${file}`, 'utf8')) as { draft?: boolean; topics: string[]; activity: string })
  .filter(tool => tool.draft === false);
const toolCount = inventory.length;

test('검색, 한글 조합, 복합 필터와 초기화', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('[data-catalog]')).toHaveAttribute('data-ready', 'true');
  const search = page.getByRole('searchbox');
  const visible = page.locator('[data-tool-id]:visible');
  await expect(visible).toHaveCount(toolCount);
  await search.fill('마이크로비트');
  await expect(page.locator('[data-tool-id="gas"]')).toBeVisible();
  await expect(page.locator('[data-tool-id="sensor"]')).toBeVisible();
  await expect(page.locator('[data-tool-id="sound"]')).toBeHidden();
  await expect(search).toBeFocused();
  await search.fill('소리');
  await expect(page.locator('[data-tool-id="sound"]')).toBeVisible();
  await expect(page.locator('[data-tool-id="peak"]')).toBeVisible();
  await expect(page.locator('[data-tool-id="circuit"]')).toBeHidden();
  await page.locator('[data-topic="electricity"]').click();
  await search.fill('empty-result-probe-42');
  await expect(page.locator('[data-empty]')).toBeVisible();
  await page.getByRole('button', { name: '검색어 지우기' }).click();
  await expect(visible).toHaveCount(inventory.filter(t => t.topics.includes('electricity')).length);
  await page.getByLabel('활동', { exact: true }).selectOption('making');
  await expect(visible).toHaveCount(inventory.filter(t => t.topics.includes('electricity') && t.activity === 'making').length);
  await page.locator('.catalog-status [data-reset]').click();
  await search.evaluate(input => {
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    (input as HTMLInputElement).value = '자기장';
    input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
  });
  await expect(visible).toHaveCount(toolCount);
  await search.evaluate(input => input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })));
  await expect(page.locator('[data-tool-id="mag"]')).toBeVisible();
  await expect(page.locator('[data-tool-id="sound"]')).toBeHidden();
  expect(errors).toEqual([]);
});

test('검색 주소 공유, 상세 소개, 뒤로 가기', async ({ page }) => {
  await page.goto('/?q=소리&topic=waves&activity=audio#tools');
  await expect(page.locator('[data-catalog]')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('[data-tool-id="sound"]')).toBeVisible();
  const ids = await page.locator('[data-tool-id]:visible').evaluateAll(items => items.map(item => (item as HTMLElement).dataset.toolId));
  await page.locator('[data-tool-id="sound"]').getByRole('link', { name: '소리 발생기 도구 소개' }).click();
  await expect(page).toHaveURL(/\/tools\/sound\//);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('소리 발생기');
  await expect(page.getByRole('link', { name: '소리 발생기 영어 버전 (새 탭)' })).toHaveAttribute('href', 'https://cho-wh.github.io/MultiFreqGen/');
  await page.goBack();
  await expect(page.getByRole('searchbox')).toHaveValue('소리');
  await expect(page.locator('[data-tool-id]:visible')).toHaveCount(ids.length);
  expect(await page.locator('[data-tool-id]:visible').evaluateAll(items => items.map(item => (item as HTMLElement).dataset.toolId))).toEqual(ids);
});

test('대표 도구는 수동 탭으로 전환되며 미리보기는 정적 더미다', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-featured]')).toHaveAttribute('data-ready', 'true');
  const first = page.locator('#feature-tab-circuit');
  const indicator = page.locator('[data-feature-indicator]');
  await expect(page.getByRole('tablist')).toHaveAttribute('data-indicator-ready', 'true');
  const start = await indicator.boundingBox();
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#feature-tab-waves')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#feature-panel-waves')).toBeVisible();
  await expect.poll(async () => (await indicator.boundingBox())!.x).toBeGreaterThan(start!.x);
  await expect(page.locator('figure[data-preview]')).toHaveCount(1);
  await expect(page.locator('input[type="range"], canvas, iframe')).toHaveCount(0);
  await page.keyboard.press('End');
  await expect(page.locator('#feature-tab-gas')).toBeFocused();
  await expect(page.locator('#feature-panel-gas').getByText('조작 기능 준비 중')).toBeVisible();
});

test('첫 줄은 3열 이미지형, 다음 줄은 2열 오른쪽 이미지형이며 검색 후 복원된다', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-catalog]')).toHaveAttribute('data-ready', 'true');
  const cards = page.locator('[data-tool-id]');
  const boxes = await cards.evaluateAll(es => es.map(el => {
    const box = el.getBoundingClientRect();
    const image = el.querySelector('[data-tool-image]')!.getBoundingClientRect();
    const heading = el.querySelector('h3')!.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, imageX: image.x, imageY: image.y, headingX: heading.x, headingY: heading.y };
  }));
  expect(boxes[0].y).toBe(boxes[1].y);
  expect(boxes[1].y).toBe(boxes[2].y);
  expect(boxes[3].y).toBe(boxes[4].y);
  expect(boxes[3].width).toBeGreaterThan(boxes[0].width);
  expect(boxes[0].imageY).toBeLessThan(boxes[0].headingY);
  expect(boxes[3].imageX).toBeGreaterThan(boxes[3].headingX);
  await expect(page.locator('[data-tool-id="peak"] [data-tool-image]')).toContainText('이미지 준비 중');
  for (const image of await page.locator('[data-tool-image] img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  await page.getByRole('searchbox').fill('소리');
  await expect(page.locator('[data-tool-id]:visible[data-card-variant="featured"]')).toHaveCount(0);
  await page.getByRole('button', { name: '검색어 지우기' }).click();
  await expect(page.locator('[data-card-variant="featured"]')).toHaveCount(3);
});

test('모바일에서는 미리보기를 생성하거나 이미지를 요청하지 않는다', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const posters: string[] = [];
  page.on('request', request => { if (request.url().includes('/images/previews/')) posters.push(request.url()); });
  await page.goto('http://127.0.0.1:4322/');
  await expect(page.locator('[data-featured]')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('figure[data-preview]')).toHaveCount(0);
  await page.locator('#feature-tab-gas').tap();
  await expect(page.locator('#feature-panel-gas')).toBeVisible();
  await expect(page.locator('figure[data-preview]')).toHaveCount(0);
  expect(posters).toEqual([]);
  const banner = await page.locator('[data-featured]').boundingBox();
  expect(banner!.height).toBeLessThan(300);
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(page.locator('figure[data-preview]')).toHaveCount(1);
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.locator('figure[data-preview]')).toHaveCount(0);
  await context.close();
});

test('반응형 화면과 상세 페이지에 가로 넘침이 없다', async ({ page }) => {
  mkdirSync('.local/qa', { recursive: true });
  for (const width of [320, 360, 736, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.locator('[data-catalog]')).toHaveAttribute('data-ready', 'true');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('[data-tool-id]:visible')).toHaveCount(toolCount);
    await page.screenshot({ path: `.local/qa/home-${width}.png`, fullPage: true });
  }
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.screenshot({ path: '.local/qa/home-dark.png', fullPage: true });
  await page.goto('/tools/gas/');
  await expect(page.getByText('노트북 Chrome·Edge', { exact: true })).toBeVisible();
  await page.screenshot({ path: '.local/qa/detail-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 1000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.local/qa/detail-mobile.png', fullPage: true });
});

test('자바스크립트 없이도 목록과 실행·상세 링크가 존재한다', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4322/');
  await expect(page.locator('[data-tool-id]')).toHaveCount(toolCount);
  await page.locator('[data-tool-id="circuit"]').getByRole('link', { name: '회로봄 도구 소개' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('회로봄');
  await expect(page.getByRole('link', { name: '회로봄 실행 (새 탭)' })).toHaveAttribute('href', 'https://cho-wh.github.io/circuit/');
  await context.close();
});
