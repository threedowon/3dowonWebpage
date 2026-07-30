// Magda-style: home map, works index, hover thumbs, blur-up images

function initMobileMenu() {
  const btn = document.getElementById('moMenuBtn');
  const nav = document.getElementById('moNav');
  const overlay = document.getElementById('moOverlay');
  const close = document.getElementById('moNavClose');
  if (!btn || !nav) return;

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    overlay?.classList.toggle('is-open', open);
    nav.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.style.overflow = open ? 'hidden' : '';
  };

  btn.addEventListener('click', () => setOpen(true));
  close?.addEventListener('click', () => setOpen(false));
  overlay?.addEventListener('click', () => setOpen(false));
}

function markImageLoaded(img) {
  img.classList.remove('is-loading');
  img.classList.add('is-loaded');
}

function initBlurUp(root = document) {
  root.querySelectorAll('img.img-blur').forEach((img) => {
    // Tiny UI thumbs should never stay soft-focus
    if (img.classList.contains('mg-row-thumb') || img.closest('.map-strip-item') || img.id === 'mgThumbFloatImg') {
      img.classList.remove('is-loading');
      img.classList.add('is-loaded');
      return;
    }

    if (img.dataset.blurBound === '1') return;
    img.dataset.blurBound = '1';
    img.classList.add('is-loading');

    const done = () => markImageLoaded(img);
    const fail = () => {
      img.classList.remove('is-loading');
      img.classList.add('is-error', 'is-loaded');
    };

    if (img.complete) {
      if (img.naturalWidth > 0) done();
      else fail();
      return;
    }

    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', fail, { once: true });
    // Safety: never leave images permanently blurred
    window.setTimeout(() => {
      if (!img.classList.contains('is-loaded')) done();
    }, 2500);
  });

  root.querySelectorAll('.img-blur-bg').forEach((el) => {
    if (el.dataset.blurBound === '1') return;
    el.dataset.blurBound = '1';
    el.classList.add('is-loading');
    const bg = getComputedStyle(el).backgroundImage;
    const match = bg && bg.match(/url\(["']?(.*?)["']?\)/);
    if (!match || !match[1]) {
      el.classList.remove('is-loading');
      el.classList.add('is-loaded');
      return;
    }
    const probe = new Image();
    probe.onload = () => {
      el.classList.remove('is-loading');
      el.classList.add('is-loaded');
    };
    probe.onerror = () => {
      el.classList.remove('is-loading');
      el.classList.add('is-error', 'is-loaded');
    };
    probe.src = match[1];
  });
}

function initThumbFloat() {
  const float = document.getElementById('mgThumbFloat');
  const floatImg = document.getElementById('mgThumbFloatImg');
  if (!float || !floatImg) return;

  const hide = () => {
    float.hidden = true;
    float.classList.remove('is-visible');
  };

  const showFrom = (img, event) => {
    if (!img || !img.getAttribute('src')) return;
    floatImg.classList.remove('is-loading', 'is-error');
    floatImg.classList.add('is-loaded');
    floatImg.src = img.currentSrc || img.src;
    float.hidden = false;
    float.classList.add('is-visible');
    move(event);
  };

  const move = (event) => {
    if (float.hidden) return;
    const pad = 18;
    const w = float.offsetWidth || 220;
    const h = float.offsetHeight || 160;
    let x = event.clientX + 18;
    let y = event.clientY + 18;
    if (x + w + pad > window.innerWidth) x = event.clientX - w - 18;
    if (y + h + pad > window.innerHeight) y = event.clientY - h - 18;
    float.style.transform = `translate(${Math.max(8, x)}px, ${Math.max(8, y)}px)`;
  };

  document.querySelectorAll('.mg-row').forEach((row) => {
    const thumb = row.querySelector('.mg-row-thumb');
    if (!thumb) return;
    row.addEventListener('mouseenter', (e) => showFrom(thumb, e));
    row.addEventListener('mousemove', move);
    row.addEventListener('mouseleave', hide);
  });

  document.querySelectorAll('.map-strip-item').forEach((item) => {
    const thumb = item.querySelector('img');
    if (!thumb) return;
    item.addEventListener('mouseenter', (e) => showFrom(thumb, e));
    item.addEventListener('mousemove', move);
    item.addEventListener('mouseleave', hide);
  });
}

function initMagdaIndex() {
  const stage = document.getElementById('mgStage');
  if (!stage) return;

  const rows = [...stage.querySelectorAll('.mg-row[data-slug]')];
  const panels = [...stage.querySelectorAll('.mg-detail-panel[data-slug]')];
  const empty = stage.querySelector('.mg-detail-empty');
  if (!rows.length || !panels.length) return;

  const setActive = (slug, { pushHash = true } = {}) => {
    if (!slug) return;
    const panel = panels.find((p) => p.dataset.slug === slug);
    if (!panel) return;

    rows.forEach((row) => row.classList.toggle('is-active', row.dataset.slug === slug));
    panels.forEach((p) => p.classList.toggle('is-active', p.dataset.slug === slug));
    empty?.classList.add('hidden');
    stage.dataset.active = slug;

    if (pushHash) {
      const next = `#${slug}`;
      if (location.hash !== next) history.replaceState(null, '', next);
    }

    if (window.matchMedia('(max-width: 900px)').matches) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  rows.forEach((row) => {
    row.addEventListener('click', (e) => {
      e.preventDefault();
      setActive(row.dataset.slug);
    });
  });

  const fromHash = () => {
    const raw = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    if (!raw) {
      const first = stage.dataset.active || rows[0]?.dataset.slug;
      if (first) setActive(first, { pushHash: false });
      return;
    }

    if (panels.some((p) => p.dataset.slug === raw)) {
      setActive(raw, { pushHash: false });
      return;
    }

    const branch = document.getElementById(raw);
    if (branch) {
      branch.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const firstInBranch = branch.querySelector('.mg-row[data-slug]');
      if (firstInBranch) setActive(firstInBranch.dataset.slug, { pushHash: false });
      return;
    }

    const first = stage.dataset.active || rows[0]?.dataset.slug;
    if (first) setActive(first, { pushHash: false });
  };

  window.addEventListener('hashchange', fromHash);
  fromHash();
}

function initLabLightbox() {
  const lightbox = document.getElementById('labLightbox');
  const img = document.getElementById('labLightboxImg');
  if (!lightbox || !img) return;

  document.querySelectorAll('.lab-post').forEach((post) => {
    const trigger = post.querySelector('.lab-post-trigger');
    const video = post.querySelector('.lab-post-video');
    if (!trigger) return;

    trigger.addEventListener('click', () => {
      if (video) {
        video.hidden = false;
        video.play?.();
        return;
      }
      const src = post.dataset.labImage;
      if (!src) return;
      img.classList.add('img-blur', 'is-loading');
      img.classList.remove('is-loaded');
      img.dataset.blurBound = '0';
      img.src = src;
      initBlurUp(lightbox);
      lightbox.hidden = false;
    });
  });

  lightbox.addEventListener('click', () => {
    lightbox.hidden = true;
    img.removeAttribute('src');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initBlurUp();
  initMagdaIndex();
  initThumbFloat();
  initLabLightbox();
  initNodeCursor();
});

function initNodeCursor() {
  const fine = window.matchMedia('(pointer: fine) and (hover: hover)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!fine.matches || reduce.matches) return;

  const el = document.createElement('div');
  el.className = 'mg-cursor';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  document.body.classList.add('has-mg-cursor');

  let x = 0;
  let y = 0;
  let visible = false;

  const place = () => {
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const onMove = (e) => {
    x = e.clientX;
    y = e.clientY;
    if (!visible) {
      visible = true;
      el.classList.add('is-on');
    }
    place();
  };

  const interactive = 'a, button, .mg-row, .map-node, .map-strip-item, .lab-post-trigger, .lang-switch-link, .mg-back, summary, [role="button"]';

  document.addEventListener('mousemove', onMove, { passive: true });
  document.addEventListener('mouseenter', onMove, { passive: true });

  document.addEventListener(
    'mouseover',
    (e) => {
      const target = e.target.closest(interactive);
      el.classList.toggle('is-hover', Boolean(target));
    },
    { passive: true }
  );

  document.addEventListener('mousedown', () => el.classList.add('is-click'));
  document.addEventListener('mouseup', () => el.classList.remove('is-click'));
  document.addEventListener('mouseleave', () => {
    visible = false;
    el.classList.remove('is-on', 'is-hover', 'is-click');
  });
}
