import { stage, node, label, path, mix, smooth, clamp } from '../drawing';
import type { WavesData, PreviewScene } from '../types';
import { waveConditionMarkup } from './wave-condition';
export async function createScene(
  host: HTMLElement,
  data: WavesData,
  signal: AbortSignal,
): Promise<PreviewScene> {
  const response = await fetch(data.field.src, { signal });
  if (!response.ok) throw new Error('Field unavailable');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length !== data.field.columns * data.field.rows * 3)
    throw new Error('Invalid field size');
  const canvas = document.createElement('canvas');
  canvas.width = data.field.columns;
  canvas.height = data.field.rows;
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const pixels = ctx.createImageData(canvas.width, canvas.height);
  for (let i = 0; i < bytes.length / 3; i++) {
    pixels.data.set(bytes.subarray(i * 3, i * 3 + 3), i * 4);
    pixels.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const svg = stage(host),
    field = node(
      'foreignObject',
      {
        x: data.field.rect[0],
        y: data.field.rect[1],
        width: data.field.rect[2],
        height: data.field.rect[3],
      },
      svg,
    );
  canvas.style.cssText =
    'display:block;width:100%;height:100%;mask-image:linear-gradient(to right,transparent,#000 15%,#000 90%,transparent),linear-gradient(to bottom,transparent,#000 12%,#000 86%,transparent);mask-composite:intersect';
  field.append(canvas);
  const rows = data.rows.map((r, i) => {
    const group = node('g', {}, svg);
    node(
      'path',
      { d: `M0 0H${r.length}`, stroke: r.color, 'stroke-width': 2, opacity: 0.6 },
      group,
    );
    node(
      'path',
      {
        d: path(r.points),
        fill: 'none',
        stroke: r.color,
        'stroke-width': 4,
        ...(i ? { 'stroke-dasharray': '9 3' } : {}),
      },
      group,
    );
    node(
      'circle',
      { cx: 0, cy: 0, r: 9, fill: '#25272f', stroke: r.color, 'stroke-width': 3 },
      group,
    );
    const source = label(svg, `S${i + 1}`, 0, 0, r.color, 23),
      end = label(svg, 'P', 0, 0, r.color, 24);
    const distance = label(
      svg,
      r.label,
      r.target[0] + r.length / 2,
      r.target[1] + 53,
      '#d7dbe8',
      23,
    );
    return { group, source, end, distance };
  });
  const originalP = node('g', {}, svg);
  node(
    'circle',
    {
      cx: data.probe[0],
      cy: data.probe[1],
      r: 12,
      fill: '#25272f',
      stroke: '#e7e9ef',
      'stroke-width': 2,
    },
    originalP,
  );
  label(originalP, 'P', data.probe[0] + 25, data.probe[1] + 8);
  const guides = node('g', {}, svg),
    x = 410 + data.common,
    last = 410 + data.long;
  node(
    'path',
    {
      d: `M${x} 125V315`,
      fill: 'none',
      stroke: '#acb1bf',
      'stroke-width': 1.5,
      'stroke-dasharray': '5 6',
    },
    guides,
  );
  node(
    'path',
    { d: `M${x} 353V365H${last}V353`, fill: 'none', stroke: '#b2baf5', 'stroke-width': 3 },
    guides,
  );
  label(guides, data.deltaLabel, 700, 414, '#e7e9ef', 27);
  const condition = node('g', {}, svg);
  condition.innerHTML = waveConditionMarkup;
  return {
    durationMs: data.durationMs,
    renderAt(time) {
      const raw = clamp((time - 1200) / 1400),
        p = raw ** 3 * (raw * (raw * 6 - 15) + 10);
      field.style.opacity = String(1 - smooth((time - 1300) / 1100));
      originalP.style.opacity = String(1 - smooth((time - 1200) / 400));
      rows.forEach((row, i) => {
        const r = data.rows[i],
          x = mix(r.origin[0], r.target[0], p),
          y = mix(r.origin[1], r.target[1], p),
          angle = r.angle * (1 - p),
          rad = (angle * Math.PI) / 180;
        row.group.setAttribute('transform', `translate(${x} ${y}) rotate(${angle})`);
        row.source.setAttribute('x', String(x - 20));
        row.source.setAttribute('y', String(y - 24));
        row.end.setAttribute('x', String(x + r.length * Math.cos(rad) + 25));
        row.end.setAttribute('y', String(y + r.length * Math.sin(rad) + 8));
        row.end.style.opacity = String(p);
        row.distance.style.opacity = String(smooth((time - 2600) / 320));
      });
      guides.style.opacity = String(smooth((time - 2600) / 320));
      condition.style.opacity = String(smooth((time - 2920) / 480));
    },
    dispose() {
      svg.remove();
      canvas.width = canvas.height = 0;
    },
  };
}
