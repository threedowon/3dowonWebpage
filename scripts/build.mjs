import { assertWorkPageHeaders, cleanOrphanWorkPages, loadJson, loadWorks, writeOutput } from './lib/content.mjs';
import { dataAttrs, escapeHtml, vimeoEmbedHtml } from './lib/html.mjs';

const CSS_VERSION = '203';
const JS_VERSION = '84';
const LOGO_VERSION = '2';

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
  },
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

function siteFooter(site) {
  return `        E. <a href="mailto:${escapeHtml(site.email)}">${escapeHtml(site.email)}</a><br />
        <a href="${escapeHtml(site.instagram)}" target="_blank" rel="noopener">I. instagram.com/3dowon</a><br />
        <a href="${escapeHtml(site.vimeo)}" target="_blank" rel="noopener">V. vimeo.com/3dowon</a><br />
        <a href="${escapeHtml(site.youtube)}" target="_blank" rel="noopener">Y. youtube.com/@3dowon</a>`;
}

function siteLogo(assetPrefix, homeHref) {
  return `<a href="${homeHref}" class="sidebar-logo sidebar-logo--img"><img src="${assetPrefix}assets/logo.png?v=${LOGO_VERSION}" alt="3Dowon" class="sidebar-logo-img" /></a>`;
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
    <a href="${homeHref}" class="mo-logo mo-logo--img"><img src="${assetPrefix}assets/logo.png?v=${LOGO_VERSION}" alt="3Dowon" class="mo-logo-img" /></a>
    <button class="mo-menu-btn" id="moMenuBtn" aria-label="${str.menu}"><span class="mo-menu-icon" aria-hidden="true"></span></button>
  </div>`;
}

function mobileNav(site, activeNav, homePrefix, assetPrefix, lang, relPath, str) {
  const navClass = (name) => (activeNav === name ? ' class="active"' : '');
  return `  <div class="mo-overlay" id="moOverlay"></div>
  <nav class="mo-nav" id="moNav" aria-hidden="true">
    <button type="button" class="mo-nav-close" id="moNavClose" aria-label="${str.close}">×</button>
    <div class="mo-nav-links">
      <a href="${homePrefix}index.html"${navClass('works')}>WORKS</a>
      <a href="${homePrefix}lab.html"${navClass('lab')}>LAB</a>
      <a href="${homePrefix}about.html"${navClass('about')}>ABOUT</a>
      <a href="${homePrefix}cv.html"${navClass('cv')}>CV</a>
    </div>
${mobileLangSwitch(assetPrefix, lang, relPath)}
    <div class="mo-nav-footer">
      <div class="mo-nav-footer-info">
${siteFooter(site)}
      </div>
    </div>
  </nav>`;
}

function mobileShell(site, activeNav, homePrefix, assetPrefix, lang, relPath, str) {
  return `${mobileHeader(assetPrefix, `${homePrefix}index.html`, str)}${mobileNav(site, activeNav, homePrefix, assetPrefix, lang, relPath, str)}`;
}

function worksControls() {
  return `          <div class="sidebar-controls">
            <ul class="view-toggle">
              <li data-view="grid" class="active">Grid</li>
              <li data-view="index">Index</li>
            </ul>
            <ul class="filter-checks filter-checks--type">
              <li data-filter="type" data-value="설치">Installation</li>
              <li data-filter="type" data-value="영상">Video</li>
              <li data-filter="type" data-value="퍼포먼스">Performance</li>
              <li data-filter="type" data-value="전시">Exhibition</li>
              <li data-filter="type" data-value="인터랙티브">Interactive</li>
              <li data-filter="type" data-value="프로젝션">Projection</li>
            </ul>
            <ul class="filter-checks filter-checks--tech">
              <li data-filter="tech" data-value="Unreal">Unreal</li>
              <li data-filter="tech" data-value="Unity">Unity</li>
              <li data-filter="tech" data-value="Arduino">Arduino</li>
              <li data-filter="tech" data-value="3ds Max">3ds Max</li>
            </ul>
          </div>`;
}

function secondaryNav(homePrefix = '', activeNav = '') {
  const navClass = (name) => `nav-cell nav-${name}${activeNav === name ? ' active' : ''}`;
  return `      <nav class="nav-main nav-main--secondary">
        <a href="${homePrefix}lab.html" class="${navClass('lab')}">LAB</a>
        <a href="${homePrefix}about.html" class="${navClass('about')}">ABOUT</a>
        <a href="${homePrefix}cv.html" class="${navClass('cv')}">CV</a>
        <a href="${homePrefix}contact.html" class="${navClass('contact')}">CONTACT</a>
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
  const worksBlock = showWorksControls
      ? `        <div class="nav-accordion is-open">
          <a href="${home}" class="${worksClass}">WORKS</a>
${worksControls()}
        </div>`
      : `        <div class="nav-accordion">
          <a href="${home}" class="${worksClass}">WORKS</a>
        </div>`;

  const variantClass =
    variant === 'project'
      ? ' site-header--project'
      : activeNav === 'works'
        ? ' site-header--works'
        : activeNav
          ? ' site-header--simple'
          : '';

  const col2 = variant === 'project'
    ? `${extraCol2}${headerLangSwitch(assetPrefix, lang, relPath)}`
    : headerLangSwitch(assetPrefix, lang, relPath);

  return `  <header class="site-header site-header--bar${variantClass}">
    <div class="header-bar">
      <div class="header-bar-col header-bar-col--logo">
        ${logoHtml}
      </div>
      <div class="header-bar-col header-bar-col--back">${col2}</div>
      <div class="header-bar-col header-bar-col--works">
${worksBlock}
      </div>
      <div class="header-bar-col header-bar-col--nav">
${secondaryNav(homePrefix, activeNav)}
      </div>
    </div>
  </header>`;
}

function simpleHeader(site, activeNav, lang, relPath, str) {
  const { homePrefix, assetPrefix } = prefixes(lang, false);
  return `${headerBar({
    homePrefix,
    assetPrefix,
    activeNav,
    logoHtml: siteLogo(assetPrefix, `${homePrefix}index.html`),
    lang,
    relPath,
  })}
${mobileShell(site, activeNav, homePrefix, assetPrefix, lang, relPath, str)}`;
}

function pageShell({ title, body, header, extraHead = '', lang, assetPrefix }) {
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
${header}
  <main>
${body}
  </main>
  <script src="${assetPrefix}script.js?v=${JS_VERSION}"></script>
</body>
</html>
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
    <span class="mo-filter" data-filter="type" data-value="설치">Installation</span>
    <span class="mo-filter" data-filter="type" data-value="영상">Video</span>
    <span class="mo-filter" data-filter="type" data-value="퍼포먼스">Performance</span>
    <span class="mo-filter" data-filter="type" data-value="전시">Exhibition</span>
    <span class="mo-filter" data-filter="type" data-value="인터랙티브">Interactive</span>
    <span class="mo-filter" data-filter="type" data-value="프로젝션">Projection</span>
  </div>
  <div class="mo-filters mo-filters--tech">
    <span class="mo-filter" data-filter="tech" data-value="Unreal">Unreal</span>
    <span class="mo-filter" data-filter="tech" data-value="Unity">Unity</span>
    <span class="mo-filter" data-filter="tech" data-value="Arduino">Arduino</span>
    <span class="mo-filter" data-filter="tech" data-value="3ds Max">3ds Max</span>
  </div>
${mobileNav(site, 'works', homePrefix, assetPrefix, lang, relPath, str)}`;

  return pageShell({ title: '3Dowon — Media Artist', body, header, lang, assetPrefix });
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
${video}
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
    extraCol2: `<button class="btn-back" onclick="history.back()" aria-label="${str.back}">←</button>`,
    lang,
    relPath,
  })}
${mobileHeader(assetPrefix, `${homePrefix}index.html`, str)}
${mobileNav(site, '', homePrefix, assetPrefix, lang, relPath, str)}`;

  return pageShell({
    title: `${escapeHtml(work.title)} — 3Dowon`,
    body,
    header,
    lang,
    assetPrefix,
  });
}

function buildAbout(about, site, lang) {
  const str = STR[lang];
  const relPath = 'about.html';
  const paragraphs = pick(about, 'body', lang)
    .split(/\n{2,}/)
    .map((p) => `          <p>${p.trim()}</p>`)
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
    header: simpleHeader(site, 'about', lang, relPath, str),
    lang,
    assetPrefix,
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
    header: simpleHeader(site, 'cv', lang, relPath, str),
    lang,
    assetPrefix,
  });
}

function buildLab(lab, site, lang) {
  const str = STR[lang];
  const relPath = 'lab.html';
  const items = lab.items
    .map(
      (item) => `        <div class="img-post lab-post reveal">
          <div class="img-post-thumbimg" style="background-image:url(${item.image})"></div>
          <div class="lab-post-caption">${escapeHtml(pick(item, 'caption', lang))}</div>
        </div>`
    )
    .join('\n');
  const body = `    <div class="lab-view">
      <div class="img-post-box" id="labPostBox">
${items}
      </div>
    </div>`;
  const { assetPrefix } = prefixes(lang, false);
  return pageShell({
    title: 'LAB — 3Dowon',
    body,
    header: simpleHeader(site, 'lab', lang, relPath, str),
    lang,
    assetPrefix,
  });
}

function buildContact(site, lang) {
  const relPath = 'contact.html';
  const str = STR[lang];
  const body = `    <div class="contact-box">
      <div class="contact-info reveal">
        E. <a href="mailto:${escapeHtml(site.email)}">${escapeHtml(site.email)}</a><br />
        <a href="${escapeHtml(site.instagram)}" target="_blank">I. instagram.com/3dowon</a><br />
        <a href="${escapeHtml(site.vimeo)}" target="_blank">V. vimeo.com/3dowon</a><br />
        <a href="${escapeHtml(site.youtube)}" target="_blank">Y. youtube.com/@3dowon</a>
      </div>
    </div>`;
  const { assetPrefix } = prefixes(lang, false);
  return pageShell({
    title: 'contact — 3Dowon',
    body,
    header: simpleHeader(site, 'contact', lang, relPath, str),
    lang,
    assetPrefix,
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
  writeOutput(`${outPrefix}contact.html`, buildContact(site, lang));

  for (const work of works) {
    const relPath = `${outPrefix}work/${work.slug}.html`;
    writeOutput(relPath, buildWorkPage(work, site, lang));
    allWorkPaths.push(relPath);
  }

  cleanOrphanWorkPages(works.map((work) => work.slug), `${outPrefix}work`);
}

assertWorkPageHeaders(allWorkPaths);

console.log(`Built ${works.length} works × 2 languages and site pages from content/`);
