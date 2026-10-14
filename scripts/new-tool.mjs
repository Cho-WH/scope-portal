import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const id = process.argv[2];
if (!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
  console.error('사용법: npm run new:tool -- pendulum (영문 소문자·숫자·하이픈)');
  process.exit(1);
}
const root = fileURLToPath(new URL('../', import.meta.url));
const template = JSON.parse(await readFile(resolve(root, 'docs/templates/tool.json'), 'utf8'));
try {
  await writeFile(resolve(root, 'src/content/tools', `${id}.json`), `${JSON.stringify(template, null, 2)}\n`, { flag: 'wx' });
  console.log(`src/content/tools/${id}.json 생성. 내용을 채운 뒤 draft를 false로 바꾸세요.`);
} catch (error) {
  if (error.code === 'EEXIST') console.error(`이미 존재하는 도구입니다: ${id}`);
  else throw error;
  process.exitCode = 1;
}
