import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { checkScene, validatePreview } from '../../scripts/preview-validation.ts';
import type { Tool } from '../../src/lib/catalog/schema.ts';

const read = async (path: string) => JSON.parse(await readFile(resolve(path), 'utf8'));

test('해시 대상 텍스트는 운영체제와 관계없이 LF 줄바꿈으로 저장된다', async () => {
  for (const id of ['circuit', 'waves', 'gas']) {
    const manifest = await read(`public/previews/${id}/1/manifest.json`);
    for (const asset of [...manifest.files, manifest.poster]) {
      if (asset.src.endsWith('.rgb')) continue;
      const bytes = await readFile(resolve('public', asset.src.slice(1)));
      assert.equal(bytes.includes(13), false, `${asset.src}: CR 줄바꿈 발견`);
    }
  }
});

test('배포할 세 장면의 파일·해시·종류·좌표가 일치한다', async () => {
  for (const id of ['circuit', 'waves', 'gas']) {
    const tool: Tool = await read(`src/content/tools/${id}.json`);
    await validatePreview(process.cwd(), tool);
  }
});

test('회로의 자세 사이 대응 관계가 손상되면 빌드를 차단한다', async () => {
  const data = await read('public/previews/circuit/1/scene.json');
  data.poses[12].paths[2].pop();
  assert.throws(() => checkScene(data), /일치하지 않는 회로 도형/);
});

test('파동과 기체의 저장 값은 장면의 물리 조건을 만족한다', async () => {
  const waves = await read('public/previews/waves/1/scene.json');
  const p = waves.physics;
  assert.ok(Math.abs(p.distances[1] - p.distances[0] - p.wavelength / 2) < 1e-8);
  assert.ok(Math.abs(p.amplitude) < 1e-8);
  // Opposite displacements at the same P survive sampling/coordinate rounding.
  assert.ok(Math.abs(waves.rows[0].points.at(-1)[1] + waves.rows[1].points.at(-1)[1]) < .01);
  const gas = await read('public/previews/gas/1/scene.json');
  assert.equal(gas.physics.example, true);
  assert.ok(gas.physics.fit.rSquared > .99);
  assert.equal(gas.physics.samples.length, gas.points.length);
});
