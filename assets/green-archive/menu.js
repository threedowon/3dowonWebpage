// Shared fixed navigation, a hover/focus Works submenu, and a touch drawer.
const menu = document.querySelector('.site-menu');
const toggle = menu?.querySelector('.menu-toggle');
const panel = menu?.querySelector('.menu-panel');
const dialog = menu?.querySelector('.mobile-menu-dialog');
const mobile = window.matchMedia('(max-width:700px)');
const works = menu?.querySelector('.works-menu');
const worksTrigger = works?.querySelector('.works-trigger');
const submenu = works?.querySelector('.works-submenu');
const footer = document.querySelector('[data-footer]');
let suppressFocusOpen = false;
function setWorksOpen(open) {
  if (!submenu) return;
  // The desktop Works archive keeps its filter navigation visible, including All.
  open = open || (!mobile.matches && document.body.classList.contains('page-archive'));
  submenu.hidden = !open;
  worksTrigger.setAttribute('aria-expanded',String(open));
  menu.classList.toggle('works-open',open);
}
function syncFilterControls() {
  const params = new URLSearchParams(location.search);
  menu?.querySelectorAll('[data-work-filter]').forEach(link => {
    const target = new URL(link.href,location.href);
    const current = document.body.classList.contains('page-archive') &&
      (target.searchParams.get('type') || '') === (params.get('type') || '') &&
      (!params.get('year') || target.searchParams.has('type'));
    link.toggleAttribute('data-active',current);
  });
  menu?.querySelectorAll('[data-language]').forEach(link => {
    const base = link.getAttribute('href').split(/[?#]/)[0];
    link.href = `${base}${location.search}${location.hash}`;
  });
}
if (worksTrigger && submenu) {
  works.addEventListener('pointerenter',event => {
    if (!mobile.matches && event.pointerType !== 'touch') setWorksOpen(true);
  });
  works.addEventListener('pointerleave',() => {
    if (!mobile.matches && !works.contains(document.activeElement)) setWorksOpen(false);
  });
  works.addEventListener('focusin',event => {
    if (!mobile.matches && !suppressFocusOpen && event.target.matches(':focus-visible')) setWorksOpen(true);
  });
  works.addEventListener('focusout',event => {
    if (!mobile.matches && !works.contains(event.relatedTarget)) setWorksOpen(false);
  });
  worksTrigger.addEventListener('click',event => {
    if (!mobile.matches) return;
    event.preventDefault(); setWorksOpen(submenu.hidden);
  });
  worksTrigger.addEventListener('keydown',event => {
    if (mobile.matches && event.key === ' ') {
      event.preventDefault(); setWorksOpen(submenu.hidden);
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault(); setWorksOpen(true); submenu.querySelector('a')?.focus();
    }
  });
  works.addEventListener('keydown',event => {
    if (event.key !== 'Escape' || submenu.hidden) return;
    event.preventDefault(); event.stopPropagation(); setWorksOpen(false);
    suppressFocusOpen = true; worksTrigger.focus(); suppressFocusOpen = false;
  });
  document.addEventListener('click',event => {
    if (!works.contains(event.target)) setWorksOpen(false);
  });
}
if (toggle && panel && dialog) {
  const closeButton = panel.querySelector('.menu-close');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let closeTimer;
  const resetMenu = () => {
    clearTimeout(closeTimer);
    dialog.classList.remove('is-closing');
    document.documentElement.classList.remove('mobile-menu-open');
    toggle.setAttribute('aria-expanded','false');
    menu.append(panel); panel.hidden = mobile.matches; setWorksOpen(false);
  };
  const finishClose = () => { if (dialog.open) dialog.close(); resetMenu(); };
  const closeMenu = (immediate = false) => {
    if (!dialog.open || immediate || reducedMotion.matches) { finishClose(); return; }
    if (dialog.classList.contains('is-closing')) return;
    dialog.classList.add('is-closing');
    closeTimer = window.setTimeout(finishClose,240);
  };
  const syncScroll = () => menu.classList.toggle('is-scrolled',window.scrollY > 24);
  const syncLayout = () => {
    const focused = document.activeElement;
    const wasInPanel = panel.contains(focused);
    if (mobile.matches) worksTrigger?.setAttribute('role','button');
    else worksTrigger?.removeAttribute('role');
    toggle.hidden = !mobile.matches; closeMenu(true); syncScroll();
    if (mobile.matches && wasInPanel) toggle.focus({preventScroll:true});
    if (!mobile.matches && (focused === toggle || wasInPanel)) panel.querySelector('.menu-links a')?.focus({preventScroll:true});
  };
  toggle.addEventListener('click',() => {
    if (!mobile.matches) return;
    dialog.append(panel); panel.hidden = false;
    toggle.setAttribute('aria-expanded','true');
    document.documentElement.classList.add('mobile-menu-open');
    dialog.showModal(); dialog.scrollTop = 0; closeButton.focus({preventScroll:true});
  });
  closeButton.addEventListener('click',() => closeMenu());
  dialog.addEventListener('cancel',event => { event.preventDefault(); closeMenu(); });
  dialog.addEventListener('animationend',event => {
    if (event.target === dialog && event.animationName === 'mobile-menu-hide') finishClose();
  });
  dialog.addEventListener('close',() => { if (!dialog.open) resetMenu(); });
  dialog.addEventListener('keydown',event => {
    if (event.key !== 'Tab') return;
    const controls = [...panel.querySelectorAll('button,a[href],select,summary')].filter(control => control.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  panel.addEventListener('click',event => {
    if (mobile.matches && !event.defaultPrevented && event.target.closest('a')) closeMenu();
  });
  document.addEventListener('works:filtered',() => {
    if (dialog.open) closeMenu();
    else {
      const params = new URLSearchParams(location.search);
      setWorksOpen(!mobile.matches && (Boolean(params.get('type')) || params.get('menu') === 'all'));
    }
    syncFilterControls();
  });
  mobile.addEventListener('change',syncLayout);
  window.addEventListener('scroll',syncScroll,{passive:true});
  window.addEventListener('pageshow',event => { if (event.persisted) syncLayout(); });
  syncLayout();
}
window.addEventListener('popstate',syncFilterControls);
syncFilterControls();
if (!mobile.matches && document.body.classList.contains('page-archive')) {
  setWorksOpen(true);
}
if (footer) {
  const trigger = footer.querySelector('.footer-toggle');
  const wrap = footer.querySelector('.footer-question-wrap');
  const inline = footer.querySelector('.footer-question-inline');
  const sheet = footer.querySelector('.footer-question-sheet');
  const hover = matchMedia('(min-width:701px) and (hover:hover)');
  let gestureStart = null;
  const closeSheet = () => { if (sheet.open) sheet.close(); gestureStart = null; };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const questionText = inline.querySelector('p');
  let questionAnimation;
  const animateQuestions = () => {
    questionAnimation?.cancel();
    questionAnimation = null;
    inline.classList.remove('is-moving');
    if (inline.hidden || !hover.matches || reducedMotion.matches) return;
    const distance = Math.ceil(questionText.getBoundingClientRect().width - inline.clientWidth);
    if (distance <= 1) return;
    inline.scrollLeft = 0;
    inline.classList.add('is-moving');
    const travel = distance / 28 * 1000;
    const duration = travel * 2 + 4000;
    questionAnimation = questionText.animate([
      {transform:'translateX(0)',offset:0},
      {transform:'translateX(0)',offset:2000 / duration},
      {transform:`translateX(-${distance}px)`,offset:(2000 + travel) / duration},
      {transform:`translateX(-${distance}px)`,offset:(4000 + travel) / duration},
      {transform:'translateX(0)',offset:1},
    ], {duration,iterations:Infinity,easing:'linear'});
  };
  const setInline = open => {
    inline.hidden = !open;
    trigger.setAttribute('aria-expanded',String(open));
    animateQuestions();
  };
  new ResizeObserver(animateQuestions).observe(inline);
  document.fonts?.ready.then(animateQuestions);
  reducedMotion.addEventListener('change', animateQuestions);
  wrap.addEventListener('pointerenter', () => { if (hover.matches) setInline(true); });
  wrap.addEventListener('pointerleave', () => { if (hover.matches) setInline(false); });
  trigger.addEventListener('focus', () => { if (hover.matches) setInline(true); });
  wrap.addEventListener('focusout', event => { if (!wrap.contains(event.relatedTarget)) setInline(false); });
  trigger.addEventListener('click', () => {
    if (hover.matches) { setInline(true); return; }
    sheet.showModal(); trigger.setAttribute('aria-expanded','true');
  });
  sheet.querySelector('button').addEventListener('click', closeSheet);
  // Dismiss on gestures without blocking the user's scrolling or swiping.
  document.addEventListener('pointerdown', event => {
    if (sheet.open) gestureStart = {x:event.clientX,y:event.clientY};
  }, {capture:true,passive:true});
  document.addEventListener('pointermove', event => {
    if (sheet.open && gestureStart && Math.hypot(event.clientX-gestureStart.x,event.clientY-gestureStart.y)>8) closeSheet();
  }, {capture:true,passive:true});
  document.addEventListener('touchmove', closeSheet, {capture:true,passive:true});
  document.addEventListener('wheel', closeSheet, {capture:true,passive:true});
  document.addEventListener('scroll', closeSheet, {capture:true,passive:true});
  sheet.addEventListener('click', event => {
    const r=sheet.getBoundingClientRect();
    if(event.target===sheet && (event.clientY<r.top || event.clientX<r.left || event.clientX>r.right)) sheet.close();
  });
  sheet.addEventListener('close', () => { gestureStart = null; trigger.setAttribute('aria-expanded','false'); });
  document.addEventListener('keydown', event => { if(event.key==='Escape') setInline(false); });
  hover.addEventListener('change', () => { setInline(false); if(sheet.open) sheet.close(); });
}
