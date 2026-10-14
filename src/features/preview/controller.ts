import type { PreviewScene, SceneData, SceneId, Manifest } from './types';

const factories = {
  circuit: () => import('./scenes/circuit'),
  waves: () => import('./scenes/waves'),
  gas: () => import('./scenes/gas'),
};
type Playback = { elapsed: number; paused: boolean; ended: boolean; explicit: boolean };

export function createPreviewManager(root: HTMLElement) {
  const desktop = matchMedia('(min-width: 680px)'),
    spacious = matchMedia('(min-width: 960px)'),
    reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const records = new Map<string, Playback>();
  let selectedId: string | undefined;
  let mounted: HTMLElement | null = null,
    scene: PreviewScene | null = null,
    state: Playback | null = null;
  let loading: AbortController | null = null,
    frame = 0,
    last: number | null = null,
    visible = false,
    generation = 0,
    loadingScene = false;
  const panels = [...root.querySelectorAll<HTMLElement>('[data-feature-panel]')];
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = null;
  }
  function paintControl() {
    if (!mounted || !state) return;
    const button = mounted.querySelector<HTMLButtonElement>('[data-preview-control]');
    if (!button) return;
    button.hidden = !spacious.matches;
    button.disabled = loadingScene;
    button.textContent = loadingScene
      ? '불러오는 중…'
      : state.ended
        ? '다시 보기'
        : !scene
          ? '재생'
          : state.paused
            ? '계속 보기'
            : '일시 정지';
    mounted.dataset.playback = loadingScene
      ? 'loading'
      : state.ended
        ? 'ended'
        : !scene
          ? 'poster'
          : state.paused
            ? 'paused'
            : 'playing';
  }
  function eligible() {
    return (
      !!scene &&
      !!state &&
      !state.paused &&
      !state.ended &&
      visible &&
      !document.hidden &&
      desktop.matches &&
      spacious.matches
    );
  }
  function tick(now: number) {
    frame = 0;
    if (!eligible()) {
      last = null;
      return;
    }
    if (last !== null)
      state!.elapsed = Math.min(scene!.durationMs, state!.elapsed + Math.min(100, now - last));
    last = now;
    scene!.renderAt(state!.elapsed);
    if (state!.elapsed >= scene!.durationMs) {
      state!.ended = true;
      stop();
      paintControl();
    } else frame = requestAnimationFrame(tick);
  }
  function schedule() {
    if (!eligible()) stop();
    else if (!frame) frame = requestAnimationFrame(tick);
  }
  function unmount() {
    generation++;
    stop();
    loading?.abort();
    loading = null;
    scene?.dispose();
    scene = null;
    loadingScene = false;
    mounted?.remove();
    mounted = null;
    state = null;
  }
  async function load() {
    if (!mounted || !state || scene || loadingScene) return;
    const figure = mounted,
      record = state,
      id = figure.dataset.scene as SceneId;
    const manifestUrl = figure.dataset.manifest;
    if (!(id in factories) || !manifestUrl) return;
    const token = ++generation;
    loading = new AbortController();
    const signal = loading.signal;
    loadingScene = true;
    figure.querySelector<HTMLElement>('[data-preview-status]')!.textContent = '';
    paintControl();
    try {
      const response = await fetch(manifestUrl, { signal });
      if (!response.ok) throw new Error('Manifest unavailable');
      const manifest: Manifest = await response.json();
      if (
        manifest.schemaVersion !== 1 ||
        manifest.scene !== id ||
        !manifest.data.startsWith(`/previews/${id}/`)
      )
        throw new Error('Invalid manifest');
      const [dataResponse, module] = await Promise.all([
        fetch(manifest.data, { signal }),
        factories[id](),
      ]);
      if (!dataResponse.ok) throw new Error('Scene unavailable');
      const data: SceneData = await dataResponse.json();
      if (data.schemaVersion !== 1 || data.scene !== id || data.durationMs !== manifest.durationMs)
        throw new Error('Invalid scene');
      if (token !== generation || signal.aborted) return;
      const surface = figure.querySelector<HTMLElement>('[data-scene-surface]')!;
      // Each selected factory accepts its matching discriminated scene data.
      const created = await (
        module.createScene as (
          host: HTMLElement,
          data: SceneData,
          signal: AbortSignal,
        ) => PreviewScene | Promise<PreviewScene>
      )(surface, data, signal);
      if (token !== generation || signal.aborted) {
        created.dispose();
        return;
      }
      scene = created;
      record.elapsed = record.ended ? scene.durationMs : record.elapsed;
      scene.renderAt(record.elapsed);
      figure.querySelector<HTMLElement>('[data-scene-poster]')!.hidden = true;
      loadingScene = false;
      paintControl();
      schedule();
    } catch (error) {
      if (token !== generation || signal.aborted) return;
      loadingScene = false;
      figure.dataset.playback = 'fallback';
      scene?.dispose();
      scene = null;
      figure.querySelector<HTMLElement>('[data-scene-poster]')!.hidden = false;
      figure.querySelector<HTMLElement>('[data-preview-status]')!.textContent =
        '미리보기를 불러오지 못해 정지 이미지를 표시합니다. 다시 불러오기를 눌러 재시도할 수 있습니다.';
      figure.querySelector<HTMLElement>('[data-scene-surface]')?.replaceChildren();
      const button = figure.querySelector<HTMLButtonElement>('[data-preview-control]');
      if (button) {
        button.disabled = false;
        button.textContent = '다시 불러오기';
      }
    }
  }
  function sync() {
    const panel = panels.find((p) => !p.hidden),
      host = panel?.querySelector<HTMLElement>('[data-preview-host]');
    const id = panel?.dataset.featurePanel;
    if (id && id !== selectedId) {
      // A deliberate tab change starts a fresh scene, including return visits.
      // Resizing, scrolling and pageshow keep the current scene's playback position.
      records.set(id, { elapsed: 0, paused: false, ended: false, explicit: false });
      selectedId = id;
    }
    if (!desktop.matches || !host) {
      unmount();
      return;
    }
    if (mounted?.parentElement === host) {
      schedule();
      return;
    }
    unmount();
    const template = host.querySelector<HTMLTemplateElement>('[data-preview-template]');
    if (!template) return;
    host.append(template.content.cloneNode(true));
    mounted = host.querySelector<HTMLElement>('figure');
    if (!mounted?.dataset.scene) return;
    state = records.get(id!)!;
    if (reduced.matches && !state.explicit) {
      state.ended = true;
      state.paused = true;
    }
    paintControl();
    if (spacious.matches && (!reduced.matches || state.explicit)) void load();
  }
  root.addEventListener('click', (event) => {
    if (
      !(event.target instanceof Element) ||
      !event.target.closest('[data-preview-control]') ||
      !state
    )
      return;
    state.explicit = true;
    if (!scene) {
      state.elapsed = 0;
      state.ended = false;
      state.paused = false;
      void load();
      return;
    }
    if (state.ended) {
      state.elapsed = 0;
      state.ended = false;
      state.paused = false;
      scene.renderAt(0);
    } else state.paused = !state.paused;
    paintControl();
    schedule();
  });
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.35;
      schedule();
    },
    { threshold: [0, 0.35] },
  );
  observer.observe(root);
  document.addEventListener('visibilitychange', schedule);
  const changeMode = () => {
    unmount();
    sync();
  };
  spacious.addEventListener('change', changeMode);
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      // A newly enabled preference also applies to previously visited scenes.
      for (const record of records.values()) {
        record.ended = true;
        record.paused = true;
        record.explicit = false;
      }
    }
    changeMode();
  });
  window.addEventListener('pagehide', () => {
    stop();
    loading?.abort();
  });
  window.addEventListener('pageshow', () => {
    if (loading?.signal.aborted && loadingScene) {
      unmount();
      sync();
    } else schedule();
  });
  return { sync };
}
