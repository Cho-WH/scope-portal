import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toolSchema, resourceSchema } from '../../src/lib/catalog/schema.ts';
import { catalogErrors } from '../../src/lib/catalog/validation.ts';
import { defaultFilters, matches, readFilters, toSearchItem, writeFilters } from '../../src/lib/catalog/search.ts';

const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const tool = { ...toolSchema.parse(read('../../src/content/tools/gas.json')), id: 'gas' };
test('한글·영문 기기 이름과 공백을 정규화하고 여러 검색어를 함께 적용한다', () => {
  const item = toSearchItem(tool);
  for (const q of ['마이크로비트', 'micro:bit', 'MICROBIT', '온도 압력']) assert(matches(item, { ...defaultFilters(), q }));
  assert(!matches(item, { ...defaultFilters(), q: '온도 소리' }));
});
test('주제와 활동 조건은 동시에 적용된다', () => {
  const item = toSearchItem(tool);
  assert(matches(item, { q: '', topic: 'thermal', activity: 'measurement' }));
  assert(!matches(item, { q: '', topic: 'thermal', activity: 'simulation' }));
});
test('URL 상태는 왕복하며 알 수 없는 분류는 안전하게 초기화한다', () => {
  const filters = { q: '온도 압력', topic: 'thermal', activity: 'measurement' };
  const url = writeFilters(new URL('https://sco.pe.kr/?other=1#tools'), filters);
  assert.deepEqual(readFilters(url.searchParams), filters);
  assert.equal(url.searchParams.get('other'), '1');
  assert.equal(url.hash, '#tools');
  assert.equal(readFilters(new URLSearchParams('topic=missing&activity=missing')).topic, 'all');
  assert.equal(writeFilters(url, defaultFilters()).search, '?other=1');
});
test('새 도구 템플릿은 초안 상태이며 공개 목록에 실수로 섞이지 않는다', () => {
  const draft = toolSchema.parse(read('../../docs/templates/tool.json'));
  assert.equal(draft.draft, true);
  assert.deepEqual(catalogErrors([{ ...draft, id: 'new-tool' }], []), []);
  assert.match(catalogErrors([{ ...draft, id: 'new-tool', draft: false }], [])[0], /예제 실행 주소/);
});
test('누락·오타·실행 가능한 스킴을 콘텐츠 경계에서 거부한다', () => {
  const raw = read('../../src/content/tools/gas.json');
  assert.equal(toolSchema.safeParse({ ...raw, topics: ['unknown'] }).success, false);
  assert.equal(toolSchema.safeParse({ ...raw, launchUrl: 'javascript:alert(1)' }).success, false);
  assert.equal(toolSchema.safeParse({ ...raw, enviroment: 'typo' }).success, false);
  assert.equal(toolSchema.safeParse({ ...raw, name: '' }).success, false);
});
test('대표 도구 순서 중복과 자료의 잘못된 연결을 감지한다', () => {
  const duplicate = { ...tool, id: 'another' };
  assert(catalogErrors([tool, duplicate], []).some(e => e.includes('순서 중복')));
  const resource = { ...resourceSchema.parse(read('../../src/content/resources/gas-setup.json')), id: 'setup', toolIds: ['missing'] };
  assert(catalogErrors([tool], [resource]).some(e => e.includes('없는 도구')));
  assert(catalogErrors([{ ...tool, draft: true }], [{ ...resource, toolIds: ['gas'] }]).some(e => e.includes('비공개 도구')));
});
