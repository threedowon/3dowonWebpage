// ── Language: browser-based first-visit redirect + persistence ──
(function initLangRedirect() {
  var STORAGE_KEY = 'lang-pref';
  try {
    var switchLinks = document.querySelectorAll('.lang-switch-link[data-lang]');
    switchLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        try {
          localStorage.setItem(STORAGE_KEY, link.dataset.lang);
        } catch (e) {}
      });
    });

    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return;

    var browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    var preferKo = browserLang.indexOf('ko') === 0;
    var currentLang = document.documentElement.lang === 'ko' ? 'ko' : 'en';
    localStorage.setItem(STORAGE_KEY, preferKo ? 'ko' : 'en');

    if ((preferKo && currentLang === 'en') || (!preferKo && currentLang === 'ko')) {
      var target = preferKo ? 'ko' : 'en';
      var targetLink = document.querySelector('.lang-switch-link[data-lang="' + target + '"]');
      if (targetLink) {
        window.location.replace(targetLink.getAttribute('href'));
      }
    }
  } catch (e) {}
})();

// ── Filter functionality (유형 + 기술) ──
function initFilters() {
  if (document.querySelector('.post-projects')) return;

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
    const typeChecks = getActiveChecks('type');
    const techChecks = getActiveChecks('tech');

    containers.forEach((container) => {
      container.querySelectorAll('[data-type]').forEach((item) => {
        const typeMatch = itemMatchesType(item, typeChecks);
        const techMatch = itemMatchesTech(item, techChecks);
        item.classList.toggle('hidden', !(typeMatch && techMatch));
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
    activeContainer.querySelectorAll('[data-type]').forEach((item) => {
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
      if (window.updateFilterDropdownLabels) window.updateFilterDropdownLabels();
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
    if (window.matchMedia('(min-width: 769px)').matches) return;

    e.preventDefault();
    accordion.classList.toggle('is-open');
  });

  document.querySelectorAll('.nav-lab, .nav-about, .nav-cv, .nav-contact').forEach((link) => {
    link.addEventListener('click', () => {
      accordion.classList.remove('is-open');
    });
  });
}

// ── Filter dropdowns (type / tech) ──
function initFilterDropdowns() {
  const buttons = document.querySelectorAll('.filter-dropdown-btn[data-filter-group]');
  if (!buttons.length) return;

  const groups = [...buttons].map((btn) => ({
    btn,
    label: btn.querySelector('.filter-dropdown-label'),
    panel: document.querySelector(`.filter-checks[data-filter-panel="${btn.dataset.filterGroup}"]`),
  })).filter((g) => g.panel && g.label);

  function updateLabel({ btn, label, panel }) {
    const checked = [...panel.querySelectorAll('li.checked')];
    if (checked.length === 0) {
      label.textContent = btn.dataset.defaultLabel;
    } else if (checked.length <= 2) {
      label.textContent = checked.map((li) => li.textContent).join(', ');
    } else {
      label.textContent = btn.dataset.mixedLabel;
    }
  }

  window.updateFilterDropdownLabels = () => groups.forEach(updateLabel);

  groups.forEach((group) => {
    const { btn, panel } = group;
    btn.addEventListener('click', () => {
      const willOpen = !panel.classList.contains('is-open');
      panel.classList.toggle('is-open', willOpen);
      btn.classList.toggle('is-active', willOpen);
    });
    updateLabel(group);
  });
}

// ── Grid / Index view toggle ──
function initViewToggle() {
  if (document.querySelector('.post-projects')) return;

  const toggles = document.querySelectorAll('.view-toggle > li');
  const gridView = document.getElementById('gridView');
  const indexView = document.getElementById('indexView');
  if (!toggles.length || !gridView || !indexView) return;

  const isMobile = window.matchMedia('(max-width: 768px)').matches;

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

  if (isMobile) {
    setView('grid');
    return;
  }

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

    // Matches the CSS (width: min(31.5vw, 375px); aspect-ratio: 16/9) so we
    // can tell whether the preview would overflow the viewport bottom before
    // it's actually laid out (it's display:none until shown).
    const previewWidth = Math.min(window.innerWidth * 0.315, 375);
    const previewHeight = (previewWidth * 9) / 16;
    const spaceBelow = window.innerHeight - lineRect.bottom;

    if (spaceBelow < previewHeight) {
      preview.style.top = `${lineRect.bottom - previewHeight}px`;
    } else {
      preview.style.top = `${lineRect.bottom + INDEX_PREVIEW_OFFSET_Y}px`;
    }
    const titleRect = titleCell.getBoundingClientRect();
    preview.style.left = `${titleRect.right - previewWidth}px`;
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

// ── Lab image lightbox ──
function initLabLightbox() {
  const lightbox = document.getElementById('labLightbox');
  const lightboxImg = document.getElementById('labLightboxImg');
  const posts = document.querySelectorAll('.lab-post[data-lab-image]');
  if (!lightbox || !lightboxImg || !posts.length) return;

  const open = (src) => {
    lightboxImg.src = src;
    lightbox.classList.add('is-open');
  };

  const close = () => {
    lightbox.classList.remove('is-open');
    lightboxImg.src = '';
  };

  posts.forEach((post) => {
    post.addEventListener('click', () => open(post.dataset.labImage));
  });

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
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
  const overlay = document.getElementById('moOverlay');
  const closeBtn = document.getElementById('moNavClose');
  if (!btn || !nav) return;

  const openMenu = () => {
    nav.classList.add('open');
    document.body.classList.add('mo-menu-open');
    nav.setAttribute('aria-hidden', 'false');
  };

  const closeMenu = () => {
    nav.classList.remove('open');
    document.body.classList.remove('mo-menu-open');
    nav.setAttribute('aria-hidden', 'true');
  };

  const setActiveNavLink = () => {
    const current = window.location.pathname.split('/').pop() || 'index.html';
    nav.querySelectorAll('.mo-nav-links a').forEach((a) => {
      const href = a.getAttribute('href')?.split('/').pop();
      const isIndex = (current === '' || current === 'index.html') && href === 'index.html';
      a.classList.toggle('active', isIndex || href === current);
    });
  };

  setActiveNavLink();

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (nav.classList.contains('open')) closeMenu();
    else openMenu();
  });

  closeBtn?.addEventListener('click', closeMenu);
  overlay?.addEventListener('click', closeMenu);

  nav.querySelectorAll('.mo-nav-links a').forEach((a) => {
    a.addEventListener('click', closeMenu);
  });
}

// ── CV comma wrap (mobile) ──
function initCvCommaWrap() {
  const descs = [...document.querySelectorAll('.cv-desc')];
  if (!descs.length) return;

  descs.forEach((el) => {
    if (!el.dataset.cvOriginal) el.dataset.cvOriginal = el.innerHTML;
  });

  const isTooWide = (el, html) => {
    const prevHtml = el.innerHTML;
    el.innerHTML = html;
    const tooWide = el.scrollWidth > el.clientWidth;
    el.innerHTML = prevHtml;
    return tooWide;
  };

  const commaCount = (html) => {
    let depth = 0;
    let count = 0;
    for (let i = 0; i < html.length; i++) {
      if (html[i] === '<') depth++;
      else if (html[i] === '>') depth--;
      else if (html[i] === ',' && depth === 0) count++;
    }
    return count;
  };

  const insertBreakAtCommaFromEnd = (html, fromEnd) => {
    const positions = [];
    let depth = 0;
    for (let i = 0; i < html.length; i++) {
      if (html[i] === '<') depth++;
      else if (html[i] === '>') depth--;
      else if (html[i] === ',' && depth === 0) positions.push(i);
    }
    if (positions.length < fromEnd) return html;
    const idx = positions[positions.length - fromEnd];
    return html.slice(0, idx + 1) + '<br>' + html.slice(idx + 1).replace(/^\s+/, '');
  };

  const wrapOverflowingDesc = (el, original) => {
    const commas = commaCount(original);
    if (commas === 0) return original;

    const breakAt = commas >= 3 ? 2 : 1;
    const wrapped = insertBreakAtCommaFromEnd(original, breakAt);
    if (wrapped === original) return original;

    el.innerHTML = wrapped;
    if (!isTooWide(el, wrapped)) return wrapped;

    el.innerHTML = original;
    if (breakAt === 2 && commas > 1) {
      const fallback = insertBreakAtCommaFromEnd(original, 1);
      el.innerHTML = fallback;
      return fallback;
    }
    return original;
  };

  const apply = () => {
    descs.forEach((el) => {
      const original = el.dataset.cvOriginal;
      el.innerHTML = original;

      if (!original.includes(',')) return;
      if (!isTooWide(el, original)) return;

      wrapOverflowingDesc(el, original);
    });
  };

  apply();
  window.addEventListener('resize', apply);
}

// ── Header height sync (mobile subheader + desktop top bar) ──
function initMobileHeaderHeight() {
  const mq = window.matchMedia('(max-width: 768px)');

  const sync = () => {
    const header = document.querySelector('.site-header');
    if (!header) return;

    const height = header.getBoundingClientRect().height;

    if (mq.matches) {
      document.documentElement.style.setProperty('--mobile-subheader-h', `${height}px`);
      document.documentElement.style.removeProperty('--desktop-header-h');
      return;
    }

    document.documentElement.style.setProperty('--desktop-header-h', `${height}px`);
    document.documentElement.style.setProperty('--logo-bar-h', `${height}px`);
    document.documentElement.style.removeProperty('--mobile-subheader-h');
  };

  window.addEventListener('resize', sync);
  window.addEventListener('orientationchange', sync);
  if (document.fonts?.ready) document.fonts.ready.then(sync);
  sync();
  requestAnimationFrame(sync);
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  initNavAccordion();
  initFilters();
  initFilterDropdowns();
  initViewToggle();
  initIndexPreview();
  initLabLightbox();
  initReveal();
  initMobileMenu();
  initMobileHeaderHeight();
  initCvCommaWrap();
});
