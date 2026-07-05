// ── Filter functionality (인터랙티브 / 프로젝션) ──
function initFilters(container) {
  const checkItems = document.querySelectorAll('.filter-checks li, .mo-filter');
  const items = container.querySelectorAll('[data-year]');
  const noResults = document.querySelector('.no-results');

  if (!checkItems.length) return;

  function getActiveChecks() {
    const active = [];
    checkItems.forEach((el) => {
      if (el.classList.contains('checked')) active.push(el.dataset.value);
    });
    return active;
  }

  function syncChecks(value, checked) {
    checkItems.forEach((el) => {
      if (el.dataset.value === value) el.classList.toggle('checked', checked);
    });
  }

  function filter() {
    const checks = getActiveChecks();
    let visible = 0;

    items.forEach((item) => {
      const itemTags = (item.dataset.tags || '').split(',');
      const tagMatch = checks.length === 0 || checks.some((c) => itemTags.includes(c));
      item.classList.toggle('hidden', !tagMatch);
      if (tagMatch) visible++;
    });

    if (noResults) noResults.classList.toggle('show', visible === 0);
  }

  checkItems.forEach((el) => {
    el.addEventListener('click', () => {
      const willCheck = !el.classList.contains('checked');
      syncChecks(el.dataset.value, willCheck);
      filter();
    });
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
  if (!btn || !nav) return;

  btn.addEventListener('click', () => nav.classList.toggle('open'));
  nav.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => nav.classList.remove('open'));
  });
}

// ── Project page: left text scroll, then page scrolls images ──
function initProjectScroll() {
  const postText = document.querySelector('.post-text');
  const postImgBox = document.querySelector('.post-img-box');
  if (!postText || !postImgBox) return;

  const minPageHeight = () => {
    const imgHeight = postImgBox.offsetHeight + 100;
    const textHeight = postText.scrollHeight;
    document.body.style.minHeight = `${Math.max(imgHeight + 100, textHeight + 200)}px`;
  };

  minPageHeight();
  window.addEventListener('resize', minPageHeight);

  window.addEventListener('wheel', (e) => {
    if (window.innerWidth <= 1100) return;

    const textAtBottom = postText.scrollTop + postText.clientHeight >= postText.scrollHeight - 2;
    const textAtTop = postText.scrollTop <= 0;
    const pageAtTop = window.scrollY <= 0;

    if (e.deltaY > 0 && !textAtBottom) {
      e.preventDefault();
      postText.scrollTop += e.deltaY;
    } else if (e.deltaY < 0 && !pageAtTop) {
      return;
    } else if (e.deltaY < 0 && pageAtTop && !textAtTop) {
      e.preventDefault();
      postText.scrollTop += e.deltaY;
    }
  }, { passive: false });
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  const indexBox = document.querySelector('.index-post-box');
  const imgBox = document.querySelector('.img-post-box');

  if (indexBox) initFilters(indexBox);
  if (imgBox) initFilters(imgBox);

  initReveal();
  initMobileMenu();
  initProjectScroll();
});
