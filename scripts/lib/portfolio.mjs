import { escapeHtml as esc, vimeoEmbedHtml } from './html.mjs';
import { pick, resolveMediaPath, workFormY, formKey } from './catalog.mjs';

const VERSION = '1067';
const COPY = {
  ko: { works: '작업', lab: '실험', about: '소개', portfolio: '포트폴리오', cv: '이력', photos: '사진', index: '목차', allYears: '모든 연도', allFields: '모든 분야', space: '공간', object: '오브젝트', screen: '스크린', year: '연도', field: '분야', name: '작업명', back: '작업 목록', previous: '이전 작업', next: '다음 작업', close: '닫기', enlarge: '크게 보기', practice: '작업', approach: '작업 방식', fields: '작업 분야', noResults: '조건에 맞는 작업이 없습니다.', reset: '필터 초기화', note: '빛, 공간, 일상의 사물을 연결하는\n인터랙티브 설치와 미디어 실험.', artist: '인터랙티브 미디어 아티스트', type: '유형', medium: '매체', tech: '기술', production: '제작', skip: '본문으로 이동' },
  en: { works: 'Works', lab: 'Lab', about: 'About', portfolio: 'Portfolio', cv: 'CV', photos: 'Images', index: 'Index', allYears: 'All years', allFields: 'All fields', space: 'Space', object: 'Object', screen: 'Screen', year: 'Year', field: 'Field', name: 'Project', back: 'All works', previous: 'Previous work', next: 'Next work', close: 'Close', enlarge: 'Enlarge image', practice: 'Practice', approach: 'Approach', fields: 'Fields', noResults: 'No work matches these filters.', reset: 'Reset filters', note: 'How do familiar objects change\nour experience of space? How do everyday\nactions change it?', artist: 'Interactive media artist', type: 'Type', medium: 'Medium', tech: 'Technology', production: 'Production', skip: 'Skip to content' },
};
const number = (n) => String(n).padStart(2, '0');
const paragraphs = (value) => String(value || '').split(/\r?\n\s*\r?\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
// Content entries contain authored HTML; normalize literal line breaks left by older imports.
const richText = (value) => String(value || '').replace(/\r\n?/g, '\n').replace(/[ \t]+(?=\n)/g, '').replace(/\\n\s*(?=<)/g, '\n');

function context(lang, relPath, section = 'works') {
  const home = relPath.includes('/') ? '../' : '';
  const c = { ...COPY[lang] };
  if (section === 'lab') Object.assign(c, lang === 'ko'
    ? { back: '실험 목록', previous: '이전 실험', next: '다음 실험', noResults: '조건에 맞는 실험이 없습니다.' }
    : { back: 'All studies', previous: 'Previous study', next: 'Next study', noResults: 'No study matches these filters.' });
  return { lang, relPath, home, section, directory: section === 'lab' ? 'lab' : 'work', assets: home + (lang === 'ko' ? '../' : ''), c };
}

function image(src, alt, ctx, { lazy = true, className = '' } = {}) {
  if (!src) return '';
  return `<img src="${esc(resolveMediaPath(src, ctx.assets))}" alt="${esc(alt)}"${className ? ` class="${className}"` : ''} ${lazy ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async" />`;
}

function socials(site) {
  return [['Email', `mailto:${site.email}`], ['Instagram', site.instagram], ['Vimeo', site.vimeo], ['YouTube', site.youtube]]
    .filter(([, href]) => href).map(([label, href]) => `<a href="${esc(href)}"${href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${label}<span aria-hidden="true"> ↗</span></a>`).join('');
}

function shell(ctx, site, { active, title, body, pageClass = '', toolbar = '', catalog = '' }) {
  const { c, home, assets, relPath, lang } = ctx;
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#ffffff" />
  <meta name="description" content="${esc(c.note.replace(/\n/g, ' '))}" />
  <title>${esc(title)} — 3Dowon</title>
  ${catalog === 'works' ? `<script>document.documentElement.classList.add('works-reveal');</script>` : ''}
  <link rel="stylesheet" href="${assets}styles.css?v=${VERSION}" />
  <script src="${assets}script.js?v=${VERSION}" defer${catalog === 'works' ? ` onerror="document.documentElement.classList.remove('works-reveal')"` : ''}></script>
</head>
<body class="portfolio ${pageClass}" data-home="${home}" data-section="${active}">
  <a class="skip-link" href="#main">${c.skip}</a>
  <div class="site-frame">
    <header class="site-header archive-site-header">
      <a class="wordmark" href="${home}index.html" aria-label="3Dowon ${lang === 'ko' ? '홈' : 'Home'}">3Dowon</a>
      <p class="header-note">${esc(c.note).replace(/\n/g, '<br />')}</p>
      <nav class="site-nav" aria-label="${lang === 'ko' ? '주 메뉴' : 'Main navigation'}">
        ${['works', 'lab', 'about', 'portfolio', 'cv'].map((key) => `<a href="${home}${key}.html"${active === key ? ' aria-current="page"' : ''}>${c[key]}</a>`).join('')}
      </nav>
    </header>
    <main id="main" tabindex="-1"${catalog ? ` data-catalog="${catalog}"` : ''}>
      <div class="page-toolbar"${toolbar ? '' : ' aria-hidden="true"'}>${toolbar}</div>
      <div class="page-content">${body}</div>
    </main>
    <footer class="site-footer"><a class="footer-wordmark" href="${home}index.html">3Dowon</a><div class="footer-contact"><p>${lang === 'ko' ? '문의' : 'Enquiries'}</p><a href="mailto:${esc(site.email)}">E. &nbsp;${esc(site.email)}</a></div><div class="footer-links">${socials(site)}</div><a class="back-to-top" href="#main">${lang === 'ko' ? '맨 위로' : 'Back to top'} ↑</a><span class="footer-copyright">© ${new Date().getFullYear()} 3Dowon</span><span class="footer-practice">${c.artist}</span></footer>
  </div>
  <dialog class="media-dialog" id="media-dialog" aria-labelledby="viewer-title"><header><h2 id="viewer-title"></h2><a id="viewer-work" hidden>${lang === 'ko' ? '작업 보기' : 'View work'} ↗</a><button type="button" data-close-viewer>${c.close} ×</button></header><div id="viewer-media"></div></dialog>
</body>
</html>
`;
}

function projectImages(work, ctx) {
  const thumbnail = resolveMediaPath(work.thumbnail, ctx.assets);
  const media = [...new Set([work.thumbnail, work.hero_image, ...work.gallery].filter(Boolean).map((src) => resolveMediaPath(src, ctx.assets)))];
  return ctx.section === 'works' ? media.filter((src) => src !== thumbnail) : media;
}

function overviewImages(work, ctx) {
  const hidden = new Set((work.works_hidden_images || []).map(src => resolveMediaPath(src, ctx.assets)));
  return projectImages(work, ctx).filter(src => ctx.section !== 'works' || !hidden.has(src));
}

function overviewGrid(works, ctx, toolbar = '') {
  const entries = works.map((work, index) => {
    const title = pick(work, 'title', ctx.lang);
    const projectNumber = number(index + 1);
    const field = work.field || formKey(workFormY(work));
    const medium = pick(work, 'meta_medium', ctx.lang) || pick(work, 'meta_type', ctx.lang) || ctx.c[field];
    const categories = [...new Set(medium.split(/[,，]/).map((value) => value.trim()).filter(Boolean))];
    const media = overviewImages(work, ctx);
    const href = `${ctx.directory}/${work.slug}.html`;
    const openLabel = ctx.section === 'lab'
      ? (ctx.lang === 'ko' ? '실험 보기' : 'View study')
      : (ctx.lang === 'ko' ? '작업 보기' : 'View project');
    const attrs = `data-year="${esc(work.year || '')}" data-field="${field}"`;
    const project = ctx.section === 'works'
      ? `<li class="works-index-item" data-overview-project data-project="${esc(work.slug)}" ${attrs}><a class="works-index-link" href="${esc(href)}"><span class="works-index-number">${projectNumber}</span><h2 class="works-index-title">${esc(title)}</h2><span class="works-index-year">${esc(work.meta_year || work.year || '')}</span></a></li>`
      : `<article class="overview-project" data-overview-project data-project="${esc(work.slug)}" ${attrs}>
      <a class="project-summary" href="${esc(href)}"><div><span class="project-number">${projectNumber}</span><h2>${esc(title)}</h2></div><div class="project-summary-bottom"><p>${esc(pick(work, 'meta_tech', ctx.lang) || '')}</p>${work.year ? `<p class="lab-date">${esc(work.year)}${work.month ? '.' + String(work.month).padStart(2, '0') : ''}</p>` : ''}</div></a>
    </article>`;
    const images = media.map((src, i) => `<figure class="overview-image" data-plate data-project="${esc(work.slug)}" ${attrs}>${ctx.section === 'lab' ? '' : `<span class="image-reference">${projectNumber}.${i + 1}</span>`}<a class="overview-image-link" href="${esc(href)}" aria-label="${esc(title)} · ${openLabel}"><img src="${esc(src)}" alt="${esc(title)} — ${i + 1}" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" /></a></figure>`).join('');
    const video = ctx.section === 'lab' && work.video ? `<figure class="overview-image" data-plate data-project="${esc(work.slug)}" ${attrs}><a class="overview-image-link" href="${esc(href)}" aria-label="${esc(title)} · ${openLabel}"><video src="${esc(resolveMediaPath(work.video, ctx.assets))}" autoplay muted loop playsinline preload="metadata" aria-label="${esc(title)}"></video></a></figure>` : '';
    return { project, images: video + images };
  });
  if (ctx.section === 'works') {
    const templates = works.map((work, index) => {
      const { title, metadata, description, gallery } = projectContent(work, ctx);
      return `<template data-project-detail="${esc(work.slug)}"><button type="button" class="inline-all-works" data-all-works>← All Works</button><article class="inline-work" aria-labelledby="works-project-title">${gallery}<div class="inline-project-information"><header class="inline-project-heading"><p class="eyebrow">Work ${number(index + 1)}</p><h2 id="works-project-title">${esc(title)}</h2></header>${metadata ? `<div class="project-facts">${metadata}</div>` : ''}${description ? `<div class="prose post-des">${description}</div>` : ''}</div></article></template>`;
    }).join('');
    return `<div class="works-layout"><nav class="works-index" aria-label="${ctx.lang === 'ko' ? '작품 목록' : 'Project index'}"><div class="works-index-controls"><button type="button" class="works-all" data-all-works hidden>All Works</button><button type="button" class="works-filter-toggle" aria-expanded="false" aria-controls="works-filter-panel">Filter +</button></div><div id="works-filter-panel" hidden>${toolbar}</div><div class="works-filter-tags" aria-label="${ctx.lang === 'ko' ? '선택한 필터' : 'Active filters'}" hidden></div><ol>${entries.map((entry) => entry.project).join('\n')}</ol></nav><div class="works-stage"><div class="overview-grid works-image-grid">${entries.map((entry) => entry.images).join('\n')}</div><section class="works-project-panel" tabindex="-1" aria-labelledby="works-project-title" hidden></section></div>${templates}</div>`;
  }
  return `<div class="overview-grid">${entries.map((entry) => `<div class="lab-entry">${entry.images}${entry.project}</div>`).join('\n')}</div>`;
}

export function catalogPage(works, site, lang, relPath = 'works.html', section = 'works') {
  const ctx = context(lang, relPath, section);
  const { c } = ctx;
  const years = [...new Set(works.map((work) => work.year).filter(Boolean))].sort((a, b) => b - a);
  const photoCount = works.reduce((count, work) => count + overviewImages(work, ctx).length, 0);
  const countLabel = section === 'lab' ? (lang === 'ko' ? '개 실험' : ' studies') : (lang === 'ko' ? '개 작업' : ' works');
  const toolbar = `<header class="catalog-toolbar">
      <p id="catalog-count" role="status"${section === 'lab' ? ' hidden' : ''}>${works.length}${countLabel} · ${photoCount}${lang === 'ko' ? '장' : ' images'}</p>
      <div class="toolbar-cell catalog-filters">${section !== 'lab' && years.length ? `<label><span class="visually-hidden">${c.year}</span><select name="year" aria-label="${c.year}"><option value="all">${c.allYears}</option>${years.map((year) => `<option value="${year}">${year}</option>`).join('')}</select></label>` : ''}<label${section === 'lab' ? ' hidden' : ''}><span class="visually-hidden">${c.field}</span><select name="field" aria-label="${c.field}"><option value="all">${c.allFields}</option>${['space', 'object', 'screen'].map((key) => `<option value="${key}">${c[key]}</option>`).join('')}</select></label></div>
    </header>`;
  const body = `<section class="catalog-section" aria-labelledby="page-title">
    <h1 id="page-title" class="visually-hidden">${c[section]}</h1>
    ${overviewGrid(works, ctx, section === 'works' ? toolbar : '')}
    <div class="catalog-empty" hidden><p>${c.noResults}</p><button type="button" data-reset-filters>${c.reset} ↗</button></div>
  </section>`;
  return shell(ctx, site, { active: section, title: c[section], body, toolbar: section === 'works' ? '' : toolbar, catalog: section, pageClass: `page-${section}` });
}

export function labPage(studies, site, lang) {
  return catalogPage(studies, site, lang, 'lab.html', 'lab');
}

export function aboutPage(about, site, lang) {
  const ctx = context(lang, 'about.html');
  const { c } = ctx;
  const paras = paragraphs(pick(about, 'body', lang));
  const fields = lang === 'ko' ? ['인터랙티브 설치', '피지컬 컴퓨팅', '실시간 그래픽', '센서 기술'] : ['Interactive installation', 'Physical computing', 'Real-time graphics', 'Sensor technology'];
  const body = `<article class="editorial-article about-article">
    <section class="about-information" tabindex="0" aria-labelledby="page-title">
      <h1 id="page-title" class="visually-hidden">${esc(pick(about, 'name', lang))}</h1>
      <div class="prose about-prose">${paras.map((para) => `<p>${esc(para)}</p>`).join('')}</div>
      <section class="about-fields"><h2 class="visually-hidden">${c.fields}</h2><ul>${fields.map((field) => `<li>${field}</li>`).join('')}</ul></section>
      <address class="about-contact">${socials(site)}</address>
    </section>
    <figure class="about-image">${image(about.image, pick(about, 'name', lang), ctx, { lazy: false })}</figure>
  </article>`;
  return shell(ctx, site, { active: 'about', title: c.about, body, pageClass: 'page-about' });
}

export function portfolioPage(site, lang, portfolio = { images: [] }) {
  const ctx = context(lang, 'portfolio.html');
  const pages = portfolio.images || [];
  return shell(ctx, site, {
    active: 'portfolio', title: ctx.c.portfolio, pageClass: 'page-portfolio',
    body: `<h1 id="page-title" class="visually-hidden">${ctx.c.portfolio}</h1><section class="portfolio-book" aria-label="Portfolio" tabindex="0">${pages.map((src, i) => `<img class="portfolio-slide" src="${esc(resolveMediaPath(src, ctx.assets))}" alt="Portfolio ${i + 1}" ${i ? 'hidden loading="lazy"' : 'fetchpriority="high"'} decoding="async" />`).join('')}${pages.length > 1 ? `<button class="portfolio-prev" aria-label="${lang === 'ko' ? '이전 페이지' : 'Previous page'}"></button><button class="portfolio-next" aria-label="${lang === 'ko' ? '다음 페이지' : 'Next page'}"></button>` : ''}<span class="visually-hidden portfolio-status" role="status"></span></section>`,
  });
}

export function cvPage(cv, site, lang) {
  const ctx = context(lang, 'cv.html');
  const { c } = ctx;
  const titles = { Education: '학력', Experience: '경력', 'Professional Experience': '경력', Exhibitions: '전시', Awards: '수상', Training: '교육', Courses: '교육', 'Training & Courses': '교육' };
  const sections = cv.sections.map((section, index) => `<section class="cv-section"><h2><span class="section-number">${number(index + 1)}</span>${esc(lang === 'ko' ? titles[section.title] || section.title : section.title)}</h2><dl>${section.entries.map((entry) => `<div class="cv-row"><dt>${esc(entry.year)}</dt><dd>${richText(pick(entry, 'description', lang))}${entry.teaching_materials ? ` <a class="teaching-link" href="teaching-materials.html">${lang === 'ko' ? '강의 자료' : 'Teaching Materials'} ↗</a>` : ''}</dd></div>`).join('')}</dl></section>`);
  const body = `<article class="editorial-article cv-article" aria-labelledby="page-title">
    <h1 id="page-title" class="visually-hidden">CV</h1>
    <div class="cv-sections">${sections.join('')}</div>
  </article>`;
  return shell(ctx, site, { active: 'cv', title: c.cv, body, pageClass: 'page-cv' });
}

export function teachingMaterialsPage(materials, site, lang) {
  const ctx = context(lang, 'teaching-materials.html');
  const title = lang === 'ko' ? '강의 자료' : 'Teaching Materials';
  const items = materials.items || [];
  const body = `<article class="teaching-materials"><a class="archive-back" href="cv.html">← CV</a><h1>${title}</h1><p class="teaching-intro">${lang === 'ko' ? 'XR실감형 영상 콘텐츠 편집 및 제작 · 한강미디어고등학교' : 'XR Immersive Video Content Editing and Production · Hangang Media High School'}<br>2024.07–2024.08</p>${items.length ? `<div class="teaching-grid">${items.map((item, index) => {
    const href = resolveMediaPath(item.file, ctx.assets);
    const label = pick(item, 'title', lang);
    return `<section class="teaching-card"><iframe class="pdf-preview" src="${esc(href)}#page=1&view=FitH&toolbar=0&navpanes=0" title="${esc(label)}" loading="lazy"></iframe><h2><span>${number(index + 1)}</span> ${esc(label)}</h2><a href="${esc(href)}" target="_blank" rel="noopener">${lang === 'ko' ? 'PDF 보기' : 'View PDF'} ↗</a></section>`;
  }).join('')}</div>` : `<p class="teaching-empty">${lang === 'ko' ? '강의 자료를 준비 중입니다.' : 'Teaching materials will be available soon.'}</p>`}</article>`;
  return shell(ctx, site, { active: 'cv', title, body, pageClass: 'page-teaching-materials' });
}

function projectContent(work, ctx) {
  const { c, lang } = ctx;
  const title = pick(work, 'title', lang);
  const media = projectImages(work, ctx);
  const year = work.meta_year || work.year;
  const video = vimeoEmbedHtml(work.vimeo_url, title) || (work.video ? `<div class="post-video"><video ${ctx.section === 'lab' ? 'autoplay muted loop' : 'controls'} playsinline preload="metadata" aria-label="${esc(title)}" src="${esc(resolveMediaPath(work.video, ctx.assets))}"></video></div>` : '');
  const figure = (src, position) => `<figure class="project-image"><a href="${esc(src)}" data-viewer="${esc(src)}" data-viewer-title="${esc(title)} — ${number(position + 1)}" aria-label="${esc(title)} ${position + 1} — ${c.enlarge}"><img src="${esc(src)}" alt="${esc(title)} — ${position + 1}" class="project-detail-image" ${position === 0 && !video ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" /></a></figure>`;
  const metadata = [
    [['year', year], ...(ctx.section === 'lab' ? [] : [['type', pick(work, 'meta_type', lang)], ['medium', pick(work, 'meta_medium', lang)]])],
    [['tech', pick(work, 'meta_tech', lang)], ['production', pick(work, 'meta_production', lang)]],
  ].map((entries) => entries.filter(([, value]) => value)).filter((entries) => entries.length)
    .map((entries) => `<dl class="work-meta">${entries.map(([label, value]) => `<div><dt>${c[label]}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`).join('');
  const background = /^#[0-9a-f]{6}$/i.test(work.detail_background || '') ? work.detail_background : '#dddddd';
  const columns = [1, 2, 3].includes(Number(work.detail_columns)) ? Number(work.detail_columns) : 1;
  return { title, metadata, description: richText(pick(work, 'description', lang)), gallery: `<div class="feature-gallery" style="--detail-paper:${background};--detail-columns:${columns}">${video}${media.map(figure).join('')}</div>` };
}

export function workPage(work, works, site, lang, section = 'works') {
  const directory = section === 'lab' ? 'lab' : 'work';
  const ctx = context(lang, `${directory}/${work.slug}.html`, section);
  const { c } = ctx;
  const { title, metadata, description, gallery } = projectContent(work, ctx);
  const index = works.findIndex((item) => item.slug === work.slug);
  const mediaArrow = (offset) => {
    const target = works[index + offset];
    const direction = offset < 0 ? 'previous' : 'next';
    const label = offset < 0 ? c.previous : c.next;
    return target ? `<a class="study-arrow study-arrow-${direction}" href="${esc(target.slug)}.html" aria-label="${esc(label)}: ${esc(pick(target, 'title', lang))}"></a>` : `<span class="study-arrow study-arrow-${direction}" aria-hidden="true" data-disabled></span>`;
  };
  const detailGallery = section === 'lab' ? `${gallery.slice(0, -6)}${mediaArrow(-1)}${mediaArrow(1)}</div>` : gallery;
  const adjacent = (offset, label) => {
    const next = works[index + offset];
    return next ? `<a href="${esc(next.slug)}.html"><span>${label} ${offset < 0 ? '↖' : '↗'}</span><strong>${esc(pick(next, 'title', lang))}</strong></a>` : '<span></span>';
  };
  const toolbar = `<nav class="detail-toolbar" aria-label="${c[section]}"><a class="archive-back" href="../${section}.html">← ${c.back}</a><span class="eyebrow">${section === 'lab' ? 'Lab' : 'Work'} ${number(index + 1)}</span></nav>`;
  const body = `<article class="editorial-article work-article" aria-labelledby="page-title">
    <header class="feature-heading"><h1 class="post-title" id="page-title">${esc(title)}</h1></header>
    <div class="project-information">
      ${metadata ? `<div class="project-facts">${metadata}</div>` : ''}
      ${description ? `<div class="prose post-des">${description}</div>` : ''}
    </div>
    ${detailGallery}
  </article>${section === 'lab' ? '' : `<nav class="project-pagination" aria-label="${c[section]}">${adjacent(-1, c.previous)}${adjacent(1, c.next)}</nav>`}`;
  return shell(ctx, site, { active: section, title, body, toolbar, pageClass: `page-work page-archive-work${section === 'lab' ? ' page-study' : ''}` });
}

