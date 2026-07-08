import { assertWorkPageHeaders, cleanOrphanWorkPages, loadJson, loadWorks, writeOutput } from './lib/content.mjs';
import { dataAttrs, escapeHtml, vimeoEmbedHtml } from './lib/html.mjs';

const CSS_VERSION = '196';
const JS_VERSION = '83';
const LOGO_VERSION = '2';

function siteFooter(site) {
  return `        E. <a href="mailto:${escapeHtml(site.email)}">${escapeHtml(site.email)}</a><br />
        <a href="${escapeHtml(site.instagram)}" target="_blank" rel="noopener">I. instagram.com/3dowon</a><br />
        <a href="${escapeHtml(site.vimeo)}" target="_blank" rel="noopener">V. vimeo.com/3dowon</a><br />
        <a href="${escapeHtml(site.youtube)}" target="_blank" rel="noopener">Y. youtube.com/@3dowon</a>`;
}

function siteLogo(prefix = '') {
  return `<a href="${prefix}index.html" class="sidebar-logo sidebar-logo--img"><img src="${prefix}assets/logo.png?v=${LOGO_VERSION}" alt="3Dowon" class="sidebar-logo-img" /></a>`;
}

function mobileHeader(home = 'index.html') {
  const assetPrefix = home.startsWith('../') ? '../' : '';
  return `  <div class="mo-header">
    <a href="${home}" class="mo-logo mo-logo--img"><img src="${assetPrefix}assets/logo.png?v=${LOGO_VERSION}" alt="3Dowon" class="mo-logo-img" /></a>
    <button class="mo-menu-btn" id="moMenuBtn" aria-label="메뉴"><span class="mo-menu-icon" aria-hidden="true"></span></button>
  </div>`;
}

function mobileNav(site, activeNav = '', prefix = '') {
  const navClass = (name) => (activeNav === name ? ' class="active"' : '');
  return `  <div class="mo-overlay" id="moOverlay"></div>
  <nav class="mo-nav" id="moNav" aria-hidden="true">
    <button type="button" class="mo-nav-close" id="moNavClose" aria-label="닫기">×</button>
    <div class="mo-nav-links">
      <a href="${prefix}index.html"${navClass('works')}>WORKS</a>
      <a href="${prefix}lab.html"${navClass('lab')}>LAB</a>
      <a href="${prefix}about.html"${navClass('about')}>ABOUT</a>
      <a href="${prefix}cv.html"${navClass('cv')}>CV</a>
    </div>
    <div class="mo-nav-footer">
      <div class="mo-nav-footer-info">
${siteFooter(site)}
      </div>
    </div>
  </nav>`;
}

function mobileShell(site, activeNav = '') {
  return `${mobileHeader()}${mobileNav(site, activeNav)}`;
}

function worksControls() {
  return `          <div class="sidebar-controls">
            <ul class="view-toggle">
              <li data-view="grid" class="active">그리드</li>
              <li data-view="index">인덱스</li>
            </ul>
            <ul class="filter-checks filter-checks--type">
              <li data-filter="type" data-value="설치">설치</li>
              <li data-filter="type" data-value="영상">영상</li>
              <li data-filter="type" data-value="퍼포먼스">퍼포먼스</li>
              <li data-filter="type" data-value="전시">전시</li>
              <li data-filter="type" data-value="인터랙티브">인터랙티브</li>
              <li data-filter="type" data-value="프로젝션">프로젝션</li>
            </ul>
            <ul class="filter-checks filter-checks--tech">
              <li data-filter="tech" data-value="Unreal">Unreal</li>
              <li data-filter="tech" data-value="Unity">Unity</li>
              <li data-filter="tech" data-value="Arduino">Arduino</li>
              <li data-filter="tech" data-value="3ds Max">3ds Max</li>
            </ul>
          </div>`;
}

function secondaryNav(prefix = '', activeNav = '') {
  const navClass = (name) => `nav-cell nav-${name}${activeNav === name ? ' active' : ''}`;
  return `      <nav class="nav-main nav-main--secondary">
        <a href="${prefix}lab.html" class="${navClass('lab')}">LAB</a>
        <a href="${prefix}about.html" class="${navClass('about')}">ABOUT</a>
        <a href="${prefix}cv.html" class="${navClass('cv')}">CV</a>
        <a href="${prefix}contact.html" class="${navClass('contact')}">CONTACT</a>
      </nav>`;
}

function headerBar({ prefix = '', home = `${prefix}index.html`, activeNav = '', worksOpen = false, logoHtml, extraCol2 = '', variant = '' }) {
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
${secondaryNav(prefix, activeNav)}
      </div>
    </div>
  </header>`;
}

function simpleHeader(site, activeNav) {
  return `${headerBar({
    activeNav,
    logoHtml: siteLogo(),
  })}
${mobileShell(site, activeNav)}`;
}

function pageShell({ title, body, header, extraHead = '' }) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
  <link rel="stylesheet" href="styles.css?v=${CSS_VERSION}" />
${extraHead}
</head>
<body>
${header}
  <main>
${body}
  </main>
  <script src="script.js?v=${JS_VERSION}"></script>
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

function renderGridPost(work) {
  return `        <a href="work/${work.slug}.html" class="img-post reveal" ${dataAttrs(work)}>
          <div class="img-post-thumbimg" style="background-image:url(${work.thumbnail})"></div>
          <div class="img-post-title">${escapeHtml(work.title)}</div>
          <div class="img-post-type">${escapeHtml(work.grid_type_label)}</div>
          <div class="img-post-year">${work.year}</div>
        </a>`;
}

function renderIndexPost(work) {
  const preview = work.preview_bg || work.thumbnail;
  return `          <a href="work/${work.slug}.html" class="index-post reveal" data-preview-bg="${preview}" ${dataAttrs(work)}>
            <div class="index-post-row">
              <div class="index-post-cells">
                <div class="index-post-year">${work.year}</div>
                <div class="index-post-title">${escapeHtml(work.title)}</div>
                <div class="index-post-type">${escapeHtml(work.index_type_label)}</div>
              </div>
              <div class="index-post-line"></div>
            </div>
          </a>`;
}

function buildIndex(works, site) {
  const gridPosts = works.map(renderGridPost).join('\n');
  const indexPosts = works.map(renderIndexPost).join('\n');
  const body = `    <div class="works-view works-view--grid" id="gridView">
      <div class="img-post-box" id="imgPostBox">
${gridPosts}
      </div>
    </div>

    <div class="works-view works-view--index hidden" id="indexView">
      <div class="index-box">
        <div class="index-category">
          <div class="index-category-cells">
            <div class="index-category-year">년도</div>
            <div class="index-category-title">작업</div>
            <div class="index-category-type">유형</div>
          </div>
          <div class="index-category-line"></div>
        </div>
        <div class="index-post-box" id="indexPostBox">
${indexPosts}
        </div>
        <div id="indexPreview" class="index-post-thumbimg"></div>
      </div>
    </div>

    <p class="no-results" style="margin-left:30px">검색 결과가 없습니다.</p>`;

  const header = `${headerBar({
    activeNav: 'works',
    worksOpen: true,
    logoHtml: siteLogo(),
  })}

${mobileHeader()}
  <div class="mo-filters mo-filters--type">
    <span class="mo-filter" data-filter="type" data-value="설치">설치</span>
    <span class="mo-filter" data-filter="type" data-value="영상">영상</span>
    <span class="mo-filter" data-filter="type" data-value="퍼포먼스">퍼포먼스</span>
    <span class="mo-filter" data-filter="type" data-value="전시">전시</span>
    <span class="mo-filter" data-filter="type" data-value="인터랙티브">인터랙티브</span>
    <span class="mo-filter" data-filter="type" data-value="프로젝션">프로젝션</span>
  </div>
  <div class="mo-filters mo-filters--tech">
    <span class="mo-filter" data-filter="tech" data-value="Unreal">Unreal</span>
    <span class="mo-filter" data-filter="tech" data-value="Unity">Unity</span>
    <span class="mo-filter" data-filter="tech" data-value="Arduino">Arduino</span>
    <span class="mo-filter" data-filter="tech" data-value="3ds Max">3ds Max</span>
  </div>
${mobileNav(site, 'works')}`;

  return pageShell({ title: '3Dowon — Media Artist', body, header });
}

function buildWorkPage(work, site) {
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
            <div class="post-des-list"><div class="post-q">연도</div><div class="post-a">${escapeHtml(work.meta_year || String(work.year))}</div></div>
            <div class="post-des-list"><div class="post-q">유형</div><div class="post-a">${escapeHtml(work.meta_type || '')}</div></div>
            <div class="post-des-list"><div class="post-q">매체</div><div class="post-a">${escapeHtml(work.meta_medium || '')}</div></div>
            <div class="post-des-list"><div class="post-q">기술</div><div class="post-a">${escapeHtml(work.meta_tech || '')}</div></div>
            <div class="post-des-list"><div class="post-q">제작</div><div class="post-a">${escapeHtml(work.meta_production || '')}</div></div>
          </div>
          <div class="post-detail-des reveal">
            ${work.description || ''}
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
    prefix: '../',
    home: '../index.html',
    activeNav: 'works',
    variant: 'project',
    logoHtml: siteLogo('../'),
    extraCol2: `<button class="btn-back" onclick="history.back()" aria-label="뒤로">←</button>`,
  })}
${mobileHeader('../index.html')}
${mobileNav(site, '', '../')}`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(work.title)} — 3Dowon</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
  <link rel="stylesheet" href="../styles.css?v=${CSS_VERSION}" />
</head>
<body>
${header}
  <main>
${body}
  </main>
  <script src="../script.js?v=${JS_VERSION}"></script>
</body>
</html>
`;
}

function buildAbout(about, site) {
  const paragraphs = about.body
    .split(/\n{2,}/)
    .map((p) => `          <p>${p.trim()}</p>`)
    .join('\n');
  const meta = about.meta
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => escapeHtml(line))
    .join('<br />\n            ');
  const body = `    <div class="about-box">
      <div class="about-left">
        <div class="about-selector">
          <div class="about-name">${escapeHtml(about.name)}</div>
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
  return pageShell({ title: 'about — 3Dowon', body, header: simpleHeader(site, 'about') });
}

function buildCv(cv, site) {
  const sections = cv.sections
    .map((section) => {
      const entries = section.entries
        .map(
          (entry) => `          <div class="cv-entry">
            <div class="cv-year">${entry.year}</div>
            <div class="cv-desc">${entry.description}</div>
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
  return pageShell({ title: 'CV — 3Dowon', body, header: simpleHeader(site, 'cv') });
}

function buildLab(lab, site) {
  const items = lab.items
    .map(
      (item) => `        <div class="img-post lab-post reveal">
          <div class="img-post-thumbimg" style="background-image:url(${item.image})"></div>
          <div class="lab-post-caption">${escapeHtml(item.caption)}</div>
        </div>`
    )
    .join('\n');
  const body = `    <div class="lab-view">
      <div class="img-post-box" id="labPostBox">
${items}
      </div>
    </div>`;
  return pageShell({ title: 'LAB — 3Dowon', body, header: simpleHeader(site, 'lab') });
}

function buildContact(site) {
  const body = `    <div class="contact-box">
      <div class="contact-info reveal">
        E. <a href="mailto:${escapeHtml(site.email)}">${escapeHtml(site.email)}</a><br />
        <a href="${escapeHtml(site.instagram)}" target="_blank">I. instagram.com/3dowon</a><br />
        <a href="${escapeHtml(site.vimeo)}" target="_blank">V. vimeo.com/3dowon</a><br />
        <a href="${escapeHtml(site.youtube)}" target="_blank">Y. youtube.com/@3dowon</a>
      </div>
    </div>`;
  return pageShell({ title: 'contact — 3Dowon', body, header: simpleHeader(site, 'contact') });
}

const site = loadJson('content/site.json');
const about = loadJson('content/about.json');
const cv = loadJson('content/cv.json');
const lab = loadJson('content/lab.json');
const works = loadWorks().map(normalizeWork);

writeOutput('index.html', buildIndex(works, site));
writeOutput('about.html', buildAbout(about, site));
writeOutput('cv.html', buildCv(cv, site));
writeOutput('lab.html', buildLab(lab, site));
writeOutput('contact.html', buildContact(site));

for (const work of works) {
  writeOutput(`work/${work.slug}.html`, buildWorkPage(work, site));
}

cleanOrphanWorkPages(works.map((work) => work.slug));
assertWorkPageHeaders(works.map((work) => work.slug));

console.log(`Built ${works.length} works and site pages from content/`);
