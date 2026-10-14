import type { Tool, Resource } from './schema.ts';

export function catalogErrors(tools: Tool[], resources: Resource[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const features = new Set<number>();
  for (const tool of tools) {
    if (ids.has(tool.id)) errors.push(`중복 도구 ID: ${tool.id}`);
    ids.add(tool.id);
    if (tool.draft) continue;
    if (['example.com', 'example.org', 'example.invalid'].includes(new URL(tool.launchUrl).hostname)) {
      errors.push(`${tool.id}: 공개 도구에 예제 실행 주소를 사용할 수 없습니다.`);
    }
    if (tool.featured) {
      if (features.has(tool.featured.order)) errors.push(`대표 도구 순서 중복: ${tool.featured.order}`);
      features.add(tool.featured.order);
    }
  }
  const published = new Set(tools.filter(t => !t.draft).map(t => t.id));
  for (const resource of resources) {
    for (const id of resource.toolIds) {
      if (!ids.has(id)) errors.push(`${resource.id}: 없는 도구 참조 ${id}`);
      else if (!resource.draft && !published.has(id)) errors.push(`${resource.id}: 비공개 도구 참조 ${id}`);
    }
  }
  return errors;
}
