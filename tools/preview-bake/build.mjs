import { build } from 'esbuild';
import { readFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const sources = resolve(process.env.PREVIEW_SOURCE_DIR || resolve(root, '.local/preview-sources'));
const lock = JSON.parse(await readFile(resolve(here, 'sources.lock.json'), 'utf8'));
for (const [name, source] of Object.entries(lock)) {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: resolve(sources, name),
    encoding: 'utf8',
  }).trim();
  const dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
    cwd: resolve(sources, name),
    encoding: 'utf8',
  }).trim();
  if (head !== source.commit || dirty)
    throw new Error(`${name}: expected clean source at ${source.commit}`);
}
await mkdir(resolve(root, '.local/preview-build'), { recursive: true });
const outfile = resolve(root, '.local/preview-build/bake.mjs');
await build({
  entryPoints: [resolve(here, 'scenes.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'bundle',
  loader: { '.svg': 'text' },
  nodePaths: [resolve(here, 'node_modules')],
  alias: Object.fromEntries(Object.keys(lock).map((name) => [`@${name}`, resolve(sources, name)])),
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
const { bakeAll } = await import(pathToFileURL(outfile).href);
await bakeAll(root, lock);
