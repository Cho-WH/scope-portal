import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import type { Tool } from '../src/lib/catalog/schema.ts';
import type { SceneData, Manifest } from '../src/features/preview/types.ts';
const hash = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
const point = (p: unknown): p is [number, number] =>
  Array.isArray(p) &&
  p.length === 2 &&
  p.every((v) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 10000);
function requireValid(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
export function checkScene(data: SceneData) {
  requireValid(data.schemaVersion === 1, '지원하지 않는 장면 형식');
  requireValid(
    Number.isFinite(data.durationMs) && data.durationMs > 0 && data.durationMs <= 15000,
    '잘못된 재생 시간',
  );
  requireValid(data.viewBox?.[0] === 1200 && data.viewBox?.[1] === 480, '잘못된 장면 좌표계');
  if (data.scene === 'circuit') {
    requireValid(
      data.poses.length >= 2 && data.poses.length <= 120 && data.primitives.length > 0,
      '잘못된 회로 자세',
    );
    for (const pose of data.poses) {
      requireValid(
        pose.paths.length === data.primitives.length &&
          pose.paths.every((p, i) => p.length === data.poses[0].paths[i].length && p.every(point)),
        '일치하지 않는 회로 도형',
      );
      requireValid(
        pose.labels.length === data.labels.length &&
          pose.labels.every(point) &&
          pose.componentLabels.length === data.componentLabels.length &&
          pose.componentLabels.every(point),
        '잘못된 회로 라벨',
      );
      requireValid(
        pose.order.length === data.primitives.length &&
          new Set(pose.order).size === pose.order.length &&
          pose.order.every((i) => Number.isInteger(i) && i >= 0 && i < data.primitives.length),
        '잘못된 그리기 순서',
      );
    }
    for (const f of data.flow)
      requireValid(
        f.points.length >= 2 &&
          f.points.every(point) &&
          f.lengths.length === f.points.length &&
          f.lengths.every(
            (n, i) => Number.isFinite(n) && (i === 0 ? n === 0 : n >= f.lengths[i - 1]),
          ) &&
          f.spacing > 0 &&
          f.speed > 0,
        '잘못된 전류 경로',
      );
  } else if (data.scene === 'waves') {
    requireValid(
      data.rows.length === 2 &&
        data.rows.every(
          (r) =>
            point(r.origin) &&
            point(r.target) &&
            r.points.every(point) &&
            Number.isFinite(r.angle) &&
            r.length > 0,
        ),
      '잘못된 파동 경로',
    );
    requireValid(
      data.field.columns > 0 &&
        data.field.rows > 0 &&
        data.field.columns * data.field.rows <= 1000000,
      '잘못된 파동장',
    );
    requireValid(data.long > data.common && point(data.probe), '잘못된 경로차');
  } else if (data.scene === 'gas') {
    requireValid(
      data.points.length >= 2 &&
        data.points.every(point) &&
        data.trend.length === 2 &&
        data.trend.every(point),
      '잘못된 산점도',
    );
    requireValid(
      [...data.xTicks, ...data.yTicks].every((t) => point(t.point)),
      '잘못된 그래프 축',
    );
  } else throw new Error('알 수 없는 장면');
}
export async function validatePreview(root: string, tool: Tool) {
  const preview = tool.preview;
  if (preview?.kind !== 'baked-scene') return;
  const prefix = `/previews/${preview.scene}/${preview.revision}/`;
  requireValid(preview.manifest === `${prefix}manifest.json`, '장면 manifest 경로 불일치');
  const file = (src: string) => resolve(root, 'public', src.slice(1));
  const manifest: Manifest & {
    source: { commit: string };
    poster: { src: string; sha256: string };
  } = JSON.parse(await readFile(file(preview.manifest), 'utf8'));
  requireValid(
    manifest.schemaVersion === 1 &&
      manifest.scene === preview.scene &&
      manifest.data === `${prefix}scene.json`,
    '장면 manifest 불일치',
  );
  requireValid(/^[a-f0-9]{40}$/.test(manifest.source.commit), '원본 커밋 누락');
  const available = new Set<string>();
  for (const asset of manifest.files) {
    requireValid(
      asset.src.startsWith(prefix) &&
        /^[a-z-]+\.(json|rgb|svg)$/.test(asset.src.slice(prefix.length)),
      '잘못된 장면 파일 경로',
    );
    const bytes = await readFile(file(asset.src));
    requireValid(
      bytes.length === asset.bytes && hash(bytes) === asset.sha256,
      '장면 파일 해시 불일치',
    );
    available.add(asset.src);
  }
  requireValid(available.has(manifest.data), '장면 데이터 누락');
  requireValid(manifest.poster.src === preview.poster.src, '대체 이미지 불일치');
  requireValid(
    hash(await readFile(file(preview.poster.src))) === manifest.poster.sha256,
    '대체 이미지 해시 불일치',
  );
  const data: SceneData = JSON.parse(await readFile(file(manifest.data), 'utf8'));
  checkScene(data);
  requireValid(
    data.scene === preview.scene && data.durationMs === manifest.durationMs,
    '장면 종류/시간 불일치',
  );
  if (data.scene === 'waves') {
    requireValid(available.has(data.field.src), '파동장 파일 누락');
    requireValid(
      (await readFile(file(data.field.src))).length === data.field.columns * data.field.rows * 3,
      '파동장 크기 불일치',
    );
  }
  if (data.scene === 'gas') requireValid(available.has(data.equipment), '장비 이미지 누락');
}
