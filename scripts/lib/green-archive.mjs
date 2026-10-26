import { siteSidebar, siteFooter } from './navigation.mjs';
import { escapeHtml as esc } from './html.mjs';
import { pick, resolveMediaPath } from './catalog.mjs';

export function greenArchivePage(works, site, lang, page = 'index.html') {
  const ko = lang === 'ko', assets = ko ? '../' : '';
  const selected = site.selected_projects || [];
  const ordered = [...works].sort((a,b) => {
    const rank = w => selected.includes(w.slug) ? selected.indexOf(w.slug) : selected.length;
    return rank(a)-rank(b) || Number(b.year)-Number(a.year);
  });
  const cards = ordered.map((w,i) => {
    const title = pick(w,'title',lang), type = pick(w,'meta_type',lang) || '';
    const src = [w.cover_image,w.thumbnail,w.hero_image,...w.gallery].find(s => s && !/\.(mp4|webm|mov|m4v)([?#]|$)/i.test(s));
    const details = [type, w.year].filter(value => value != null && String(value).trim() !== '').map(value => `<span> / ${esc(value)}</span>`).join('');
    return `<article class="work-card" data-title="${esc(title)}" data-year="${esc(w.year)}" data-order="${i}" data-search="${esc(`${title} ${type} ${w.year}`.toLowerCase())}"><a href="work/${esc(w.slug)}.html"><div class="work-image">${src ? `<img src="${esc(resolveMediaPath(src,assets))}" alt="${esc(title)}" ${i<3?'fetchpriority="high"':'loading="lazy"'} decoding="async">` : `<span class="no-image">${esc(title)}</span>`}</div><div class="work-caption"><h2>${esc(title)}</h2>${details}</div></a></article>`;
  }).join('');
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#15591f"><meta name="description" content="3Dowon — Interactive media, objects and spatial experiences."><title>Works — 3Dowon</title><link rel="icon" href="${assets}assets/green-archive/3dowon.png"><link rel="stylesheet" href="${assets}assets/green-archive/archive.css?v=3"><link rel="stylesheet" href="${assets}assets/green-archive/menu.css?v=5"><link rel="stylesheet" href="${assets}assets/green-archive/sidebar.css?v=6"><link rel="stylesheet" href="${assets}assets/green-archive/layout.css?v=4"><script src="${assets}assets/green-archive/menu.js?v=1" defer></script><script src="${assets}assets/green-archive/archive.js?v=1" defer></script></head>
<body class="archive-layout page-archive"><a class="skip" href="#main">${ko?'본문으로 이동':'Skip to content'}</a>
${siteSidebar({assets,lang,active:'works',languageHref:(ko?'../':'ko/')+page,className:'identity'})}
<div class="archive-shell">
<main id="main"><div class="page-heading"><h1>${ko?'작업 / Works':'Works'}</h1></div><div class="catalog-tools"><p id="work-count" role="status" aria-live="polite">${works.length} ${ko?'개 작업':'works'}</p><div class="sort-options" aria-label="${ko?'정렬':'Sort works'}"><button data-sort="selected" aria-pressed="true">${ko?'선택 작업순':'Selected works'}</button><button data-sort="newest" aria-pressed="false">${ko?'최신순':'Newest first'}</button><button data-sort="title" aria-pressed="false">${ko?'이름순':'Title A–Z'}</button></div></div><div class="search-row"><label for="search">${ko?'작업 검색':'Search works'}</label><input id="search" type="search" placeholder="${ko?'제목, 유형, 연도':'Title, medium, year'}" autocomplete="off"><button type="button" id="clear-search" hidden>${ko?'지우기':'Clear'} ×</button></div><section class="work-grid" aria-label="${ko?'작품 목록':'Project collection'}">${cards}</section><p class="empty-state" hidden>${ko?'검색 결과가 없습니다. 다른 검색어를 입력해 주세요.':'No works found. Try another title, medium, or year.'}</p></main>
${siteFooter({site, lang})}</div></body></html>`;
}
