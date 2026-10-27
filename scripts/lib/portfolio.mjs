import { siteNavigation, siteFooter } from './navigation.mjs';
import { pageLoadingHead } from './page-loading.mjs';
import {videoTheme} from './video-theme.mjs';
import {galleryRows} from '../../admin/public/gallery-layout.mjs';
import { escapeHtml as esc, vimeoEmbedHtml } from './html.mjs';
import { pick, resolveMediaPath, workFormY, formKey } from './catalog.mjs';
import { selectRelatedWorks } from '../../admin/public/related-works.mjs';
import { workCoverImage } from '../../admin/public/work-images.mjs';

const VERSION = '1127-white-default-background';
const isGalleryVideo = src => /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i.test(src || '');
const productionLabel = (work, lang) => work.production === '회사' && work.company?.trim()
  ? work.company.trim()
  : String(pick(work, 'meta_production', lang) || '').replace(/^(?:회사|Company)\s*[.·:]\s*/i, '');
const COPY = {
  ko: { works: '작업', lab: '실험', about: '소개', portfolio: '포트폴리오', cv: '이력', photos: '사진', index: '목차', allYears: '모든 연도', allFields: '모든 분야', space: '공간', object: '오브젝트', screen: '스크린', year: '연도', field: '분야', name: '작업명', back: '작업 목록', previous: '이전 작업', next: '다음 작업', close: '닫기', enlarge: '크게 보기', practice: '작업', approach: '작업 방식', fields: '작업 분야', noResults: '조건에 맞는 작업이 없습니다.', reset: '필터 초기화', note: '빛, 공간, 일상의 사물을 연결하는\n인터랙티브 설치와 미디어 실험.', artist: '인터랙티브 미디어 아티스트', type: '유형', medium: '매체', tech: '기술', production: '제작', skip: '본문으로 이동' },
  en: { works: 'Works', lab: 'Lab', about: 'About', portfolio: 'Portfolio', cv: 'CV', photos: 'Images', index: 'Index', allYears: 'All years', allFields: 'All fields', space: 'Space', object: 'Object', screen: 'Screen', year: 'Year', field: 'Field', name: 'Project', back: 'All works', previous: 'Previous work', next: 'Next work', close: 'Close', enlarge: 'Enlarge image', practice: 'Practice', approach: 'Approach', fields: 'Fields', noResults: 'No work matches these filters.', reset: 'Reset filters', note: 'How do familiar objects change\nour experience of space? How do familiar actions\nchange our experience of space?', artist: 'Interactive Media Artist', type: 'Type', medium: 'Medium', tech: 'Technology', production: 'Production', skip: 'Skip to content' },
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
  return [['Instagram', site.instagram], ['YouTube', site.youtube], ['GitHub', site.github], ['Naver Blog', site.naver_blog]]
    .filter(([, href]) => href).map(([label, href]) => `<a href="${esc(href)}"${href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}<span aria-hidden="true"> ↗</span></a>`).join('');
}

function labMotion(src, title, work, ctx) {
  const preview = Object.entries(work.lab_previews || {}).find(([source]) => resolveMediaPath(source, ctx.assets) === src)?.[1];
  const poster = preview ? resolveMediaPath(preview.src, ctx.assets) : '';
  const fallback = preview?.loop ? resolveMediaPath(preview.loop, ctx.assets) : '';
  const ratio = preview ? preview.width / preview.height : 16 / 9;
  return `<span class="lab-motion" data-lab-motion data-playback="loading" data-orientation="${ratio > 1 ? 'landscape' : 'portrait'}" style="--lab-motion-ratio:${ratio}"><video src="${esc(src)}"${poster ? ` poster="${esc(poster)}"` : ''} autoplay muted loop playsinline webkit-playsinline preload="auto" disablepictureinpicture aria-label="${esc(title)}"></video>${fallback ? `<img class="lab-motion-fallback" data-src="${esc(fallback)}" alt="${esc(title)}" decoding="async" />` : ''}<span class="lab-motion-preview" aria-hidden="true">${poster ? `<img src="${esc(poster)}" alt="" decoding="async" />` : ''}</span></span>`;
}

function shell(ctx, site, { active, title, body, pageClass = '', toolbar = '', catalog = '' }) {
  const { c, home, assets, relPath, lang } = ctx;
  const isDetail = pageClass.includes('page-work');
  // Non-detail pages share one heading and its accessible label.
  if (!isDetail) body = body.replace(/<h1 id="page-title" class="visually-hidden">[\s\S]*?<\/h1>/, '');
  return `<!DOCTYPE html>
<html id="top" lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${pageLoadingHead(assets, lang)}
  <meta name="theme-color" content="#ffffff" />
  <meta name="description" content="${esc(c.note.replace(/\n/g, ' '))}" />
  <title>${esc(title)} — 3Dowon</title>
  ${catalog === 'works' ? `<script>document.documentElement.classList.add('works-reveal');</script>` : ''}
  <link rel="stylesheet" href="${assets}styles.css?v=${VERSION}" />
  <link rel="stylesheet" href="${assets}selected.css?v=reference-rows-1" />
  <link rel="stylesheet" href="${assets}assets/green-archive/brand.css?v=1" />
  <link rel="stylesheet" href="${assets}assets/green-archive/menu.css?v=38" />
  <link rel="stylesheet" href="${assets}assets/green-archive/layout.css?v=97" />
  ${pageClass.includes('page-work') && ctx.section === 'works' ? `<link rel="stylesheet" href="${assets}assets/green-archive/detail.css?v=52" /><script src="${assets}assets/green-archive/detail.js?v=20" defer></script>` : ''}
  <script src="${assets}assets/green-archive/menu.js?v=28" defer></script>
  <script src="${assets}script.js?v=${VERSION}" defer${catalog === 'works' ? ` onerror="document.documentElement.classList.remove('works-reveal')"` : ''}></script>${ctx.section === 'lab' ? `\n  <script src="${assets}assets/lab-motion.js?v=${VERSION}" defer></script>` : ''}
  ${body.includes('<mux-player') ? '<script src="https://cdn.jsdelivr.net/npm/@mux/mux-player@3.8.0" defer></script>' : ''}
</head>
<body class="portfolio archive-layout ${pageClass}${active === 'works' ? ' quiet-site' : ''}" data-home="${home}" data-section="${active}">
  ${body.includes('<mux-player') ? videoTheme : ''}
  <a class="skip-link" href="#main">${c.skip}</a>
  <div class="site-frame">
    <header class="site-header archive-site-header">${siteNavigation({site,home,lang,active,languageHref:`${assets}${lang === 'en' ? 'ko/' : ''}${relPath}`})}</header>
    <main id="main" tabindex="-1"${catalog ? ` data-catalog="${catalog}"` : ''}>
      ${isDetail ? '' : ['about', 'works', 'lab', 'portfolio', 'cv'].includes(active) ? `<h1 id="page-title" class="page-title-hidden">${esc(title)}</h1>` : `<div class="page-heading"><h1 id="page-title">${esc(title)}</h1></div>`}
      ${!isDetail || toolbar ? `<div class="page-toolbar"${toolbar ? '' : ' aria-hidden="true"'}>${toolbar}</div>` : ''}
      <div class="page-content">${body}</div>
    </main>
    ${siteFooter({home, site, lang})}
  </div>
  <dialog class="media-dialog" id="media-dialog" aria-labelledby="viewer-title"><header><h2 id="viewer-title"></h2><a id="viewer-work" hidden>${lang === 'ko' ? '작업 보기' : 'View work'} ↗</a><button type="button" data-close-viewer aria-label="${c.close}">${c.close} ×</button></header><div id="viewer-media"></div></dialog>
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
    const medium = pick(work, 'meta_medium', 'en') || pick(work, 'meta_type', 'en') || ctx.c[field];
    const categories = [...new Set(medium.split(/[,，]/).map((value) => value.trim()).filter(Boolean))];
    const media = overviewImages(work, ctx);
    const href = `${ctx.directory}/${work.slug}.html`;
    const openLabel = ctx.section === 'lab'
      ? (ctx.lang === 'ko' ? '크게 보기' : 'Enlarge preview')
      : (ctx.lang === 'ko' ? '작업 보기' : 'View project');
    const attrs = `data-year="${esc(work.year || '')}" data-field="${field}"`;
    const mediaLink = (src, content) => `<a class="overview-image-link" href="${esc(ctx.section === 'lab' ? src : href)}"${ctx.section === 'lab' ? ` data-viewer="${esc(src)}" data-viewer-type="${isGalleryVideo(src) ? 'video' : 'image'}" data-viewer-title="${esc(title)}" aria-haspopup="dialog" aria-controls="media-dialog"` : ''} aria-label="${esc(title)} · ${openLabel}">${content}</a>`;
    const project = ctx.section === 'works'
      ? `<li class="works-index-item" data-overview-project data-project="${esc(work.slug)}" ${attrs}><a class="works-index-link" href="${esc(href)}"><span class="works-index-number">${projectNumber}</span><h2 class="works-index-title">${esc(title)}</h2><span class="works-index-year">${esc(work.meta_year || work.year || '')}</span></a></li>`
      : `<article class="overview-project" data-overview-project data-project="${esc(work.slug)}" ${attrs}>
      <div class="project-summary"><div><span class="project-number">${projectNumber}</span><h2>${esc(title)}</h2></div><div class="project-summary-bottom"><p>${esc(pick(work, 'meta_tech', ctx.lang) || '')}</p>${work.year ? `<p class="lab-date">${esc(work.year)}${work.month ? '.' + String(work.month).padStart(2, '0') : ''}</p>` : ''}</div></div>
    </article>`;
    const images = media.map((src, i) => `<figure class="overview-image" data-plate data-project="${esc(work.slug)}" ${attrs}>${ctx.section === 'lab' ? '' : `<span class="image-reference">${projectNumber}.${i + 1}</span>`}${mediaLink(src, isGalleryVideo(src) ? (ctx.section === 'lab' ? labMotion(src, title, work, ctx) : `<video src="${esc(src)}" autoplay muted loop playsinline preload="metadata" aria-label="${esc(title)} — ${i + 1}"></video>`) : `<img src="${esc(src)}" alt="${esc(title)} — ${i + 1}" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`)}</figure>`).join('');
    const videoSrc = resolveMediaPath(work.video, ctx.assets);
    const video = ctx.section === 'lab' && work.video && !work.mux?.playback_id ? `<figure class="overview-image" data-plate data-project="${esc(work.slug)}" ${attrs}>${mediaLink(videoSrc, labMotion(videoSrc, title, work, ctx))}</figure>` : '';
    const description = String(pick(work, 'description', ctx.lang) || '').trim();
    const previewMeta = [pick(work, 'meta_tech', ctx.lang) || (work.tech || []).join(', '), work.year].filter(Boolean);
    const preview = ctx.section === 'lab' ? `<template data-lab-preview><figcaption class="lab-preview-caption"><h2>${esc(title)}</h2>${description ? `<p class="lab-preview-description">${esc(description)}</p>` : ''}${previewMeta.length ? `<p class="lab-preview-meta">${previewMeta.map(esc).join(' · ')}</p>` : ''}</figcaption></template>` : '';
    return { project, images: video + images, preview };
  });
  if (ctx.section === 'works') {
    const templates = works.map((work, index) => {
      const { title, metadata, description, gallery, process } = projectContent(work, ctx);
      return `<template data-project-detail="${esc(work.slug)}"><button type="button" class="inline-all-works" data-all-works>← All Works</button><article class="inline-work" aria-labelledby="works-project-title">${gallery}<div class="inline-project-information"><header class="inline-project-heading"><p class="eyebrow">Work ${number(index + 1)}</p><h2 id="works-project-title">${esc(title)}</h2></header>${metadata ? `<div class="project-facts">${metadata}</div>` : ''}${description ? `<div class="prose post-des">${description}</div>` : ''}</div>${process}</article></template>`;
    }).join('');
    return `<div class="works-layout"><nav class="works-index" aria-label="${ctx.lang === 'ko' ? '작품 목록' : 'Project index'}"><div class="works-index-controls"><button type="button" class="works-all" data-all-works hidden>All Works</button><button type="button" class="works-filter-toggle" aria-expanded="false" aria-controls="works-filter-panel">Filter +</button></div><div id="works-filter-panel" hidden>${toolbar}</div><div class="works-filter-tags" aria-label="${ctx.lang === 'ko' ? '선택한 필터' : 'Active filters'}" hidden></div><ol>${entries.map((entry) => entry.project).join('\n')}</ol></nav><div class="works-stage"><div class="overview-grid works-image-grid">${entries.map((entry) => entry.images).join('\n')}</div><section class="works-project-panel" tabindex="-1" aria-labelledby="works-project-title" hidden></section></div>${templates}</div>`;
  }
  return `<div class="overview-grid">${entries.map((entry) => `<div class="lab-entry">${entry.images}${entry.project}${entry.preview}</div>`).join('\n')}</div>`;
}

export function catalogPage(works, site, lang, relPath = 'works.html', section = 'works') {
  const ctx = context(lang, relPath, section);
  const { c } = ctx;
  if (section === 'works') {
    const selected = (site.selected_projects || []).map(slug => works.find(work => work.slug === slug)).filter(Boolean);
    const cards = selected.map((work, index) => {
      const title = pick(work, 'title', lang);
      const photos = overviewImages(work, ctx).filter(src => !isGalleryVideo(src)).slice(0, 3);
      const facts = [[c.type, pick(work, 'meta_type', 'en')], [c.tech, pick(work, 'meta_tech', lang) || (work.tech || []).join(', ')], [c.production, productionLabel(work, lang)], [c.year, work.year]].filter(([, value]) => value);
      return `<article class="reference-row"><a class="reference-title" href="work/${esc(work.slug)}.html"><h2>${esc(title)}</h2><span>${esc(work.year)}</span></a><dl class="reference-facts">${facts.map(([label,value]) => `<div><dt>${esc(label)}:</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><div class="reference-photos">${photos.map((src,i) => `<a href="work/${esc(work.slug)}.html" aria-label="${esc(title)} — ${number(i+1)}">${image(src, title, ctx, {lazy:index > 2})}</a>`).join('')}</div></article>`;
    }).join('');
    const archive = works.map(work => `<a href="work/${esc(work.slug)}.html"><span>${esc(pick(work, 'title', lang))}</span><span>${esc(work.year)}</span></a>`).join('');
    const body = `<section class="reference-index" aria-labelledby="page-title"><h1 id="page-title" class="visually-hidden">${lang === 'ko' ? '선택한 작업' : 'Selected works'}</h1>${cards}<details class="reference-archive"><summary>${lang === 'ko' ? '모든 작업' : 'ALL WORKS'} <span>+</span></summary><div>${archive}</div></details></section>`;
    return shell(ctx, site, {active:section, title:c.works, body, pageClass:'page-selected'});
  }
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
  const information = (contentLang) => {
    const paras = paragraphs(pick(about, 'body', contentLang));
    const fields = contentLang === 'ko' ? ['인터랙티브 설치', '피지컬 컴퓨팅', '실시간 그래픽', '센서 기술'] : ['Interactive installation', 'Physical computing', 'Real-time graphics', 'Sensor technology'];
    return `<div class="prose about-prose">${paras.map((para) => `<p>${esc(para)}</p>`).join('')}</div>
      <section class="about-fields"><h2 class="visually-hidden">${COPY[contentLang].fields}</h2><ul>${fields.map((field) => `<li>${field}</li>`).join('')}</ul></section>
      <address class="about-contact">${socials(site)}</address>`;
  };
  const body = `<article class="editorial-article about-article">
    <figure class="about-image">${image(about.image, pick(about, 'name', lang), ctx, { lazy: false })}</figure>
    <section class="about-information" tabindex="0" aria-labelledby="page-title">
      <h1 id="page-title" class="visually-hidden">${esc(pick(about, 'name', lang))}</h1>
      ${information(lang)}
      ${lang === 'ko' ? `<div class="about-size-reference" lang="en" aria-hidden="true" inert>${information('en')}</div>` : ''}
    </section>
  </article>`;
  return shell(ctx, site, { active: 'about', title: c.about, body, pageClass: 'page-about' });
}

export function portfolioPage(site, lang, portfolio = { images: [] }) {
  const ctx = context(lang, 'portfolio.html');
  const pages = portfolio.images || [];
  return shell(ctx, site, {
    active: 'portfolio', title: ctx.c.portfolio, pageClass: 'page-portfolio',
    body: `<h1 id="page-title" class="visually-hidden">${ctx.c.portfolio}</h1><section class="portfolio-book" aria-label="Portfolio" tabindex="0"><div class="portfolio-page-stage">${pages.map((src, i) => `<img class="portfolio-slide" src="${esc(resolveMediaPath(src, ctx.assets))}" alt="Portfolio ${i + 1}" ${i ? 'hidden loading="lazy"' : 'fetchpriority="high"'} decoding="async" />`).join('')}${pages.length > 1 ? `<button class="portfolio-prev" disabled aria-label="${lang === 'ko' ? '이전 페이지' : 'Previous page'}"></button><button class="portfolio-next" aria-label="${lang === 'ko' ? '다음 페이지' : 'Next page'}"></button>` : ''}</div><span class="visually-hidden portfolio-status" role="status"></span></section>`,
  });
}

export function cvPage(cv, site, lang) {
  const ctx = context(lang, 'cv.html');
  const { c } = ctx;
  const titles = { Education: '학력', Experience: '경력', Experiences: '경력', 'Professional Experience': '경력', Exhibitions: '전시', Awards: '수상', Training: '교육', Courses: '교육', 'Training & Courses': '교육' };
  const entryContent = (entry, section) => {
    const description = richText(pick(entry, 'description', lang));
    const parts = description.split(/,\s*(?![^<]*>)/);
    const leadCount = section.title === 'Exhibitions' || (entry.teaching_materials && lang === 'en') ? 2 : 1;
    const primary = parts.slice(0, leadCount).join(', ');
    const secondary = parts.slice(leadCount).join(', ');
    return `<div class="cv-entry-primary">${primary}</div>${secondary ? `<div class="cv-entry-secondary">${secondary}</div>` : ''}${entry.teaching_materials ? `<a class="teaching-link" href="teaching-materials.html">${lang === 'ko' ? '강의 자료' : 'Teaching Materials'} ↗</a>` : ''}`;
  };
  const sections = cv.sections.map((section) => `<section class="cv-section cv-aligned-dates"><h2>${esc(lang === 'ko' ? titles[section.title] || section.title : section.title)}</h2><dl>${section.entries.map((entry) => `<div class="cv-row"><dt>${esc(entry.year)}</dt><dd>${entryContent(entry, section)}</dd></div>`).join('')}</dl></section>`);
  const body = `<article class="editorial-article cv-article" aria-labelledby="page-title">
    <h1 id="page-title" class="visually-hidden">CV</h1>
    <div class="cv-sections">${sections.join('')}</div>
  </article>`;
  return shell(ctx, site, { active: 'cv', title: c.cv, body, pageClass: 'page-cv' });
}

export function teachingMaterialsPage(materials, site, lang) {
  const ctx = context(lang, 'teaching-materials.html');
  const { c } = ctx;
  const title = lang === 'ko' ? '강의 자료' : 'Teaching Materials';
  const items = materials.items || [];
  const body = `<article class="teaching-materials"><a class="archive-back" href="cv.html">← CV</a><p class="teaching-intro">${lang === 'ko' ? 'XR실감형 영상 콘텐츠 편집 및 제작 · 한강미디어고등학교' : 'XR Immersive Video Content Editing and Production · Hangang Media High School'}<br>2024.07–2024.08</p>${items.length ? `<div class="teaching-grid">${items.map((item, index) => {
    const href = resolveMediaPath(item.file, ctx.assets);
    const rawLabel = pick(item, 'title', lang) || item.title || `PDF ${index + 1}`;
    const label = rawLabel.replace(/^\d+[._\s]+/, '').replace(/_/g, ' ').trim();
    return `<section class="teaching-card" data-pdf="${esc(href)}" data-pdf-title="${esc(label)}"><iframe class="pdf-preview" src="${esc(href)}#page=1&view=FitH&toolbar=0&navpanes=0" data-src="${esc(href)}#page=1&view=FitH&toolbar=0&navpanes=0" title="${esc(label)}" loading="lazy"></iframe><button class="pdf-mobile-preview" data-open-pdf aria-label="${esc(label)}"><canvas aria-hidden="true"></canvas><span>${lang === 'ko' ? '자료 열기' : 'Open slides'} →</span></button><h2><button data-open-pdf><span>${number(index + 1)}</span> ${esc(label)}</button></h2><a href="${esc(href)}" target="_blank" rel="noopener" data-open-pdf>${lang === 'ko' ? 'PDF 보기' : 'View PDF'} ↗</a></section>`;
  }).join('')}</div>` : `<p class="teaching-empty">${lang === 'ko' ? '강의 자료를 준비 중입니다.' : 'Teaching materials will be available soon.'}</p>`}</article>`;
  const reader = `<dialog class="pdf-reader"><header><span class="pdf-reader-title"></span><button data-pdf-close aria-label="${c.close}">×</button></header><div class="pdf-reader-stage"><div class="pdf-canvas-scroll"><canvas></canvas></div></div><footer><button data-pdf-step="-1" aria-label="${c.previous}">←</button><span class="pdf-page-status" role="status"></span><button data-pdf-step="1" aria-label="${c.next}">→</button><button data-pdf-zoom>${lang === 'ko' ? '확대' : 'Zoom'}</button></footer><p class="pdf-reader-error" role="alert"></p></dialog><script type="module" src="${ctx.assets}pdf-reader.mjs?v=${VERSION}"></script>`;
  return shell(ctx, site, { active: 'cv', title, body:body + reader, pageClass: 'page-teaching-materials' });
}

// Detail-only editorial sections; preserve authored copy and omit empty sections.
function detailDescription(work, ctx) {
  const source = richText(pick(work, 'description', ctx.lang));
  const parts = source.split(/<(?:p|h[2-4])[^>]*>\s*(?:<strong>)?\s*(?:담당|주요 업무|Role|Responsibilities)\s*(?:<\/strong>)?\s*<\/(?:p|h[2-4])>/i);
  const section = (label, body, open = false) => body?.trim() ? `<details class="detail-disclosure"${open ? ' open' : ''}><summary>${label}</summary><div class="detail-disclosure-copy">${body}</div></details>` : '';
  const responsibilities = Array.isArray(work.responsibility_items)
    ? work.responsibility_items.map(item => {
      const title = pick(item, 'title', ctx.lang) || '';
      const description = pick(item, 'description', ctx.lang) || '';
      if (!title.trim() && !description.trim()) return '';
      return `<section class="detail-responsibility">${title.trim() ? `<h4>${esc(title)}</h4>` : ''}${description.split(/\r?\n/).filter(line => line.trim()).map(line => /^\s*[-•]\s+/.test(line) ? `<p class="responsibility-bullet">${esc(line.trim())}</p>` : `<p>${esc(line)}</p>`).join('')}</section>`;
    }).join('')
    : richText(pick(work, 'responsibilities', ctx.lang)) || parts.slice(1).join('');
  return section(ctx.lang === 'ko' ? '소개' : 'Introduction', parts[0], true)
    + section(ctx.lang === 'ko' ? '주요 업무' : 'Responsibilities', responsibilities)
    + section(ctx.lang === 'ko' ? '문제 해결과 배운 점' : 'Challenges & Lessons Learned', richText(pick(work, 'lessons', ctx.lang)));
}

function projectContent(work, ctx) {
  const { c, lang } = ctx;
  const title = pick(work, 'title', lang);
  const processEntries = ctx.section === 'works' && Array.isArray(work.process) ? work.process : [];
  const processSources = new Set(processEntries.flatMap(entry => entry.images || []).map(src => resolveMediaPath(src, ctx.assets)));
  const media = projectImages(work, ctx).filter(src => !processSources.has(src));
  const yearValue = work.meta_year || work.year;
  const month = Number(work.month);
  const year = yearValue && Number.isInteger(month) && month >= 1 && month <= 12 ? `${yearValue}.${number(month)}` : yearValue;
  const background = /^#[0-9a-f]{6}$/i.test(work.detail_background || '') ? work.detail_background : '#ffffff';
  const imageSizes = new Map(Object.entries(work.image_sizes || {}).map(([src, size]) => [resolveMediaPath(src, ctx.assets), size]));
  const sizeAttributes = src => {
    const size = imageSizes.get(src);
    return size ? ` width="${size.width}" height="${size.height}"` : '';
  };
  const video = (work.mux?.playback_id && /^[a-zA-Z0-9]+$/.test(work.mux.playback_id) ? `<div class="post-video"><div class="post-video-frame"><mux-player theme="${ctx.section === 'works' ? 'margin-video-theme' : 'portfolio-video-theme'}" playback-id="${work.mux.playback_id}" metadata-video-title="${esc(title)}" stream-type="on-demand" preload="metadata" accent-color="${background}" primary-color="${background}"></mux-player></div></div>` : '') || vimeoEmbedHtml(work.vimeo_url, title, background) || (work.video ? `<div class="post-video">${ctx.section === 'lab' ? labMotion(resolveMediaPath(work.video, ctx.assets), title, work, ctx) : `<video controls playsinline preload="metadata" aria-label="${esc(title)}" src="${esc(resolveMediaPath(work.video, ctx.assets))}"></video>`}</div>` : '');
  const figure = (src, position) => isGalleryVideo(src) ? `<figure class="project-image gallery-video">${ctx.section === 'lab' ? labMotion(src, title, work, ctx) : `<video src="${esc(src)}" autoplay muted loop playsinline preload="metadata" aria-label="${esc(title)} — ${position + 1}"></video>`}</figure>` : `<figure class="project-image"><a href="${esc(src)}" data-viewer="${esc(src)}" data-viewer-title="${esc(title)} — ${number(position + 1)}" aria-label="${esc(title)} ${position + 1} — ${c.enlarge}"><img src="${esc(src)}" alt="${esc(title)} — ${position + 1}" class="project-detail-image"${sizeAttributes(src)} ${position === 0 && !video ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" /></a></figure>`;
  const metadata = [
    [['year', year], ...(ctx.section === 'lab' ? [] : [['type', pick(work, 'meta_type', 'en')]])],
    [['tech', pick(work, 'meta_tech', lang)], ['production', productionLabel(work, lang)]],
  ].map((entries) => entries.filter(([, value]) => value)).filter((entries) => entries.length)
    .map((entries) => `<dl class="work-meta">${entries.map(([label, value]) => `<div><dt>${label === 'year' ? (lang === 'ko' ? '날짜' : 'Date') : c[label]}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`).join('');
  const columns = [1, 2, 3].includes(Number(work.detail_columns)) ? Number(work.detail_columns) : 1;
  const documents = ctx.section === 'lab' ? [] : (work.documents || []).filter(item => /^\/3dowonWebpage\/assets\/documents\/[a-zA-Z0-9-]+\.pdf$/.test(item.file || ''));
  const documentLinks = documents.length ? `<div class="project-documents">${documents.map((item, i) => `<a href="${esc(resolveMediaPath(item.file, ctx.assets))}" target="_blank" rel="noopener">${lang === 'ko' ? '보도자료' : 'Press Release'}${documents.length > 1 ? ` ${i + 1}` : ''} ↗</a>`).join('')}</div>` : '';
  const rows = galleryRows(work).map(row => row.map(src => resolveMediaPath(src, ctx.assets)).filter(src => media.includes(src))).filter(row => row.length);
  const assigned = new Set(rows.flat());
  media.filter(src => !assigned.has(src)).forEach(src => rows.unshift([src]));
  const groupedMedia = rows.map(row => `<div class="detail-image-row" style="--row-columns:${row.length}">${row.map(src => figure(src, media.indexOf(src))).join('')}</div>`).join('');
  const processMediaEntries = processEntries.filter(entry => entry.images?.length);
  const process = processMediaEntries.length ? `<div class="detail-process">${processMediaEntries.map(entry => {
    const images = entry.images.map(src => resolveMediaPath(src, ctx.assets));
    return `<section class="detail-process-row"><div class="detail-process-media" style="--detail-paper:${background};--process-columns:${[1,2,3].includes(Number(entry.columns))?Number(entry.columns):1}"><div class="detail-process-images">${images.map(figure).join('')}</div>${pick(entry, 'title', lang)?.trim() ? `<p class="detail-process-caption">${esc(pick(entry, 'title', lang))}</p>` : ''}</div></section>`;
  }).join('')}</div>` : '';
  // A flat media grid keeps the full images visible in the two-column detail layout.
  const detailFigures = rows.flat().map(src => figure(src, media.indexOf(src))).join('');
  const detailProcess = processMediaEntries.map(entry => entry.images.map((src, i) => {
    const caption = pick(entry, 'title', lang)?.trim();
    return figure(resolveMediaPath(src, ctx.assets), i).replace('</figure>', `${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}</figure>`);
  }).join('')).join('');
  const fallback = !video && !detailFigures && !detailProcess && (work.hero_image || work.thumbnail)
    ? figure(resolveMediaPath(work.hero_image || work.thumbnail, ctx.assets), 0) : '';
  const detailMedia = video + detailFigures + detailProcess + fallback;
  const detailGallery = `<section class="detail-gallery" style="--detail-paper:${background}" aria-label="${lang === 'ko' ? '작품 미디어' : 'Project media'}"><div class="detail-media-grid" tabindex="0">${detailMedia || `<p class="detail-media-empty">${lang === 'ko' ? '등록된 이미지가 없습니다.' : 'No images available.'}</p>`}</div><nav class="detail-controls" aria-label="${lang === 'ko' ? '미디어 탐색' : 'Media navigation'}" hidden><span role="status" aria-live="polite"></span><div class="detail-pagination"></div></nav></section>`;
  return { title, metadata, process, detailGallery, description: (ctx.section === 'works' ? detailDescription(work, ctx) : richText(pick(work, 'description', lang))) + documentLinks, gallery:  `<div class="feature-gallery" style="--detail-paper:${background};--detail-columns:${ctx.section === 'works' ? 1 : columns}">${video}${ctx.section === 'works' ? groupedMedia : media.map(figure).join('')}</div>` };
}

export function workPage(work, works, site, lang, section = 'works') {
  const directory = section === 'lab' ? 'lab' : 'work';
  const ctx = context(lang, `${directory}/${work.slug}.html`, section);
  const { c } = ctx;
  const { title, metadata, description, gallery, detailGallery: workGallery } = projectContent(work, ctx);
  const index = works.findIndex((item) => item.slug === work.slug);
  const mediaArrow = (offset) => {
    const target = works[index + offset];
    const direction = offset < 0 ? 'previous' : 'next';
    const label = offset < 0 ? c.previous : c.next;
    return target ? `<a class="study-arrow study-arrow-${direction}" href="${esc(target.slug)}.html" aria-label="${esc(label)}: ${esc(pick(target, 'title', lang))}"></a>` : `<span class="study-arrow study-arrow-${direction}" aria-hidden="true" data-disabled></span>`;
  };
  const detailGallery = section === 'lab' ? `${gallery.slice(0, -6)}${mediaArrow(-1)}${mediaArrow(1)}</div>` : workGallery;
  const related = section === 'works' ? selectRelatedWorks(work, works).map(item => {
    const label = pick(item, 'title', lang);
    const src = workCoverImage(item);
    const details = [pick(item, 'meta_type', 'en'), item.year].filter(value => value != null && String(value).trim() !== '').map(value => esc(value)).join(' / ');
    return `<a class="related-card" href="${esc(item.slug)}.html"><div class="related-image">${src ? image(src,label,ctx) : `<span>${esc(label)}</span>`}</div><div class="related-caption"><h3>${esc(label)}</h3>${details ? `<span lang="en"> / ${details}</span>` : ''}</div></a>`;
  }).join('') : '';
  const relatedSection = related ? `<section class="related-projects" aria-labelledby="related-title"><h2 id="related-title" lang="en">You might also like</h2><div class="related-grid">${related}</div></section>` : '';
  const toolbar = section === 'lab' ? `<nav class="detail-toolbar" aria-label="${c[section]}"><a class="archive-back" href="../${section}.html">← ${c.back}</a><span class="eyebrow">Lab ${number(index + 1)}</span></nav>` : '';
  const body = `<article class="editorial-article work-article" aria-labelledby="page-title">
    ${section === 'lab' ? `<header class="feature-heading"><h1 class="post-title" id="page-title">${esc(title)}</h1></header>` : detailGallery}
    <div class="project-information">
      ${section === 'works' ? `<header class="feature-heading"><h1 class="post-title" id="page-title">${esc(title)}</h1></header>` : ''}
      ${metadata ? `<div class="project-facts">${metadata}</div>` : ''}
      ${description ? `<div class="prose post-des">${description}</div>` : ''}
    </div>
    ${section === 'lab' ? detailGallery : ''}
  </article>${relatedSection}`;
  return shell(ctx, site, { active: section, title, body, toolbar, pageClass: `page-work page-archive-work${section === 'lab' ? ' page-study' : ''}` });
}

