import { getCollection } from 'astro:content';
import { catalogErrors } from './validation';
import type { Resource, Tool } from './schema';

/** Build-time boundary: pages/components never read raw JSON files themselves. */
export async function loadCatalog() {
  const [toolEntries, resourceEntries] = await Promise.all([
    getCollection('tools'), getCollection('resources'),
  ]);
  const allTools: Tool[] = toolEntries.map(({ id, data }) => ({ ...data, id }));
  const allResources: Resource[] = resourceEntries.map(({ id, data }) => ({ ...data, id }));
  const errors = catalogErrors(allTools, allResources);
  if (errors.length) throw new Error(errors.join('\n'));
  const byOrder = <T extends { order: number; id: string }>(a: T, b: T) => a.order - b.order || a.id.localeCompare(b.id);
  const tools = allTools.filter(t => !t.draft).sort(byOrder);
  const resources = allResources.filter(r => !r.draft).sort(byOrder);
  const featured = tools.filter(t => t.featured).sort((a, b) => a.featured!.order - b.featured!.order);
  return { tools, resources, featured };
}
