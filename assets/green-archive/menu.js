// One responsive menu shares the same links on desktop and mobile.
const menu = document.querySelector('.site-menu');
const toggle = menu?.querySelector('.menu-toggle');
const panel = menu?.querySelector('.menu-panel');

if (toggle && panel) {
  const mobile = window.matchMedia('(max-width: 700px)');
  const setOpen = open => {
    toggle.setAttribute('aria-expanded', String(open));
    panel.hidden = mobile.matches && !open;
  };
  const syncLayout = () => {
    const focused = document.activeElement;
    toggle.hidden = !mobile.matches;
    setOpen(false);
    if (mobile.matches && panel.contains(focused)) toggle.focus({preventScroll:true});
    if (!mobile.matches && focused === toggle) panel.querySelector('a')?.focus({preventScroll:true});
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !mobile.matches || panel.hidden) return;
    setOpen(false);
    toggle.focus({preventScroll:true});
  });
  panel.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!mobile.matches || !link) return;
    const target = new URL(link.href, location.href);
    if (target.origin === location.origin && target.pathname === location.pathname && target.hash) {
      setOpen(false);
      document.getElementById(target.hash.slice(1))?.focus({preventScroll:true});
    }
  });
  mobile.addEventListener('change', syncLayout);
  syncLayout();
}
