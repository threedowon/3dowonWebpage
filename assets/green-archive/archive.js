const grid = document.querySelector('.work-grid');
const cards = [...grid.children];
const search = document.querySelector('#search');
const clear = document.querySelector('#clear-search');
const ko = document.documentElement.lang === 'ko';
function filter() {
  const query = search.value.trim().toLocaleLowerCase();
  let count = 0;
  for (const card of cards) {
    card.hidden = !card.dataset.search.includes(query);
    if (!card.hidden) count++;
  }
  document.querySelector('#work-count').textContent = `${count} ${ko ? '개 작업' : 'works'}`;
  document.querySelector('.empty-state').hidden = count !== 0;
  clear.hidden = !search.value;
}
search.addEventListener('input', filter);
clear.addEventListener('click', () => { search.value = ''; filter(); search.focus(); });
document.querySelectorAll('[data-sort]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-sort]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  const sort = button.dataset.sort;
  const sorted = [...cards].sort((a,b) => sort === 'title' ? a.dataset.title.localeCompare(b.dataset.title,ko?'ko':'en') : sort === 'newest' ? Number(b.dataset.year)-Number(a.dataset.year) || Number(a.dataset.order)-Number(b.dataset.order) : Number(a.dataset.order)-Number(b.dataset.order));
  grid.append(...sorted);
}));
