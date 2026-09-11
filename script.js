// Shared interactions for the static portfolio. Page content and navigation also work without JavaScript.
function restoreLegacyRoute() {
  const home = document.body.dataset.home || '';
  const hash = location.hash.slice(1);
  const isCatalog = document.body.classList.contains('page-works');
  if (isCatalog && ['about', 'cv', 'lab'].includes(hash)) {
    location.replace(`${home}${hash}.html`);
    return true;
  }
  if (isCatalog && /^work\/[a-z0-9-]+$/.test(hash)) {
    location.replace(`${home}${hash}.html`);
    return true;
  }
  const study = hash.match(/^study\/(L\d+)$/)?.[1];
  if ((isCatalog || document.body.classList.contains('page-lab')) && study) {
    location.replace(`${home}lab/${study.toLowerCase()}.html`);
    return true;
  }
  return false;
}

function syncLanguageLinks() {
  document.querySelectorAll('[data-language]').forEach((link) => {
    const base = link.getAttribute('href').split(/[?#]/)[0];
    link.href = `${base}${location.search}${location.hash}`;
  });
}

function initProjectHover(catalog, projects, plates) {
  if (catalog.dataset.catalog !== 'works') return () => {};
  const imageGrid = catalog.querySelector('.works-image-grid');
  const index = catalog.querySelector('.works-index');
  let activeProject = '';
  let waitingForPointer = false;
  let scrollQuietAfter = 0;
  let pointerPosition;
  const supportsHover = (event) => event.pointerType === 'mouse' || event.pointerType === 'pen';
  const showProject = (slug = '') => {
    if (slug && catalog.dataset.openProject) return;
    if (activeProject === slug) return;
    if (imageGrid) {
      if (slug) {
        const rect = imageGrid.getBoundingClientRect();
        // Preserve the page's height and show a preview beside the sticky index.
        if (!activeProject) imageGrid.style.minHeight = `${rect.height}px`;
        const indexTop = parseFloat(getComputedStyle(index).top) || 0;
        imageGrid.style.setProperty('--project-preview-offset', `${Math.max(0, indexTop - rect.top)}px`);
      } else {
        imageGrid.style.removeProperty('min-height');
        imageGrid.style.removeProperty('--project-preview-offset');
      }
      imageGrid.classList.toggle('is-project-preview', Boolean(slug));
    }
    activeProject = slug;
    plates.forEach((plate) => {
      plate.classList.toggle('is-hover-hidden', Boolean(slug) && plate.dataset.project !== slug);
      if (slug && plate.dataset.project === slug) plate.querySelector('img').loading = 'eager';
    });
  };
  const clear = () => showProject();
  const suspend = () => {
    waitingForPointer = true;
    scrollQuietAfter = performance.now() + 180;
    clear();
  };
  projects.forEach((project) => {
    project.addEventListener('pointerenter', (event) => {
      if (!supportsHover(event)) return;
      pointerPosition ||= { x: event.clientX, y: event.clientY };
      if (!waitingForPointer && !event.buttons) showProject(project.dataset.project);
    });
    project.addEventListener('pointerleave', clear);
    project.addEventListener('pointercancel', clear);
  });
  // Scrolling can move a title beneath a stationary pointer. Resume only on
  // actual pointer movement after wheel input and scroll momentum have stopped.
  window.addEventListener('pointermove', (event) => {
    if (!supportsHover(event)) return;
    const moved = !pointerPosition || event.clientX !== pointerPosition.x || event.clientY !== pointerPosition.y;
    pointerPosition = { x: event.clientX, y: event.clientY };
    if (!moved || event.buttons || performance.now() < scrollQuietAfter) return;
    waitingForPointer = false;
    const project = event.target.closest?.('[data-overview-project]');
    showProject(project && catalog.contains(project) ? project.dataset.project : '');
  }, { passive: true });
  window.addEventListener('wheel', suspend, { passive: true });
  window.addEventListener('scroll', suspend, { passive: true });
  window.addEventListener('pointerdown', (event) => {
    if (event.button === 1) suspend();
  }, { passive: true });
  window.addEventListener('blur', clear);
  return clear;
}

function initWorksProjectView(catalog, projects, clearProjectHover, refreshCatalog) {
  if (catalog.dataset.catalog !== 'works') return;
  const layout = catalog.querySelector('.works-layout');
  const grid = catalog.querySelector('.works-image-grid');
  const panel = catalog.querySelector('.works-project-panel');
  const allWorks = catalog.querySelector('.works-all');
  const templates = new Map([...catalog.querySelectorAll('template[data-project-detail]')]
    .map((template) => [template.dataset.projectDetail, template]));
  const originalTitle = document.title;
  let currentSlug;
  let gridScroll = 0;
  let opener;
  allWorks.hidden = false;

  const writeUrl = (slug, { replace = false, resetFilters = false } = {}) => {
    const url = new URL(location.href);
    if (slug) url.searchParams.set('project', slug);
    else url.searchParams.delete('project');
    if (resetFilters) {
      url.searchParams.delete('year');
      url.searchParams.delete('field');
    }
    const next = `${url.pathname}${url.search}${url.hash}`;
    if (next !== `${location.pathname}${location.search}${location.hash}`) {
      history[replace ? 'replaceState' : 'pushState'](history.state, '', next);
    }
  };

  const syncFromUrl = (focus = false) => {
    let slug = new URLSearchParams(location.search).get('project') || '';
    if (slug && !templates.has(slug)) {
      writeUrl('', { replace: true });
      slug = '';
    }
    if (slug === currentSlug) {
      syncLanguageLinks();
      return;
    }
    const wasOpen = Boolean(currentSlug);
    if (slug && !wasOpen) gridScroll = window.scrollY;
    clearProjectHover();
    const dialog = document.getElementById('media-dialog');
    if (dialog?.open) dialog.close();
    panel.querySelectorAll('video').forEach((video) => video.pause());
    panel.replaceChildren();
    grid.hidden = Boolean(slug);
    panel.hidden = !slug;
    layout.classList.toggle('is-detail-open', Boolean(slug));
    if (slug) catalog.dataset.openProject = slug;
    else delete catalog.dataset.openProject;
    allWorks.setAttribute('aria-pressed', String(!slug));
    projects.forEach((project) => {
      const link = project.querySelector('.works-index-link');
      if (project.dataset.project === slug) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    currentSlug = slug;
    if (slug) {
      panel.append(templates.get(slug).content.cloneNode(true));
      panel.querySelectorAll('img').forEach(trackImageRatio);
      const firstImage = panel.querySelector('img');
      if (firstImage) firstImage.loading = 'eager';
      document.title = `${panel.querySelector('h2').textContent} — ${originalTitle}`;
      if (focus) {
        const narrow = window.matchMedia('(max-width:900px)').matches;
        const target = narrow ? panel : layout;
        const top = target.getBoundingClientRect().top + window.scrollY - (narrow ? 16 : 48);
        window.scrollTo({ top: narrow ? Math.max(0, top) : Math.min(window.scrollY, Math.max(0, top)), behavior: 'instant' });
        panel.focus({ preventScroll: true });
      }
    } else {
      document.title = originalTitle;
      if (wasOpen) window.scrollTo({ top: gridScroll, behavior: 'instant' });
    }
    syncLanguageLinks();
  };

  catalog.addEventListener('click', (event) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (event.target.closest('[data-all-works]')) {
      event.preventDefault();
      writeUrl('', { resetFilters: true });
      refreshCatalog();
      (opener?.isConnected ? opener : allWorks).focus({ preventScroll: true });
      return;
    }
    const link = event.target.closest('.works-index-link, .works-image-grid .overview-image-link');
    const slug = link?.closest('[data-project]')?.dataset.project;
    if (!templates.has(slug)) return;
    event.preventDefault();
    opener = link;
    writeUrl(slug);
    syncFromUrl(true);
  });
  syncFromUrl();
  return { syncFromUrl };
}

function initCatalog() {
  const catalog = document.querySelector('[data-catalog]');
  if (!catalog) return;
  const year = catalog.querySelector('[name="year"]');
  const field = catalog.querySelector('[name="field"]');
  const plates = [...catalog.querySelectorAll('[data-plate]')];
  const projects = [...catalog.querySelectorAll('[data-overview-project]')];
  const clearProjectHover = initProjectHover(catalog, projects, plates);
  const count = document.getElementById('catalog-count');
  const empty = catalog.querySelector('.catalog-empty');
  let projectView;

  const readUrl = () => {
    const params = new URLSearchParams(location.search);
    const valid = (select, value) => [...select.options].some((option) => option.value === value) ? value : 'all';
    if (year) year.value = valid(year, params.get('year'));
    field.value = valid(field, params.get('field'));
  };
  const render = (writeUrl = false) => {
    clearProjectHover();
    const yearValue = year?.value || 'all';
    const matches = (item) => (yearValue === 'all' || yearValue === item.dataset.year) && (field.value === 'all' || field.value === item.dataset.field);
    let visible = 0;
    projects.forEach((project) => {
      project.hidden = !matches(project);
      if (!project.hidden) visible += 1;
    });
    let photos = 0;
    plates.forEach((plate) => { plate.hidden = !matches(plate); if (!plate.hidden) photos += 1; });
    const ko = document.documentElement.lang === 'ko';
    const label = catalog.dataset.catalog === 'lab' ? (ko ? '개 실험' : ' studies') : (ko ? '개 작업' : ' works');
    count.textContent = `${visible}${label} · ${photos}${ko ? '장' : ' images'}`;
    empty.hidden = visible !== 0;
    const params = new URLSearchParams(location.search);
    if (writeUrl) params.delete('project');
    for (const [key, value] of [['year', yearValue], ['field', field.value]]) {
      if (value === 'all') params.delete(key);
      else params.set(key, value);
    }
    const legacyView = params.has('view');
    params.delete('view');
    if (writeUrl || legacyView) {
      const query = params.toString();
      history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
    }
    syncLanguageLinks();
    projectView?.syncFromUrl();
  };
  for (const select of [year, field].filter(Boolean)) select.addEventListener('change', () => render(true));
  catalog.querySelector('[data-reset-filters]').addEventListener('click', () => {
    if (year) year.value = 'all';
    field.value = 'all';
    render(true);
    (year || field).focus();
  });
  window.addEventListener('popstate', () => { readUrl(); render(); });
  readUrl();
  render();
  projectView = initWorksProjectView(catalog, projects, clearProjectHover, () => { readUrl(); render(); });
}

function trackImageRatio(img) {
  const applyRatio = () => {
    if (!img.naturalWidth || !img.naturalHeight) return;
    const plate = img.closest('[data-plate]');
    if (plate) plate.dataset.orientation = img.naturalWidth > img.naturalHeight ? 'landscape' : 'portrait';
    const ratio = img.naturalHeight > img.naturalWidth ? '3 / 4' : '16 / 9';
    img.style.setProperty('--image-ratio', ratio);
    img.closest('.overview-image-link')?.style.setProperty('--image-ratio', ratio);
  };
  img.addEventListener('load', applyRatio);
  if (img.complete) applyRatio();
}

function initImageRatios() {
  document.querySelectorAll('.portfolio img').forEach(trackImageRatio);
}

function initWorksLoader() {
  const root = document.documentElement;
  const catalog = document.querySelector('[data-catalog="works"]');
  if (!catalog || !root.classList.contains('works-loading')) return;
  const controller = new AbortController();
  const { signal } = controller;
  const prepared = new Set();
  catalog.setAttribute('aria-busy', 'true');

  const finish = () => {
    clearTimeout(window.worksLoadingGuard);
    controller.abort();
    catalog.removeAttribute('aria-busy');
    root.classList.remove('works-loading');
  };
  // Replace the early guard with cleanup that also releases image listeners.
  clearTimeout(window.worksLoadingGuard);
  window.worksLoadingGuard = setTimeout(finish, 8000);
  window.addEventListener('pagehide', finish, { once: true, signal });

  const prepareImage = (img) => new Promise((resolve) => {
    let done = false;
    const settle = () => {
      if (done) return;
      done = true;
      img.removeEventListener('load', loaded);
      img.removeEventListener('error', settle);
      signal.removeEventListener('abort', settle);
      resolve();
    };
    const loaded = () => {
      if (img.naturalWidth && img.decode) img.decode().catch(() => {}).then(settle);
      else settle();
    };
    signal.addEventListener('abort', settle, { once: true });
    img.addEventListener('load', loaded, { once: true });
    img.addEventListener('error', settle, { once: true });
    // Hidden content must not leave native lazy loading waiting on this overlay.
    img.loading = 'eager';
    if (img.complete) loaded();
  });

  const prepareViewport = async () => {
    while (!signal.aborted) {
      const pending = [...catalog.querySelectorAll('.overview-image img')].filter((img) => {
        if (prepared.has(img)) return false;
        const rect = img.getBoundingClientRect();
        return rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
      });
      if (!pending.length) break;
      pending.forEach((img) => prepared.add(img));
      await Promise.all(pending.map(prepareImage));
      // Loaded image ratios may move another image into the first viewport.
    }
  };
  prepareViewport().finally(finish);
}

function initMediaViewer() {
  const dialog = document.getElementById('media-dialog');
  if (!dialog || !dialog.showModal) return;
  const title = document.getElementById('viewer-title');
  const media = document.getElementById('viewer-media');
  const workLink = document.getElementById('viewer-work');
  let opener;
  const open = (link) => {
    opener = link;
    title.textContent = link.dataset.viewerTitle || '';
    workLink.hidden = !link.dataset.viewerWork;
    if (link.dataset.viewerWork) workLink.href = link.dataset.viewerWork;
    else workLink.removeAttribute('href');
    const isVideo = link.dataset.viewerType === 'video';
    const element = document.createElement(isVideo ? 'video' : 'img');
    element.src = link.dataset.viewer;
    if (isVideo) {
      element.controls = true;
      element.playsInline = true;
      element.preload = 'metadata';
    } else element.alt = title.textContent;
    media.replaceChildren(element);
    if (!isVideo) trackImageRatio(element);
    dialog.showModal();
    document.documentElement.classList.add('viewer-open');
  };
  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-viewer]');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open(link);
  });
  dialog.querySelector('[data-close-viewer]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    media.querySelector('video')?.pause();
    media.replaceChildren();
    document.documentElement.classList.remove('viewer-open');
    opener?.focus({ preventScroll: true });
  });
}

if (!restoreLegacyRoute()) {
  initImageRatios();
  initCatalog();
  initWorksLoader();
  initMediaViewer();
  syncLanguageLinks();
}
window.addEventListener('hashchange', () => { if (!restoreLegacyRoute()) syncLanguageLinks(); });
