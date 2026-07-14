import { assertWorkPageHeaders, cleanOrphanWorkPages, loadJson, loadWorks, writeOutput } from './lib/content.mjs';
import { dataAttrs, escapeHtml, vimeoEmbedHtml } from './lib/html.mjs';

const CSS_VERSION = '258';
const JS_VERSION = '96';

const STR = {
  en: {
    year: 'Year',
    type: 'Type',
    medium: 'Medium',
    tech: 'Technology',
    production: 'Production',
    idxYear: 'Year',
    idxWork: 'Work',
    idxType: 'Type',
    noResults: 'No results found.',
    menu: 'Menu',
    close: 'Close',
    back: 'Back',
    filterMixed: 'Mixed',
    navWorks: 'WORKS',
    navLab: 'LAB',
    navAbout: 'ABOUT',
    navCv: 'CV',
    viewGrid: 'Grid',
    viewIndex: 'Index',
  },
  ko: {
    year: '연도',
    type: '유형',
    medium: '매체',
    tech: '기술',
    production: '제작',
    idxYear: '년도',
    idxWork: '작업',
    idxType: '유형',
    noResults: '검색 결과가 없습니다.',
    menu: '메뉴',
    close: '닫기',
    back: '뒤로',
    filterMixed: '혼합',
    navWorks: '작업',
    navLab: '실험',
    navAbout: '소개',
    navCv: '이력',
    viewGrid: '그리드',
    viewIndex: '인덱스',
  },
};

const TYPE_FILTER_LABELS = {
  설치: { en: 'Installation', ko: '설치' },
  영상: { en: 'Video', ko: '영상' },
  퍼포먼스: { en: 'Performance', ko: '퍼포먼스' },
  전시: { en: 'Exhibition', ko: '전시' },
  인터랙티브: { en: 'Interactive', ko: '인터랙티브' },
  프로젝션: { en: 'Projection', ko: '프로젝션' },
};

// homePrefix: relative path back to the top-level pages of the SAME language (index.html, about.html, ...)
// assetPrefix: relative path back to the true site root, where styles.css/script.js/assets/ live (shared by both languages)
function prefixes(lang, isWork) {
  const homePrefix = isWork ? '../' : '';
  const assetPrefix = homePrefix + (lang === 'ko' ? '../' : '');
  return { homePrefix, assetPrefix };
}

function pick(obj, field, lang) {
  if (lang === 'en' && obj[`${field}_en`] != null) return obj[`${field}_en`];
  return obj[field];
}

function siteFooterBar(site) {
  return `  <footer class="site-footer-bar">
    <div class="site-footer-bar-group site-footer-bar-group--1">
      <a href="mailto:${escapeHtml(site.email)}">E. ${escapeHtml(site.email)}</a>
      <a href="${escapeHtml(site.instagram)}" target="_blank" rel="noopener">I. instagram.com/3dowon</a>
    </div>
    <div class="site-footer-bar-group site-footer-bar-group--2">
      <a href="${escapeHtml(site.vimeo)}" target="_blank" rel="noopener">V. vimeo.com/3dowon</a>
      <a href="${escapeHtml(site.youtube)}" target="_blank" rel="noopener">Y. youtube.com/@3dowon</a>
    </div>
  </footer>`;
}

function siteLogo(assetPrefix, homeHref) {
  return `<a href="${homeHref}" class="sidebar-logo">3Dowon</a>`;
}

function langSwitchLinks(assetPrefix, lang, relPath) {
  const enHref = `${assetPrefix}${relPath}`;
  const koHref = `${assetPrefix}ko/${relPath}`;
  return `<a href="${enHref}" class="lang-switch-link${lang === 'en' ? ' active' : ''}" data-lang="en"${lang === 'en' ? ' aria-current="true"' : ''}>EN</a><span class="lang-switch-sep">/</span><a href="${koHref}" class="lang-switch-link${lang === 'ko' ? ' active' : ''}" data-lang="ko"${lang === 'ko' ? ' aria-current="true"' : ''}>KO</a>`;
}

function headerLangSwitch(assetPrefix, lang, relPath) {
  return `<div class="header-lang-switch">${langSwitchLinks(assetPrefix, lang, relPath)}</div>`;
}

function mobileLangSwitch(assetPrefix, lang, relPath) {
  return `    <div class="mo-lang-switch">${langSwitchLinks(assetPrefix, lang, relPath)}</div>`;
}

function mobileHeader(assetPrefix, homeHref, str) {
  return `  <div class="mo-header">
    <a href="${homeHref}" class="mo-logo">3Dowon</a>
    <button class="mo-menu-btn" id="moMenuBtn" aria-label="${str.menu}"><span class="mo-menu-icon" aria-hidden="true"></span></button>
  </div>`;
}

function mobileNav(activeNav, homePrefix, assetPrefix, lang, relPath, str) {
  const navClass = (name) => (activeNav === name ? ' class="active"' : '');
  return `  <div class="mo-overlay" id="moOverlay"></div>
  <nav class="mo-nav" id="moNav" aria-hidden="true">
    <button type="button" class="mo-nav-close" id="moNavClose" aria-label="${str.close}">×</button>
    <div class="mo-nav-links">
      <a href="${homePrefix}index.html"${navClass('works')}>${str.navWorks}</a>
      <a href="${homePrefix}lab.html"${navClass('lab')}>${str.navLab}</a>
      <a href="${homePrefix}about.html"${navClass('about')}>${str.navAbout}</a>
      <a href="${homePrefix}cv.html"${navClass('cv')}>${str.navCv}</a>
    </div>
${mobileLangSwitch(assetPrefix, lang, relPath)}
  </nav>`;
}

function mobileShell(activeNav, homePrefix, assetPrefix, lang, relPath, str) {
  return `${mobileHeader(assetPrefix, `${homePrefix}index.html`, str)}${mobileNav(activeNav, homePrefix, assetPrefix, lang, relPath, str)}`;
}

function worksControls(lang) {
  const str = STR[lang];
  const typeItems = Object.entries(TYPE_FILTER_LABELS)
    .map(([value, labels]) => `              <li data-filter="type" data-value="${value}">${labels[lang]}</li>`)
    .join('\n');
  return `          <div class="sidebar-controls">
            <ul class="view-toggle">
              <li data-view="grid" class="active">${str.viewGrid}</li>
              <li data-view="index">${str.viewIndex}</li>
            </ul>
            <div class="filter-dropdown-row">
              <div class="filter-dropdown">
                <button type="button" class="filter-dropdown-btn" data-filter-group="type" data-default-label="${str.type}" data-mixed-label="${str.filterMixed}"><span class="filter-dropdown-label">${str.type}</span></button>
                <ul class="filter-checks filter-checks--type" data-filter-panel="type">
${typeItems}
                </ul>
              </div>
              <div class="filter-dropdown">
                <button type="button" class="filter-dropdown-btn" data-filter-group="tech" data-default-label="${str.tech}" data-mixed-label="${str.filterMixed}"><span class="filter-dropdown-label">${str.tech}</span></button>
                <ul class="filter-checks filter-checks--tech" data-filter-panel="tech">
                  <li data-filter="tech" data-value="Unreal">Unreal</li>
                  <li data-filter="tech" data-value="Unity">Unity</li>
                  <li data-filter="tech" data-value="Arduino">Arduino</li>
                  <li data-filter="tech" data-value="3ds Max">3ds Max</li>
                </ul>
              </div>
            </div>
          </div>`;
}

function secondaryNav(homePrefix = '', activeNav = '', lang = 'en') {
  const str = STR[lang];
  const navClass = (name) => `nav-cell nav-${name}${activeNav === name ? ' active' : ''}`;
  return `      <nav class="nav-main nav-main--secondary">
        <a href="${homePrefix}lab.html" class="${navClass('lab')}">${str.navLab}</a>
        <a href="${homePrefix}about.html" class="${navClass('about')}">${str.navAbout}</a>
        <a href="${homePrefix}cv.html" class="${navClass('cv')}">${str.navCv}</a>
      </nav>`;
}

function headerBar({
  homePrefix = '',
  assetPrefix = homePrefix,
  home = `${homePrefix}index.html`,
  activeNav = '',
  worksOpen = false,
  logoHtml,
  extraCol2 = '',
  variant = '',
  lang = 'en',
  relPath = 'index.html',
}) {
  const worksClass = `nav-cell nav-works${activeNav === 'works' ? ' active' : ''}`;
  const showWorksControls = worksOpen || (activeNav === 'works' && variant !== 'project');
  // Always render the filter controls markup (even when visually hidden) so the
  // header-bar-col--works column — and therefore the whole header row, via
  // align-items:stretch — reserves the same height on every desktop page.
  const worksBlock = `        <div class="nav-accordion${showWorksControls ? ' is-open' : ''}">
          <a href="${home}" class="${worksClass}">${STR[lang].navWorks}</a>
${worksControls(lang)}
        </div>`;

  const variantClass =
    variant === 'project'
      ? ' site-header--project'
      : activeNav === 'works'
        ? ' site-header--works'
        : activeNav
          ? ' site-header--simple'
          : '';

  return `  <header class="site-header site-header--bar${variantClass}">
    <div class="header-bar">
      <div class="header-bar-col header-bar-col--logo">
        ${logoHtml}
      </div>
      <div class="header-bar-col header-bar-col--back">${extraCol2}</div>
      <div class="header-bar-col header-bar-col--works">
${worksBlock}
      </div>
      <div class="header-bar-col header-bar-col--nav">
${secondaryNav(homePrefix, activeNav, lang)}
${headerLangSwitch(assetPrefix, lang, relPath)}
      </div>
    </div>
  </header>`;
}

function simpleHeader(activeNav, lang, relPath, str) {
  const { homePrefix, assetPrefix } = prefixes(lang, false);
  return `${headerBar({
    homePrefix,
    assetPrefix,
    activeNav,
    logoHtml: siteLogo(assetPrefix, `${homePrefix}index.html`),
    lang,
    relPath,
  })}
${mobileShell(activeNav, homePrefix, assetPrefix, lang, relPath, str)}`;
}

function pageShell({ title, body, header, extraHead = '', lang, assetPrefix, site }) {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
  <link rel="stylesheet" href="${assetPrefix}styles.css?v=${CSS_VERSION}" />
${extraHead}
</head>
<body>
${siteBgDecor()}${header}
  <main>
${body}
  </main>
${siteFooterBar(site)}
  <script src="${assetPrefix}script.js?v=${JS_VERSION}"></script>
</body>
</html>
`;
}

// A fixed, page-wide collage of faint project photos "pasted" behind the
// paper-grain texture — same on every page (site chrome, not per-page
// content), so it reads as the site's paper stock rather than a per-page
// decoration. References `works`, populated below before any page is built.
function siteBgDecor() {
  if (!works.length) return '';
  const count = Math.min(8, works.length);
  const step = works.length / count;
  const picks = Array.from({ length: count }, (_, i) => works[Math.floor(i * step) % works.length]);
  const photos = picks
    .map(
      (w, i) =>
        `    <div class="page-bg-photo page-bg-photo--${i + 1}" style="background-image:url(${escapeHtml(w.preview_bg || w.thumbnail)})"></div>`
    )
    .join('\n');
  return `  <div class="page-bg-texture" aria-hidden="true">
${photos}
  </div>
`;
}

function normalizeList(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object') {
        return value.tag || value.item || value.image || value.url || '';
      }
      return '';
    })
    .filter(Boolean);
}

function normalizeWork(work) {
  return {
    ...work,
    tags: normalizeList(work.tags),
    tech: normalizeList(work.tech),
    gallery: normalizeList(work.gallery),
  };
}

function renderGridPost(work, lang) {
  return `        <a href="work/${work.slug}.html" class="img-post reveal" ${dataAttrs(work)}>
          <div class="img-post-thumbimg" style="background-image:url(${work.thumbnail})"></div>
          <div class="img-post-title">${escapeHtml(work.title)}</div>
          <div class="img-post-type">${escapeHtml(pick(work, 'grid_type_label', lang))}</div>
          <div class="img-post-year">${work.year}</div>
        </a>`;
}

function renderIndexPost(work, lang) {
  const preview = work.preview_bg || work.thumbnail;
  return `          <a href="work/${work.slug}.html" class="index-post reveal" data-preview-bg="${preview}" ${dataAttrs(work)}>
            <div class="index-post-row">
              <div class="index-post-cells">
                <div class="index-post-year">${work.year}</div>
                <div class="index-post-title">${escapeHtml(work.title)}</div>
                <div class="index-post-type">${escapeHtml(pick(work, 'index_type_label', lang))}</div>
              </div>
              <div class="index-post-line"></div>
            </div>
          </a>`;
}

function buildIndex(works, site, lang) {
  const str = STR[lang];
  const { homePrefix, assetPrefix } = prefixes(lang, false);
  const relPath = 'index.html';
  const gridPosts = works.map((w) => renderGridPost(w, lang)).join('\n');
  const indexPosts = works.map((w) => renderIndexPost(w, lang)).join('\n');
  const body = `    <div class="works-view works-view--grid" id="gridView">
      <div class="img-post-box" id="imgPostBox">
${gridPosts}
      </div>
    </div>

    <div class="works-view works-view--index hidden" id="indexView">
      <div class="index-box">
        <div class="index-category">
          <div class="index-category-cells">
            <div class="index-category-year">${str.idxYear}</div>
            <div class="index-category-title">${str.idxWork}</div>
            <div class="index-category-type">${str.idxType}</div>
          </div>
          <div class="index-category-line"></div>
        </div>
        <div class="index-post-box" id="indexPostBox">
${indexPosts}
        </div>
        <div id="indexPreview" class="index-post-thumbimg"></div>
      </div>
    </div>

    <p class="no-results" style="margin-left:30px">${str.noResults}</p>`;

  const header = `${headerBar({
    homePrefix,
    assetPrefix,
    activeNav: 'works',
    worksOpen: true,
    logoHtml: siteLogo(assetPrefix, `${homePrefix}index.html`),
    lang,
    relPath,
  })}

${mobileHeader(assetPrefix, `${homePrefix}index.html`, str)}
  <div class="mo-filters mo-filters--type">
${Object.entries(TYPE_FILTER_LABELS)
  .map(([value, labels]) => `    <span class="mo-filter" data-filter="type" data-value="${value}">${labels[lang]}</span>`)
  .join('\n')}
  </div>
  <div class="mo-filters mo-filters--tech">
    <span class="mo-filter" data-filter="tech" data-value="Unreal">Unreal</span>
    <span class="mo-filter" data-filter="tech" data-value="Unity">Unity</span>
    <span class="mo-filter" data-filter="tech" data-value="Arduino">Arduino</span>
    <span class="mo-filter" data-filter="tech" data-value="3ds Max">3ds Max</span>
  </div>
${mobileNav('works', homePrefix, assetPrefix, lang, relPath, str)}`;

  return pageShell({ title: '3Dowon — Media Artist', body, header, lang, assetPrefix, site });
}

function buildWorkPage(work, site, lang) {
  const str = STR[lang];
  const { homePrefix, assetPrefix } = prefixes(lang, true);
  const relPath = `work/${work.slug}.html`;
  const gallery = (work.gallery || [])
    .map(
      (src, index) =>
        `          <li class="reveal"><img src="${src}" alt="${escapeHtml(work.title)} ${index + 1}" class="project-detail-image" /></li>`
    )
    .join('\n');
  const video = vimeoEmbedHtml(work.vimeo_url, work.title);

  const body = `    <div class="post-projects">
      ${video}
      <div class="post-hero reveal">
        <img src="${work.hero_image || work.thumbnail}" alt="${escapeHtml(work.title)}" class="post-hero-image" />
      </div>
      <div class="post-left">
      <div class="post-title reveal">${escapeHtml(work.title)}</div>
      <div class="post-text">
        <div class="post-des">
          <div class="post-des-box1 reveal">
            <div class="post-des-list"><div class="post-q">${str.year}</div><div class="post-a">${escapeHtml(work.meta_year || String(work.year))}</div></div>
            <div class="post-des-list"><div class="post-q">${str.type}</div><div class="post-a">${escapeHtml(pick(work, 'meta_type', lang) || '')}</div></div>
            <div class="post-des-list"><div class="post-q">${str.medium}</div><div class="post-a">${escapeHtml(pick(work, 'meta_medium', lang) || '')}</div></div>
            <div class="post-des-list"><div class="post-q">${str.tech}</div><div class="post-a">${escapeHtml(pick(work, 'meta_tech', lang) || '')}</div></div>
            <div class="post-des-list"><div class="post-q">${str.production}</div><div class="post-a">${escapeHtml(pick(work, 'meta_production', lang) || '')}</div></div>
          </div>
          <div class="post-detail-des reveal">
            ${pick(work, 'description', lang) || ''}
          </div>
        </div>
      </div>
      </div>
      <div class="post-img-box">
        <ul class="project-detail-gallery">
${gallery}
        </ul>
      </div>
    </div>`;

  const header = `${headerBar({
    homePrefix,
    assetPrefix,
    home: `${homePrefix}index.html`,
    activeNav: 'works',
    variant: 'project',
    logoHtml: siteLogo(assetPrefix, `${homePrefix}index.html`),
    extraCol2: `<button class="btn-back" onclick="history.back()" aria-label="${str.back}"><span class="btn-back-arrow" aria-hidden="true"></span></button>`,
    lang,
    relPath,
  })}
${mobileHeader(assetPrefix, `${homePrefix}index.html`, str)}
${mobileNav('', homePrefix, assetPrefix, lang, relPath, str)}`;

  return pageShell({
    title: `${escapeHtml(work.title)} — 3Dowon`,
    body,
    header,
    lang,
    assetPrefix,
    site,
  });
}

function buildAbout(about, site, lang) {
  const str = STR[lang];
  const relPath = 'about.html';
  const paragraphs = pick(about, 'body', lang)
    .split(/\n{2,}/)
    .map((p) => `          <p>${p.trim().split(/\r?\n/).join('<br />\n            ')}</p>`)
    .join('\n');
  const meta = pick(about, 'meta', lang)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => escapeHtml(line))
    .join('<br />\n            ');
  const body = `    <div class="about-box">
      <div class="about-left">
        <div class="about-selector">
          <div class="about-name">${escapeHtml(pick(about, 'name', lang))}</div>
          <div class="about-meta">
            ${meta}
          </div>
        </div>
        <div class="about-section2">
${paragraphs}
        </div>
      </div>
      <div class="about-right">
        <div class="about-img" style="background-image:url(${about.image})"></div>
      </div>
    </div>`;
  const { assetPrefix } = prefixes(lang, false);
  return pageShell({
    title: 'about — 3Dowon',
    body,
    header: simpleHeader('about', lang, relPath, str),
    lang,
    assetPrefix,
    site,
  });
}

function buildCv(cv, site, lang) {
  const str = STR[lang];
  const relPath = 'cv.html';
  const sections = cv.sections
    .map((section) => {
      const entries = section.entries
        .map(
          (entry) => `          <div class="cv-entry">
            <div class="cv-year">${entry.year}</div>
            <div class="cv-desc">${pick(entry, 'description', lang)}</div>
          </div>`
        )
        .join('\n');
      return `      <section class="cv-section reveal">
        <h3>${escapeHtml(section.title)}</h3>
        <div class="cv-entries">
${entries}
        </div>
      </section>`;
    })
    .join('\n\n');
  const body = `    <div class="cv-box">

${sections}
    </div>`;
  const { assetPrefix } = prefixes(lang, false);
  return pageShell({
    title: 'CV — 3Dowon',
    body,
    header: simpleHeader('cv', lang, relPath, str),
    lang,
    assetPrefix,
    site,
  });
}

function buildLab(lab, site, lang) {
  const str = STR[lang];
  const relPath = 'lab.html';
  const items = lab.items
    .map(
      (item) => `        <div class="img-post lab-post reveal" data-lab-image="${item.image}">
          <div class="img-post-thumbimg" style="background-image:url(${item.image})"></div>
          <div class="lab-post-caption">${escapeHtml(pick(item, 'caption', lang))}</div>
        </div>`
    )
    .join('\n');
  const body = `    <div class="lab-view">
      <div class="img-post-box" id="labPostBox">
${items}
      </div>
    </div>
    <div class="lab-lightbox" id="labLightbox">
      <img class="lab-lightbox-img" id="labLightboxImg" alt="" />
    </div>`;
  const { assetPrefix } = prefixes(lang, false);
  return pageShell({
    title: 'LAB — 3Dowon',
    body,
    header: simpleHeader('lab', lang, relPath, str),
    lang,
    assetPrefix,
    site,
  });
}

const site = loadJson('content/site.json');
const about = loadJson('content/about.json');
const cv = loadJson('content/cv.json');
const lab = loadJson('content/lab.json');
const works = loadWorks().map(normalizeWork);

const allWorkPaths = [];

for (const lang of ['en', 'ko']) {
  const outPrefix = lang === 'ko' ? 'ko/' : '';

  writeOutput(`${outPrefix}index.html`, buildIndex(works, site, lang));
  writeOutput(`${outPrefix}about.html`, buildAbout(about, site, lang));
  writeOutput(`${outPrefix}cv.html`, buildCv(cv, site, lang));
  writeOutput(`${outPrefix}lab.html`, buildLab(lab, site, lang));

  for (const work of works) {
    const relPath = `${outPrefix}work/${work.slug}.html`;
    writeOutput(relPath, buildWorkPage(work, site, lang));
    allWorkPaths.push(relPath);
  }

  cleanOrphanWorkPages(works.map((work) => work.slug), `${outPrefix}work`);
}

assertWorkPageHeaders(allWorkPaths);

console.log(`Built ${works.length} works × 2 languages and site pages from content/`);
