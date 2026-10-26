// Filter the full archive locally; the same query URLs work from every page.
(() => {
  const grid = document.querySelector('.page-archive .work-grid');
  if (!grid) return;
  const cards = [...grid.querySelectorAll('.work-card')];
  const types = new Map(cards.map(card => [card,JSON.parse(card.dataset.types || '[]')]));
  const status = document.querySelector('.archive-results');
  const empty = document.querySelector('.archive-empty');
  const ko = document.documentElement.lang === 'ko';
  const apply = () => {
    const params = new URLSearchParams(location.search);
    const type = params.get('type'), year = params.get('year'), sort = params.get('sort');
    let visible = 0;
    const ordered = [...cards].sort((a,b) => {
      if (sort === 'title') return a.dataset.title.localeCompare(b.dataset.title,ko ? 'ko' : 'en');
      if (sort === 'newest' || sort === 'oldest') return (Number(b.dataset.year)-Number(a.dataset.year))*(sort === 'oldest' ? -1 : 1) || Number(a.dataset.order)-Number(b.dataset.order);
      return Number(a.dataset.order)-Number(b.dataset.order);
    });
    for (const card of ordered) {
      card.hidden = Boolean((type && !types.get(card).includes(type)) || (year && card.dataset.year !== year));
      if (!card.hidden) visible++;
      grid.append(card);
    }
    status.hidden = !type && !year && (!sort || sort === 'selected');
    status.textContent = ko ? `${visible}개 작업` : `${visible} ${visible === 1 ? 'work' : 'works'}`;
    empty.hidden = visible !== 0;
    document.dispatchEvent(new Event('works:filtered'));
  };
  const navigate = url => {
    history.pushState(null,'',url.pathname+url.search);
    apply();
  };
  document.addEventListener('click',event => {
    const link = event.target.closest('a[data-work-filter]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href,location.href);
    if (url.origin !== location.origin) return;
    event.preventDefault(); navigate(url);
  });
  window.addEventListener('popstate',apply);
  apply();
})();
