import { stage, node, label, path, mix, smooth, clamp, setPosition } from '../drawing';
import type { CircuitData, Point, PreviewScene } from '../types';
export function createScene(host: HTMLElement, data: CircuitData): PreviewScene {
  const svg = stage(host),
    lines = node('g', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
  const paths = data.primitives.map((p) =>
    node(
      'path',
      {
        fill: 'none',
        stroke: p.color,
        'stroke-width': p.width,
        ...(p.dashed ? { 'stroke-dasharray': '5 7' } : {}),
      },
      lines,
    ),
  );
  // Keep the source voltage colors on wires; numerical labels use readable text contrast.
  const voltageLabels = data.labels.map((l) => label(svg, l.label, 0, 0));
  const components = data.componentLabels.map((c) => ({
    name: label(svg, c.text, 0, 0, '#acb1bf', 22),
    current: label(svg, c.current, 0, 0, '#e7e9ef', 24),
  }));
  const flowGroup = node('g', {}, svg);
  const flows = data.flow.map((f) => {
    const group = node('g', {}, flowGroup);
    node(
      'path',
      {
        d: path(f.points),
        fill: 'none',
        stroke: '#b2baf5',
        'stroke-width': f.width,
        opacity: 0.14,
      },
      group,
    );
    return {
      data: f,
      marks: Array.from({ length: Math.ceil(f.lengths.at(-1)! / f.spacing) + 1 }, () =>
        node(
          'path',
          {
            d: 'M-5 -3L0 0L-5 3',
            fill: 'none',
            stroke: '#edf0ff',
            'stroke-width': 2.2,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
          },
          group,
        ),
      ),
    };
  });
  let order = '';
  return {
    durationMs: data.durationMs,
    renderAt(time) {
      const p = clamp((time - 1200) / 1100) * (data.poses.length - 1),
        i = Math.min(data.poses.length - 2, Math.floor(p)),
        blend = p - i;
      const a = data.poses[i],
        b = data.poses[i + 1];
      const interpolate = (v: Point, w: Point): Point => [
        mix(v[0], w[0], blend),
        mix(v[1], w[1], blend),
      ];
      const nextOrder = (blend < 0.5 ? a : b).order.join(',');
      if (order !== nextOrder) {
        for (const index of (blend < 0.5 ? a : b).order) lines.append(paths[index]);
        order = nextOrder;
      }
      paths.forEach((el, j) => {
        el.setAttribute('d', path(a.paths[j].map((v, k) => interpolate(v, b.paths[j][k]))));
        el.style.opacity = String(
          data.primitives[j].dashed
            ? smooth((time - 1700) / 600) * 0.5
            : mix(0.55, 1, smooth((time - 1200) / 1100)),
        );
      });
      voltageLabels.forEach((el, j) => {
        setPosition(el, interpolate(a.labels[j], b.labels[j]), -24);
        el.style.opacity = String(smooth((time - 2100) / 600));
      });
      components.forEach((c, j) => {
        const pos = interpolate(a.componentLabels[j], b.componentLabels[j]);
        setPosition(c.name, pos, 38);
        setPosition(c.current, pos, 66);
        c.current.style.opacity = String(smooth((time - 2400) / 600));
      });
      flowGroup.style.opacity = String(smooth((time - 3000) / 350));
      const elapsed = Math.max(0, Math.min(time, 5500) - 3000) / 1000;
      for (const { data: f, marks } of flows) {
        const total = f.lengths.at(-1)!;
        marks.forEach((el, j) => {
          const distance = (j * f.spacing + elapsed * f.speed) % (total + f.spacing);
          if (distance > total) {
            el.style.opacity = '0';
            return;
          }
          let k = 1;
          while (k < f.lengths.length - 1 && f.lengths[k] < distance) k++;
          const span = f.lengths[k] - f.lengths[k - 1],
            t = span ? (distance - f.lengths[k - 1]) / span : 0;
          const [x, y] = interpolateFlow(f.points[k - 1], f.points[k], t),
            angle =
              (Math.atan2(
                f.points[k][1] - f.points[k - 1][1],
                f.points[k][0] - f.points[k - 1][0],
              ) *
                180) /
              Math.PI;
          el.setAttribute('transform', `translate(${x} ${y}) rotate(${angle})`);
          el.style.opacity = String(Math.min(1, distance / 12, (total - distance) / 12));
        });
      }
    },
    dispose() {
      svg.remove();
    },
  };
}
function interpolateFlow(a: Point, b: Point, t: number): Point {
  return [mix(a[0], b[0], t), mix(a[1], b[1], t)];
}
