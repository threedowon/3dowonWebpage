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

function initCatalog() {
  const catalog = document.querySelector('[data-catalog]');
  if (!catalog) return;
  const year = catalog.querySelector('[name="year"]');
  const field = catalog.querySelector('[name="field"]');
  const plates = [...catalog.querySelectorAll('[data-plate]')];
  const projects = [...catalog.querySelectorAll('[data-overview-project]')];
  const count = document.getElementById('catalog-count');
  const empty = catalog.querySelector('.catalog-empty');

  const readUrl = () => {
    const params = new URLSearchParams(location.search);
    const valid = (select, value) => [...select.options].some((option) => option.value === value) ? value : 'all';
    if (year) year.value = valid(year, params.get('year'));
    field.value = valid(field, params.get('field'));
  };
  const render = (writeUrl = false) => {
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
}

function trackImageRatio(img) {
  const applyRatio = () => {
    if (!img.naturalWidth || !img.naturalHeight) return;
    const ratio = img.naturalHeight > img.naturalWidth ? '4 / 3' : '16 / 9';
    img.style.setProperty('--image-ratio', ratio);
    img.closest('.overview-image-link')?.style.setProperty('--image-ratio', ratio);
  };
  img.addEventListener('load', applyRatio);
  if (img.complete) applyRatio();
}

function initImageRatios() {
  document.querySelectorAll('.portfolio img').forEach(trackImageRatio);
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
  document.querySelectorAll('[data-viewer]').forEach((link) => link.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open(link);
  }));
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
  initMediaViewer();
  syncLanguageLinks();
}
window.addEventListener('hashchange', () => { if (!restoreLegacyRoute()) syncLanguageLinks(); });
