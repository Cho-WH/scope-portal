/** Stable IDs are stored in content and URLs. Labels may change independently. */
export const topics = [
  { id: 'electricity', label: '전기·자기' },
  { id: 'waves', label: '파동·빛' },
  { id: 'thermal', label: '열·기체' },
  { id: 'general', label: '공통 도구' },
] as const;

export const activities = [
  { id: 'simulation', label: '화면 실험' },
  { id: 'measurement', label: '센서 측정' },
  { id: 'making', label: '만들기' },
  { id: 'audio', label: '소리 도구' },
] as const;

export type TopicId = (typeof topics)[number]['id'];
export type ActivityId = (typeof activities)[number]['id'];
export const topicIds = topics.map(({ id }) => id) as [TopicId, ...TopicId[]];
export const activityIds = activities.map(({ id }) => id) as [ActivityId, ...ActivityId[]];
export const topicLabel = (id: string) => topics.find(t => t.id === id)?.label ?? id;
export const activityLabel = (id: string) => activities.find(t => t.id === id)?.label ?? id;
