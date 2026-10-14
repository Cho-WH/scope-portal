import { stage, node, label, path, smooth, clamp } from '../drawing';
import type { GasData, PreviewScene } from '../types';
export function createScene(host: HTMLElement, data: GasData): PreviewScene {
  const svg = stage(host),
    equipment = node(
      'image',
      { href: data.equipment, x: 240, y: 40, width: 400, height: 330 },
      svg,
    );
  const chart = node('g', {}, svg);
  node(
    'path',
    { d: 'M650 70V370H1100', fill: 'none', stroke: '#8993ad', 'stroke-width': 2 },
    chart,
  );
  for (const tick of data.xTicks) {
    node('path', { d: `M${tick.point[0]} 370v7`, stroke: '#8993ad' }, chart);
    label(chart, tick.value, tick.point[0], 397, '#acb1bf', 20);
  }
  for (const tick of data.yTicks) {
    node('path', { d: `M650 ${tick.point[1]}H1095`, stroke: '#596174', opacity: 0.3 }, chart);
    label(chart, tick.value, 612, tick.point[1] + 7, '#acb1bf', 20);
  }
  label(chart, '온도 (°C)', 875, 440, '#acb1bf', 24);
  label(chart, '압력 (hPa)', 705, 53, '#acb1bf', 22);
  const link = node(
    'path',
    {
      d: 'M545 227H600M593 220l7 7-7 7',
      fill: 'none',
      stroke: '#b2baf5',
      'stroke-width': 2,
      'stroke-dasharray': '4 6',
    },
    svg,
  );
  const points = data.points.map(([cx, cy]) =>
    node('circle', { cx, cy, r: 5, fill: '#b2baf5' }, chart),
  );
  const trend = node(
    'path',
    {
      d: path(data.trend),
      fill: 'none',
      stroke: '#ecaa65',
      'stroke-width': 3,
      pathLength: 1,
      'stroke-dasharray': 1,
    },
    chart,
  );
  return {
    durationMs: data.durationMs,
    renderAt(time) {
      equipment.style.opacity = String(smooth(time / 600));
      chart.style.opacity = String(smooth(time / 800));
      link.style.opacity = String(smooth((time - 800) / 400) * (1 - smooth((time - 1800) / 500)));
      points.forEach((p, i) => (p.style.opacity = String(smooth((time - 1500 - i * 200) / 180))));
      trend.setAttribute('stroke-dashoffset', String(1 - clamp((time - 3900) / 900)));
    },
    dispose() {
      svg.remove();
    },
  };
}
