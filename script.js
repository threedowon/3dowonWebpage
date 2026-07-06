// ── Filter functionality (제작 + 유형 + 기술) ──
function initFilters() {
  const checkItems = document.querySelectorAll('.filter-checks > li, .mo-filter');
  const containers = document.querySelectorAll('.img-post-box, .index-post-box');

  if (!checkItems.length || !containers.length) return;

  function getItemTypeLabels(item) {
    const labels = [];
    if (item.dataset.type) labels.push(item.dataset.type);
    if (item.dataset.tags) {
      item.dataset.tags.split(',').forEach((tag) => {
        if (tag) labels.push(tag);
      });
    }
    return labels;
  }

  function getActiveChecks(filterName) {
    const active = [];
    checkItems.forEach((el) => {
      if (el.dataset.filter === filterName && el.classList.contains('checked')) {
        active.push(el.dataset.value);
      }
    });
    return active;
  }

  function syncChecks(filterName, value, checked) {
    checkItems.forEach((el) => {
      if (el.dataset.filter === filterName && el.dataset.value === value) {
        el.classList.toggle('checked', checked);
      }
    });
  }

  function itemMatchesProduction(item, productionChecks) {
    if (productionChecks.length === 0) return true;
    return productionChecks.includes(item.dataset.production);
  }

  function itemMatchesType(item, typeChecks) {
    if (typeChecks.length === 0) return true;
    const typeLabels = getItemTypeLabels(item);
    return typeChecks.some((check) => typeLabels.includes(check));
  }

  function itemMatchesTech(item, techChecks) {
    if (techChecks.length === 0) return true;
    const techs = (item.dataset.tech || '').split(',').filter(Boolean);
    return techChecks.some((check) => techs.includes(check));
  }

  function filter() {
    const productionChecks = getActiveChecks('production');
    const typeChecks = getActiveChecks('type');
    const techChecks = getActiveChecks('tech');

    containers.forEach((container) => {
      container.querySelectorAll('[data-production]').forEach((item) => {
        const productionMatch = itemMatchesProduction(item, productionChecks);
        const typeMatch = itemMatchesType(item, typeChecks);
        const techMatch = itemMatchesTech(item, techChecks);
        item.classList.toggle('hidden', !(productionMatch && typeMatch && techMatch));
      });
    });

    updateNoResults();
  }

  function updateNoResults() {
    const noResultsEl = document.querySelector('.no-results');
    const indexView = document.getElementById('indexView');
    const activeContainer = indexView && !indexView.classList.contains('hidden')
      ? document.querySelector('.index-post-box')
      : document.querySelector('.img-post-box');

    if (!noResultsEl || !activeContainer) return;

    let visible = 0;
    activeContainer.querySelectorAll('[data-production]').forEach((item) => {
      if (!item.classList.contains('hidden')) visible++;
    });
    noResultsEl.classList.toggle('show', visible === 0);
  }

  window.updateNoResults = updateNoResults;

  checkItems.forEach((el) => {
    el.addEventListener('click', () => {
      const filterName = el.dataset.filter;
      if (!filterName) return;
      const willCheck = !el.classList.contains('checked');
      syncChecks(filterName, el.dataset.value, willCheck);
      filter();
    });
  });
}

// ── Works nav accordion ──
function initNavAccordion() {
  const accordion = document.querySelector('.nav-accordion');
  const worksLink = document.querySelector('.nav-works');
  if (!accordion || !worksLink) return;

  worksLink.addEventListener('click', (e) => {
    if (!document.querySelector('.site-header--works')) return;

    e.preventDefault();
    accordion.classList.toggle('is-open');
  });

  document.querySelectorAll('.nav-lab, .nav-about, .nav-cv, .nav-contact').forEach((link) => {
    link.addEventListener('click', () => {
      accordion.classList.remove('is-open');
    });
  });
}

// ── Grid / Index view toggle ──
function initViewToggle() {
  const toggles = document.querySelectorAll('.view-toggle > li');
  const gridView = document.getElementById('gridView');
  const indexView = document.getElementById('indexView');
  if (!toggles.length || !gridView || !indexView) return;

  const setView = (view) => {
    const isGrid = view === 'grid';
    gridView.classList.toggle('hidden', !isGrid);
    indexView.classList.toggle('hidden', isGrid);
    toggles.forEach((t) => t.classList.toggle('active', t.dataset.view === view));

    const url = new URL(window.location.href);
    if (isGrid) url.searchParams.delete('view');
    else url.searchParams.set('view', 'index');
    history.replaceState(null, '', url);

    if (window.updateNoResults) window.updateNoResults();
    hideIndexPreview();
  };

  toggles.forEach((t) => {
    t.addEventListener('click', () => setView(t.dataset.view));
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get('view') === 'index') setView('index');
}

// ── Index hover preview (single shared image) ──
const INDEX_PREVIEW_OFFSET_Y = 0;

function hideIndexPreview() {
  const preview = document.getElementById('indexPreview');
  if (!preview) return;
  preview.classList.remove('is-visible');
  document.querySelectorAll('.index-post.is-hovered').forEach((p) => {
    p.classList.remove('is-hovered');
  });
}

function initIndexPreview() {
  const preview = document.getElementById('indexPreview');
  const posts = document.querySelectorAll('.index-post');
  if (!preview || !posts.length) return;

  const positionPreview = (post) => {
    const line = post.querySelector('.index-post-line');
    const titleCell = post.querySelector('.index-post-title');
    if (!line || !titleCell) return;

    const bg = post.dataset.previewBg;
    if (bg) preview.style.backgroundImage = `url(${bg})`;

    const lineRect = line.getBoundingClientRect();
    const titleRect = titleCell.getBoundingClientRect();
    const textStartX = titleRect.left + (parseFloat(getComputedStyle(titleCell).paddingLeft) || 0);

    preview.style.top = `${lineRect.bottom + INDEX_PREVIEW_OFFSET_Y}px`;
    preview.style.left = `${textStartX}px`;
  };

  posts.forEach((post) => {
    post.addEventListener('mouseenter', () => {
      hideIndexPreview();
      post.classList.add('is-hovered');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          positionPreview(post);
          preview.classList.add('is-visible');
        });
      });
    });

    post.addEventListener('mouseleave', () => {
      post.classList.remove('is-hovered');
      preview.classList.remove('is-visible');
    });
  });

  document.getElementById('indexView')?.addEventListener('mouseleave', hideIndexPreview);
}

// ── Scroll reveal ──
function initReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -20px 0px' }
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

// ── Mobile menu ──
function initMobileMenu() {
  const btn = document.getElementById('moMenuBtn');
  const nav = document.getElementById('moNav');
  if (!btn || !nav) return;

  btn.addEventListener('click', () => nav.classList.toggle('open'));
  nav.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => nav.classList.remove('open'));
  });
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  initNavAccordion();
  initFilters();
  initViewToggle();
  initIndexPreview();
  initReveal();
  initMobileMenu();
});
