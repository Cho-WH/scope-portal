import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { Vector3, OrthographicCamera } from 'three';
import fixture from '@circuit/fixtures/FIX-04-series-parallel.json';
import { layoutExample } from '@circuit/src/app/examples';
import { compileCircuit } from '@circuit/src/connectivity';
import { solveCircuit } from '@circuit/src/simulation';
import * as q from '@circuit/src/rational';
import { documentBounds } from '@circuit/src/component-library';
import {
  buildPotentialModel,
  buildCurrentModel,
  buildCurrentPaths,
} from '@circuit/src/visualization';
import {
  fitPotentialHeight,
  automaticHeight,
  sceneBounds,
  sceneExtent,
  projectedSize,
  obliqueDirection,
} from '@circuit/src/potential-3d/model';
import { createModel, updateModel } from '@interference/src/model/state';
import { createRetardedEngine } from '@interference/src/physics/retarded-engine';
import { paletteTable } from '@interference/src/visual/field-palettes';
import { linearFit, predict } from '@bme280/gay-lussac/analysis/regression.js';
import equipmentSource from '@bme280/gay-lussac/assets/setup.svg';
import { waveConditionMarkup } from '../../src/features/preview/scenes/wave-condition';

const round = (v: number) => Math.round(v * 1000) / 1000;
const close = (a: number, b: number, tolerance = 1e-8) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const point = (p: { x: number; y: number; z: number }) => new Vector3(p.x, -p.y, p.z);
const pathD = (points: number[][]) =>
  points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
const svg = (content: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="480" viewBox="0 0 1200 480"><g font-family="sans-serif">${content}</g></svg>`;
const text = (x: number, y: number, value: string, color = '#e7e9ef', size = 25) =>
  `<text x="${x}" y="${y}" text-anchor="middle" fill="${color}" font-size="${size}">${value}</text>`;

function circuitScene() {
  const doc = layoutExample(fixture.document);
  const compilation = compileCircuit(doc);
  assert.equal(compilation.diagnostics.length, 0);
  const result = solveCircuit(compilation.circuit, { physicalModel: 'textbook' });
  assert.equal(result.status, 'solved');
  const current = buildCurrentModel(doc, compilation, result);
  let potential = buildPotentialModel(doc, compilation.circuit, result);
  potential = fitPotentialHeight(potential, automaticHeight(doc, potential, 900, 390), 1);
  for (const [id, expected] of Object.entries(fixture.expected.probeVoltagesV))
    close(q.toNumber(potential.endpoints[id].exactVoltage), expected as number);
  for (const [id, expected] of Object.entries(fixture.expected.branchCurrentsA)) {
    const sample = current.samples.find((s) => s.id === id)!;
    assert.equal(sample.value.status, 'known');
    close(Math.abs(q.toNumber(sample.value.amperes)), expected as number);
  }
  const primitives: any[] = potential.segments
    .filter((s) => s.kind === 'wire')
    .map((s) => ({ id: s.id, points: s.points, color: s.color, width: 4 }));
  // Coordinates of the original component-library symbols, lifted by the same terminal potentials.
  const zigzag = [
    [-44, 0],
    [-30, 0],
    [-25, -10],
    [-15, 10],
    [-5, -10],
    [5, 10],
    [15, -10],
    [25, 10],
    [30, 0],
    [44, 0],
  ];
  for (const c of doc.components) {
    const za = potential.endpoints[c.terminals[0].id].height,
      zb = potential.endpoints[c.terminals[1].id].height;
    const phi = (c.rotation * Math.PI) / 180;
    const lift = ([x, y]: number[]) => ({
      x: c.position.x + x * Math.cos(phi) - y * Math.sin(phi),
      y: c.position.y + x * Math.sin(phi) + y * Math.cos(phi),
      z: za + ((zb - za) * (x + 44)) / 88,
    });
    const segments =
      c.type === 'resistor'
        ? [zigzag]
        : [
            [
              [-44, 0],
              [-7, 0],
            ],
            [
              [7, 0],
              [44, 0],
            ],
            [
              [-7, -22],
              [-7, 22],
            ],
            [
              [7, -12],
              [7, 12],
            ],
          ];
    segments.forEach((s, i) =>
      primitives.push({
        id: `${c.id}-${i}`,
        points: s.map(lift),
        color: '#dce0ef',
        width: c.type === 'resistor' ? 4 : 5,
      }),
    );
  }
  const anchors = [
    {
      point: {
        ...doc.junctions.find((j) => j.id === 'JM').position,
        z: potential.endpoints.JM.height,
      },
      label: '6 V',
      color: potential.endpoints.JM.color,
    },
    {
      point: { x: 240, y: 300, z: potential.endpoints['V1.p'].height },
      label: '12 V',
      color: potential.endpoints['V1.p'].color,
    },
    {
      point: { ...doc.junctions.find((j) => j.id === 'JG').position, z: 0 },
      label: '0 V',
      color: potential.endpoints.JG.color,
    },
  ];
  for (const [i, a] of anchors.entries())
    if (a.point.z)
      primitives.unshift({
        id: `height-${i}`,
        points: [{ ...a.point, z: 0 }, a.point],
        color: '#7c849b',
        width: 1.5,
        dashed: true,
      });
  const flowPaths = buildCurrentPaths(doc, current, potential);
  const bounds = sceneBounds(sceneExtent(doc, potential));
  const center = bounds.getCenter(new Vector3()),
    size = bounds.getSize(new Vector3());
  const distance = Math.max(size.x, size.y, size.z, 100) * 4 + 400;
  const cam = new OrthographicCamera();
  cam.up.set(0, 0, 1);
  cam.position.copy(center).addScaledVector(obliqueDirection, distance);
  cam.lookAt(center);
  cam.updateMatrixWorld(true);
  const endRotation = cam.quaternion.clone();
  const span = projectedSize(bounds, cam.matrixWorldInverse);
  const finalFrustum = Math.max(span.y, span.x / (900 / 390), 100) * 1.18;
  const flat = documentBounds(doc, 65);
  const startCenter = new Vector3(flat.x + flat.width / 2, -flat.y - flat.height / 2, 0);
  const flatFrustum = Math.max(flat.height, flat.width / (900 / 390));
  const startRotation = cam.quaternion.clone().identity();
  const poses = Array.from({ length: 36 }, (_, index) => {
    const t = index / 35,
      progress = t * t * (3 - 2 * t);
    const target = startCenter.clone().lerp(center, progress);
    cam.quaternion.slerpQuaternions(startRotation, endRotation, progress);
    cam.position.set(0, 0, distance).applyQuaternion(cam.quaternion).add(target);
    const frustum = flatFrustum + (finalFrustum - flatFrustum) * progress;
    cam.left = (-frustum * (900 / 390)) / 2;
    cam.right = -cam.left;
    cam.top = frustum / 2;
    cam.bottom = -cam.top;
    cam.near = 0.1;
    cam.far = distance * 10;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    const project = (p: any) => {
      const v = point({ ...p, z: p.z * progress }).project(cam);
      return [round(270 + (v.x + 1) * 450), round(36 + (1 - v.y) * 195)];
    };
    return {
      paths: primitives.map((p) => p.points.map(project)),
      labels: anchors.map((a) => project(a.point)),
      componentLabels: doc.components.map((c) => {
        const z =
          c.terminals.reduce((sum, t) => sum + potential.endpoints[t.id].height, 0) /
          c.terminals.length;
        return project({ ...c.position, z });
      }),
      order: primitives
        .map((p, i) => ({
          i,
          z:
            p.points.reduce((s, v) => s + point({ ...v, z: v.z * progress }).project(cam).z, 0) /
            p.points.length,
        }))
        .sort((a, b) => b.z - a.z)
        .map((p) => p.i),
      flow: flowPaths.map((p) => p.points.map(project)),
    };
  });
  // The source camera includes its interactive floor. Reframe only the exported
  // drawing for the shallow banner, preserving perspective and equal x/y scale.
  for (const pose of poses) {
    const points = pose.paths.flat(),
      xs = points.map((p) => p[0]),
      ys = points.map((p) => p[1]);
    const left = Math.min(...xs),
      right = Math.max(...xs),
      top = Math.min(...ys),
      bottom = Math.max(...ys);
    const scale = Math.min(680 / (right - left), 330 / (bottom - top));
    const fit = (p: number[]) => [
      round(740 + (p[0] - (left + right) / 2) * scale),
      round(230 + (p[1] - (top + bottom) / 2) * scale),
    ];
    pose.paths = pose.paths.map((p) => p.map(fit));
    pose.labels = pose.labels.map(fit);
    pose.componentLabels = pose.componentLabels.map(fit);
    pose.flow = pose.flow.map((p) => p.map(fit));
  }
  const final = poses.at(-1)!;
  const flow = flowPaths
    .map((p, i) => {
      let points = final.flow[i];
      const value = p.sample.value;
      assert.equal(value.status, 'known');
      const wire = doc.wires.find((w) => w.id === p.id);
      if (wire && value.from.id !== wire.start.id) points = [...points].reverse();
      const amperes = Math.abs(q.toNumber(value.amperes));
      const lengths = [0];
      for (let j = 1; j < points.length; j++)
        lengths.push(
          lengths[j - 1] +
            Math.hypot(points[j][0] - points[j - 1][0], points[j][1] - points[j - 1][1]),
        );
      return {
        id: p.id,
        points,
        lengths: lengths.map(round),
        amperes,
        width: round((amperes / 3) * 9),
        spacing: round(34 / (amperes / 3)),
        speed: 30,
      };
    })
    .filter((p) => p.amperes > 0);
  poses.forEach((p) => delete p.flow);
  const componentLabels = doc.components.map((c) => ({
    text:
      c.type === 'resistor' ? `${c.label} · ${q.toNumber(c.properties.resistanceOhm)} Ω` : '12 V',
    current: c.type === 'resistor' ? `${fixture.expected.branchCurrentsA[c.id]} A` : '',
  }));
  const data = {
    schemaVersion: 1,
    scene: 'circuit',
    durationMs: 6500,
    viewBox: [1200, 480],
    physics: {
      model: 'textbook',
      voltages: fixture.expected.probeVoltagesV,
      currents: fixture.expected.branchCurrentsA,
    },
    primitives: primitives.map(({ points, ...p }) => p),
    poses,
    flow,
    labels: anchors.map(({ point, ...a }) => a),
    componentLabels,
  };
  const poster = svg(
    final.paths
      .map(
        (p, i) =>
          `<path d="${pathD(p)}" fill="none" stroke="${primitives[i].color}" stroke-width="${primitives[i].width}" ${primitives[i].dashed ? 'stroke-dasharray="5 7"' : ''}/>`,
      )
      .join('') +
      anchors
        .map((a, i) => text(final.labels[i][0], final.labels[i][1] - 23, a.label))
        .join('') +
      componentLabels
        .map((c, i) =>
          text(
            final.componentLabels[i][0],
            final.componentLabels[i][1] + 39,
            c.text,
            '#acb1bf',
            22,
          ),
        )
        .join(''),
  );
  return { data, poster, files: {} };
}

function wavesScene() {
  let model = createModel();
  let lo = 0,
    hi = 0.36;
  for (let i = 0; i < 80; i++) {
    const y = (lo + hi) / 2;
    if (Math.hypot(0.45, y - 0.51) - Math.hypot(0.45, y - 0.21) > 0.075) lo = y;
    else hi = y;
  }
  model = updateModel(model, { type: 'probe', position: { x: 0.85, y: (lo + hi) / 2 } });
  const r1 = Math.hypot(0.45, model.probe.y - 0.21),
    t0 = (r1 / model.wavelength + 0.25) / (model.speed / model.wavelength);
  const bounds = { x: 0.1, y: 0.04, width: 1.2, height: 0.64 };
  const engine = createRetardedEngine(model, bounds);
  engine.advanceTo(t0);
  engine.settle();
  const frame = engine.read(model.probe, bounds);
  const probe = frame.snapshot.probe;
  assert.equal(probe.interference, 'destructive');
  close(Math.abs(probe.signedPathDifference), 0.075);
  close(probe.resultantAmplitude, 0);
  const paths = frame.samplePaths();
  const scale = 570,
    amplitudeScale = 2400;
  const world = (p: any) => [
    round(340 + (p.x - bounds.x) * scale),
    round(32 + (p.y - bounds.y) * scale),
  ];
  const rows = paths.map((p, i) => {
    const origin = world(model.sources[i].position),
      target = [410, 145 + i * 150];
    const points = p.distances.map((distance, j) => [
      round(distance * scale),
      round(-p.displacements[j] * amplitudeScale),
    ]);
    close(p.displacements.at(-1), probe.componentDisplacements[i]);
    return {
      origin,
      target,
      angle:
        (Math.atan2(
          model.probe.y - model.sources[i].position.y,
          model.probe.x - model.sources[i].position.x,
        ) *
          180) /
        Math.PI,
      length: round(probe.distances[i] * scale),
      distance: probe.distances[i],
      points,
      color: i ? '#ecaa65' : '#69c9d1',
      label: `${(probe.distances[i] * 100).toFixed(1)} cm`,
    };
  });
  const grid = frame.sampleField(384, 205, 'wave'),
    table = paletteTable('water', 'wave');
  const colors = Buffer.alloc(grid.values.length * 3);
  grid.values.forEach((v, i) => {
    const color = table[Math.max(0, Math.min(512, Math.round((v + 1) * 256)))];
    colors.set(color, i * 3);
  });
  const data = {
    schemaVersion: 1,
    scene: 'waves',
    durationMs: 5500,
    viewBox: [1200, 480],
    physics: {
      t0,
      wavelength: model.wavelength,
      sources: model.sources,
      probe: model.probe,
      distances: probe.distances,
      delta: Math.abs(probe.signedPathDifference),
      amplitude: probe.resultantAmplitude,
    },
    field: {
      src: '/previews/waves/1/field.rgb',
      columns: 384,
      rows: 205,
      rect: [340, 32, 684, 364.8],
    },
    rows,
    probe: world(model.probe),
    deltaLabel: '경로차 7.5 cm = λ/2',
    common: round(Math.min(...probe.distances) * scale),
    long: round(Math.max(...probe.distances) * scale),
  };
  const poster = svg(
    rows
      .map(
        (r, i) =>
          `<g transform="translate(${r.target.join(' ')})"><path d="M0 0H${r.length}" stroke="#596174"/><path d="${pathD(r.points)}" fill="none" stroke="${r.color}" stroke-width="4"/>${text(0, -40, `S${i + 1}`, r.color)}${text(r.length + 26, 8, 'P', r.color)}${text(r.length / 2, 50, r.label)}</g>`,
      )
      .join('') + text(700, 410, data.deltaLabel) + waveConditionMarkup,
  );
  return { data, poster, files: { 'field.rgb': colors } };
}

function gasScene() {
  const offsets = [-0.6, 0.4, -0.25, 0.7, -0.4, 0.15, 0.5, -0.55, 0.3, -0.1, 0.45, -0.35];
  const samples = offsets.map((error, i) => ({
    x: 20 + (30 * i) / 11,
    y: (1000 * (20 + (30 * i) / 11 + 273.15)) / 293.15 + error,
  }));
  const fit = linearFit(samples);
  assert.equal(fit.reason, null);
  assert.ok(fit.slope > 0 && fit.rSquared > 0.99);
  const map = (p: any) => [
    round(650 + ((p.x - 18) / 34) * 430),
    round(370 - ((p.y - 980) / 140) * 290),
  ];
  const trend = [
    { x: 20, y: predict(fit, 20) },
    { x: 50, y: predict(fit, 50) },
  ];
  let equipment = equipmentSource.replace(/<g font-family=[\s\S]*?<\/g>\s*<\/svg>/, '</svg>');
  for (const [a, b] of Object.entries({
    '#f7f9f5': '#30333d',
    '#486c77': '#a7afd7',
    '#dceff0': '#303b4a',
    '#345762': '#acb1bf',
    '#e4eeea': '#434855',
  }))
    equipment = equipment.split(a).join(b);
  assert.ok(!/<script|foreignObject|\son\w+=/i.test(equipment));
  const data = {
    schemaVersion: 1,
    scene: 'gas',
    durationMs: 6500,
    viewBox: [1200, 480],
    physics: { example: true, temperatureUnit: '°C', pressureUnit: 'hPa', samples, fit, offsets },
    equipment: '/previews/gas/1/equipment.svg',
    points: samples.map(map),
    trend: trend.map(map),
    xTicks: [20, 30, 40, 50].map((v) => ({ value: String(v), point: map({ x: v, y: 980 }) })),
    yTicks: [1000, 1050, 1100].map((v) => ({ value: String(v), point: map({ x: 18, y: v }) })),
  };
  const body = equipment.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const poster = svg(
    `<svg x="240" y="40" width="400" height="330" viewBox="0 0 620 400">${body}</svg><path d="M650 70V370H1100" fill="none" stroke="#8993ad" stroke-width="2"/>` +
      data.points.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="#b2baf5"/>`).join('') +
      `<path d="${pathD(data.trend)}" fill="none" stroke="#ecaa65" stroke-width="3"/>` +
      text(875, 425, '온도 (°C)') +
      text(700, 50, '압력 (hPa)', '#acb1bf', 22),
  );
  return { data, poster, files: { 'equipment.svg': equipment } };
}

export async function bakeAll(root: string, sources: any) {
  for (const [id, make] of Object.entries({
    circuit: circuitScene,
    waves: wavesScene,
    gas: gasScene,
  })) {
    const { data, poster: rawPoster, files } = make();
    // Normalize source checkout line endings before both writing and hashing.
    const poster = rawPoster.replace(/\r\n?/g, '\n');
    const folder = resolve(root, `public/previews/${id}/1`);
    await mkdir(folder, { recursive: true });
    const encoded = JSON.stringify(data);
    const assets = { 'scene.json': encoded, ...files };
    const entries = [];
    for (const [name, rawValue] of Object.entries(assets)) {
      const value = typeof rawValue === 'string' ? rawValue.replace(/\r\n?/g, '\n') : rawValue;
      await writeFile(resolve(folder, name), value as any);
      entries.push({
        src: `/previews/${id}/1/${name}`,
        sha256: sha(value as any),
        bytes: Buffer.byteLength(value as any),
      });
    }
    const posterPath = `/images/previews/${id}-final.svg`;
    await writeFile(resolve(root, 'public', posterPath.slice(1)), poster);
    const manifest = {
      schemaVersion: 1,
      scene: id,
      revision: '1',
      durationMs: data.durationMs,
      viewBox: data.viewBox,
      data: `/previews/${id}/1/scene.json`,
      files: entries,
      source: sources[id === 'waves' ? 'interference' : id === 'gas' ? 'bme280' : id],
      generator: 'preview-bake/1',
      inputHash: sha(JSON.stringify(data.physics)),
      poster: { src: posterPath, sha256: sha(poster) },
    };
    await writeFile(resolve(folder, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    console.log(`${id}: ${encoded.length} bytes; source calculations verified`);
  }
}
