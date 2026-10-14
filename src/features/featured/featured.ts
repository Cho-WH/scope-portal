/** Manual tabs only. No timer, physics model, device access or simulation dependency. */
document.querySelectorAll<HTMLElement>('[data-featured]').forEach(root => {
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[data-feature-panel]')];
  const desktop = matchMedia('(min-width: 680px)');
  const tablist = root.querySelector<HTMLElement>('[role="tablist"]')!;
  const indicator = root.querySelector<HTMLElement>('[data-feature-indicator]')!;
  let indicatorFrame = 0;
  function positionIndicator() {
    cancelAnimationFrame(indicatorFrame);
    indicatorFrame = requestAnimationFrame(() => {
      const active = tabs.find(tab => tab.getAttribute('aria-selected') === 'true');
      const label = active?.querySelector<HTMLElement>(desktop.matches ? '.label-long' : '.label-short');
      if (!label) return;
      const rect = label.getBoundingClientRect();
      const track = tablist.getBoundingClientRect();
      indicator.style.transform = `translateX(${rect.left - track.left}px) scaleX(${rect.width})`;
      tablist.dataset.indicatorReady = 'true';
    });
  }
  new ResizeObserver(positionIndicator).observe(tablist);
  document.fonts.ready.then(positionIndicator);

  function syncPreview() {
    for (const panel of panels) {
      const host = panel.querySelector<HTMLElement>('[data-preview-host]');
      if (!host) continue;
      const rendered = host.querySelector('figure');
      if (!desktop.matches || panel.hidden) rendered?.remove();
      else if (!rendered) {
        const template = host.querySelector<HTMLTemplateElement>('template');
        if (template) host.append(template.content.cloneNode(true));
      }
    }
  }
  function select(tab: HTMLButtonElement, focus = false, syncUrl = true) {
    for (const item of tabs) {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    }
    for (const panel of panels) panel.hidden = panel.dataset.featurePanel !== tab.dataset.featureId;
    syncPreview();
    positionIndicator();
    if (focus) tab.focus({ preventScroll: true });
    if (syncUrl) {
      const url = new URL(location.href);
      if (tab === tabs[0]) url.searchParams.delete('feature');
      else url.searchParams.set('feature', tab.dataset.featureId!);
      history.replaceState(history.state, '', url);
    }
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      const index = event.key === 'ArrowRight' ? (i + 1) % tabs.length
        : event.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
      if (index !== null) { event.preventDefault(); select(tabs[index], true); }
    });
  });
  desktop.addEventListener('change', () => { syncPreview(); positionIndicator(); });
  function restore() {
    const id = new URL(location.href).searchParams.get('feature');
    select(tabs.find(tab => tab.dataset.featureId === id) ?? tabs[0], false, false);
  }
  window.addEventListener('popstate', restore);
  window.addEventListener('pageshow', restore);
  restore();
  root.dataset.ready = 'true';
});
