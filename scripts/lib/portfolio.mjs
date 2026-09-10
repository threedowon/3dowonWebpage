import { escapeHtml as esc, vimeoEmbedHtml } from './html.mjs';
import { pick, resolveMediaPath, workFormY, formKey } from './catalog.mjs';

const VERSION = '926';
const COPY = {
  ko: { works: '작업', lab: '실험', about: '소개', cv: '이력', photos: '사진', index: '목차', allYears: '모든 연도', allFields: '모든 분야', space: '공간', object: '오브젝트', screen: '스크린', year: '연도', field: '분야', name: '작업명', back: '작업 목록', previous: '이전 작업', next: '다음 작업', close: '닫기', enlarge: '크게 보기', practice: '작업', approach: '작업 방식', fields: '작업 분야', noResults: '조건에 맞는 작업이 없습니다.', reset: '필터 초기화', note: '빛, 공간, 일상의 사물을 연결하는\n인터랙티브 설치와 미디어 실험.', artist: '인터랙티브 미디어 아티스트', type: '유형', medium: '매체', tech: '기술', production: '제작', skip: '본문으로 이동' },
  en: { works: 'Works', lab: 'Lab', about: 'About', cv: 'CV', photos: 'Images', index: 'Index', allYears: 'All years', allFields: 'All fields', space: 'Space', object: 'Object', screen: 'Screen', year: 'Year', field: 'Field', name: 'Project', back: 'All works', previous: 'Previous work', next: 'Next work', close: 'Close', enlarge: 'Enlarge image', practice: 'Practice', approach: 'Approach', fields: 'Fields', noResults: 'No work matches these filters.', reset: 'Reset filters', note: 'Interactive installations and media experiments\nwith light, space, and everyday objects.', artist: 'Interactive media artist', type: 'Type', medium: 'Medium', tech: 'Technology', production: 'Production', skip: 'Skip to content' },
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
  <link rel="stylesheet" href="${assets}styles.css?v=${VERSION}" />
  <script src="${assets}script.js?v=${VERSION}" defer></script>
</head>
<body class="portfolio ${pageClass}" data-home="${home}" data-section="${active}">
  <a class="skip-link" href="#main">${c.skip}</a>
  <div class="site-frame">
    <header class="site-header archive-site-header">
      <a class="wordmark" href="${home}index.html" aria-label="3Dowon ${lang === 'ko' ? '홈' : 'Home'}">3Dowon</a>
      <div class="header-contact"><p>${lang === 'ko' ? '문의' : 'Enquiries'}</p><a href="mailto:${esc(site.email)}">E. &nbsp;${esc(site.email)}</a></div>
      <nav class="site-nav" aria-label="${lang === 'ko' ? '주 메뉴' : 'Main navigation'}">
        ${['works', 'lab', 'about', 'cv'].map((key, index) => `<a href="${home}${key}.html"${active === key ? ' aria-current="page"' : ''}>${c[key]}${index < 3 ? ',' : ''}</a>`).join('')}
      </nav>
      <p class="header-note">${esc(c.note).replace(/\n/g, ' ')}</p>
      <nav class="language-nav" aria-label="${lang === 'ko' ? '언어' : 'Language'}"><a href="${assets}${relPath}" lang="en" data-language="en"${lang === 'en' ? ' aria-current="true"' : ''}>EN</a><span aria-hidden="true">/</span><a href="${assets}ko/${relPath}" lang="ko" data-language="ko"${lang === 'ko' ? ' aria-current="true"' : ''}>KO</a></nav>
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

function folio(label, page) {
  return `<footer class="article-folio"><span>3Dowon / ${label}</span><span>${page}</span></footer>`;
}

function projectImages(work, ctx) {
  const thumbnail = resolveMediaPath(work.thumbnail, ctx.assets);
  const media = [...new Set([work.thumbnail, work.hero_image, ...work.gallery].filter(Boolean).map((src) => resolveMediaPath(src, ctx.assets)))];
  return ctx.section === 'works' ? media.filter((src) => src !== thumbnail) : media;
}

function overviewGrid(works, ctx) {
  return `<div class="overview-grid">${works.map((work, index) => {
    const title = pick(work, 'title', ctx.lang);
    const projectNumber = number(index + 1);
    const field = work.field || formKey(workFormY(work));
    const medium = pick(work, 'meta_medium', ctx.lang) || pick(work, 'meta_type', ctx.lang) || ctx.c[field];
    const categories = [...new Set(medium.split(/[,，]/).map((value) => value.trim()).filter(Boolean))];
    const media = projectImages(work, ctx);
    const href = `${ctx.directory}/${work.slug}.html`;
    const openLabel = ctx.section === 'lab'
      ? (ctx.lang === 'ko' ? '실험 보기' : 'View study')
      : (ctx.lang === 'ko' ? '작업 보기' : 'View project');
    const attrs = `data-year="${esc(work.year || '')}" data-field="${field}"`;
    return `<article class="overview-project" data-overview-project data-project="${esc(work.slug)}" ${attrs}>
      <a class="project-summary" href="${esc(href)}"><div><span class="project-number">${projectNumber}</span><h2>${esc(title)}</h2><ul class="project-categories">${categories.map((category, i) => `<li><span>${projectNumber}.${i + 1}</span> ${esc(category)}</li>`).join('')}</ul></div><div class="project-summary-bottom"><p>${esc(work.meta_year || work.year || '')}</p><p>${esc(pick(work, 'meta_tech', ctx.lang) || '')}</p></div></a>
    </article>${media.map((src, i) => `<figure class="overview-image" data-plate data-project="${esc(work.slug)}" ${attrs}><span class="image-reference">${projectNumber}.${i + 1}.1</span><a class="overview-image-link" href="${esc(href)}" aria-label="${esc(title)} · ${openLabel}"><img src="${esc(src)}" alt="${esc(title)} — ${i + 1}" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" /></a></figure>`).join('')}`;
  }).join('\n')}</div>`;
}

export function catalogPage(works, site, lang, relPath = 'works.html', section = 'works') {
  const ctx = context(lang, relPath, section);
  const { c } = ctx;
  const years = [...new Set(works.map((work) => work.year).filter(Boolean))].sort((a, b) => b - a);
  const photoCount = works.reduce((count, work) => count + projectImages(work, ctx).length, 0);
  const countLabel = section === 'lab' ? (lang === 'ko' ? '개 실험' : ' studies') : (lang === 'ko' ? '개 작업' : ' works');
  const toolbar = `<header class="catalog-toolbar">
      <p id="catalog-count" role="status">${works.length}${countLabel} · ${photoCount}${lang === 'ko' ? '장' : ' images'}</p>
      <div class="toolbar-cell catalog-filters">${years.length ? `<label><span class="visually-hidden">${c.year}</span><select name="year" aria-label="${c.year}"><option value="all">${c.allYears}</option>${years.map((year) => `<option value="${year}">${year}</option>`).join('')}</select></label>` : ''}<label><span class="visually-hidden">${c.field}</span><select name="field" aria-label="${c.field}"><option value="all">${c.allFields}</option>${['space', 'object', 'screen'].map((key) => `<option value="${key}">${c[key]}</option>`).join('')}</select></label></div>
    </header>`;
  const body = `<section class="catalog-section" aria-labelledby="page-title">
    <h1 id="page-title" class="visually-hidden">${c[section]}</h1>
    ${overviewGrid(works, ctx)}
    <div class="catalog-empty" hidden><p>${c.noResults}</p><button type="button" data-reset-filters>${c.reset} ↗</button></div>
  </section>`;
  return shell(ctx, site, { active: section, title: c[section], body, toolbar, catalog: section, pageClass: `page-${section}` });
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
    <header class="article-heading"><p class="eyebrow">03 / Profile</p><h1 id="page-title">${esc(pick(about, 'name', lang))}</h1><p class="document-subtitle">${esc(pick(about, 'meta', lang)).replace(/\r?\n/g, '<br />')}</p></header>
    <div class="profile-opening"><p class="profile-intro">${esc(paras[0] || '')}</p><figure class="about-image">${image(about.image, pick(about, 'name', lang), ctx, { lazy: false })}<figcaption><span>3Dowon / ${c.about}</span><span>01</span></figcaption></figure></div>
    <div class="article-body"><div class="article-aside"><p class="eyebrow">${c.approach}</p><p class="margin-note">${lang === 'ko' ? '익숙한 풍경을<br />새로운 감각으로.' : 'Familiar scenery,<br />seen anew.'}</p></div><div class="prose about-prose">${paras.slice(1).map((para) => `<p>${esc(para)}</p>`).join('')}</div></div>
    <section class="field-list"><h2>${c.fields}</h2><ul>${fields.map((field) => `<li>${field}</li>`).join('')}</ul></section>${folio('Profile', '03')}
  </article>`;
  return shell(ctx, site, { active: 'about', title: c.about, body, pageClass: 'page-about' });
}

export function cvPage(cv, about, site, lang) {
  const ctx = context(lang, 'cv.html');
  const { c } = ctx;
  const titles = { Education: '학력', Experience: '경력', Exhibitions: '전시', Awards: '수상', Training: '교육', Courses: '교육', 'Training & Courses': '교육' };
  const sections = cv.sections.map((section, index) => `<section class="cv-section"><h2><span class="section-number">${number(index + 1)}</span>${esc(lang === 'ko' ? titles[section.title] || section.title : section.title)}</h2><dl>${section.entries.map((entry) => `<div class="cv-row"><dt>${esc(entry.year)}</dt><dd>${richText(pick(entry, 'description', lang))}</dd></div>`).join('')}</dl></section>`);
  const split = Math.ceil(sections.length / 2);
  const body = `<article class="editorial-article cv-article"><header class="chapter-heading"><div><p class="eyebrow">04 / Curriculum vitae</p><h1 id="page-title">${c.cv}</h1></div><p class="chapter-note">${esc(pick(about, 'name', lang))}<br />${c.artist}</p></header><div class="cv-spread"><div class="cv-column">${sections.slice(0, split).join('')}</div><div class="cv-column">${sections.slice(split).join('')}</div></div><div class="cv-contact"><span>${lang === 'ko' ? '전시와 협업에 관한 연락' : 'For exhibitions & collaborations'}</span><a href="mailto:${esc(site.email)}">${esc(site.email)} ↗</a></div>${folio('Curriculum vitae', '04')}</article>`;
  return shell(ctx, site, { active: 'cv', title: c.cv, body, pageClass: 'page-cv' });
}

export function workPage(work, works, site, lang, section = 'works') {
  const directory = section === 'lab' ? 'lab' : 'work';
  const ctx = context(lang, `${directory}/${work.slug}.html`, section);
  const { c } = ctx;
  const title = pick(work, 'title', lang);
  const media = projectImages(work, ctx);
  const index = works.findIndex((item) => item.slug === work.slug);
  const adjacent = (offset, label) => {
    const next = works[index + offset];
    return next ? `<a href="${esc(next.slug)}.html"><span>${label} ${offset < 0 ? '↖' : '↗'}</span><strong>${esc(pick(next, 'title', lang))}</strong></a>` : '<span></span>';
  };
  const year = work.meta_year || work.year;
  const video = vimeoEmbedHtml(work.vimeo_url, title) || (work.video ? `<div class="post-video"><video controls playsinline preload="metadata" aria-label="${esc(title)}" src="${esc(resolveMediaPath(work.video, ctx.assets))}"></video></div>` : '');
  const figure = (src, position) => `<figure class="project-image"><a href="${esc(src)}" data-viewer="${esc(src)}" data-viewer-title="${esc(title)} — ${number(position + 1)}" aria-label="${esc(title)} ${position + 1} — ${c.enlarge}"><img src="${esc(src)}" alt="${esc(title)} — ${position + 1}" class="project-detail-image" ${position === 0 && !video ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" /></a></figure>`;
  const metadata = [
    [['year', year], ['type', pick(work, 'meta_type', lang)], ['medium', pick(work, 'meta_medium', lang)]],
    [['tech', pick(work, 'meta_tech', lang)], ['production', pick(work, 'meta_production', lang)]],
  ].map((entries) => entries.filter(([, value]) => value)).filter((entries) => entries.length)
    .map((entries) => `<dl class="work-meta">${entries.map(([label, value]) => `<div><dt>${c[label]}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`).join('');
  const description = richText(pick(work, 'description', lang));
  const toolbar = `<nav class="detail-toolbar" aria-label="${c[section]}"><a class="archive-back" href="../${section}.html">← ${c.back}</a><span class="eyebrow">${section === 'lab' ? 'Lab' : 'Work'} ${number(index + 1)}</span></nav>`;
  const body = `<article class="editorial-article work-article" aria-labelledby="page-title">
    <div class="project-information"><header class="feature-heading"><h1 class="post-title" id="page-title">${esc(title)}</h1></header>
      ${metadata ? `<div class="project-facts">${metadata}</div>` : ''}
      ${description ? `<div class="prose post-des">${description}</div>` : ''}
    </div>
    <div class="feature-gallery">${video}${media.map(figure).join('')}</div>
  </article><nav class="project-pagination" aria-label="${c[section]}">${adjacent(-1, c.previous)}${adjacent(1, c.next)}</nav>`;
  return shell(ctx, site, { active: section, title, body, toolbar, pageClass: `page-work page-archive-work${section === 'lab' ? ' page-study' : ''}` });
}

