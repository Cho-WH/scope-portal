import { test, expect } from '@playwright/test';

test('세 장면은 일시 정지·재개·종료·재생하며 파동장은 고정된다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto('/');
  for (const id of ['circuit', 'waves', 'gas']) {
    await page.locator(`#feature-tab-${id}`).click();
    const figure = page.locator(`figure[data-scene="${id}"]`);
    await expect(figure).toHaveAttribute('data-playback', 'playing');
    await page.clock.runFor(1600);
    const field = id === 'waves' ? await page.locator('canvas').evaluate(c => (c as HTMLCanvasElement).toDataURL()) : null;
    await figure.getByRole('button', { name: '일시 정지' }).click();
    await expect(figure).toHaveAttribute('data-playback', 'paused');
    const paused = await figure.locator('svg').innerHTML();
    await page.clock.runFor(1000);
    expect(await figure.locator('svg').innerHTML()).toBe(paused);
    await figure.getByRole('button', { name: '계속 보기' }).click();
    await page.clock.runFor(7000);
    await expect(figure).toHaveAttribute('data-playback', 'ended');
    if (field) expect(await page.locator('canvas').evaluate(c => (c as HTMLCanvasElement).toDataURL())).toBe(field);
    await figure.getByRole('button', { name: '다시 보기' }).click();
    await expect(figure).toHaveAttribute('data-playback', 'playing');
    await figure.getByRole('button', { name: '일시 정지' }).click();
  }
  await page.locator('#feature-tab-circuit').click();
  await expect(page.locator('figure[data-scene="circuit"]')).toHaveAttribute('data-playback', 'playing');
  await page.clock.runFor(7000);
  await expect(page.locator('figure[data-scene="circuit"]')).toHaveAttribute('data-playback', 'ended');
  await page.locator('#feature-tab-waves').click();
  await page.locator('#feature-tab-circuit').click();
  await expect(page.locator('figure[data-scene="circuit"]')).toHaveAttribute('data-playback', 'playing');
  expect(errors).toEqual([]);
});

test('동작 줄이기와 태블릿은 포스터만 요청하고 명시적으로 재생할 수 있다', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => { if (request.url().includes('/previews/') && !request.url().includes('/images/')) requests.push(request.url()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?feature=waves');
  const figure = page.locator('figure[data-preview]');
  await expect(figure).toHaveAttribute('data-playback', 'ended');
  await expect(figure.locator('[data-scene-poster]')).toBeVisible();
  expect(requests).toEqual([]);
  await figure.getByRole('button', { name: '다시 보기' }).click();
  await expect(figure).toHaveAttribute('data-playback', 'playing');
  expect(requests.some(url => url.endsWith('/waves/1/field.rgb'))).toBe(true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#feature-tab-gas').click();
  await expect(page.locator('figure[data-scene="gas"]')).toHaveAttribute('data-playback', 'playing');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  requests.length = 0;
  await page.locator('#feature-tab-waves').click();
  await expect(page.locator('figure[data-scene="waves"]')).toHaveAttribute('data-playback', 'ended');
  await expect(page.locator('figure[data-preview] svg')).toHaveCount(0);
  expect(requests).toEqual([]);
  requests.length = 0;
  await page.setViewportSize({ width: 768, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#feature-tab-gas').click();
  await expect(page.locator('figure[data-preview] [data-scene-poster]')).toBeVisible();
  await expect(page.locator('[data-preview-control]:visible')).toHaveCount(0);
  expect(requests).toEqual([]);
});

test('배너가 화면 밖으로 나가면 재생을 멈추고 돌아오면 이어간다', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  const figure = page.locator('figure[data-preview]');
  await expect(figure).toHaveAttribute('data-playback', 'playing');
  await page.clock.runFor(1500);
  await page.locator('footer').scrollIntoViewIfNeeded();
  // IntersectionObserver is delivered by browser rendering, not Playwright's virtual clock.
  await page.evaluate(() => new Promise<void>(resolve => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) { observer.disconnect(); resolve(); }
    });
    observer.observe(document.querySelector('[data-featured]')!);
  }));
  const hidden = await figure.locator('svg').innerHTML();
  await page.clock.runFor(8000);
  expect(await figure.locator('svg').innerHTML()).toBe(hidden);
  await page.locator('[data-featured]').scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise<void>(resolve => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= .35) { observer.disconnect(); resolve(); }
    }, { threshold: .35 });
    observer.observe(document.querySelector('[data-featured]')!);
  }));
  await page.clock.runFor(7000);
  await expect(figure).toHaveAttribute('data-playback', 'ended');
});

test('데이터 실패 시 포스터와 재시도를 제공하고 빠른 탭 전환은 장면을 섞지 않는다', async ({ page }) => {
  await page.route('**/circuit/1/manifest.json', route => route.abort());
  await page.goto('/');
  const figure = page.locator('figure[data-preview]');
  await expect(figure).toHaveAttribute('data-playback', 'fallback');
  await expect(figure.locator('[data-scene-poster]')).toBeVisible();
  await page.unroute('**/circuit/1/manifest.json');
  await figure.getByRole('button', { name: '다시 불러오기' }).click();
  await expect(figure).toHaveAttribute('data-playback', 'playing');
  await page.route('**/waves/1/field.rgb', async route => {
    await new Promise(resolve => setTimeout(resolve, 300));
    await route.continue().catch(() => {});
  });
  await page.locator('#feature-tab-waves').click();
  await page.locator('#feature-tab-gas').click();
  await expect(page.locator('figure[data-scene="gas"]')).toHaveAttribute('data-playback', 'playing');
  await expect(page.locator('figure[data-preview]')).toHaveCount(1);
  await expect(page.locator('canvas')).toHaveCount(0);
});
