import { siteNavigation, siteFooter } from './navigation.mjs';
import { escapeHtml as esc } from './html.mjs';
import { pick, resolveMediaPath } from './catalog.mjs';
import { workCoverImage, workHoverImage } from '../../admin/public/work-images.mjs';
import { workFilterTypes } from './work-filters.mjs';

export function greenArchivePage(works, site, lang, page = 'index.html') {
  const ko = lang === 'ko', assets = ko ? '../' : '';
  const selected = site.selected_projects || [];
  const ordered = [...works].sort((a,b) => {
    const rank = w => selected.includes(w.slug) ? selected.indexOf(w.slug) : selected.length;
    return rank(a)-rank(b) || Number(b.year)-Number(a.year);
  });
  const cards = ordered.map((w,i) => {
    const title = pick(w,'title',lang), type = pick(w,'meta_type',lang) || '';
    const src = workCoverImage(w), hoverSrc = src && workHoverImage(w);
    const details = [type, w.year].filter(value => value != null && String(value).trim() !== '').map(value => esc(value)).join(' / ');
    return `<article class="work-card" data-title="${esc(title)}" data-year="${esc(w.year)}" data-types="${esc(JSON.stringify(workFilterTypes(w)))}" data-order="${i}" data-search="${esc(`${title} ${type} ${w.year}`.toLowerCase())}"><a href="work/${esc(w.slug)}.html"><div class="work-image">${src ? `<img src="${esc(resolveMediaPath(src,assets))}" alt="${esc(title)}" ${i<3?'fetchpriority="high"':'loading="lazy"'} decoding="async">${hoverSrc ? `<img class="work-hover-image" src="${esc(resolveMediaPath(hoverSrc,assets))}" alt="" aria-hidden="true" loading="lazy" decoding="async">` : ''}` : `<span class="no-image">${esc(title)}</span>`}</div><div class="work-caption"><h2>${esc(title)}</h2><p>${details}</p></div></a></article>`;
  }).join('');
  return `<!doctype html><html id="top" lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#15591f"><meta name="description" content="3Dowon — Interactive media, objects and spatial experiences."><title>Works — 3Dowon</title><link rel="icon" href="${assets}assets/green-archive/3dowon.png"><link rel="stylesheet" href="${assets}assets/green-archive/archive.css?v=9"><link rel="stylesheet" href="${assets}assets/green-archive/menu.css?v=22"><link rel="stylesheet" href="${assets}assets/green-archive/layout.css?v=41"><script src="${assets}assets/green-archive/menu.js?v=13" defer></script><script src="${assets}assets/green-archive/hover.js?v=1" defer></script><script src="${assets}assets/green-archive/filters.js?v=2" defer></script></head>
<body class="archive-layout page-archive"><a class="skip" href="#main">${ko?'본문으로 이동':'Skip to content'}</a>
<div class="archive-shell">
<header class="archive-header">${siteNavigation({site,lang,active:'works',languageHref:(ko?'../':'ko/')+page})}</header>
<main id="main"><h1 class="page-title-hidden">${ko?'작업 / Works':'Works'}</h1><p class="archive-results" role="status" hidden></p><section class="work-grid" aria-label="${ko?'작품 목록':'Project collection'}">${cards}</section><div class="archive-empty" hidden><p>${ko?'조건에 맞는 작업이 없습니다.':'No works match these filters.'}</p><a data-work-filter href="works.html">${ko?'모든 작업 보기':'View all works'}</a></div></main>
${siteFooter({site, lang})}</div></body></html>`;
}
