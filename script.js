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

function initProjectHover(catalog, projects, plates, refreshImages) {
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
    refreshImages();
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

  const updateDetailLayout = () => {
    const information = panel.querySelector('.inline-project-information');
    if (!information) return;
    const informationWidth = parseFloat(getComputedStyle(panel).getPropertyValue('--inline-information-width'));
    // Long metadata wraps within the fixed information column, without moving it.
    const minimumGalleryWidth = 320;
    panel.classList.toggle('has-side-information', window.matchMedia('(min-width:901px)').matches && panel.clientWidth >= informationWidth + minimumGalleryWidth);
  };
  let previousPanelWidth;
  const panelResize = new ResizeObserver(([entry]) => {
    if (entry.contentRect.width === previousPanelWidth) return;
    previousPanelWidth = entry.contentRect.width;
    updateDetailLayout();
  });
  panelResize.observe(panel);
  document.fonts?.ready.then(updateDetailLayout);

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
    panel.classList.remove('has-side-information');
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
      updateDetailLayout();
      panel.querySelectorAll('img').forEach(trackImageRatio);
      const firstImage = panel.querySelector('img');
      if (firstImage) firstImage.loading = 'eager';
      document.title = `${panel.querySelector('h2').textContent} — ${originalTitle}`;
      if (focus) {
        const narrow = window.matchMedia('(max-width:900px)').matches;
        const target = narrow ? panel : layout;
        const headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height || 0;
        const top = target.getBoundingClientRect().top + window.scrollY - (narrow ? headerHeight + 12 : 48);
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

function initCatalog(refreshImages = () => {}) {
  const catalog = document.querySelector('[data-catalog]');
  if (!catalog) return;
  const year = catalog.querySelector('[name="year"]');
  const field = catalog.querySelector('[name="field"]');
  const plates = [...catalog.querySelectorAll('[data-plate]')];
  const projects = [...catalog.querySelectorAll('[data-overview-project]')];
  const clearProjectHover = initProjectHover(catalog, projects, plates, refreshImages);
  const count = document.getElementById('catalog-count');
  const empty = catalog.querySelector('.catalog-empty');
  const filterToggle = catalog.querySelector('.works-filter-toggle');
  const filterPanel = catalog.querySelector('#works-filter-panel');
  const filterTags = catalog.querySelector('.works-filter-tags');
  filterToggle?.addEventListener('click', () => {
    const expanded = filterToggle.getAttribute('aria-expanded') !== 'true';
    filterToggle.setAttribute('aria-expanded', String(expanded));
    filterToggle.textContent = expanded ? 'Filter −' : 'Filter +';
    filterPanel.hidden = !expanded;
  });
  let projectView;

  const readUrl = () => {
    const params = new URLSearchParams(location.search);
    const valid = (select, value) => [...select.options].some((option) => option.value === value) ? value : 'all';
    if (year) year.value = valid(year, params.get('year'));
    field.value = catalog.dataset.catalog === 'lab' ? 'all' : valid(field, params.get('field'));
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
    if (filterTags) {
      filterTags.replaceChildren();
      for (const select of [year, field].filter(Boolean)) {
        if (select.value === 'all') continue;
        const button = document.createElement('button');
        button.type = 'button';
        const text = select.selectedOptions[0].textContent;
        button.textContent = `${text} ×`;
        button.setAttribute('aria-label', ko ? `${text} 필터 해제` : `Remove ${text} filter`);
        button.addEventListener('click', () => {
          select.value = 'all';
          render(true);
          (filterTags.querySelector('button') || filterToggle).focus({preventScroll:true});
        });
        filterTags.append(button);
      }
      filterTags.hidden = !filterTags.childElementCount;
    }
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
    refreshImages();
  };
  for (const select of [year, field].filter(Boolean)) select.addEventListener('change', () => render(true));
  catalog.querySelector('[data-reset-filters]').addEventListener('click', () => {
    if (year) year.value = 'all';
    field.value = 'all';
    render(true);
    (filterPanel?.hidden ? filterToggle : (year || field)).focus();
  });
  window.addEventListener('popstate', () => { readUrl(); render(); });
  readUrl();
  render();
  projectView = initWorksProjectView(catalog, projects, clearProjectHover, () => { readUrl(); render(); });
}

function trackImageRatio(img) {
  const applyRatio = () => {
    if (!img.naturalWidth || !img.naturalHeight) return;
    img.dataset.orientation = img.naturalWidth > img.naturalHeight ? 'landscape' : 'portrait';
    const plate = img.closest('[data-plate]');
    if (plate) plate.dataset.orientation = img.naturalWidth > img.naturalHeight ? 'landscape' : 'portrait';
    const ratio = img.naturalHeight > img.naturalWidth ? '3 / 4' : '16 / 9';
    img.style.setProperty('--image-ratio', ratio);
    img.closest('.overview-image-link')?.style.setProperty('--image-ratio', ratio);
  };
  img.addEventListener('load', applyRatio);
  if (img.complete) applyRatio();
}

let studyAlignmentObserver;
function initImageRatios() {
  studyAlignmentObserver?.disconnect();
  const study = document.querySelector('.page-study .work-article');
  const studyMedia = study?.querySelector('.feature-gallery img, .feature-gallery video, .feature-gallery iframe');
  if (studyMedia) {
    const alignStudyText = () => {
      if (!study.isConnected) return;
      const media = studyMedia.getBoundingClientRect();
      const article = study.getBoundingClientRect();
      if (!media.height) return;
      const sourceWidth = studyMedia.naturalWidth || studyMedia.videoWidth;
      const sourceHeight = studyMedia.naturalHeight || studyMedia.videoHeight;
      const height = sourceWidth && sourceHeight ? Math.min(media.height, media.width * sourceHeight / sourceWidth) : media.height;
      const center = media.top - article.top + (studyMedia.tagName === 'IMG' ? height / 2 : media.height / 2);
      study.style.setProperty('--study-media-center', `${center}px`);
      const facts = study.querySelector('.project-facts');
      study.style.setProperty('--study-facts-half', `${(facts?.getBoundingClientRect().height || 0) / 2}px`);
    };
    studyAlignmentObserver = new ResizeObserver(alignStudyText);
    studyAlignmentObserver.observe(study.querySelector('.feature-gallery'));
    studyAlignmentObserver.observe(studyMedia);
    studyMedia.addEventListener('load', alignStudyText);
    studyMedia.addEventListener('loadedmetadata', alignStudyText);
    alignStudyText();
  }
  const aboutText = document.querySelector('.about-information');
  const aboutArticle = document.querySelector('.about-article');
  if (aboutText && aboutArticle && !aboutArticle.dataset.heightObserved) {
    aboutArticle.dataset.heightObserved = 'true';
    const syncHeight = () => aboutArticle.style.setProperty('--about-text-height', `${aboutText.getBoundingClientRect().height}px`);
    new ResizeObserver(syncHeight).observe(aboutText);
    syncHeight();
  }
  document.querySelectorAll('.portfolio img').forEach(trackImageRatio);
  document.querySelectorAll('.portfolio video').forEach((video) => {
    const applyRatio = () => {
      if (!video.videoWidth || !video.videoHeight) return;
      const portrait = video.videoHeight > video.videoWidth;
      const plate = video.closest('[data-plate]');
      if (plate) plate.dataset.orientation = portrait ? 'portrait' : 'landscape';
      const preview = video.closest('.overview-image-link');
      preview?.style.setProperty('--image-ratio', video.closest('.page-lab') ? '3 / 4' : portrait ? '3 / 4' : '16 / 9');
    };
    video.addEventListener('loadedmetadata', applyRatio);
    applyRatio();
  });
}

function initWorksImageReveal() {
  const grid = document.querySelector('.works-image-grid');
  if (!grid) return () => {};
  const entries = [...grid.querySelectorAll('[data-plate]')].map((plate) => ({
    plate, img: plate.querySelector('img'), state: 'pending',
  }));
  const refresh = () => {
    const selected = entries.filter(({ plate }) => !plate.hidden && !plate.classList.contains('is-hover-hidden'));
    let blocked = false;
    entries.forEach(({ plate }) => plate.classList.remove('is-image-ready'));
    for (const entry of selected) {
      if (entry.state === 'failed') continue;
      if (entry.state !== 'ready') blocked = true;
      if (!blocked) entry.plate.classList.add('is-image-ready');
    }
    if (grid.hidden) return;
    // Fetch ahead concurrently, even when pending tiles are hidden or offscreen.
    // Keep the window anchored to the first gap rather than waiting for scrolling.
    const firstPending = selected.findIndex(({ state }) => state !== 'ready' && state !== 'failed');
    if (firstPending !== -1) {
      selected.slice(firstPending, firstPending + 8).forEach(({ img }) => { img.loading = 'eager'; });
    }
  };
  entries.forEach((entry) => {
    const { img, plate } = entry;
    const finish = (state) => {
      if (entry.state === 'ready' || entry.state === 'failed') return;
      entry.state = state;
      plate.classList.toggle('is-image-error', state === 'failed');
      img.removeEventListener('load', loaded);
      img.removeEventListener('error', failed);
      refresh();
    };
    const failed = () => finish('failed');
    const loaded = () => {
      if (entry.state !== 'pending') return;
      if (!img.naturalWidth) return failed();
      entry.state = 'decoding';
      if (img.decode) img.decode().then(() => finish('ready'), failed);
      else finish('ready');
    };
    img.addEventListener('load', loaded);
    img.addEventListener('error', failed);
    if (img.complete) loaded();
  });
  refresh();
  return refresh;
}

function initDetailScrollChaining() {
  let activeText, pending = 0, frame = 0, previousTime = 0;
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    pending = 0;
    previousTime = 0;
  };
  const move = (text, delta) => {
    const max = Math.max(0, text.scrollHeight - text.clientHeight);
    const start = Math.max(0, Math.min(max, text.scrollTop));
    const end = Math.max(0, Math.min(max, start + delta));
    if (end !== start) text.scrollTop = end;
    const remaining = delta - (end - start);
    if (remaining) window.scrollBy({ top: remaining, behavior: 'instant' });
  };
  const tick = (time) => {
    if (!activeText?.isConnected || !activeText.getClientRects().length || document.documentElement.classList.contains('viewer-open')) return stop();
    const elapsed = previousTime ? Math.min(32, time - previousTime) : 16;
    previousTime = time;
    const step = Math.abs(pending) < 0.5 ? pending : pending * (1 - Math.exp(-elapsed / 55));
    pending -= step;
    move(activeText, step);
    if (pending) frame = requestAnimationFrame(tick);
    else { frame = 0; previousTime = 0; }
  };
  window.addEventListener('pointerdown', stop, { passive: true });
  window.addEventListener('keydown', stop);
  window.addEventListener('blur', stop);
  document.addEventListener('wheel', (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || !event.cancelable || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (document.documentElement.classList.contains('viewer-open')) return;
    const information = event.target.closest?.('.inline-project-information, .project-information');
    const text = information?.querySelector('.post-des');
    if (!text || !event.deltaY) { stop(); return; }
    const style = getComputedStyle(text);
    if (!['auto', 'scroll'].includes(style.overflowY)) return;
    const max = Math.max(0, text.scrollHeight - text.clientHeight);
    if (!max) return;
    const unit = event.deltaMode === 1 ? (parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2 || 16) : event.deltaMode === 2 ? text.clientHeight : 1;
    const delta = event.deltaY * unit;
    event.preventDefault();
    if (activeText !== text || (pending && Math.sign(pending) !== Math.sign(delta))) stop();
    activeText = text;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { move(text, delta); return; }
    pending += delta;
    if (!frame) frame = requestAnimationFrame(tick);
  }, { passive: false });
}

function initMediaViewer() {
  const dialog = document.getElementById('media-dialog');
  if (!dialog || !dialog.showModal) return;
  const title = document.getElementById('viewer-title');
  const media = document.getElementById('viewer-media');
  const workLink = document.getElementById('viewer-work');
  let opener;
  let viewerEntry = null;
  const historyKey = '__3dowonViewer';
  // A reload does not restore a modal, so discard any stale modal marker.
  if (history.state?.[historyKey]) {
    const state = { ...history.state };
    delete state[historyKey];
    history.replaceState(state, '', location.href);
  }
  const open = (link, restoreEntry = null) => {
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
    viewerEntry = restoreEntry;
    if (!restoreEntry && window.matchMedia('(max-width:900px)').matches) {
      viewerEntry = { id: `${Date.now()}-${Math.random()}`, src: link.dataset.viewer, url: location.href };
      history.pushState({ ...history.state, [historyKey]: viewerEntry }, '', location.href);
    }
  };
  window.addEventListener('popstate', () => {
    const entry = history.state?.[historyKey];
    if (entry && entry.url === location.href) {
      if (dialog.open) return;
      const link = [...document.querySelectorAll('[data-viewer]')].find(link => link.dataset.viewer === entry.src);
      if (link) open(link, entry);
    } else {
      viewerEntry = null;
      if (dialog.open) dialog.close();
    }
  });
  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-viewer]');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open(link);
  });
  dialog.querySelector('[data-close-viewer]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target.closest('video')) return;
    dialog.close();
  });
  dialog.addEventListener('close', () => {
    media.querySelector('video')?.pause();
    media.replaceChildren();
    document.documentElement.classList.remove('viewer-open');
    opener?.focus({ preventScroll: true });
    const entry = viewerEntry;
    viewerEntry = null;
    if (entry && history.state?.[historyKey]?.id === entry.id && location.href === entry.url) history.back();
  });
}

function initStudyNavigation() {
  if (!document.body.classList.contains('page-study')) return;
  let currentPath = location.pathname;
  let controller;
  const navigate = async (url, push, direction) => {
    controller?.abort();
    const request = new AbortController();
    controller = request;
    const main = document.getElementById('main');
    main.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch(url, { signal: request.signal });
      if (!response.ok) throw new Error('Unable to load study');
      const page = new DOMParser().parseFromString(await response.text(), 'text/html');
      const next = page.querySelector('body.page-study #main');
      if (!next) throw new Error('Not a study page');
      if (request.signal.aborted) return;
      main.querySelectorAll('video').forEach(video => video.pause());
      main.replaceChildren(...next.childNodes);
      document.title = page.title;
      if (push) history.pushState(null, '', url);
      currentPath = location.pathname;
      initImageRatios();
      syncLanguageLinks();
      const focus = direction && main.querySelector(`.study-arrow-${direction}[href]`);
      (focus || main).focus({ preventScroll: true });
    } catch (error) {
      if (error.name !== 'AbortError') location.assign(url);
    } finally {
      if (controller === request) main.removeAttribute('aria-busy');
    }
  };
  document.addEventListener('click', event => {
    const link = event.target.closest('.study-arrow[href], .page-study .project-pagination a');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(link.href, true, link.classList.contains('study-arrow-previous') ? 'previous' : 'next');
  });
  window.addEventListener('popstate', () => {
    if (location.pathname !== currentPath) navigate(location.href, false);
  });
}

function initPortfolioBook() {
  const book = document.querySelector('.portfolio-book');
  if (!book) return;
  const slides = [...book.querySelectorAll('.portfolio-slide')];
  const previous = book.querySelector('.portfolio-prev');
  const next = book.querySelector('.portfolio-next');
  let index = 0;
  const show = (value) => {
    index = Math.max(0, Math.min(slides.length - 1, value));
    slides.forEach((slide, i) => { slide.hidden = i !== index; });
    if (slides[index + 1]) slides[index + 1].loading = 'eager';
    if (previous) previous.disabled = index === 0;
    if (next) next.disabled = index === slides.length - 1;
    book.querySelector('.portfolio-status').textContent = slides.length ? `${index + 1} / ${slides.length}` : '';
  };
  previous?.addEventListener('click', () => show(index - 1));
  next?.addEventListener('click', () => show(index + 1));
  book.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); show(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  show(0);
}

if (!restoreLegacyRoute()) {
  initPortfolioBook();
  initStudyNavigation();
  initImageRatios();
  initCatalog(initWorksImageReveal());
  initMediaViewer();
  initDetailScrollChaining();
  syncLanguageLinks();
}
window.addEventListener('hashchange', () => { if (!restoreLegacyRoute()) syncLanguageLinks(); });
