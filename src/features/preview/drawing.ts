import type { Point } from './types';
export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const smooth = (n: number) => {
  const p = clamp(n);
  return p * p * (3 - 2 * p);
};
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const path = (points: Point[]) =>
  points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
export function node<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  parent?: Element,
) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  parent?.append(el);
  return el;
}
export function label(
  parent: Element,
  value: string,
  x: number,
  y: number,
  color = '#e7e9ef',
  size = 25,
) {
  const el = node(
    'text',
    { x, y, fill: color, 'font-size': size, 'text-anchor': 'middle' },
    parent,
  );
  el.textContent = value;
  return el;
}
export function stage(host: HTMLElement) {
  const svg = node(
    'svg',
    {
      viewBox: '0 0 1200 480',
      width: 1200,
      height: 480,
      'aria-hidden': 'true',
      preserveAspectRatio: 'xMidYMid meet',
    },
    host,
  );
  svg.style.cssText = 'width:100%;height:100%;display:block;overflow:visible;font-family:inherit';
  return svg;
}
export function setPosition(el: Element, p: Point, dy = 0) {
  el.setAttribute('x', String(p[0]));
  el.setAttribute('y', String(p[1] + dy));
}
