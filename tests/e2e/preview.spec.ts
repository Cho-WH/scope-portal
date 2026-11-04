import { test, expect } from '@playwright/test';

test('세 장면은 일시 정지·재개·종료·재생하며 파동장은 고정된다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto('/');
  for (const id of ['circuit', 'waves', 'sensor']) {
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

for (const width of [390, 768, 1280]) {
  test('동작 줄이기에서도 세 대표 장면이 실제로 진행된다: ' + width, async ({page}) => {
    await page.setViewportSize({width, height:900});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto('/');
    for (const id of ['circuit','waves','sensor']) {
      await page.locator('#feature-tab-' + id).click();
      const scene = page.locator('figure[data-scene="' + id + '"]');
      await expect(scene).toHaveAttribute('data-playback','playing');
      await scene.locator('img[data-scene-poster]').evaluate(img => (img as HTMLImageElement).decode());
      const svg = scene.locator('[data-scene-surface] svg').first();
      const initial = await svg.innerHTML();
      await expect.poll(() => svg.innerHTML()).not.toBe(initial);
    }
  });
}

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
  await page.locator('#feature-tab-circuit').click();
  await expect(page.locator('figure[data-scene="circuit"]')).toHaveAttribute('data-playback', 'playing');
  await expect(page.locator('figure[data-preview]')).toHaveCount(1);
  await expect(page.locator('canvas')).toHaveCount(0);
});
