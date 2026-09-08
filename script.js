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

function initPracticeGrid() {
  const sheet = document.querySelector('[data-practice-grid]');
  const dataEl = document.getElementById('practiceGridData');
  const indexEl = document.getElementById('index');
  const tagline = document.getElementById('tagline');
  const hint = document.getElementById('hint');
  const detail = document.getElementById('detail');
  const head = document.getElementById('head');
  const peek = document.getElementById('peek');
  const peekFrame = document.getElementById('peekFrame');
  if (!sheet || !dataEl || !indexEl || !tagline || !detail || !head || !peek || !peekFrame) return;

  let payload;
  try {
    payload = JSON.parse(dataEl.textContent || '{}');
  } catch {
    return;
  }

  const CELL = 20;
  const MARGIN_C = 7;
  const HEAD_C = 5;
  const PAD_R = 3;
  const PAD_B = 3;
  const COL = { space: '#4A7C59', object: '#B0603C', screen: '#3E7B95' };
  const FORMV = {
    space: 0.1,
    'space-object': 0.3,
    object: 0.5,
    'object-screen': 0.7,
    screen: 0.92,
  };
  const bucket = (f) => (f < 0.36 ? 'space' : f < 0.72 ? 'object' : 'screen');
  const bucketName = (b) =>
    b === 'space'
      ? 'Space / installation'
      : b === 'object'
        ? 'Object / physical system'
        : 'Screen / real-time image';

  const parseT = (v, end) => {
    if (v == null || v === '') return null;
    const m = String(v)
      .trim()
      .match(/^(\d{4})(?:\s*Q([1-4]))?$/i);
    if (!m) return null;
    const y = +m[1];
    if (m[2]) return y + (+m[2] - 1) / 4 + (end ? 0.25 : 0);
    return end ? y + 1 : y;
  };

  const items = (payload.works || [])
    .filter((w) => w.id && w.t)
    .map((w) => {
      let s = parseT(w.s, false);
      if (s === null) s = 2024;
      let e = parseT(w.e, true);
      if (e === null || e <= s) e = s + 0.5;
      const f = typeof w.form === 'number' ? w.form : FORMV[w.form] !== undefined ? FORMV[w.form] : 0.5;
      return {
        id: w.id,
        t: w.t,
        s,
        e,
        year: Math.floor(s),
        date: w.date || `${Math.floor(s)}.01`,
        form: f,
        bucket: bucket(f),
        kind: w.kind === 'professional' ? 'professional' : 'work',
        tags: (w.tags || []).slice(),
        imgs: (w.images && w.images.length ? w.images : w.img ? [w.img] : []).slice(0, 6),
        note: w.note || '',
        vimeo: w.vimeo || '',
      };
    });

  const byId = {};
  items.forEach((i) => {
    byId[i.id] = i;
  });

  (payload.labs || [])
    .filter((l) => l.id && l.t)
    .forEach((l) => {
      let s = parseT(l.y, false);
      if (s === null) s = 2024;
      const p = l.of ? byId[l.of] : null;
      const f =
        typeof l.form === 'number'
          ? l.form
          : FORMV[l.form] !== undefined
            ? FORMV[l.form]
            : p
              ? p.form
              : 0.5;
      const item = {
        id: l.id,
        t: l.t,
        s,
        e: s + 0.25,
        year: Math.floor(s),
        date: l.date || `${Math.floor(s)}.01`,
        form: f,
        bucket: bucket(f),
        kind: 'lab',
        of: l.of || null,
        tags: (l.tags || []).slice(),
        imgs: (l.images && l.images.length ? l.images : l.img ? [l.img] : []).slice(0, 6),
        note: l.note || (p ? `${p.t}` : ''),
      };
      items.push(item);
      byId[item.id] = item;
    });

  (payload.pages || [])
    .filter((p) => p.id && p.t)
    .forEach((p) => {
      const item = {
        id: p.id,
        t: p.t,
        label: p.label || '',
        s: 9999,
        e: 9999,
        year: 9999,
        date: p.date || '9999.12',
        form: 0.1,
        bucket: 'space',
        kind: 'page',
        page: p.page || '',
        tags: [],
        imgs: (p.images && p.images.length ? p.images : p.img ? [p.img] : []).slice(0, 1),
        note: p.note || '',
      };
      items.push(item);
      byId[item.id] = item;
    });

  const brandChars = (payload.brand && payload.brand.length
    ? payload.brand
    : '3Dowon'.split('').map((ch, index) => ({ id: `BRAND_${index}`, t: ch, kind: 'brand' }))
  ).filter((b) => b.id && b.t);
  brandChars.forEach((b) => {
    const item = {
      id: b.id,
      t: String(b.t).slice(0, 1),
      s: 10000,
      e: 10000,
      year: 10000,
      date: '10000.01',
      form: 0.1,
      bucket: 'space',
      kind: 'brand',
      tags: [],
      imgs: [],
      note: '',
    };
    items.push(item);
    byId[item.id] = item;
  });

  if (!items.length) return;

  let openId = null;
  const cellEls = {};
  let bounds = null;
  const aboutData = payload.about || null;
  const cvData = payload.cv || null;
  const homeHref = (payload.copy && payload.copy.home) || 'works.html';

  const C = (n) => n * CELL;

  const place = () => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const cols = Math.floor(W / CELL);
    const rows = Math.floor(H / CELL);

    const x0 = MARGIN_C + 2;
    const x1 = cols - PAD_R;
    const y0 = HEAD_C + 3;
    const y1 = rows - PAD_B;

    const brand = items.filter((it) => it.kind === 'brand');
    const pages = items.filter((it) => it.kind === 'page');
    const dateKey = (it) => {
      const raw = String(it.date || `${Math.floor(it.s)}.01`);
      const m = raw.match(/^(\d{4})\D+(\d{1,2})$/);
      if (m) return Number(m[1]) * 100 + Number(m[2]);
      return Math.floor(it.s) * 100;
    };
    // Left rail: two columns — works | labs (newest first)
    const sortByDate = (a, b) => dateKey(b) - dateKey(a) || a.id.localeCompare(b.id);
    const workRail = items
      .filter((it) => it.kind === 'work' || it.kind === 'professional')
      .sort(sortByDate);
    const labRail = items.filter((it) => it.kind === 'lab').sort(sortByDate);
    const leftCols = (workRail.length ? 1 : 0) + (labRail.length ? 1 : 0) || 1;
    const detailX0 = x0 + leftCols + 2;

    // Top row: 3Dowon letters, then About image, then CV cell
    const brandY = HEAD_C - 3;
    brand.forEach((it, i) => {
      it._c = { cx: x0 + i, cy: brandY, cw: 1, ch: 1 };
    });
    const pageOrder = ['about', 'cv'];
    pages
      .slice()
      .sort((a, b) => pageOrder.indexOf(a.page) - pageOrder.indexOf(b.page))
      .forEach((it, i) => {
        it._c = { cx: x0 + brand.length + 1 + i, cy: brandY, cw: 1, ch: 1 };
      });

    const headX = x0 + brand.length + 1 + pages.length + 1;
    head.style.left = `${C(headX)}px`;
    head.style.top = `${C(brandY)}px`;
    if (hint) {
      hint.style.left = `${C(x0)}px`;
      hint.style.top = `${C(y1)}px`;
    }

    const placeRailCol = (list, col) => {
      list.forEach((it, row) => {
        const cy = Math.min(y1 - 1, y0 + row);
        it._c = { cx: x0 + col, cy, cw: 1, ch: 1 };
      });
    };
    let col = 0;
    if (workRail.length) placeRailCol(workRail, col++);
    if (labRail.length) placeRailCol(labRail, col);

    items.forEach((it) => {
      const el = cellEls[it.id];
      if (!el || !it._c) return;
      const c = it._c;
      el.style.left = `${C(c.cx)}px`;
      el.style.top = `${C(c.cy)}px`;
      el.style.width = `${C(c.cw)}px`;
      el.style.height = `${C(c.ch)}px`;
      paintThumb(it);
    });

    bounds = { x0, x1, y0, y1, cols, rows, detailX0, leftCols };
  };

  const paintThumb = (it) => {
    const el = cellEls[it.id];
    if (!el) return;
    const src = it.imgs[0];
    if (src) {
      el.style.backgroundImage = `url("${src}")`;
      el.classList.add('has-thumb');
    } else {
      el.style.backgroundImage = '';
      el.classList.remove('has-thumb');
    }
  };

  const unhoverSilent = (id) => {
    const el = cellEls[id];
    const it = byId[id];
    const c = it._c;
    if (!el || !c) return;
    el.classList.remove('is-hot');
    paintThumb(it);
    el.style.left = `${C(c.cx)}px`;
    el.style.top = `${C(c.cy)}px`;
    el.style.width = `${C(c.cw)}px`;
    el.style.height = `${C(c.ch)}px`;
  };

  const hidePeek = () => {
    peek.classList.remove('on');
    peekFrame.style.backgroundImage = '';
  };

  const showPeek = (it, c) => {
    if (!bounds) return;
    if (it.kind === 'page' && it.page === 'about') {
      hidePeek();
      return;
    }
    const src = it.imgs[0];
    if (!src) {
      hidePeek();
      return;
    }

    const availLeft = Math.max(6, bounds.x0 - 1);
    const PEEK_W = Math.min(12, availLeft);
    const PEEK_H_MAX = 10;
    const PEEK_H_MIN = 6;
    const px = Math.max(0, bounds.x0 - PEEK_W);
    let py = c.cy;
    let ph = PEEK_H_MAX;

    const apply = (nw, nh) => {
      const naturalH = Math.max(PEEK_H_MIN, Math.round((PEEK_W * nh) / Math.max(1, nw)));
      ph = Math.min(PEEK_H_MAX, naturalH);
      py = Math.max(bounds.y0, Math.min(bounds.y1 - ph, c.cy - Math.floor(ph / 3)));
      peek.style.left = `${C(px)}px`;
      peek.style.top = `${C(py)}px`;
      peek.style.width = `${C(PEEK_W)}px`;
      peek.style.height = `${C(ph)}px`;
      peekFrame.style.backgroundImage = `url("${src}")`;
      peek.classList.add('on');
    };

    apply(4, 3);
    const img = new Image();
    img.onload = () => {
      if (!peek.classList.contains('on')) return;
      apply(img.naturalWidth || 4, img.naturalHeight || 3);
    };
    img.src = src;
  };

  const hover = (id) => {
    if (!bounds) return;
    const it = byId[id];
    const el = cellEls[id];
    const c = it && it._c;
    if (!it || !el || !c) return;

    // Detail open: still allow peek on left rail works/labs
    if (openId) {
      if (it.kind === 'page' || it.kind === 'brand') return;
      el.classList.add('is-hot');
      showPeek(it, c);
      return;
    }

    el.classList.add('is-hot');
    indexEl.classList.add('hushed');
    showPeek(it, c);
    hint?.classList.add('off');
  };

  const unhover = (id) => {
    const el = cellEls[id];
    if (el) el.classList.remove('is-hot');
    hidePeek();
    if (openId) return;
    indexEl.classList.remove('hushed');
  };

  const syncHash = (page) => {
    const next = page === 'about' ? '#about' : page === 'cv' ? '#cv' : '';
    const url = `${location.pathname}${location.search}${next}`;
    if (`${location.pathname}${location.search}${location.hash}` !== url) {
      history.pushState({ practiceOpen: page || null }, '', url);
    }
  };

  const fillAboutBoard = (put, sx, sy, bw, bh, TW, TH) => {
    const data = aboutData || {};
    const blockedTpl = [];
    const overlapsTpl = (x, y, w, h) =>
      blockedTpl.some(([bx, by, bw0, bh0]) => x < bx + bw0 && x + w > bx && y < by + bh0 && y + h > by);
    const blockedBoard = [];
    const blockBoard = (x, y, w, h) => blockedBoard.push({ x, y, w, h });
    const overlapsBoard = (x, y, w, h) =>
      blockedBoard.some((b) => x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y);

    const title = put('x-title', sx(0), sy(0), sx(14), sy(4));
    title.innerHTML = '';
    const kicker = document.createElement('p');
    kicker.className = 'x-kicker';
    kicker.textContent = [data.role, data.origin].filter(Boolean).join('  ·  ');
    const name = document.createElement('h2');
    name.className = 'x-name';
    name.textContent = data.name || '3Dowon';
    title.appendChild(kicker);
    title.appendChild(name);
    blockedTpl.push([0, 0, 14, 4]);
    blockBoard(sx(0), sy(0), sx(14), sy(4));

    const practice = put('x-copy', sx(0), sy(5), sx(14), sy(10));
    practice.innerHTML = '';
    const pK = document.createElement('p');
    pK.className = 'x-kicker';
    pK.textContent = `01 — ${(data.labels && data.labels.practice) || 'Practice'}`;
    const pB = document.createElement('p');
    pB.className = 'x-body';
    pB.textContent = data.practice || '';
    practice.appendChild(pK);
    practice.appendChild(pB);
    blockedTpl.push([0, 5, 14, 10]);
    blockBoard(sx(0), sy(5), sx(14), sy(10));

    const approach = put('x-copy', sx(0), sy(16), sx(14), sy(10));
    approach.innerHTML = '';
    const aK = document.createElement('p');
    aK.className = 'x-kicker';
    aK.textContent = `02 — ${(data.labels && data.labels.approach) || 'Approach'}`;
    const aB = document.createElement('p');
    aB.className = 'x-body';
    aB.textContent = data.approach || '';
    approach.appendChild(aK);
    approach.appendChild(aB);
    blockedTpl.push([0, 16, 14, 10]);
    blockBoard(sx(0), sy(16), sx(14), sy(10));

    const imgSlot = { x: 16, y: 0, w: 16, maxH: 14 };
    const mountImage = (nw, nh) => {
      const mx = sx(imgSlot.x);
      const my = sy(imgSlot.y);
      const mw = sx(imgSlot.w);
      const naturalH = Math.max(2, Math.round((mw * nh) / Math.max(1, nw)));
      const mh = Math.min(sy(imgSlot.maxH), Math.max(2, bh - my), naturalH);
      blockBoard(mx, my, mw, mh);
      blockedTpl.push([
        imgSlot.x,
        imgSlot.y,
        imgSlot.w,
        Math.max(1, Math.round((mh * TH) / Math.max(1, bh))),
      ]);
      const el = put('x-img', mx, my, mw, mh);
      if (data.image) el.style.backgroundImage = `url("${data.image}")`;
    };

    const finishChips = () => {
      const tagMeasure = document.createElement('span');
      tagMeasure.setAttribute('aria-hidden', 'true');
      tagMeasure.style.cssText =
        'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;' +
        'font-family:Inter,"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:9px;font-weight:600;' +
        'letter-spacing:0.04em;text-transform:uppercase;padding:0 6px;';
      document.body.appendChild(tagMeasure);
      const measureW = (text) => {
        tagMeasure.textContent = text;
        return Math.max(1, Math.ceil(tagMeasure.offsetWidth / CELL));
      };
      const fields = (data.fields || []).map((t) => String(t).toUpperCase());
      const chipSpots = [
        { x: 34, y: 0 },
        { x: 34, y: 2 },
        { x: 34, y: 4 },
        { x: 34, y: 6 },
        { x: 16, y: 16 },
        { x: 28, y: 16 },
        { x: 16, y: 18 },
        { x: 28, y: 18 },
      ];
      fields.forEach((text, i) => {
        if (!text) return;
        const wBoard = measureW(text);
        const wTpl = Math.max(1, Math.round((wBoard * TW) / Math.max(1, bw)));
        const candidates = chipSpots[i] ? [chipSpots[i], ...chipSpots] : chipSpots;
        for (const s of candidates) {
          if (overlapsTpl(s.x, s.y, wTpl, 1)) continue;
          const gx = sx(s.x);
          const gy = sy(s.y);
          if (gx + wBoard > bw || gy + 1 > bh) continue;
          if (overlapsBoard(gx, gy, wBoard, 1)) continue;
          const chip = put('x-chip x-chip-tag', gx, gy, wBoard, 1);
          chip.textContent = text;
          blockedTpl.push([s.x, s.y, wTpl, 1]);
          blockBoard(gx, gy, wBoard, 1);
          break;
        }
      });
      tagMeasure.remove();
    };

    if (data.image) {
      const img = new Image();
      img.onload = () => {
        mountImage(img.naturalWidth || 4, img.naturalHeight || 3);
        finishChips();
      };
      img.onerror = () => {
        mountImage(4, 3);
        finishChips();
      };
      img.src = data.image;
    } else {
      mountImage(4, 3);
      finishChips();
    }
  };

  const fillCvBoard = (put, sx, sy) => {
    const data = cvData || { sections: [] };
    const panel = put('cv-panel', sx(0), sy(0), sx(48), sy(28));
    panel.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'cv-panel-title';
    title.innerHTML = '<p class="x-kicker">RECORD</p><h2 class="x-name">CV</h2>';
    panel.appendChild(title);
    (data.sections || []).forEach((section) => {
      const block = document.createElement('section');
      block.className = 'cv-block';
      const headChip = document.createElement('div');
      headChip.className = 'x-piece x-chip cv-section-chip';
      headChip.textContent = section.title || '';
      block.appendChild(headChip);
      const entries = document.createElement('div');
      entries.className = 'cv-entries';
      (section.entries || []).forEach((entry) => {
        const row = document.createElement('div');
        row.className = 'cv-row';
        const year = document.createElement('div');
        year.className = 'x-piece x-chip x-chip-tag cv-year-chip';
        year.textContent = entry.year || '';
        const desc = document.createElement('div');
        desc.className = 'x-piece x-copy cv-desc';
        desc.innerHTML = entry.description || '';
        row.appendChild(year);
        row.appendChild(desc);
        entries.appendChild(row);
      });
      block.appendChild(entries);
      panel.appendChild(block);
    });
  };

  const openDetail = (id) => {
    openId = id;
    const it = byId[id];
    const b = bounds;
    if (!it || !b) return;

    items.forEach((o) => {
      const el = cellEls[o.id];
      if (!el) return;
      el.classList.toggle('is-selected', o.id === id);
      el.classList.remove('is-hot');
    });
    indexEl.classList.add('is-reading');
    indexEl.classList.remove('hushed');
    tagline.classList.remove('on');
    hidePeek();
    hint?.classList.add('off');
    head.style.opacity = '';

    detail.innerHTML = '';

    const ox = b.detailX0;
    const oy = b.y0;
    const bw = Math.max(20, b.x1 - ox);
    const bh = Math.max(16, b.y1 - oy);

    const board = document.createElement('div');
    board.className = 'x-board';
    board.style.left = `${C(ox)}px`;
    board.style.top = `${C(oy)}px`;
    board.style.width = `${C(bw)}px`;
    board.style.height = `${C(bh)}px`;
    detail.appendChild(board);

    // Template authored for 48×28 cells, then scaled to the right board
    const TW = 48;
    const TH = 28;
    const sx = (n) => Math.max(1, Math.round((n * bw) / TW));
    const sy = (n) => Math.max(1, Math.round((n * bh) / TH));
    const clampPiece = (x, y, w, h) => {
      let pw = Math.min(w, bw);
      let ph = Math.min(h, bh);
      let px = Math.max(0, Math.min(bw - pw, x));
      let py = Math.max(0, Math.min(bh - ph, y));
      return { px, py, pw, ph };
    };

    const put = (cls, x, y, w, h) => {
      const { px, py, pw, ph } = clampPiece(x, y, w, h);
      const el = document.createElement('div');
      el.className = `x-piece ${cls}`;
      el.style.left = `${C(px)}px`;
      el.style.top = `${C(py)}px`;
      el.style.width = `${C(pw)}px`;
      el.style.height = `${C(ph)}px`;
      board.appendChild(el);
      return el;
    };

    if (it.kind === 'page' && it.page === 'about') {
      fillAboutBoard(put, sx, sy, bw, bh, TW, TH);
      syncHash('about');
      detail.classList.add('on');
      return;
    }
    if (it.kind === 'page' && it.page === 'cv') {
      fillCvBoard(put, sx, sy);
      syncHash('cv');
      detail.classList.add('on');
      return;
    }

    syncHash('');

    const kindLabel =
      it.kind === 'lab' ? 'Study' : it.kind === 'professional' ? 'Commissioned' : 'Work';
    const note = it.note || `${it.t} — ${bucketName(it.bucket)}.`;
    const half = Math.ceil(note.length / 2);
    const breakAt = note.lastIndexOf(' ', half);
    const noteA = breakAt > 20 ? note.slice(0, breakAt) : note.slice(0, half);
    const noteB = breakAt > 20 ? note.slice(breakAt + 1) : note.slice(half);
    const TAG_LABEL = {
      interactive: 'INTERACTIVE',
      'physical-computing': 'PHYSICAL COMPUTING',
      realtime: 'REAL-TIME',
      projection: 'PROJECTION',
      sensors: 'SENSOR',
      robotics: 'ROBOTICS',
      light: 'LIGHT',
      shadow: 'SHADOW',
      display: 'DISPLAY',
    };
    const tags = (it.tags || [])
      .map((t) => TAG_LABEL[t] || String(t).replace(/-/g, ' ').toUpperCase())
      .filter(Boolean);
    const imgs = it.imgs.length ? it.imgs : [null];

    // Left text fixed; media at fixed irregular anchors; date always same spot
    const title = put('x-title', sx(0), sy(0), sx(12), sy(3));
    title.innerHTML = '';
    const kicker = document.createElement('p');
    kicker.className = 'x-kicker';
    kicker.textContent = `${it.id}  ·  ${it.date || it.year}`;
    const name = document.createElement('h2');
    name.className = 'x-name';
    name.textContent = it.t;
    title.appendChild(kicker);
    title.appendChild(name);

    const across = put('x-copy', sx(0), sy(4), sx(12), sy(9));
    across.innerHTML = '';
    const aK = document.createElement('p');
    aK.className = 'x-kicker';
    aK.textContent = `${it.id}.1 — CONCEPT`;
    const aB = document.createElement('p');
    aB.className = 'x-body';
    aB.textContent = noteA.trim() || note;
    across.appendChild(aK);
    across.appendChild(aB);

    const down = put('x-copy', sx(0), sy(14), sx(12), sy(10));
    down.innerHTML = '';
    const dK = document.createElement('p');
    dK.className = 'x-kicker';
    dK.textContent = `${it.id}.2 — EXPERIENCE`;
    const dB = document.createElement('p');
    dB.className = 'x-body';
    dB.textContent = noteB.trim() || `${kindLabel} · ${bucketName(it.bucket)}`;
    down.appendChild(dK);
    down.appendChild(dB);

    let seed = 2166136261;
    const seedSrc = `${it.id}|${it.date || it.year}|${it.t}`;
    for (let i = 0; i < seedSrc.length; i += 1) {
      seed = Math.imul(seed ^ seedSrc.charCodeAt(i), 16777619);
    }
    seed >>>= 0;
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    const blockedTpl = [
      [0, 0, 12, 3],
      [0, 4, 12, 9],
      [0, 14, 12, 10],
    ];
    const overlapsTpl = (x, y, w, h) =>
      blockedTpl.some(([bx, by, bw0, bh0]) => x < bx + bw0 && x + w > bx && y < by + bh0 && y + h > by);

    const blockedBoard = [];
    const blockBoard = (x, y, w, h) => {
      blockedBoard.push({ x, y, w, h });
    };
    const overlapsBoard = (x, y, w, h) =>
      blockedBoard.some((b) => x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y);

    blockBoard(sx(0), sy(0), sx(12), sy(3));
    blockBoard(sx(0), sy(4), sx(12), sy(9));
    blockBoard(sx(0), sy(14), sx(12), sy(10));

    const tagMeasure = document.createElement('span');
    tagMeasure.setAttribute('aria-hidden', 'true');
    tagMeasure.style.cssText =
      'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;' +
      'font-family:Inter,"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:9px;font-weight:600;' +
      'letter-spacing:0.04em;text-transform:uppercase;padding:0 6px;';
    document.body.appendChild(tagMeasure);
    const measureW = (text) => {
      tagMeasure.textContent = text;
      return Math.max(1, Math.ceil(tagMeasure.offsetWidth / CELL));
    };

    // Date chip — always the same spot
    const dateLabel = String(it.date || `${it.year}.01`);
    const dateW = measureW(dateLabel);
    const dateX = sx(40);
    const dateY = sy(0);
    const dateChip = put('x-chip x-chip-tag', dateX, dateY, dateW, 1);
    dateChip.textContent = dateLabel;
    blockBoard(dateX, dateY, dateW, 1);
    blockedTpl.push([40, 0, Math.max(1, Math.round((dateW * TW) / Math.max(1, bw))), 1]);

    // Fixed irregular media anchors. Height follows intrinsic aspect ratio (no crop).
    const mediaSlots = [
      { x: 14, y: 0, w: 15, maxH: 12 },
      { x: 31, y: 2, w: 13, maxH: 11 },
      { x: 14, y: 13, w: 14, maxH: 10 },
      { x: 30, y: 15, w: 14, maxH: 10 },
    ];

    const vimeoId = (() => {
      const value = String(it.vimeo || '').trim();
      if (!value) return '';
      const match =
        value.match(/player\.vimeo\.com\/video\/(\d+)/) ||
        value.match(/vimeo\.com\/(?:channels\/[^/]+\/|groups\/[^/]+\/videos\/|video\/)?(\d+)/);
      return match?.[1] || '';
    })();

    const loadSize = (src) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth || 4, h: img.naturalHeight || 3 });
        img.onerror = () => resolve({ w: 4, h: 3 });
        img.src = src;
      });

    const placeTags = () => {
      const chipTexts = tags.slice();
      for (let i = chipTexts.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rand() * (i + 1));
        const tmp = chipTexts[i];
        chipTexts[i] = chipTexts[j];
        chipTexts[j] = tmp;
      }

      chipTexts.forEach((text) => {
        if (!text) return;
        const wBoard = measureW(text);
        const wTpl = Math.max(1, Math.round((wBoard * TW) / Math.max(1, bw)));
        let placed = false;
        for (let tries = 0; tries < 120; tries += 1) {
          const x = Math.floor(rand() * Math.max(1, TW - wTpl));
          const y = Math.floor(rand() * TH);
          if (overlapsTpl(x, y, wTpl, 1)) continue;
          const gx = sx(x);
          const gy = sy(y);
          if (gx + wBoard > bw || gy + 1 > bh) continue;
          if (overlapsBoard(gx, gy, wBoard, 1)) continue;
          const chip = put('x-chip x-chip-tag', gx, gy, wBoard, 1);
          chip.textContent = text;
          blockedTpl.push([x, y, wTpl, 1]);
          blockBoard(gx, gy, wBoard, 1);
          placed = true;
          break;
        }
        if (placed) return;
        for (let y = 0; y < TH && !placed; y += 1) {
          for (let x = 0; x <= TW - wTpl; x += 1) {
            if (overlapsTpl(x, y, wTpl, 1)) continue;
            const gx = sx(x);
            const gy = sy(y);
            if (gx + wBoard > bw || gy + 1 > bh) continue;
            if (overlapsBoard(gx, gy, wBoard, 1)) continue;
            const chip = put('x-chip x-chip-tag', gx, gy, wBoard, 1);
            chip.textContent = text;
            blockedTpl.push([x, y, wTpl, 1]);
            blockBoard(gx, gy, wBoard, 1);
            placed = true;
            break;
          }
        }
      });
      tagMeasure.remove();
    };

    const mountAtSlot = (slot, cls, aspectW, aspectH, paint) => {
      const mx = sx(slot.x);
      const my = sy(slot.y);
      const mw = sx(slot.w);
      const naturalH = Math.max(2, Math.round((mw * aspectH) / Math.max(1, aspectW)));
      const mh = Math.min(sy(slot.maxH), Math.max(2, bh - my), naturalH);
      blockBoard(mx, my, mw, mh);
      blockedTpl.push([
        slot.x,
        slot.y,
        slot.w,
        Math.max(1, Math.round((mh * TH) / Math.max(1, bh))),
      ]);
      const el = put(cls, mx, my, mw, mh);
      paint(el);
    };

    let slotIndex = 0;

    if (vimeoId && mediaSlots[slotIndex]) {
      const slot = mediaSlots[slotIndex++];
      mountAtSlot(slot, 'x-video', 16, 9, (el) => {
        const frame = document.createElement('div');
        frame.className = 'x-video-frame';
        const iframe = document.createElement('iframe');
        iframe.src = `https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0`;
        iframe.allow = 'autoplay; fullscreen; picture-in-picture';
        iframe.setAttribute('allowfullscreen', '');
        iframe.loading = 'lazy';
        iframe.title = it.t;
        frame.appendChild(iframe);
        el.appendChild(frame);
      });
    }

    const imageList = imgs.filter(Boolean).slice(0, mediaSlots.length - slotIndex);
    Promise.all(imageList.map((src) => loadSize(src))).then((sizes) => {
      if (openId !== id) {
        tagMeasure.remove();
        return;
      }
      imageList.forEach((src, i) => {
        const slot = mediaSlots[slotIndex++];
        if (!slot) return;
        const size = sizes[i] || { w: 4, h: 3 };
        mountAtSlot(slot, 'x-img', size.w, size.h, (el) => {
          el.style.backgroundImage = `url("${src}")`;
        });
      });
      placeTags();
    });

    detail.classList.add('on');
  };

  const closeDetail = () => {
    openId = null;
    detail.classList.remove('on');
    indexEl.classList.remove('is-reading', 'hushed');
    items.forEach((o) => cellEls[o.id]?.classList.remove('is-selected', 'is-hot'));
    head.style.opacity = '';
    hint?.classList.remove('off');
    syncHash('');
    window.setTimeout(() => {
      if (!openId) detail.innerHTML = '';
    }, 420);
  };

  items.forEach((it) => {
    const d = document.createElement('div');
    const isBrand = it.kind === 'brand';
    const isAbout = it.kind === 'page' && it.page === 'about';
    const isCv = it.kind === 'page' && it.page === 'cv';
    d.className = [
      'cell',
      it.kind === 'lab' ? 'lab' : '',
      it.kind === 'page' ? 'page-cell' : '',
      isAbout ? 'about-cell' : '',
      isCv ? 'cv-cell' : '',
      isBrand ? 'brand-cell' : '',
    ]
      .filter(Boolean)
      .join(' ');
    d.style.setProperty('--c', COL[it.bucket]);

    if (isBrand) {
      d.setAttribute('role', 'link');
      d.setAttribute('tabindex', '0');
      d.setAttribute('aria-label', '3Dowon');
      d.textContent = it.t;
      const goHome = (e) => {
        e.stopPropagation();
        location.href = homeHref;
      };
      d.addEventListener('click', goHome);
      d.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goHome(e);
        }
      });
    } else {
      d.setAttribute('role', 'button');
      d.setAttribute('tabindex', '0');
      d.setAttribute('aria-label', it.kind === 'page' ? it.t : `${it.t}, ${it.year}`);
      if (isCv) d.textContent = 'CV';
      d.addEventListener('pointerenter', () => hover(it.id));
      d.addEventListener('focus', () => hover(it.id));
      d.addEventListener('pointerleave', () => unhover(it.id));
      d.addEventListener('blur', () => unhover(it.id));
      d.addEventListener('click', (e) => {
        e.stopPropagation();
        if (openId === it.id) closeDetail();
        else openDetail(it.id);
      });
      d.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (openId === it.id) closeDetail();
          else openDetail(it.id);
        }
      });
    }

    indexEl.appendChild(d);
    cellEls[it.id] = d;
  });

  head.querySelectorAll('[data-practice-open]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('data-practice-open');
      if (!id || !byId[id]) return;
      e.preventDefault();
      if (openId === id) closeDetail();
      else openDetail(id);
    });
  });

  const openFromHash = () => {
    const hash = (location.hash || '').replace(/^#/, '').toLowerCase();
    if (hash === 'about' && byId.ABOUT) openDetail('ABOUT');
    else if (hash === 'cv' && byId.CV) openDetail('CV');
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openId) closeDetail();
  });
  window.addEventListener('popstate', () => {
    const hash = (location.hash || '').replace(/^#/, '').toLowerCase();
    if (hash === 'about' || hash === 'cv') openFromHash();
    else if (openId) closeDetail();
  });
  window.addEventListener('resize', () => {
    place();
    if (openId) {
      const id = openId;
      closeDetail();
      openDetail(id);
    }
  });
  place();
  initPaperInk(sheet, CELL);
  openFromHash();
}

function initPaperInk(sheet, cellSize) {
  const canvas = sheet.querySelector('#inkGrid');
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) return;
  if (!window.matchMedia('(pointer: fine) and (hover: hover)').matches) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const marks = new Map();
  let hover = null;
  let lastKey = '';
  let lastPaintKey = '';
  let painting = false;
  let raf = 0;

  const syncSize = () => {
    const w = sheet.clientWidth;
    const h = sheet.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!raf) raf = requestAnimationFrame(draw);
  };

  const cellFromEvent = (e) => {
    const rect = sheet.getBoundingClientRect();
    const cx = Math.floor((e.clientX - rect.left) / cellSize);
    const cy = Math.floor((e.clientY - rect.top) / cellSize);
    if (cx < 0 || cy < 0) return null;
    const cols = Math.floor(sheet.clientWidth / cellSize);
    const rows = Math.floor(sheet.clientHeight / cellSize);
    if (cx >= cols || cy >= rows) return null;
    return { x: cx, y: cy, key: `${cx},${cy}` };
  };

  const stamp = (cell) => {
    marks.set(cell.key, { x: cell.x, y: cell.y });
    if (!raf) raf = requestAnimationFrame(draw);
  };

  const clearPaint = () => {
    if (!marks.size) {
      lastPaintKey = '';
      painting = false;
      return;
    }
    marks.clear();
    lastPaintKey = '';
    painting = false;
    if (!raf) raf = requestAnimationFrame(draw);
  };

  const draw = () => {
    raf = 0;
    const w = sheet.clientWidth;
    const h = sheet.clientHeight;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(30, 72, 48, 0.88)';
    marks.forEach((mark) => {
      ctx.fillRect(mark.x * cellSize, mark.y * cellSize, cellSize, cellSize);
    });

    if (hover) {
      const x = hover.x * cellSize;
      const y = hover.y * cellSize;
      ctx.strokeStyle = '#1f2421';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.75, y + 0.75, cellSize - 1.5, cellSize - 1.5);
    }

    if (marks.size || hover) raf = requestAnimationFrame(draw);
  };

  sheet.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    painting = true;
    lastPaintKey = cell.key;
    stamp(cell);
  });

  sheet.addEventListener(
    'pointermove',
    (e) => {
      const cell = cellFromEvent(e);
      if (!cell) return;

      if (cell.key !== lastKey) {
        lastKey = cell.key;
        hover = { x: cell.x, y: cell.y };
        if (!raf) raf = requestAnimationFrame(draw);
      }

      if ((e.buttons & 1) && painting) {
        if (cell.key !== lastPaintKey) {
          lastPaintKey = cell.key;
          stamp(cell);
        }
      }
    },
    { passive: true }
  );

  const endPaint = () => {
    clearPaint();
  };

  sheet.addEventListener('pointerup', endPaint);
  sheet.addEventListener('pointercancel', endPaint);
  window.addEventListener('pointerup', endPaint);

  sheet.addEventListener('pointerleave', () => {
    lastKey = '';
    hover = null;
    if (!raf) raf = requestAnimationFrame(draw);
  });

  sheet.addEventListener(
    'dragstart',
    (e) => {
      e.preventDefault();
    },
    true
  );

  window.addEventListener('resize', syncSize);
  syncSize();
}

function initPracticeSheet() {
  const sheet = document.querySelector('[data-practice-sheet]');
  if (!sheet) return;
  const CELL = 20;
  const MARGIN_C = 7;
  const HEAD_C = 5;
  const head = sheet.querySelector('#head');
  const placeHead = () => {
    if (!head) return;
    head.style.left = `${(MARGIN_C + 1) * CELL}px`;
    head.style.top = `${(HEAD_C - 3) * CELL}px`;
  };
  placeHead();
  window.addEventListener('resize', placeHead);
  initPaperInk(sheet, CELL);
}

function initPracticeAboutBoard() {
  const sheet = document.querySelector('[data-about-board]');
  const board = document.getElementById('aboutBoard');
  const dataEl = document.getElementById('aboutBoardData');
  const stage = document.getElementById('aboutStage');
  if (!sheet || !board || !dataEl || !stage) return;

  let data;
  try {
    data = JSON.parse(dataEl.textContent || '{}');
  } catch {
    return;
  }

  const CELL = 20;
  const MARGIN_C = 7;
  const HEAD_C = 5;
  const PAD_R = 3;
  const PAD_B = 3;
  const C = (n) => n * CELL;
  const TW = 48;
  const TH = 28;

  const render = () => {
    const cols = Math.floor(window.innerWidth / CELL);
    const rows = Math.floor(window.innerHeight / CELL);
    const ox = MARGIN_C + 2;
    const oy = HEAD_C + 2;
    const bw = Math.max(24, cols - PAD_R - ox);
    const bh = Math.max(18, rows - PAD_B - oy);

    stage.style.left = `${C(ox)}px`;
    stage.style.top = `${C(oy)}px`;
    stage.style.width = `${C(bw)}px`;
    stage.style.height = `${C(bh)}px`;
    board.style.width = `${C(bw)}px`;
    board.style.height = `${C(bh)}px`;
    board.innerHTML = '';

    const sx = (n) => Math.max(1, Math.round((n * bw) / TW));
    const sy = (n) => Math.max(1, Math.round((n * bh) / TH));
    const clampPiece = (x, y, w, h) => {
      let pw = Math.min(w, bw);
      let ph = Math.min(h, bh);
      let px = Math.max(0, Math.min(bw - pw, x));
      let py = Math.max(0, Math.min(bh - ph, y));
      return { px, py, pw, ph };
    };
    const put = (cls, x, y, w, h) => {
      const { px, py, pw, ph } = clampPiece(x, y, w, h);
      const el = document.createElement('div');
      el.className = `x-piece ${cls}`;
      el.style.left = `${C(px)}px`;
      el.style.top = `${C(py)}px`;
      el.style.width = `${C(pw)}px`;
      el.style.height = `${C(ph)}px`;
      board.appendChild(el);
      return el;
    };

    const blockedTpl = [];
    const overlapsTpl = (x, y, w, h) =>
      blockedTpl.some(([bx, by, bw0, bh0]) => x < bx + bw0 && x + w > bx && y < by + bh0 && y + h > by);
    const blockedBoard = [];
    const blockBoard = (x, y, w, h) => blockedBoard.push({ x, y, w, h });
    const overlapsBoard = (x, y, w, h) =>
      blockedBoard.some((b) => x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y);

    // Title
    const title = put('x-title', sx(0), sy(0), sx(14), sy(4));
    title.innerHTML = '';
    const kicker = document.createElement('p');
    kicker.className = 'x-kicker';
    kicker.textContent = [data.role, data.origin].filter(Boolean).join('  ·  ');
    const name = document.createElement('h2');
    name.className = 'x-name';
    name.textContent = data.name || '3Dowon';
    title.appendChild(kicker);
    title.appendChild(name);
    blockedTpl.push([0, 0, 14, 4]);
    blockBoard(sx(0), sy(0), sx(14), sy(4));

    // Practice / Approach copy
    const practice = put('x-copy', sx(0), sy(5), sx(14), sy(10));
    practice.innerHTML = '';
    const pK = document.createElement('p');
    pK.className = 'x-kicker';
    pK.textContent = `01 — ${(data.labels && data.labels.practice) || 'Practice'}`;
    const pB = document.createElement('p');
    pB.className = 'x-body';
    pB.textContent = data.practice || '';
    practice.appendChild(pK);
    practice.appendChild(pB);
    blockedTpl.push([0, 5, 14, 10]);
    blockBoard(sx(0), sy(5), sx(14), sy(10));

    const approach = put('x-copy', sx(0), sy(16), sx(14), sy(10));
    approach.innerHTML = '';
    const aK = document.createElement('p');
    aK.className = 'x-kicker';
    aK.textContent = `02 — ${(data.labels && data.labels.approach) || 'Approach'}`;
    const aB = document.createElement('p');
    aB.className = 'x-body';
    aB.textContent = data.approach || '';
    approach.appendChild(aK);
    approach.appendChild(aB);
    blockedTpl.push([0, 16, 14, 10]);
    blockBoard(sx(0), sy(16), sx(14), sy(10));

    // Fixed image slot — aspect contain
    const imgSlot = { x: 16, y: 0, w: 16, maxH: 14 };
    const mountImage = (nw, nh) => {
      const mx = sx(imgSlot.x);
      const my = sy(imgSlot.y);
      const mw = sx(imgSlot.w);
      const naturalH = Math.max(2, Math.round((mw * nh) / Math.max(1, nw)));
      const mh = Math.min(sy(imgSlot.maxH), Math.max(2, bh - my), naturalH);
      blockBoard(mx, my, mw, mh);
      blockedTpl.push([
        imgSlot.x,
        imgSlot.y,
        imgSlot.w,
        Math.max(1, Math.round((mh * TH) / Math.max(1, bh))),
      ]);
      const el = put('x-img', mx, my, mw, mh);
      if (data.image) el.style.backgroundImage = `url("${data.image}")`;
    };

    const finishChips = () => {
      const tagMeasure = document.createElement('span');
      tagMeasure.setAttribute('aria-hidden', 'true');
      tagMeasure.style.cssText =
        'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;' +
        'font-family:Inter,"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:9px;font-weight:600;' +
        'letter-spacing:0.04em;text-transform:uppercase;padding:0 6px;';
      document.body.appendChild(tagMeasure);
      const measureW = (text) => {
        tagMeasure.textContent = text;
        return Math.max(1, Math.ceil(tagMeasure.offsetWidth / CELL));
      };

      const fields = (data.fields || []).map((t) => String(t).toUpperCase());
      const chipSpots = [
        { x: 34, y: 0 },
        { x: 34, y: 2 },
        { x: 34, y: 4 },
        { x: 34, y: 6 },
        { x: 16, y: 16 },
        { x: 16, y: 18 },
        { x: 28, y: 16 },
        { x: 28, y: 18 },
        { x: 34, y: 20 },
        { x: 34, y: 22 },
      ];

      fields.forEach((text, i) => {
        if (!text) return;
        const wBoard = measureW(text);
        const wTpl = Math.max(1, Math.round((wBoard * TW) / Math.max(1, bw)));
        const preferred = chipSpots[i];
        const candidates = preferred ? [preferred, ...chipSpots] : chipSpots;
        let placed = false;
        for (const s of candidates) {
          if (overlapsTpl(s.x, s.y, wTpl, 1)) continue;
          const gx = sx(s.x);
          const gy = sy(s.y);
          if (gx + wBoard > bw || gy + 1 > bh) continue;
          if (overlapsBoard(gx, gy, wBoard, 1)) continue;
          const chip = put('x-chip x-chip-tag', gx, gy, wBoard, 1);
          chip.textContent = text;
          blockedTpl.push([s.x, s.y, wTpl, 1]);
          blockBoard(gx, gy, wBoard, 1);
          placed = true;
          break;
        }
        if (!placed) {
          for (let y = 0; y < TH && !placed; y += 1) {
            for (let x = 15; x <= TW - wTpl; x += 1) {
              if (overlapsTpl(x, y, wTpl, 1)) continue;
              const gx = sx(x);
              const gy = sy(y);
              if (gx + wBoard > bw || gy + 1 > bh) continue;
              if (overlapsBoard(gx, gy, wBoard, 1)) continue;
              const chip = put('x-chip x-chip-tag', gx, gy, wBoard, 1);
              chip.textContent = text;
              blockedTpl.push([x, y, wTpl, 1]);
              blockBoard(gx, gy, wBoard, 1);
              placed = true;
              break;
            }
          }
        }
      });
      tagMeasure.remove();
    };

    if (data.image) {
      const img = new Image();
      img.onload = () => {
        mountImage(img.naturalWidth || 4, img.naturalHeight || 3);
        finishChips();
      };
      img.onerror = () => {
        mountImage(4, 3);
        finishChips();
      };
      img.src = data.image;
    } else {
      mountImage(4, 3);
      finishChips();
    }
  };

  render();
  window.addEventListener('resize', render);
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
  initPracticeGrid();
  initPracticeSheet();
  initPracticeAboutBoard();
  initAboutInteraction();
  initReveal();
  initLabLightbox();
  initNodeCursor();
});
