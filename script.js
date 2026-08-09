// Fixed site tree, hover thumbnails, editorial about interactions, and blur-up images

function initMobileMenu() {
  const btn = document.getElementById('moMenuBtn');
  const tree = document.getElementById('siteTree');
  const overlay = document.getElementById('moOverlay');
  if (!btn || !tree) return;

  const setOpen = (open) => {
    tree.classList.toggle('is-open', open);
    overlay?.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };

  btn.addEventListener('click', () => setOpen(!tree.classList.contains('is-open')));
  overlay?.addEventListener('click', () => setOpen(false));
  tree.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 991px)').matches) setOpen(false);
    });
  });
}

function initSiteTree() {
  document.querySelectorAll('[data-tree-branch]').forEach((branch) => {
    const toggle = branch.querySelector('.site-tree-toggle');
    const children = branch.querySelector('.site-tree-children');
    if (!toggle || !children) return;

    toggle.addEventListener('click', () => {
      const open = !branch.classList.contains('is-open');
      branch.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      children.hidden = !open;
    });
  });
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

  const fine = window.matchMedia('(pointer: fine) and (hover: hover)');
  if (!fine.matches) return;

  let visible = false;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let raf = 0;

  const hide = () => {
    visible = false;
    float.hidden = true;
    float.classList.remove('is-visible');
  };

  const tick = () => {
    currentX += (targetX - currentX) * 0.18;
    currentY += (targetY - currentY) * 0.18;
    float.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) scale(1)`;
    if (visible) raf = requestAnimationFrame(tick);
    else raf = 0;
  };

  const move = (event) => {
    if (!visible) return;
    const pad = 18;
    const w = float.offsetWidth || 220;
    const h = float.offsetHeight || 160;
    let x = event.clientX + 20;
    let y = event.clientY + 20;
    if (x + w + pad > window.innerWidth) x = event.clientX - w - 20;
    if (y + h + pad > window.innerHeight) y = event.clientY - h - 20;
    targetX = Math.max(8, x);
    targetY = Math.max(8, y);
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const showFrom = (img, event) => {
    if (!img || !img.getAttribute('src')) return;
    floatImg.classList.remove('is-loading', 'is-error');
    floatImg.classList.add('is-loaded');
    floatImg.src = img.currentSrc || img.src;
    float.hidden = false;
    float.classList.add('is-visible');
    visible = true;
    const pad = 18;
    const w = float.offsetWidth || 220;
    const h = float.offsetHeight || 160;
    let x = event.clientX + 20;
    let y = event.clientY + 20;
    if (x + w + pad > window.innerWidth) x = event.clientX - w - 20;
    if (y + h + pad > window.innerHeight) y = event.clientY - h - 20;
    targetX = currentX = Math.max(8, x);
    targetY = currentY = Math.max(8, y);
    float.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) scale(1)`;
    if (!raf) raf = requestAnimationFrame(tick);
  };

  document.querySelectorAll('.mg-row, .tree-row--l4, .map-node--leaf, .map-node--l4').forEach((row) => {
    const thumb = row.querySelector('.mg-row-thumb, .map-leaf-thumb');
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

function initOrganicProjectField() {
  const tree = document.getElementById('siteTree');
  const cards = [...document.querySelectorAll('.t-l4')];
  const fine = window.matchMedia('(pointer: fine) and (hover: hover)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!tree || !cards.length || !fine.matches || reduce.matches) return;

  let pointerX = 0;
  let pointerY = 0;
  let raf = 0;

  const render = () => {
    raf = 0;
    const radius = 280;

    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = centerX - pointerX;
      const deltaY = centerY - pointerY;
      const distance = Math.hypot(deltaX, deltaY);
      const influence = Math.max(0, 1 - distance / radius);

      if (!influence) {
        card.style.setProperty('--drift-x', '0px');
        card.style.setProperty('--drift-y', '0px');
        card.style.setProperty('--drift-r', '0deg');
        return;
      }

      const safeDistance = Math.max(distance, 1);
      const x = (deltaX / safeDistance) * influence * 11;
      const y = (deltaY / safeDistance) * influence * 8;
      const rotation = (deltaX / safeDistance) * influence * 1.4;

      card.style.setProperty('--drift-x', `${x.toFixed(2)}px`);
      card.style.setProperty('--drift-y', `${y.toFixed(2)}px`);
      card.style.setProperty('--drift-r', `${rotation.toFixed(2)}deg`);
    });
  };

  tree.addEventListener(
    'pointermove',
    (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!raf) raf = requestAnimationFrame(render);
    },
    { passive: true }
  );

  tree.addEventListener('pointerleave', () => {
    cards.forEach((card) => {
      card.style.setProperty('--drift-x', '0px');
      card.style.setProperty('--drift-y', '0px');
      card.style.setProperty('--drift-r', '0deg');
    });
  });
}

function initRelationCatalog() {
  const page = document.getElementById('catalogPage');
  const map = page?.querySelector('.catalog-map');
  const svg = document.getElementById('catalogConnections');
  const preview = document.getElementById('catalogPreview');
  const previewImage = document.getElementById('catalogPreviewImage');
  const previewTitle = document.getElementById('catalogPreviewTitle');
  const previewMeta = document.getElementById('catalogPreviewMeta');
  if (!page || !map || !svg || !preview || !previewImage || !previewTitle || !previewMeta) return;

  const points = [...page.querySelectorAll('.catalog-point')];
  const hubs = [...page.querySelectorAll('.catalog-skill')];
  const filters = [...page.querySelectorAll('[data-catalog-filter]')];
  let drawFrame = 0;
  let activePoint = null;

  const skillsOf = (element) => (element.dataset.skills || '').split(/\s+/).filter(Boolean);
  const centerInMap = (element, mapRect) => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left - mapRect.left + rect.width / 2,
      y: rect.top - mapRect.top + rect.height / 2,
    };
  };

  const drawConnections = () => {
    drawFrame = 0;
    const mapRect = map.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${mapRect.width} ${mapRect.height}`);
    svg.replaceChildren();

    hubs.forEach((hub) => {
      const skill = hub.dataset.skill;
      const related = points
        .filter((point) => !point.hidden && skillsOf(point).includes(skill))
        .sort((a, b) => Number(a.dataset.year || 9999) - Number(b.dataset.year || 9999));
      if (!related.length) return;

      const positions = [centerInMap(hub, mapRect), ...related.map((point) => centerInMap(point, mapRect))];
      let d = `M ${positions[0].x} ${positions[0].y}`;
      for (let index = 1; index < positions.length; index += 1) {
        const previous = positions[index - 1];
        const current = positions[index];
        const midX = (previous.x + current.x) / 2;
        d += ` C ${midX} ${previous.y}, ${midX} ${current.y}, ${current.x} ${current.y}`;
      }

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'catalog-connection');
      path.dataset.skill = skill;
      svg.appendChild(path);
    });
  };

  const scheduleConnections = () => {
    if (!drawFrame) drawFrame = requestAnimationFrame(drawConnections);
  };

  const highlightSkills = (skills) => {
    const active = new Set(skills);
    map.classList.toggle('is-inspecting', active.size > 0);
    map.querySelectorAll('.catalog-connection').forEach((path) => {
      path.classList.toggle('is-highlighted', active.has(path.dataset.skill));
    });
    hubs.forEach((hub) => hub.classList.toggle('is-related', active.has(hub.dataset.skill)));
    points.forEach((point) => {
      point.classList.toggle('is-related', skillsOf(point).some((skill) => active.has(skill)));
    });
  };

  const clearHighlight = () => {
    map.classList.remove('is-inspecting');
    map.querySelectorAll('.is-highlighted, .is-related').forEach((element) => {
      element.classList.remove('is-highlighted', 'is-related');
    });
  };

  const movePreview = (event) => {
    const width = preview.offsetWidth || 300;
    const height = preview.offsetHeight || 240;
    let x = event.clientX + 18;
    let y = event.clientY + 18;
    if (x + width + 16 > window.innerWidth) x = event.clientX - width - 18;
    if (y + height + 16 > window.innerHeight) y = event.clientY - height - 18;
    preview.classList.add('is-following');
    preview.style.transform = `translate3d(${Math.max(10, x)}px, ${Math.max(10, y)}px, 0)`;
  };

  const showPreview = (point, event) => {
    activePoint = point;
    previewImage.src = point.dataset.image || '';
    previewTitle.textContent = point.dataset.title || '';
    previewMeta.textContent = point.dataset.meta || '';
    preview.classList.add('is-visible');
    movePreview(event);
    highlightSkills(skillsOf(point));
  };

  const hidePreview = () => {
    activePoint = null;
    preview.classList.remove('is-visible', 'is-following');
    preview.style.transform = '';
    clearHighlight();
  };

  const applyFilter = (filter) => {
    filters.forEach((button) => {
      const active = button.dataset.catalogFilter === filter;
      button.classList.toggle('is-active', active);
      button.textContent = button.textContent.replace(/^\[[● ]\]/, active ? '[●]' : '[ ]');
    });

    points.forEach((point) => {
      point.hidden = filter !== 'all' && point.dataset.kind !== filter;
    });

    hidePreview();
    scheduleConnections();
    history.replaceState(null, '', filter === 'lab' ? '#lab' : filter === 'work' ? '#works' : location.pathname);
  };

  points.forEach((point) => {
    point.addEventListener('pointerenter', (event) => showPreview(point, event));
    point.addEventListener('pointermove', movePreview, { passive: true });
    point.addEventListener('pointerleave', hidePreview);
    point.addEventListener('focus', () => {
      const rect = point.getBoundingClientRect();
      showPreview(point, { clientX: rect.right, clientY: rect.top });
    });
    point.addEventListener('blur', hidePreview);
  });
  map.addEventListener('mouseover', (event) => {
    const point = event.target.closest('.catalog-point');
    if (point && point !== activePoint) showPreview(point, event);
  });
  map.addEventListener(
    'mousemove',
    (event) => {
      let point = event.target.closest('.catalog-point');

      if (!point) {
        let nearest = null;
        let nearestDistance = 56;
        points.forEach((candidate) => {
          if (candidate.hidden) return;
          const rect = candidate.getBoundingClientRect();
          const dx = Math.max(rect.left - event.clientX, 0, event.clientX - rect.right);
          const dy = Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom);
          const distance = Math.hypot(dx, dy);
          if (distance < nearestDistance) {
            nearest = candidate;
            nearestDistance = distance;
          }
        });
        point = nearest;
      }

      if (point !== activePoint) {
        if (point) showPreview(point, event);
        else if (activePoint) hidePreview();
      } else if (point) {
        movePreview(event);
      }
    },
    { passive: true }
  );
  map.addEventListener('mouseout', (event) => {
    const point = event.target.closest('.catalog-point');
    if (point && !point.contains(event.relatedTarget)) hidePreview();
  });
  map.addEventListener('mouseleave', hidePreview);
  hubs.forEach((hub) => {
    hub.addEventListener('pointerenter', () => highlightSkills([hub.dataset.skill]));
    hub.addEventListener('pointerleave', clearHighlight);
    hub.addEventListener('focus', () => highlightSkills([hub.dataset.skill]));
    hub.addEventListener('blur', clearHighlight);
  });
  filters.forEach((button) => {
    button.addEventListener('click', () => applyFilter(button.dataset.catalogFilter || 'all'));
  });

  const initialFilter = location.hash === '#lab' ? 'lab' : location.hash === '#works' ? 'work' : 'all';
  applyFilter(initialFilter);
  new ResizeObserver(scheduleConnections).observe(map);
  window.addEventListener('load', scheduleConnections, { once: true });
}

function initAboutInteraction() {
  const media = document.querySelector('[data-about-media]');
  const shell = media?.querySelector('.about-image-shell');
  if (!shell || !window.matchMedia('(pointer: fine) and (hover: hover)').matches) return;

  const update = (event) => {
    const rect = shell.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));

    shell.style.setProperty('--image-x', `${42 + x * 16}%`);
    shell.style.setProperty('--image-y', `${42 + y * 16}%`);
    shell.style.setProperty('--reticle-x', `${x * 100}%`);
    shell.style.setProperty('--reticle-y', `${y * 100}%`);
  };

  shell.addEventListener('pointerenter', (event) => {
    shell.classList.add('is-pointing');
    update(event);
  });
  shell.addEventListener('pointermove', update, { passive: true });
  shell.addEventListener('pointerleave', () => {
    shell.classList.remove('is-pointing');
    shell.style.setProperty('--image-x', '50%');
    shell.style.setProperty('--image-y', '50%');
  });
}

function initReveal() {
  const nodes = [...document.querySelectorAll('.reveal')];
  if (!nodes.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) {
    nodes.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    },
    { root: document.querySelector('.mg-main.page-right') || null, threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );

  nodes.forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i * 60, 240)}ms`;
    io.observe(el);
  });
}

function initMagdaIndex() {
  // Right pane owns scrolling (like Magda detail). Reset to top on load.
  const main = document.querySelector('.mg-main.page-right');
  if (main) main.scrollTop = 0;
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

function initNodeCursor() {
  const fine = window.matchMedia('(pointer: fine) and (hover: hover)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!fine.matches || reduce.matches) return;

  const el = document.createElement('div');
  el.className = 'mg-cursor';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  document.body.classList.add('has-mg-cursor');

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let visible = false;
  let raf = 0;

  const tick = () => {
    currentX += (targetX - currentX) * 0.22;
    currentY += (targetY - currentY) * 0.22;
    el.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
    raf = requestAnimationFrame(tick);
  };

  const onMove = (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
    if (!visible) {
      visible = true;
      currentX = targetX;
      currentY = targetY;
      el.classList.add('is-on');
      if (!raf) raf = requestAnimationFrame(tick);
    }
  };

  const interactive =
    'a, button, .mg-row, .t-item, .tree-row, .map-node, .map-node--leaf, .map-node--l4, .map-strip-item, .lab-post-trigger, .lang-switch-link, .mg-back, .site-tree-toggle, summary, [role="button"]';

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

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initSiteTree();
  initBlurUp();
  initMagdaIndex();
  initThumbFloat();
  initOrganicProjectField();
  initRelationCatalog();
  initAboutInteraction();
  initReveal();
  initLabLightbox();
  initNodeCursor();
});
