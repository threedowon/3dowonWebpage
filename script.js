// Shared interactions for the static portfolio. Page content and navigation also work without JavaScript.
function restoreLegacyRoute() {
  const home = document.body.dataset.home || '';
  if (document.body.classList.contains('page-selected')) {
    const project = new URLSearchParams(location.search).get('project');
    if (project && /^[a-z0-9-]+$/.test(project) && document.querySelector(`a[href="work/${project}.html"]`)) {
      location.replace(`${home}work/${project}.html`);
      return true;
    }
  }
  const hash = location.hash.slice(1);
  const isCatalog = document.body.classList.contains('page-works') || document.body.classList.contains('page-selected');
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
  // Read the same background value used by each generated detail gallery.
  const projectColors = Object.fromEntries(
    [...catalog.querySelectorAll('template[data-project-detail]')].map(template => [
      template.dataset.projectDetail,
      template.content.querySelector('.feature-gallery')?.style.getPropertyValue('--detail-paper').trim() || '#ffffff',
    ])
  );
  const colorNodes = [...projects, ...plates];
  colorNodes.forEach(node => {
    const candidate = projectColors[node.dataset.project] || '#ffffff';
    const color = /^#[0-9a-f]{6}$/i.test(candidate) ? candidate : '#ffffff';
    const channels = color.slice(1).match(/../g).map(hex => {
      const value = parseInt(hex, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    // Use white on dark backgrounds; retain dark text where it stays readable.
    const darkLuminance = ((67 / 255 + 0.055) / 1.055) ** 2.4;
    const darkContrast = (luminance + 0.05) / (darkLuminance + 0.05);
    const whiteContrast = 1.05 / (luminance + 0.05);
    const ink = darkContrast >= 4.5 ? '#434343' : whiteContrast >= 4.5 ? '#ffffff' : '#000000';
    node.style.setProperty('--project-accent', color);
    node.style.setProperty('--project-accent-ink', ink);
  });
  let pointerProject = '', focusProject = '';
  const updateAccent = () => {
    const slug = pointerProject || focusProject;
    colorNodes.forEach(node => node.classList.toggle('is-accent-active', Boolean(slug) && node.dataset.project === slug));
  };
  const projectAt = target => target?.closest?.('.works-index-item, .works-image-grid [data-plate]')?.dataset.project || '';
  catalog.addEventListener('pointerover', event => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    pointerProject = projectAt(event.target); updateAccent();
  });
  catalog.addEventListener('pointerout', event => {
    pointerProject = catalog.contains(event.relatedTarget) ? projectAt(event.relatedTarget) : ''; updateAccent();
  });
  catalog.addEventListener('focusin', event => { focusProject = projectAt(event.target); updateAccent(); });
  catalog.addEventListener('focusout', event => {
    focusProject = catalog.contains(event.relatedTarget) ? projectAt(event.relatedTarget) : ''; updateAccent();
  });
  window.addEventListener('blur', () => { pointerProject = ''; focusProject = ''; updateAccent(); });
  const imageGrid = catalog.querySelector('.works-image-grid');
  const index = catalog.querySelector('.works-index');
  let activeProject = '';
  let waitingForPointer = false;
  let scrollQuietAfter = 0;
  let pointerPosition;
  const supportsHover = (event) => event.pointerType === 'mouse' || event.pointerType === 'pen';
  const detailPanel = catalog.querySelector('.works-project-panel');
  const preview = document.createElement('div');
  preview.className = 'works-detail-hover';
  preview.hidden = true;
  preview.setAttribute('aria-hidden', 'true');
  const previewImage = document.createElement('img');
  previewImage.alt = '';
  preview.append(previewImage);
  document.body.append(preview);
  let previewSlug = '';
  const hideDetailPreview = () => { previewSlug = ''; preview.hidden = true; };
  const showDetailPreview = slug => {
    if (slug === catalog.dataset.openProject) { hideDetailPreview(); return; }
    if (!window.matchMedia('(min-width:921px) and (hover:hover)').matches) return;
    if (previewSlug === slug) return;
    hideDetailPreview();
    const template = [...catalog.querySelectorAll('template[data-project-detail]')].find(item => item.dataset.projectDetail === slug);
    const image = template?.content.querySelector('.feature-gallery img, .detail-process-media img');
    const src = image?.getAttribute('src');
    if (!src || !detailPanel) return;
    const rect = detailPanel.getBoundingClientRect();
    const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0;
    const footerTop = document.querySelector('.site-footer')?.getBoundingClientRect().top ?? window.innerHeight;
    const top = Math.max(0, rect.top, headerBottom);
    const bottom = Math.min(window.innerHeight, footerTop);
    if (bottom <= top) return;
    Object.assign(preview.style, {left:`${rect.left}px`, top:`${top}px`, width:`${rect.width}px`, height:`${bottom-top}px`});
    previewSlug = slug;
    previewImage.onload = () => { if (previewSlug === slug) preview.hidden = false; };
    previewImage.onerror = hideDetailPreview;
    previewImage.src = src;
    if (previewImage.complete && previewImage.naturalWidth) preview.hidden = false;
  };

  const showProject = (slug = '') => {
    if (slug && catalog.dataset.openProject) { showDetailPreview(slug); return; }
    hideDetailPreview();
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
  window.addEventListener('resize', clear);
  index.addEventListener('click', clear);
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
    const panelRect = panel.getBoundingClientRect();
    panel.style.setProperty('--inline-start-top', `${panelRect.top + window.scrollY + 48}px`);
    panel.style.setProperty('--inline-fixed-right', `${window.innerWidth - panelRect.right}px`);
    // Long metadata wraps within the fixed information column, without moving it.
    const minimumGalleryWidth = 320;
    panel.classList.toggle('has-side-information', window.matchMedia('(min-width:921px)').matches && panel.clientWidth >= informationWidth + minimumGalleryWidth);
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
    panel.querySelectorAll('video, mux-player').forEach((video) => video.pause?.());
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
        const narrow = window.matchMedia('(max-width:920px)').matches;
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
    const sizeReference = aboutArticle.querySelector('.about-size-reference') || aboutText;
    const syncHeight = () => {
      const height = sizeReference.getBoundingClientRect().height;
      if (height > 0) aboutArticle.style.setProperty('--about-text-height', `${height}px`);
    };
    new ResizeObserver(syncHeight).observe(sizeReference);
    syncHeight();
  }
  document.querySelectorAll('.portfolio img').forEach(trackImageRatio);
  document.querySelectorAll('.portfolio video').forEach((video) => {
    const applyRatio = () => {
      if (!video.videoWidth || !video.videoHeight) return;
      const portrait = video.videoHeight > video.videoWidth;
      video.dataset.orientation = video.videoWidth > video.videoHeight ? 'landscape' : 'portrait';
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
    plate, img: plate.querySelector('img, video'), state: 'pending',
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
      selected.slice(firstPending, firstPending + 8).forEach(({ img }) => { if(img.tagName==='VIDEO'){img.preload='auto';}else img.loading = 'eager'; });
    }
  };
  entries.forEach((entry) => {
    const { img, plate } = entry;
    const finish = (state) => {
      if (entry.state === 'ready' || entry.state === 'failed') return;
      entry.state = state;
      plate.classList.toggle('is-image-error', state === 'failed');
      img.removeEventListener('load', loaded);
      img.removeEventListener('loadeddata', loaded);
      img.removeEventListener('error', failed);
      refresh();
    };
    const failed = () => finish('failed');
    const loaded = () => {
      if (entry.state !== 'pending') return;
      if(img.tagName==='VIDEO'){if(img.readyState>=2)finish('ready');return;}
      if (!img.naturalWidth) return failed();
      entry.state = 'decoding';
      if (img.decode) img.decode().then(() => finish('ready'), failed);
      else finish('ready');
    };
    img.addEventListener(img.tagName==='VIDEO'?'loadeddata':'load', loaded);
    img.addEventListener('error', failed);
    if (img.complete || (img.tagName==='VIDEO' && img.readyState>=2)) loaded();
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
  const closeButton = dialog.querySelector('[data-close-viewer]');
  const isLabPreview = document.body.classList.contains('page-lab');
  const mobileWorkViewer = matchMedia('(max-width:920px)');
  mobileWorkViewer.addEventListener('change', () => {
    if (!mobileWorkViewer.matches && dialog.open && dialog.classList.contains('media-dialog-gallery')) dialog.close();
  });
  let pausedLabVideos = [];
  const korean = document.documentElement.lang === 'ko';
  const controls = document.createElement('nav');
  controls.className = 'viewer-gallery-controls';
  controls.hidden = true;
  controls.setAttribute('aria-label', korean ? '확대 이미지 탐색' : 'Enlarged image navigation');
  controls.innerHTML = `<button type="button" data-viewer-prev aria-label="${korean ? '이전 이미지' : 'Previous image'}">↑</button><span role="status" aria-live="polite"></span><button type="button" data-viewer-next aria-label="${korean ? '다음 이미지' : 'Next image'}">↓</button>`;
  dialog.append(controls);
  const galleryScrollbar = document.createElement('div');
  galleryScrollbar.className = 'viewer-scrollbar';
  galleryScrollbar.setAttribute('aria-hidden', 'true');
  galleryScrollbar.innerHTML = '<span></span>';
  dialog.append(galleryScrollbar);
  const previous = controls.querySelector('[data-viewer-prev]');
  const next = controls.querySelector('[data-viewer-next]');
  const status = controls.querySelector('[role=status]');
  let slides = [];
  let current = 0;
  let scrollFrame = 0;
  let scrollbarHideTimer;
  const updateGallery = () => {
    if (!slides.length || !dialog.open) return;
    const trackHeight = galleryScrollbar.clientHeight;
    const thumbHeight = Math.min(trackHeight, Math.max(40, trackHeight * media.clientHeight / media.scrollHeight));
    const progress = media.scrollTop / Math.max(1, media.scrollHeight - media.clientHeight);
    galleryScrollbar.firstElementChild.style.height = `${thumbHeight}px`;
    galleryScrollbar.firstElementChild.style.transform = `translateY(${Math.max(0, Math.min(1, progress)) * (trackHeight - thumbHeight)}px)`;
    current = slides.reduce((nearest, slide, index) => Math.abs(slide.offsetTop - media.scrollTop) < Math.abs(slides[nearest].offsetTop - media.scrollTop) ? index : nearest, 0);
    const count = `${current + 1} / ${slides.length}`;
    if (status.textContent !== count) status.textContent = count;
    previous.disabled = current === 0;
    next.disabled = current === slides.length - 1;
    slides.slice(Math.max(0, current - 1), current + 2).forEach(slide => {
      slide.querySelector('img').loading = 'eager';
    });
  };
  const goToImage = (index, behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth') => {
    const slide = slides[Math.max(0, Math.min(index, slides.length - 1))];
    if (slide) media.scrollTo({ top: slide.offsetTop, behavior });
  };
  const fitGalleryFrame = () => {
    if (!slides.length || !dialog.open) return;
    const availableWidth = Math.max(1, media.clientWidth - (innerWidth > 920 ? 160 : 0));
    const sizes = slides.map(slide => {
      const image = slide.querySelector('img');
      const width = Number(image.getAttribute('width')) || image.naturalWidth;
      const height = Number(image.getAttribute('height')) || image.naturalHeight;
      if (!width || !height) return null;
      const scale = availableWidth / width;
      slide.style.height = `${height * scale}px`;
      return { width: width * scale, height: height * scale };
    }).filter(Boolean);
    const width = `${Math.round(sizes.length ? Math.max(...sizes.map(size => size.width)) : availableWidth)}px`;
    const height = `${Math.round(sizes.length ? Math.max(...sizes.map(size => size.height)) : media.clientHeight)}px`;
    media.style.paddingBottom = '50px';
    if (media.style.getPropertyValue('--viewer-frame-width') === width && media.style.getPropertyValue('--viewer-frame-height') === height) return;
    media.style.setProperty('--viewer-frame-width', width);
    media.style.setProperty('--viewer-frame-height', height);
    goToImage(current, 'instant');
    updateGallery();
  };
  previous.addEventListener('click', () => goToImage(current - 1));
  next.addEventListener('click', () => goToImage(current + 1));
  media.addEventListener('scroll', () => {
    if (!slides.length || !dialog.open) return;
    galleryScrollbar.classList.add('is-scrolling');
    clearTimeout(scrollbarHideTimer);
    scrollbarHideTimer = setTimeout(() => galleryScrollbar.classList.remove('is-scrolling'), 700);
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; updateGallery(); });
  }, { passive: true });
  new ResizeObserver(() => {
    if (!slides.length || !dialog.open) return;
    fitGalleryFrame();
    goToImage(current, 'instant');
    updateGallery();
  }).observe(media);
  dialog.addEventListener('keydown', event => {
    if (!slides.length) return;
    const targets = { ArrowUp: current - 1, ArrowLeft: current - 1, PageUp: current - 1,
      ArrowDown: current + 1, ArrowRight: current + 1, PageDown: current + 1, Home: 0, End: slides.length - 1 };
    if (!(event.key in targets)) return;
    event.preventDefault();
    goToImage(targets[event.key]);
  });
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
    if (link.closest('.page-work:not(.page-study) .detail-gallery') && !mobileWorkViewer.matches) return;
    opener = link;
    title.textContent = link.dataset.viewerTitle || '';
    workLink.hidden = !link.dataset.viewerWork;
    if (link.dataset.viewerWork) workLink.href = link.dataset.viewerWork;
    else workLink.removeAttribute('href');
    const isVideo = link.dataset.viewerType === 'video';
    const gallery = !isVideo && link.closest('.page-work:not(.page-study) .detail-gallery');
    dialog.classList.toggle('media-dialog-gallery', Boolean(gallery));
    controls.hidden = !gallery;
    let selected = 0;
    if (gallery) {
      dialog.style.setProperty('--detail-paper', getComputedStyle(gallery).getPropertyValue('--detail-paper').trim() || '#ffffff');
      const seen = new Set();
      const links = [...gallery.querySelectorAll('[data-viewer]')].filter(item => {
        if (item.dataset.viewerType === 'video' || seen.has(item.dataset.viewer)) return false;
        seen.add(item.dataset.viewer);
        return true;
      });
      selected = Math.max(0, links.findIndex(item => item.dataset.viewer === link.dataset.viewer));
      slides = links.map((item, index) => {
        const slide = document.createElement('figure');
        slide.className = 'viewer-slide';
        slide.setAttribute('aria-label', `${index + 1} / ${links.length}`);
        const image = document.createElement('img');
        const sourceImage = item.querySelector('img');
        const width = Number(sourceImage?.getAttribute('width')) || sourceImage?.naturalWidth;
        const height = Number(sourceImage?.getAttribute('height')) || sourceImage?.naturalHeight;
        if (width && height) { image.width = width; image.height = height; }
        image.src = item.dataset.viewer;
        image.alt = sourceImage?.alt || item.dataset.viewerTitle || '';
        image.loading = Math.abs(index - selected) <= 1 ? 'eager' : 'lazy';
        image.decoding = 'async';
        image.addEventListener('load', fitGalleryFrame);
        slide.append(image);
        return slide;
      });
      title.textContent = document.getElementById('page-title')?.textContent || title.textContent;
      media.replaceChildren(...slides);
      media.tabIndex = 0;
      previous.hidden = next.hidden = slides.length < 2;
      gallery.querySelectorAll('video,mux-player').forEach(video => video.pause?.());
    } else {
      slides = [];
      media.removeAttribute('tabindex');
      const element = document.createElement(isVideo ? 'video' : 'img');
      element.src = link.dataset.viewer;
      if (isVideo) {
        element.controls = true;
        element.playsInline = true;
        element.preload = 'metadata';
        if (isLabPreview) {
          element.muted = true;
          element.loop = true;
          element.autoplay = !matchMedia('(prefers-reduced-motion: reduce)').matches;
          element.setAttribute('autoplay','');
          element.setAttribute('aria-label', title.textContent);
          const poster = link.querySelector('video')?.poster;
          if (poster) element.poster = poster;
        }
      } else element.alt = title.textContent;
      const caption = isLabPreview && link.closest('.lab-entry')?.querySelector('[data-lab-preview]');
      if (caption) {
        const preview = document.createElement('figure');
        preview.className = 'lab-preview';
        preview.append(element, caption.content.cloneNode(true));
        preview.querySelector('h2').id = 'lab-preview-title';
        dialog.setAttribute('aria-labelledby', 'lab-preview-title');
        const fitPreview = () => {
          const width = element.videoWidth || element.naturalWidth;
          const height = element.videoHeight || element.naturalHeight;
          if (width && height) preview.style.setProperty('--lab-preview-ratio', width / height);
        };
        element.addEventListener(isVideo ? 'loadedmetadata' : 'load', fitPreview, { once: true });
        fitPreview();
        media.replaceChildren(preview);
      } else media.replaceChildren(element);
      if (!isVideo) trackImageRatio(element);
    }
    if (isLabPreview) {
      pausedLabVideos = [...document.querySelectorAll('.lab-entry video')].filter(video => !video.paused);
      pausedLabVideos.forEach(video => video.pause());
    }
    dialog.showModal();
    if (isLabPreview && isVideo && !matchMedia('(prefers-reduced-motion: reduce)').matches) element.play().catch(() => {});
    media.scrollTop = 0;
    document.documentElement.classList.add('viewer-open');
    if (gallery) {
      current = selected;
      fitGalleryFrame();
      goToImage(selected, 'instant');
      updateGallery();
      closeButton.focus({ preventScroll: true });
    }
    viewerEntry = restoreEntry;
    if (!restoreEntry && window.matchMedia('(max-width:920px)').matches) {
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
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (slides.length && mobileWorkViewer.matches && event.target.closest('.viewer-slide')) {
      dialog.close();
      return;
    }
    if (slides.length && event.target !== dialog && event.target !== media && !event.target.matches('.viewer-slide')) return;
    if (isLabPreview && event.target.closest('.lab-preview')) return;
    if (event.target.closest('video') || (isLabPreview && event.target.closest('img'))) return;
    dialog.close();
  });
  dialog.addEventListener('close', () => {
    clearTimeout(scrollbarHideTimer);
    galleryScrollbar.classList.remove('is-scrolling');
    media.querySelector('video')?.pause();
    slides = [];
    controls.hidden = true;
    media.style.removeProperty('--viewer-frame-width');
    media.style.removeProperty('--viewer-frame-height');
    media.style.removeProperty('padding-bottom');
    media.removeAttribute('tabindex');
    media.replaceChildren();
    dialog.setAttribute('aria-labelledby', 'viewer-title');
    pausedLabVideos.forEach(video => { if (video.isConnected) video.play().catch(() => {}); });
    pausedLabVideos = [];
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
      main.querySelectorAll('video, mux-player').forEach(video => video.pause?.());
      main.replaceChildren(...next.childNodes);
      document.title = page.title;
      if (push) history.pushState(null, '', url);
      currentPath = location.pathname;
      initImageRatios();
      document.dispatchEvent(new Event('lab:navigated'));
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
  // Keep the tap targets in screen coordinates while the pages rotate.
  if (previous) book.append(previous);
  if (next) book.append(next);
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


function initWorksFooterCollision() {
  if (!document.body.matches('.page-works,.page-work:not(.page-study)')) return;
  const footer = document.querySelector('.site-footer');
  if (!footer) return;
  let frame = 0;
  const update = () => {
    frame = 0;
    // Both fixed reading panels end 24px above the viewport bottom.
    const overlap = Math.max(0, window.innerHeight - 24 - footer.getBoundingClientRect().top + 16);
    document.documentElement.style.setProperty('--works-footer-overlap', `${overlap}px`);
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule);
  new ResizeObserver(schedule).observe(document.body);
  update();
}
initWorksFooterCollision();

// Selected archive previews keep real project URLs available without JavaScript.
function initSpecimens() {
  const links = [...document.querySelectorAll('[data-specimen]')];
  const panels = [...document.querySelectorAll('.specimen')];
  if (!links.length) return;
  const show = link => {
    links.forEach(item => item === link ? item.setAttribute('aria-current', 'true') : item.removeAttribute('aria-current'));
    panels.forEach(panel => { panel.hidden = panel.id !== link.getAttribute('aria-controls'); });
    panels.find(panel => !panel.hidden)?.querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
  };
  links.forEach(link => {
    link.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') show(link); });
    link.addEventListener('focus', () => show(link));
    link.addEventListener('click', event => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); show(link);
    });
  });
  document.querySelectorAll('[data-specimen-image]').forEach(button => button.addEventListener('click', () => {
    const panel = button.closest('.specimen');
    const main = panel.querySelector('.specimen-image img');
    const source = button.querySelector('img');
    if (!main || !source) return;
    main.src = source.getAttribute('src'); main.alt = source.alt;
    main.removeAttribute('srcset');
    panel.querySelectorAll('[data-specimen-image]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  }));
}
initSpecimens();
