import { assertWorkPageHeaders, cleanOrphanWorkPages, loadJson, loadWorks, writeOutput } from './lib/content.mjs';
import { dataAttrs, escapeHtml, vimeoEmbedHtml } from './lib/html.mjs';

const CSS_VERSION = '518';
const JS_VERSION = '315';

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
    navWorks: 'Works',
    navLab: 'Lab',
    navAbout: 'About',
    navCv: 'CV',
    navHome: 'Home',
    mapWork: 'Work',
    mapMe: 'Me',
    mapArchives: 'Archives',
    chapWorks: 'I',
    chapLab: 'II',
    chapAbout: 'III',
    chapCv: 'IV',
    viewGrid: 'Grid',
    viewIndex: 'Index',
    introTitle: 'Title',
    introArtist: 'Artist',
    introRole: 'Practice',
    introOrigin: 'Origin',
    introMedium: 'Medium',
    introVolume: 'Volume',
    introAccession: 'Accession No.',
    introEnter: 'Open the book',
    coverKicker: 'A personal volume',
    coverHand: 'of works, notes & memory',
    notebookLabel: 'Works Studies',
    notebookNo: 'Vol. 01',
    conductedBy: 'author:',
    testNo: 'vol. no.:',
    bookPrev: 'Previous page',
    bookNext: 'Next page',
    bookOf: 'of',
    contents: 'Contents',
    specimens: 'Specimens',
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
    navHome: '홈',
    mapWork: '작업',
    mapMe: '소개',
    mapArchives: '아카이브',
    chapWorks: 'I',
    chapLab: 'II',
    chapAbout: 'III',
    chapCv: 'IV',
    viewGrid: '그리드',
    viewIndex: '인덱스',
    introTitle: '제목',
    introArtist: '작가',
    introRole: '분야',
    introOrigin: '출생',
    introMedium: '매체',
    introVolume: '권',
    introAccession: '등록번호',
    introEnter: '책 열기',
    coverKicker: '개인 도록',
    coverHand: '작업 · 노트 · 기억',
    notebookLabel: '작업 연구',
    notebookNo: 'Vol. 01',
    conductedBy: '저자:',
    testNo: '권호:',
    bookPrev: '이전 장',
    bookNext: '다음 장',
    bookOf: '/',
    contents: '목차',
    specimens: '표본',
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

function resolveMediaPath(src, assetPrefix) {
  const value = String(src || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/3dowonWebpage/')) return `${assetPrefix}${value.slice('/3dowonWebpage/'.length)}`;
  if (value.startsWith('/')) return `${assetPrefix}${value.slice(1)}`;
  if (value.startsWith('assets/')) return `${assetPrefix}${value}`;
  return value;
}

function workTitle(work, lang) {
  return pick(work, 'title', lang) || work.title || work.title_en || '';
}

function padIndex(n) {
  return String(n).padStart(2, '0');
}

/** Irregular masonry span pattern for catalog grid cells. */
function gridSpanClass(index) {
  const pattern = ['span-sq', 'span-wide', 'span-sq', 'span-tall', 'span-sq', 'span-sq', 'span-wide', 'span-sq', 'span-tall'];
  return pattern[index % pattern.length];
}

function siteFooterBar(site) {
  return `  <footer class="mg-footer">
    <a href="mailto:${escapeHtml(site.email)}">email</a>
    <a href="${escapeHtml(site.instagram)}" target="_blank" rel="noopener">instagram</a>
    <a href="${escapeHtml(site.vimeo)}" target="_blank" rel="noopener">vimeo</a>
    <a href="${escapeHtml(site.youtube)}" target="_blank" rel="noopener">youtube</a>
  </footer>`;
}

function langSwitchLinks(assetPrefix, lang, relPath) {
  const enHref = `${assetPrefix}${relPath}`;
  const koHref = `${assetPrefix}ko/${relPath}`;
  return `<a href="${enHref}" class="lang-switch-link${lang === 'en' ? ' active' : ''}" data-lang="en"${lang === 'en' ? ' aria-current="true"' : ''}>EN</a><span class="lang-switch-sep">/</span><a href="${koHref}" class="lang-switch-link${lang === 'ko' ? ' active' : ''}" data-lang="ko"${lang === 'ko' ? ' aria-current="true"' : ''}>KO</a>`;
}

function mobileHeader(homeHref, str) {
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
      <a href="${homePrefix}index.html"${navClass('home')}>${str.navHome}</a>
      <a href="${homePrefix}works.html"${navClass('works')}>${str.navWorks}</a>
      <a href="${homePrefix}lab.html"${navClass('lab')}>${str.navLab}</a>
      <a href="${homePrefix}about.html"${navClass('about')}>${str.navAbout}</a>
      <a href="${homePrefix}cv.html"${navClass('cv')}>${str.navCv}</a>
    </div>
    <div class="mo-lang-switch">${langSwitchLinks(assetPrefix, lang, relPath)}</div>
  </nav>`;
}

function mobileShell(activeNav, homePrefix, assetPrefix, lang, relPath, str) {
  return `${mobileHeader(`${homePrefix}index.html`, str)}${mobileNav(activeNav, homePrefix, assetPrefix, lang, relPath, str)}`;
}

function mgTop({
  homePrefix = '',
  assetPrefix = homePrefix,
  activeNav = '',
  lang = 'en',
  relPath = 'index.html',
  project = false,
  backLabel = 'Back',
}) {
  const str = STR[lang];
  const link = (name, href, label) =>
    `<a href="${href}" class="${activeNav === name ? 'is-active' : ''}">${label}</a>`;
  const back = project
    ? `<button type="button" class="btn-back mg-back" onclick="history.back()" aria-label="${backLabel}"><span class="btn-back-arrow" aria-hidden="true"></span></button>`
    : '';
  return `  <header class="mg-top">
    <div class="mg-top-left">
      ${back}
      <a href="${homePrefix}index.html" class="mg-brand">3Dowon</a>
    </div>
    <nav class="mg-top-nav" aria-label="Primary">
      ${link('home', `${homePrefix}index.html`, str.navHome)}
      ${link('works', `${homePrefix}works.html`, str.navWorks)}
      ${link('lab', `${homePrefix}lab.html`, str.navLab)}
      ${link('about', `${homePrefix}about.html`, str.navAbout)}
      ${link('cv', `${homePrefix}cv.html`, str.navCv)}
    </nav>
    <div class="mg-lang">${langSwitchLinks(assetPrefix, lang, relPath)}</div>
  </header>`;
}

function simpleHeader(activeNav, lang, relPath, str) {
  const { homePrefix, assetPrefix } = prefixes(lang, false);
  return `${mgTop({ homePrefix, assetPrefix, activeNav, lang, relPath })}
${mobileShell(activeNav, homePrefix, assetPrefix, lang, relPath, str)}`;
}

function pageShell({ title, body, header, extraHead = '', lang, assetPrefix, site }) {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${assetPrefix}styles.css?v=${CSS_VERSION}" />
${extraHead}
</head>
<body class="is-magda">
${header}
  <main class="mg-main">
${body}
  </main>
${siteFooterBar(site)}
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

function stripHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

function isClientWork(work) {
  const prod = String(work.production || work.meta_production_en || work.meta_production || '').toLowerCase();
  return Boolean(prod) && !['개인', 'solo', 'personal'].includes(prod);
}

function branchKey(work) {
  const tags = work.tags || [];
  if (tags.includes('인터랙티브') || tags.includes('Interactive')) return 'interactive';
  if (tags.includes('영상') || tags.includes('Video')) return 'video';
  if (tags.includes('설치') || tags.includes('Installation')) return 'installation';
  if (tags.includes('퍼포먼스') || tags.includes('Performance')) return 'performance';
  if (tags.includes('전시') || tags.includes('Exhibition')) return 'exhibition';
  if (tags.includes('프로젝션') || tags.includes('Projection')) return 'projection';
  return 'other';
}

const BRANCH_META = {
  interactive: {
    en: { name: 'Interactive', desc: 'Live, interactive, & system-responsive work' },
    ko: { name: '인터랙티브', desc: '실시간 · 인터랙티브 · 시스템 반응형 작업' },
  },
  video: {
    en: { name: 'Video', desc: 'Moving image, animation, & screen-based work' },
    ko: { name: '영상', desc: '영상 · 애니메이션 · 스크린 기반 작업' },
  },
  installation: {
    en: { name: 'Installation', desc: 'Spatial, immersive, & object-based work' },
    ko: { name: '설치', desc: '공간 · 몰입 · 오브제 기반 작업' },
  },
  performance: {
    en: { name: 'Performance', desc: 'Durational & body-centered work' },
    ko: { name: '퍼포먼스', desc: '지속 · 신체 중심 작업' },
  },
  exhibition: {
    en: { name: 'Exhibition', desc: 'Exhibition & presentation work' },
    ko: { name: '전시', desc: '전시 · 프레젠테이션 작업' },
  },
  projection: {
    en: { name: 'Projection', desc: 'Projection-mapped & light-based work' },
    ko: { name: '프로젝션', desc: '프로젝션 · 라이트 기반 작업' },
  },
  other: {
    en: { name: 'Works', desc: 'Selected projects' },
    ko: { name: '작업', desc: '선정 작업' },
  },
};

const BRANCH_ORDER = ['interactive', 'video', 'installation', 'performance', 'exhibition', 'projection', 'other'];

function groupWorks(works) {
  const map = new Map(BRANCH_ORDER.map((k) => [k, []]));
  for (const work of works) {
    const key = branchKey(work);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(work);
  }
  return BRANCH_ORDER.filter((k) => (map.get(k) || []).length).map((k) => [k, map.get(k)]);
}

function renderMgRow(work, lang, assetPrefix = '') {
  const title = workTitle(work, lang);
  const client = isClientWork(work);
  const meta = escapeHtml(pick(work, 'grid_type_label', lang) || pick(work, 'meta_type', lang) || '');
  const prod = escapeHtml(pick(work, 'meta_production', lang) || work.production || '');
  const metaText = client ? prod : meta;
  const year = work.year || '';
  return `            <a href="#${work.slug}" class="mg-row" data-slug="${work.slug}" ${dataAttrs(work)}>
              <img class="mg-row-thumb img-blur" src="${resolveMediaPath(work.thumbnail, assetPrefix)}" alt="" width="28" height="28" loading="lazy" />
              <span class="mg-row-main">
                <span class="mg-row-title">${escapeHtml(title)}</span>
                ${metaText ? `<span class="mg-row-meta${client ? ' is-client' : ''}">${metaText}</span>` : ''}
              </span>
              <span class="mg-row-leader" aria-hidden="true"></span>
              <span class="mg-row-end">
                <span>${year}</span>
                ${client ? '<span class="mg-dot mg-dot--client" title="client-based"></span>' : ''}
                <span class="mg-dot mg-dot--posted" title="posted"></span>
              </span>
            </a>`;
}

function renderMgDetail(work, lang, assetPrefix = '') {
  const str = STR[lang];
  const title = workTitle(work, lang);
  const desc = pick(work, 'description', lang) || '';
  const tools = escapeHtml(pick(work, 'meta_tech', lang) || (work.tech || []).join(', '));
  const medium = escapeHtml(pick(work, 'meta_medium', lang) || '');
  const production = escapeHtml(pick(work, 'meta_production', lang) || '');
  const type = escapeHtml(pick(work, 'meta_type', lang) || '');
  const video = vimeoEmbedHtml(work.vimeo_url, title);
  const galleryImgs = (work.gallery || [])
    .map(
      (src, index) =>
        `            <img class="img-blur mg-detail-gallery-img" src="${resolveMediaPath(src, assetPrefix)}" alt="${escapeHtml(title)} ${index + 1}" loading="lazy" />`
    )
    .join('\n');
  const gallery = galleryImgs
    ? `          <div class="mg-detail-gallery">
${galleryImgs}
          </div>`
    : '';

  return `        <article class="mg-detail-panel" id="detail-${work.slug}" data-slug="${work.slug}">
          <h1 class="mg-detail-title">${escapeHtml(title)}</h1>
          <p class="mg-detail-year">${work.year || ''}</p>
          ${video}
          <div class="mg-detail-media">
            <img class="img-blur" src="${resolveMediaPath(work.hero_image || work.thumbnail, assetPrefix)}" alt="${escapeHtml(title)}" />
          </div>
${gallery}
          <div class="mg-detail-section">
            <h2 class="mg-detail-label">About</h2>
            <div class="mg-detail-body">${desc}</div>
          </div>
          ${type ? `<div class="mg-detail-section"><h2 class="mg-detail-label">${str.type}</h2><div class="mg-detail-tools">${type}</div></div>` : ''}
          ${medium ? `<div class="mg-detail-section"><h2 class="mg-detail-label">${str.medium}</h2><div class="mg-detail-tools">${medium}</div></div>` : ''}
          ${tools ? `<div class="mg-detail-section"><h2 class="mg-detail-label">${str.tech}</h2><div class="mg-detail-tools">${tools}</div></div>` : ''}
          ${production ? `<div class="mg-detail-section"><h2 class="mg-detail-label">${str.production}</h2><div class="mg-detail-tools">${production}</div></div>` : ''}
          <a class="mg-detail-link" href="work/${work.slug}.html">${lang === 'ko' ? '전체 보기 →' : 'Open full page →'}</a>
        </article>`;
}

function buildHome(works, site, lang, about) {
  const str = STR[lang];
  const { homePrefix, assetPrefix } = prefixes(lang, false);
  const relPath = 'index.html';
  const groups = groupWorks(works);
  const workLinks = groups
    .map(([key]) => {
      const meta = BRANCH_META[key][lang];
      return `          <a class="map-node map-node--child" href="${homePrefix}works.html#${key}">
            <span class="map-node-label">${meta.name}</span>
            <span class="map-node-desc">${meta.desc}</span>
          </a>`;
    })
    .join('\n');

  const strip = works
    .slice(0, 18)
    .map(
      (w) =>
        `      <a class="map-strip-item" href="${homePrefix}works.html#${w.slug}" title="${escapeHtml(workTitle(w, lang))}">
        <img class="img-blur" src="${resolveMediaPath(w.thumbnail, assetPrefix)}" alt="" width="36" height="36" loading="lazy" />
      </a>`
    )
    .join('\n');

  const name = escapeHtml(pick(about, 'name', lang) || '3Dowon');
  const role = String(pick(about, 'meta', lang) || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)[0] || (lang === 'ko' ? '인터랙티브 미디어 아티스트' : 'Interactive Media Artist');

  const body = `    <div class="map-stage" id="mapStage">
      <aside class="map-strip" aria-hidden="true">
${strip}
      </aside>
      <div class="map-tree">
        <div class="map-col map-col--work">
          <div class="map-node map-node--root">
            <span class="map-node-label">${name}</span>
            <span class="map-node-desc">${escapeHtml(role)}</span>
          </div>
          <div class="map-group">
            <div class="map-node map-node--section">
              <span class="map-node-label">${str.mapWork}</span>
            </div>
${workLinks}
          </div>
        </div>
        <div class="map-col map-col--me">
          <div class="map-group">
            <div class="map-node map-node--section">
              <span class="map-node-label">${str.mapMe}</span>
            </div>
            <a class="map-node map-node--child" href="${homePrefix}about.html">
              <span class="map-node-label">${str.navAbout}</span>
            </a>
            <a class="map-node map-node--child" href="${homePrefix}cv.html">
              <span class="map-node-label">${str.navCv}</span>
            </a>
            <a class="map-node map-node--child" href="${homePrefix}lab.html">
              <span class="map-node-label">${str.navLab}</span>
            </a>
          </div>
          <div class="map-group map-group--archives">
            <div class="map-node map-node--section">
              <span class="map-node-label">${str.mapArchives}</span>
            </div>
            <a class="map-node map-node--child" href="mailto:${escapeHtml(site.email)}">
              <span class="map-node-label">email</span>
            </a>
            <a class="map-node map-node--child" href="${escapeHtml(site.instagram)}" target="_blank" rel="noopener">
              <span class="map-node-label">instagram</span>
            </a>
            <a class="map-node map-node--child" href="${escapeHtml(site.vimeo)}" target="_blank" rel="noopener">
              <span class="map-node-label">vimeo</span>
            </a>
          </div>
        </div>
        <span class="map-star" aria-hidden="true">✦</span>
      </div>
    </div>
    <div class="mg-thumb-float" id="mgThumbFloat" hidden>
      <img class="img-blur" id="mgThumbFloatImg" alt="" />
    </div>`;

  const header = `${mgTop({ homePrefix, assetPrefix, activeNav: 'home', lang, relPath })}
${mobileShell('home', homePrefix, assetPrefix, lang, relPath, str)}`;

  return pageShell({ title: '3Dowon', body, header, lang, assetPrefix, site });
}

function buildWorks(works, site, lang) {
  const str = STR[lang];
  const { homePrefix, assetPrefix } = prefixes(lang, false);
  const relPath = 'works.html';
  const groups = groupWorks(works);
  const branches = groups
    .map(([key, items]) => {
      const meta = BRANCH_META[key][lang];
      const rows = items.map((w) => renderMgRow(w, lang, assetPrefix)).join('\n');
      return `          <section class="mg-branch" id="${key}" data-branch="${key}">
            <div class="mg-branch-head">
              <span class="mg-branch-name">${meta.name}</span>
              <span class="mg-branch-desc">${meta.desc}</span>
            </div>
${rows}
          </section>`;
    })
    .join('\n');
  const details = works.map((w) => renderMgDetail(w, lang, assetPrefix)).join('\n');
  const firstSlug = works[0]?.slug || '';

  const body = `    <div class="mg-stage" id="mgStage" data-active="${firstSlug}">
      <aside class="mg-index" aria-label="Index">
        <h1 class="mg-index-title">index</h1>
        <div class="mg-legend">
          <span class="mg-legend-item"><span class="mg-dot mg-dot--client"></span>${lang === 'ko' ? '공동/의뢰' : 'client-based'}</span>
          <span class="mg-legend-item"><span class="mg-dot mg-dot--posted"></span>${lang === 'ko' ? '게시됨' : 'posted'}</span>
          <span class="mg-legend-item"><span class="mg-dot mg-dot--open"></span>${lang === 'ko' ? '미게시' : 'not posted'}</span>
        </div>
${branches}
      </aside>
      <section class="mg-detail" id="mgDetail" aria-label="Detail">
        <p class="mg-detail-empty${firstSlug ? ' hidden' : ''}">${lang === 'ko' ? '작업을 선택하세요' : 'Select a work'}</p>
${details}
      </section>
    </div>
    <div class="mg-thumb-float" id="mgThumbFloat" hidden>
      <img class="img-blur" id="mgThumbFloatImg" alt="" />
    </div>`;

  const header = `${mgTop({ homePrefix, assetPrefix, activeNav: 'works', lang, relPath })}
${mobileShell('works', homePrefix, assetPrefix, lang, relPath, str)}`;

  return pageShell({ title: '3Dowon — Works', body, header, lang, assetPrefix, site });
}

function buildWorkPage(work, site, lang) {
  const str = STR[lang];
  const { homePrefix, assetPrefix } = prefixes(lang, true);
  const relPath = `work/${work.slug}.html`;
  const title = workTitle(work, lang);
  const gallery = (work.gallery || [])
    .map(
      (src, index) =>
        `          <li class="reveal"><img src="${resolveMediaPath(src, assetPrefix)}" alt="${escapeHtml(title)} ${index + 1}" class="project-detail-image img-blur" /></li>`
    )
    .join('\n');
  const video = vimeoEmbedHtml(work.vimeo_url, title);

  const body = `    <div class="mg-page post-projects">
      ${video}
      <div class="post-hero">
        <img src="${resolveMediaPath(work.hero_image || work.thumbnail, assetPrefix)}" alt="${escapeHtml(title)}" class="post-hero-image img-blur" />
      </div>
      <h1 class="post-title">${escapeHtml(title)}</h1>
      <div class="post-meta">
        <div class="post-meta-row"><span class="post-meta-q">${str.year}</span><span>${escapeHtml(work.meta_year || String(work.year))}</span></div>
        <div class="post-meta-row"><span class="post-meta-q">${str.type}</span><span>${escapeHtml(pick(work, 'meta_type', lang) || '')}</span></div>
        <div class="post-meta-row"><span class="post-meta-q">${str.medium}</span><span>${escapeHtml(pick(work, 'meta_medium', lang) || '')}</span></div>
        <div class="post-meta-row"><span class="post-meta-q">${str.tech}</span><span>${escapeHtml(pick(work, 'meta_tech', lang) || '')}</span></div>
        <div class="post-meta-row"><span class="post-meta-q">${str.production}</span><span>${escapeHtml(pick(work, 'meta_production', lang) || '')}</span></div>
      </div>
      <div class="post-des">
        ${pick(work, 'description', lang) || ''}
      </div>
      <ul class="project-detail-gallery">
${gallery}
      </ul>
    </div>`;

  const header = `${mgTop({
    homePrefix,
    assetPrefix,
    activeNav: 'works',
    lang,
    relPath,
    project: true,
    backLabel: str.back,
  })}
${mobileHeader(`${homePrefix}index.html`, str)}
${mobileNav('', homePrefix, assetPrefix, lang, relPath, str)}`;

  return pageShell({
    title: `${escapeHtml(title)} — 3Dowon`,
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
  const { assetPrefix } = prefixes(lang, false);
  const paragraphs = String(pick(about, 'body', lang) || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n').map((line) => escapeHtml(line));
      return `          <p>${lines.join('<br />\n            ')}</p>`;
    })
    .join('\n');
  const metaLines = String(pick(about, 'meta', lang) || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const metaRows = metaLines
    .map((line, i) => {
      const label = i === 0 ? (lang === 'ko' ? '역할' : 'Role') : (lang === 'ko' ? '출생' : 'Origin');
      return `            <div class="about-kv-row"><span class="about-kv-q">${label}</span><span class="about-kv-a">${escapeHtml(line)}</span></div>`;
    })
    .join('\n');
  const body = `    <div class="mg-page about-box">
      <h1 class="mg-page-title">${escapeHtml(pick(about, 'name', lang))}</h1>
      <div class="about-kv">
${metaRows}
      </div>
      <div class="about-section2">
${paragraphs}
      </div>
      <div class="about-specimen">
        <img class="about-img img-blur" src="${resolveMediaPath(about.image, assetPrefix)}" alt="${escapeHtml(pick(about, 'name', lang))}" loading="lazy" />
      </div>
    </div>`;
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
            <div class="cv-year">${escapeHtml(entry.year)}</div>
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
  const body = `    <div class="mg-page cv-box">
      <h1 class="mg-page-title">CV</h1>
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
  const { assetPrefix } = prefixes(lang, false);
  const items = lab.items
    .map((item, index) => {
      const caption = escapeHtml(pick(item, 'caption', lang));
      const hasVideo = Boolean(item.video);
      const imageSrc = resolveMediaPath(item.image, assetPrefix);
      const videoSrc = hasVideo ? resolveMediaPath(item.video, assetPrefix) : '';
      const media = hasVideo
        ? `<video class="lab-post-video" src="${videoSrc}" playsinline controls preload="metadata" hidden></video>`
        : '';
      return `        <article class="lab-post" data-lab-image="${imageSrc}" data-has-video="${hasVideo ? 'true' : 'false'}">
          <button type="button" class="lab-post-trigger" aria-label="${caption}">
            <div class="lab-post-media">
              <img class="lab-post-thumb img-blur" src="${imageSrc}" alt="${caption}" loading="lazy" />
              ${media}
            </div>
            <div class="lab-post-caption">${caption}</div>
          </button>
        </article>`;
    })
    .join('\n');
  const body = `    <div class="mg-page lab-view">
      <h1 class="mg-page-title">${lang === 'ko' ? '실험' : 'Lab'}</h1>
      <div class="lab-grid" id="labPostBox">
${items}
      </div>
    </div>
    <div class="lab-lightbox" id="labLightbox" hidden>
      <img class="lab-lightbox-img" id="labLightboxImg" alt="" />
    </div>`;
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

  writeOutput(`${outPrefix}index.html`, buildHome(works, site, lang, about));
  writeOutput(`${outPrefix}works.html`, buildWorks(works, site, lang));
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
