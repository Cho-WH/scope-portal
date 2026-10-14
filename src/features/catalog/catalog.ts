import { defaultFilters, matches, readFilters, writeFilters } from '../../lib/catalog/search';
import type { SearchItem } from '../../lib/catalog/search';

document.querySelectorAll<HTMLElement>('[data-catalog]').forEach(root => {
  const search = root.querySelector<HTMLInputElement>('#tool-search')!;
  const activity = root.querySelector<HTMLSelectElement>('#activity-filter')!;
  const counter = root.querySelector<HTMLElement>('[data-result-count]')!;
  const clear = root.querySelector<HTMLButtonElement>('[data-clear]')!;
  const reset = root.querySelector<HTMLButtonElement>('.catalog-status [data-reset]')!;
  const empty = root.querySelector<HTMLElement>('[data-empty]')!;
  const topicButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-topic]')];
  const items = [...root.querySelectorAll<HTMLElement>('[data-tool-id]')].map(element => ({
    element, variant: element.dataset.cardVariant, data: { id: element.dataset.toolId!, text: element.dataset.search!,
      topics: element.dataset.topics!.split(' '), activity: element.dataset.activity! } satisfies SearchItem,
  }));
  let filters = readFilters(new URL(location.href).searchParams);
  let composing = false;
  const number = new Intl.NumberFormat('ko-KR');
  function render(syncUrl = true) {
    let count = 0;
    const filtered = Boolean(filters.q.trim() || filters.topic !== 'all' || filters.activity !== 'all');
    for (const item of items) {
      const visible = matches(item.data, filters);
      item.element.hidden = !visible;
      item.element.dataset.cardVariant = filtered ? 'compact' : item.variant;
      if (visible) count++;
    }
    counter.textContent = filtered ? `${number.format(count)}개 도구` : `전체 ${number.format(items.length)}개 도구`;
    empty.hidden = count > 0;
    clear.hidden = !filters.q;
    reset.hidden = !filtered;
    topicButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.topic === filters.topic)));
    activity.value = filters.activity;
    if (search.value !== filters.q) search.value = filters.q;
    if (syncUrl) history.replaceState(history.state, '', writeFilters(new URL(location.href), filters));
  }
  function onSearch() { filters.q = search.value; render(); }
  search.addEventListener('compositionstart', () => { composing = true; });
  search.addEventListener('compositionend', () => { composing = false; onSearch(); });
  search.addEventListener('input', event => { if (!composing && !(event as InputEvent).isComposing) onSearch(); });
  root.querySelector('form')!.addEventListener('submit', event => { event.preventDefault(); onSearch(); });
  activity.addEventListener('change', () => { filters.activity = activity.value; render(); });
  topicButtons.forEach(button => button.addEventListener('click', () => { filters.topic = button.dataset.topic!; render(); }));
  clear.addEventListener('click', () => { filters.q = ''; render(); search.focus({ preventScroll: true }); });
  root.querySelectorAll('[data-reset]').forEach(button => button.addEventListener('click', () => {
    filters = defaultFilters(); render(); search.focus({ preventScroll: true });
  }));
  window.addEventListener('popstate', () => { filters = readFilters(new URL(location.href).searchParams); render(false); });
  window.addEventListener('pageshow', () => { filters = readFilters(new URL(location.href).searchParams); render(false); });
  render(false);
  root.dataset.ready = 'true';
});
