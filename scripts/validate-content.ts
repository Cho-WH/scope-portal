import { readdir, readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toolSchema, resourceSchema, contentId } from '../src/lib/catalog/schema.ts';
import { catalogErrors } from '../src/lib/catalog/validation.ts';
import { validatePreview } from './preview-validation.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
async function files(folder: string) {
  const directory = resolve(root, 'src/content', folder);
  return Promise.all((await readdir(directory)).filter(file => file.endsWith('.json')).map(async file => ({
    id: contentId.parse(file.slice(0, -5)),
    raw: JSON.parse(await readFile(resolve(directory, file), 'utf8')),
  })));
}
const tools = (await files('tools')).map(({ id, raw }) => ({ ...toolSchema.parse(raw), id }));
const resources = (await files('resources')).map(({ id, raw }) => ({ ...resourceSchema.parse(raw), id }));
const errors = catalogErrors(tools, resources);
for (const tool of tools) {
  try { await validatePreview(root, tool); }
  catch (error) { errors.push(`${tool.id}: ${error instanceof Error ? error.message : '장면 검증 실패'}`); }
  for (const poster of [tool.preview?.poster, tool.thumbnail]) {
    if (!poster) continue;
    try { await access(resolve(root, 'public', poster.src.slice(1))); }
    catch { errors.push(`${tool.id}: 이미지 파일이 없습니다: ${poster.src}`); }
  }
}
if (errors.length) throw new Error(errors.join('\n'));
console.log(`콘텐츠 검증 완료: 공개 도구 ${tools.filter(t => !t.draft).length}개, 공개 자료 ${resources.filter(r => !r.draft).length}개`);
