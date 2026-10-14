import { activityIds, topicIds, activityLabel, topicLabel } from './taxonomy.ts';
import type { Tool } from './schema.ts';

export interface Filters { q: string; topic: string; activity: string }
export interface SearchItem { id: string; text: string; topics: string[]; activity: string }
export const defaultFilters = (): Filters => ({ q: '', topic: 'all', activity: 'all' });
export function normalizeSearch(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/[\s:·]/g, '');
}
export function toSearchItem(tool: Tool): SearchItem {
  return { id: tool.id, topics: tool.topics, activity: tool.activity,
    text: normalizeSearch([tool.name, tool.summary, tool.description, ...tool.keywords,
      ...tool.equipment, ...tool.topics.map(topicLabel), activityLabel(tool.activity)].join(' ')) };
}
export function matches(item: SearchItem, filters: Filters) {
  const words = filters.q.trim().split(/\s+/).filter(Boolean).map(normalizeSearch);
  return (filters.topic === 'all' || item.topics.includes(filters.topic))
    && (filters.activity === 'all' || item.activity === filters.activity)
    && words.every(word => item.text.includes(word));
}
export function readFilters(params: URLSearchParams): Filters {
  const topic = params.get('topic') ?? 'all', activity = params.get('activity') ?? 'all';
  return { q: (params.get('q') ?? '').slice(0, 160),
    topic: topicIds.some(id => id === topic) ? topic : 'all',
    activity: activityIds.some(id => id === activity) ? activity : 'all' };
}
export function writeFilters(url: URL, filters: Filters) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(filters)) {
    if (!value.trim() || value === 'all') next.searchParams.delete(key);
    else next.searchParams.set(key, value);
  }
  return next;
}
