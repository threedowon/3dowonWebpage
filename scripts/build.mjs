import { assertWorkPageHeaders, cleanOrphanWorkPages, loadJson, loadWorks, writeOutput } from './lib/content.mjs';
import { dataAttrs, escapeHtml, vimeoEmbedHtml } from './lib/html.mjs';

const CSS_VERSION = '776';
const JS_VERSION = '461';

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

function siteTreeNav({
  works,
  homePrefix = '',
  assetPrefix = homePrefix,
  activeNav = '',
  activeSlug = '',
  lang = 'en',
  relPath = 'index.html',
  worksOpen = false,
}) {
  const str = STR[lang];
  const groups = groupWorks(works);
  const branches = groups
    .map(([key, items]) => {
      const meta = BRANCH_META[key][lang];
      const leaves = items
        .map((work) => {
          const title = workTitle(work, lang);
          const client = isClientWork(work);
          const leafActive = activeSlug === work.slug ? ' is-active' : '';
          return `          <a class="t-item t-l4${leafActive}" href="${homePrefix}work/${work.slug}.html" data-slug="${work.slug}">
            <i class="t-o" aria-hidden="true"></i>
            <img class="mg-row-thumb img-blur" src="${resolveMediaPath(work.thumbnail, assetPrefix)}" alt="" width="22" height="22" loading="lazy" />
            <span class="t-text">
              <span class="t-label">${escapeHtml(title)}</span>
              <span class="t-meta">${work.year || ''}${client ? ' · client' : ''}</span>
            </span>
          </a>`;
        })
        .join('\n');
      return `        <div class="t-cat" id="nav-${key}">
          <a class="t-item t-l3" href="${homePrefix}work/${items[0].slug}.html">
            <i class="t-o" aria-hidden="true"></i>
            <span class="t-label">${escapeHtml(meta.name)}</span>
          </a>
${leaves}
        </div>`;
    })
    .join('\n');
  const openAttr = worksOpen ? ' is-open' : '';
  const expanded = worksOpen ? 'true' : 'false';
  const active = (name) => (activeNav === name ? ' is-active' : '');
  const practiceNote =
    lang === 'ko'
      ? '공간과 감각을 다루는 인터랙티브 미디어 작업'
      : 'Interactive media for space, senses, and memory';
  const practiceSignal =
    lang === 'ko'
      ? '빛 · 공간 · 입력 · 움직임 · 기억 · 감각 · '
      : 'light · space · input · movement · memory · senses · ';

  return `  <aside class="site-tree menu-container" id="siteTree" aria-label="Site">
    <div class="site-tree-lang">${langSwitchLinks(assetPrefix, lang, relPath)}</div>
    <nav class="t-nav">
      <a href="${homePrefix}index.html" class="t-item t-l1${active('home')}">
        <i class="t-o" aria-hidden="true"></i>
        <span class="t-brand">
          <span class="t-label">3Dowon</span>
          <span class="t-role">${practiceNote}</span>
          <span class="t-signal" aria-hidden="true">
            <span>${practiceSignal}${practiceSignal}</span>
          </span>
        </span>
      </a>
      <div class="t-branch${openAttr}" data-tree-branch="works">
        <button type="button" class="t-item t-l2 site-tree-toggle${active('works')}" aria-expanded="${expanded}" aria-controls="tree-works-children">
          <i class="t-o" aria-hidden="true"></i>
          <span class="t-label">${str.navWorks}</span>
        </button>
        <div class="t-children site-tree-children" id="tree-works-children"${worksOpen ? '' : ' hidden'}>
${branches}
        </div>
      </div>
      <a href="${homePrefix}lab.html" class="t-item t-l2${active('lab')}">
        <i class="t-o" aria-hidden="true"></i>
        <span class="t-label">LAB</span>
      </a>
      <a href="${homePrefix}cv.html" class="t-item t-l2${active('cv')}">
        <i class="t-o" aria-hidden="true"></i>
        <span class="t-label">CV</span>
      </a>
    </nav>
  </aside>`;
}

function pageChrome({
  works,
  activeNav = '',
  activeSlug = '',
  lang = 'en',
  relPath = 'index.html',
  isWork = false,
  project = false,
  backLabel = 'Back',
}) {
  const str = STR[lang];
  const { homePrefix, assetPrefix } = prefixes(lang, isWork);
  const worksOpen = activeNav === 'home' || activeNav === 'works' || project;
  const back = project
    ? `    <button type="button" class="btn-back mg-back site-tree-back" onclick="history.back()" aria-label="${backLabel}"><span class="btn-back-arrow" aria-hidden="true"></span></button>`
    : '';
  return `${mobileHeader(`${homePrefix}index.html`, str)}
  <div class="mo-overlay" id="moOverlay"></div>
  <div class="site-shell">
${siteTreeNav({ works, homePrefix, assetPrefix, activeNav, activeSlug, lang, relPath, worksOpen })}
${back}`;
}

function archiveHeader({ lang, relPath, section, index, isWork = false, active = '' }) {
  const { homePrefix, assetPrefix } = prefixes(lang, isWork);
  const activeClass = (key) => (active === key ? ' is-active' : '');
  return `  <div class="site-shell archive-shell">
    <header class="archive-site-header">
      <a class="archive-brand" href="${homePrefix}index.html">3Dowon</a>
      <div class="archive-heading">
        <span>3D / ${index}</span>
        <strong>${escapeHtml(section)}</strong>
      </div>
      <nav class="archive-nav" aria-label="Sections">
        <a class="${activeClass('works')}" href="${homePrefix}works.html">${lang === 'ko' ? '작업 지도' : 'Practice map'}</a>
        <a class="${activeClass('about')}" href="${homePrefix}about.html">${lang === 'ko' ? '소개' : 'About'}</a>
        <a class="${activeClass('lab')}" href="${homePrefix}lab.html">Lab</a>
        <a class="${activeClass('cv')}" href="${homePrefix}cv.html">CV</a>
        <span class="archive-lang">${langSwitchLinks(assetPrefix, lang, relPath)}</span>
      </nav>
    </header>
${isWork ? `    <a class="archive-back" href="${homePrefix}works.html">← ${lang === 'ko' ? '작업 지도' : 'Practice map'}</a>` : ''}`;
}

function pageShell({ title, body, header = '', extraHead = '', lang, assetPrefix, site, pageClass = '' }) {
  const shellClose = header.includes('site-shell') ? '  </div>\n' : '';
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300..800&display=swap" />
  <link rel="stylesheet" href="${assetPrefix}styles.css?v=${CSS_VERSION}" />
${extraHead}
</head>
<body class="is-magda has-site-tree${pageClass ? ` ${pageClass}` : ''}">
${header}
    <main class="mg-main page-right">
${body}
    </main>
    <div class="mg-thumb-float" id="mgThumbFloat" hidden>
      <img class="img-blur" id="mgThumbFloatImg" alt="" />
    </div>
${siteFooterBar(site)}
${shellClose}  <script src="${assetPrefix}script.js?v=${JS_VERSION}"></script>
</body>
</html>
`;
}

function aboutBoardData(about, lang, assetPrefix) {
  const paragraphs = String(pick(about, 'body', lang) || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim().replace(/\s+/g, ' '))
    .filter(Boolean);
  const metaLines = String(pick(about, 'meta', lang) || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const labels =
    lang === 'ko'
      ? {
          practice: '작업',
          approach: '방식',
          fields: ['인터랙티브 설치', '피지컬 컴퓨팅', '실시간 그래픽', '센서 기술'],
        }
      : {
          practice: 'Practice',
          approach: 'Approach',
          fields: ['Interactive installation', 'Physical computing', 'Real-time graphics', 'Sensor technology'],
        };
  return {
    name: pick(about, 'name', lang) || '',
    role: metaLines[0] || '',
    origin: metaLines[1] || '',
    practice: paragraphs.slice(0, 2).join(' '),
    approach: paragraphs.slice(2).join(' '),
    fields: labels.fields,
    image: resolveMediaPath(about.image, assetPrefix) || '',
    labels: {
      practice: labels.practice,
      approach: labels.approach,
    },
  };
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

function renderMgRow(work, lang, assetPrefix = '', homePrefix = '') {
  const title = workTitle(work, lang);
  const client = isClientWork(work);
  const meta = escapeHtml(pick(work, 'grid_type_label', lang) || pick(work, 'meta_type', lang) || '');
  const prod = escapeHtml(pick(work, 'meta_production', lang) || work.production || '');
  const metaText = client ? prod : meta;
  const year = work.year || '';
  return `            <a href="${homePrefix}work/${work.slug}.html" class="mg-row" data-slug="${work.slug}" ${dataAttrs(work)}>
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
  const client = isClientWork(work);
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

  return `        <article class="mg-dossier" id="${work.slug}" data-slug="${work.slug}">
          <div class="mg-dossier-rule" aria-hidden="true"><span class="mg-dot"></span><span class="mg-dossier-rule-line"></span><span class="mg-dot"></span></div>
          <h1 class="mg-dossier-title map-node map-node--root">
            <span class="map-node-label">${escapeHtml(title)}${client ? '<span class="mg-dot mg-dot--client"></span>' : ''}</span>
          </h1>
          <p class="mg-dossier-year map-node map-node--leaf"><span class="map-node-label">${work.year || ''}</span></p>
          ${video}
          <div class="mg-detail-media">
            <img class="img-blur" src="${resolveMediaPath(work.hero_image || work.thumbnail, assetPrefix)}" alt="${escapeHtml(title)}" />
          </div>
${gallery}
          <div class="mg-dossier-section map-node map-node--section">
            <h2 class="map-node-label">About</h2>
            <div class="mg-detail-body">${desc}</div>
          </div>
          ${type ? `<div class="mg-dossier-section map-node map-node--child"><h2 class="map-node-label">${str.type}</h2><div class="mg-detail-tools">${type}</div></div>` : ''}
          ${medium ? `<div class="mg-dossier-section map-node map-node--child"><h2 class="map-node-label">${str.medium}</h2><div class="mg-detail-tools">${medium}</div></div>` : ''}
          ${tools ? `<div class="mg-dossier-section map-node map-node--child"><h2 class="map-node-label">${str.tech}</h2><div class="mg-detail-tools">${tools}</div></div>` : ''}
          ${production ? `<div class="mg-dossier-section map-node map-node--child"><h2 class="map-node-label">${str.production}</h2><div class="mg-detail-tools">${production}</div></div>` : ''}
        </article>`;
}

function homeRecordBody(works, lab, about, lang) {
  const name = escapeHtml(pick(about, 'name', lang));
  const labels =
    lang === 'ko'
      ? {
          title: '제목',
          accession: '등록 번호',
          artist: '작가',
          practice: '작업 분야',
          materials: '주요 재료',
          index: '인덱스',
          location: '기반',
          titleValue: '공간, 감각, 기억을 위한 인터랙티브 미디어',
          practiceValue: '인터랙티브 설치 · 피지컬 컴퓨팅',
          materialsValue: '빛 · 공간 · 센서 · 실시간 그래픽',
          locationValue: '대한민국',
          works: `작업 ${works.length}`,
          lab: `실험 ${lab.items.length}`,
          cv: '이력',
        }
      : {
          title: 'Title',
          accession: 'Accession number',
          artist: 'Artist',
          practice: 'Practice / field',
          materials: 'Working materials',
          index: 'Index',
          location: 'Based in',
          titleValue: 'Interactive media for space, senses, and memory',
          practiceValue: 'Interactive installation · physical computing',
          materialsValue: 'Light · space · sensors · real-time graphics',
          locationValue: 'South Korea',
          works: `${works.length} works`,
          lab: `${lab.items.length} experiments`,
          cv: 'CV',
        };

  return `    <div class="record-page" aria-labelledby="record-title">
      <header class="record-header">
        <span class="record-kicker">3D / 00</span>
        <h1 id="record-title">${name}</h1>
        <span class="record-status">${lang === 'ko' ? '작업 중' : 'active practice'}</span>
      </header>

      <dl class="record-fields">
        <div class="record-field record-field--title">
          <dt>${labels.title}:</dt>
          <dd>${labels.titleValue}</dd>
        </div>
        <div class="record-field record-field--accession">
          <dt>${labels.accession}:</dt>
          <dd><mark>1996.KR.3D(01)</mark></dd>
        </div>
        <div class="record-field">
          <dt>${labels.artist}:</dt>
          <dd>${name}<br />${lang === 'ko' ? '(대한민국, 1996–현재)' : '(South Korea, 1996–present)'}</dd>
        </div>
        <div class="record-field">
          <dt>${labels.practice}:</dt>
          <dd>${labels.practiceValue}</dd>
        </div>
        <div class="record-field">
          <dt>${labels.materials}:</dt>
          <dd>${labels.materialsValue}</dd>
        </div>
        <div class="record-field record-field--index">
          <dt>${labels.index}:</dt>
          <dd>
            <a href="works.html" data-record-link>↗ ${labels.works}</a>
            <a href="works.html#lab" data-record-link>↗ ${labels.lab}</a>
            <a href="cv.html" data-record-link>↗ ${labels.cv}</a>
          </dd>
        </div>
        <div class="record-field record-field--location">
          <dt>${labels.location}:</dt>
          <dd>${labels.locationValue}</dd>
        </div>
      </dl>

      <a class="record-about-link" href="works.html#about">${lang === 'ko' ? '작가 소개 읽기' : 'Read full profile'} ↗</a>
    </div>`;
}

function stableSeed(value) {
  return [...String(value)].reduce((total, char, index) => total + char.charCodeAt(0) * (index + 3), 0);
}

function clampCoordinate(value) {
  return Math.max(9, Math.min(91, value));
}

function workSkillKeys(work) {
  const terms = `${(work.tags || []).join(' ')} ${work.type || ''} ${work.meta_type || ''} ${
    work.meta_type_en || ''
  } ${work.meta_medium || ''} ${work.meta_medium_en || ''}`.toLowerCase();
  const tech = `${(work.tech || []).join(' ')} ${work.meta_tech || ''} ${
    work.meta_tech_en || ''
  }`.toLowerCase();
  const skills = [];
  if (/인터랙티브|interactive/.test(terms)) skills.push('interactive');
  if (/arduino|esp32|sensor|센서|physical|kinect|servo|motor|circuit|회로/.test(tech)) {
    skills.push('physical-computing');
  }
  if (/touchdesigner|unreal|unity|max\/msp|shader|real.?time|실시간/.test(tech)) skills.push('realtime');
  if (/프로젝션|projection|mapping/.test(`${terms} ${tech}`)) skills.push('projection');
  if (/arduino|esp32|sensor|센서|kinect/.test(tech)) skills.push('sensors');
  if (/robot|robotic|servo|motor|로봇|서보|모터/.test(`${terms} ${tech}`)) skills.push('robotics');
  if (/light|lighting|dmx|빛|조명/.test(`${terms} ${tech}`)) skills.push('light');
  if (/shadow|그림자/.test(`${terms} ${tech}`)) skills.push('shadow');
  if (/display|screen|window|디스플레이|화면|창문/.test(`${terms} ${tech}`)) skills.push('display');
  return [...new Set(skills.length ? skills : ['realtime'])];
}

function labSkillKeys(item) {
  const caption = `${item.caption || ''} ${item.caption_en || ''}`.toLowerCase();
  const skills = [];
  if (/interaction|touch|인터랙션|터치/.test(caption)) skills.push('interactive');
  if (/physical|sensor|arduino|plant|servo|circuit|motor|피지컬|센서|식물|서보|회로|모터/.test(caption)) {
    skills.push('physical-computing');
  }
  if (/unreal|shader|audio|real-time|언리얼|셰이더|오디오|실시간/.test(caption)) skills.push('realtime');
  if (/projection|mapping|light|water|프로젝션|맵핑|조명|물/.test(caption)) skills.push('projection');
  if (/sensor|arduino|plant|센서|식물/.test(caption)) skills.push('sensors');
  if (/robot|servo|motor|로봇|서보|모터/.test(caption)) skills.push('robotics');
  if (/light|lighting|dmx|빛|조명/.test(caption)) skills.push('light');
  if (/shadow|그림자/.test(caption)) skills.push('shadow');
  if (/display|window|디스플레이|화면|창문/.test(caption)) skills.push('display');
  return [...new Set(skills.length ? skills : ['realtime'])];
}

function workFormY(work) {
  const terms = `${(work.tags || []).join(' ')} ${work.type || ''} ${work.meta_type || ''} ${
    work.meta_type_en || ''
  } ${work.meta_medium || ''} ${work.meta_medium_en || ''}`.toLowerCase();
  const tech = `${(work.tech || []).join(' ')} ${work.meta_tech || ''} ${
    work.meta_tech_en || ''
  }`.toLowerCase();
  const isSpace = /설치|전시|installation|exhibition|projection|spatial|performance/.test(terms);
  const isObject = /arduino|esp32|sensor|센서|physical|kinect|servo|motor|circuit|robot/.test(tech);
  const isScreen =
    /영상|video|moving image|screen|digital/.test(terms) ||
    /unreal|touchdesigner|unity|max\/msp|shader/.test(tech);
  if (isSpace && isObject) return 39;
  if (isObject && isScreen && !isSpace) return 61;
  if (isSpace) return 27;
  if (isObject) return 50;
  return isScreen ? 73 : 71;
}

function labFormY(item) {
  const caption = `${item.caption || ''} ${item.caption_en || ''}`.toLowerCase();
  const isSpace = /installation|on-site|projection|mapping|water|light|현장|설치|프로젝션|맵핑|물|조명/.test(caption);
  const isObject = /physical|sensor|plant|servo|motor|circuit|touch|피지컬|센서|식물|서보|모터|회로|터치/.test(caption);
  const isScreen = /unreal|shader|audio|display|archive|언리얼|셰이더|오디오|디스플레이|아카이브/.test(caption);
  if (isSpace && isObject) return 39;
  if (isObject && isScreen) return 61;
  if (isSpace) return 27;
  if (isObject) return 50;
  return isScreen ? 73 : 71;
}

function formKey(y) {
  return y < 43 ? 'space' : y < 68 ? 'object' : 'screen';
}

function workDateLabel(work) {
  const meta = String(work.meta_year || '').trim();
  const stamped = meta.match(/^(\d{4})\D+(\d{1,2})$/);
  if (stamped) {
    return `${stamped[1]}.${String(Number(stamped[2])).padStart(2, '0')}`;
  }
  const year = Number(work.year) || Number(meta) || 2024;
  const seed = String(work.slug || work.title || year)
    .split('')
    .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const month = (seed % 12) + 1;
  return `${year}.${String(month).padStart(2, '0')}`;
}

function practiceFormFromY(y) {
  if (y <= 27) return 'space';
  if (y <= 39) return 'space-object';
  if (y <= 50) return 'object';
  if (y <= 61) return 'object-screen';
  return 'screen';
}

function practiceWorkId(slug, index) {
  const clean = String(slug || '')
    .replace(/[^a-z0-9]+/gi, '')
    .slice(0, 3)
    .toUpperCase();
  return `${clean || 'W'}${String(index + 1).padStart(2, '0')}`;
}

function timelineCoordinates(work, yearIndex = 0, formIndex = 0) {
  const seed = stableSeed(work.slug);
  const year = Number(work.year) || 2024;
  const y = workFormY(work) + ((formIndex % 3) - 1) * 5 + ((seed % 3) - 1);

  if (year === 2024) {
    const x = 51 + (formIndex % 8) * 4.1 + ((seed % 3) - 1) * 0.35;
    const rowOffset = Math.floor(formIndex / 8) * 8;
    return [x, Math.max(15, Math.min(87, y + rowOffset))];
  }

  const yearPositions = { 2018: 7, 2019: 14, 2020: 21, 2021: 28, 2022: 36, 2023: 44, 2025: 84 };
  const x = (yearPositions[Math.max(2018, Math.min(2025, year))] || 44) + ((seed % 5) - 2);
  return [Math.max(6, Math.min(86, x)), Math.max(15, Math.min(85, y))];
}

function labTimelineCoordinates(item, index, formIndex = 0) {
  const seed = stableSeed(item.caption_en || item.caption || index);
  const x = 85 + (formIndex % 4) * 3.4 + ((seed % 3) - 1) * 0.5;
  const y = labFormY(item) + ((Math.floor(formIndex / 4) % 3) - 1) * 5;
  return [Math.max(84, Math.min(96, x)), Math.max(15, Math.min(85, y))];
}

function layeredPointCoordinates(value, index, count, layerY) {
  const seed = stableSeed(value);
  const columns = Math.min(7, Math.max(1, count));
  const column = index % 7;
  const rows = Math.ceil(count / 7);
  const row = Math.floor(index / 7);
  const xStep = columns > 1 ? 26 / (columns - 1) : 0;
  const x = (columns > 1 ? 17 + column * xStep : 30) + ((seed % 3) - 1) * 0.28;
  const rowOffset = (row - (rows - 1) / 2) * 3.4;
  const rawYOffset = rowOffset + ((Math.floor(seed / 7) % 3) - 1) * 0.45;
  const diamondAllowance = Math.max(0.9, 9 * (1 - Math.abs(x - 30) / 19));
  const yOffset = Math.max(-diamondAllowance, Math.min(diamondAllowance, rawYOffset));
  const y = layerY + yOffset;
  return [Math.max(16, Math.min(44, x)), Math.max(6, Math.min(94, y))];
}

function catalogCardStyle(value, kind = 'work') {
  const seed = stableSeed(value);
  const ratios = ['4 / 3', '3 / 4', '1 / 1', '5 / 4'];
  const width = kind === 'work' ? 88 + (seed % 70) : 64 + (seed % 44);
  const rotation = (((seed % 15) - 7) * 0.42).toFixed(1);
  const imageX = 35 + (seed % 31);
  return `--card-w:${width}px;--card-r:${rotation}deg;--card-ratio:${ratios[seed % ratios.length]};--image-x:${imageX}%`;
}

function buildHome(works, site, lang, about, lab) {
  const { assetPrefix } = prefixes(lang, false);
  const body = homeRecordBody(works, lab, about, lang);
  return pageShell({
    title: '3Dowon',
    body,
    header: '',
    lang,
    assetPrefix,
    site,
    pageClass: 'page-home-record',
  });
}


function buildWorks(works, lab, site, lang, about, cv) {
  const { assetPrefix } = prefixes(lang, false);
  const copy =
    lang === 'ko'
      ? {
          role: 'Interactive installation',
          hint: '칸 위에 올려보세요',
          back: '← Index',
          about: 'About',
          home: 'works.html',
        }
      : {
          role: 'Interactive installation',
          hint: 'Hover a cell',
          back: '← Index',
          about: 'About',
          home: 'works.html',
        };

  const practiceWorks = works.map((work, index) => {
    const year = String(Number(work.year) || 2024);
    const hero = resolveMediaPath(work.hero_image || work.thumbnail, assetPrefix);
    const gallery = (work.gallery || [])
      .map((src) => resolveMediaPath(src, assetPrefix))
      .filter(Boolean)
      .filter((src) => src !== hero);
    const images = [hero, ...gallery].filter(Boolean).slice(0, 6);
    const note = stripHtml(pick(work, 'description', lang) || '')
      .replace(/\s+/g, ' ')
      .trim();
    const vimeo = String(work.vimeo_url || '').trim();
    return {
      id: practiceWorkId(work.slug, index),
      t: workTitle(work, lang),
      s: year,
      e: year,
      date: workDateLabel(work),
      form: practiceFormFromY(workFormY(work)),
      kind: isClientWork(work) ? 'professional' : 'work',
      tags: workSkillKeys(work),
      img: hero || undefined,
      images: images.length ? images : undefined,
      note: note || undefined,
      vimeo: vimeo || undefined,
    };
  });

  const practiceLabs = (lab.items || []).map((item, index) => {
    const caption = pick(item, 'caption', lang) || '';
    const image = resolveMediaPath(item.image, assetPrefix);
    return {
      id: `L${String(index + 1).padStart(2, '0')}`,
      t: caption,
      y: '2026',
      date: '2026.01',
      of: null,
      form: practiceFormFromY(labFormY(item)),
      tags: labSkillKeys(item),
      img: image || undefined,
      images: image ? [image] : undefined,
      note: lang === 'ko' ? '진행 중인 실험.' : 'Ongoing lab study.',
    };
  });

  const aboutData = aboutBoardData(about, lang, assetPrefix);
  const cvData = {
    sections: (cv.sections || []).map((section) => ({
      title: section.title,
      entries: (section.entries || []).map((entry) => ({
        year: entry.year,
        description: pick(entry, 'description', lang) || '',
      })),
    })),
  };

  const pages = [
    {
      id: 'ABOUT',
      t: lang === 'ko' ? '소개' : 'About',
      s: '9999',
      e: '9999',
      date: '9999.12',
      form: 'space',
      kind: 'page',
      page: 'about',
      img: aboutData.image || undefined,
      images: aboutData.image ? [aboutData.image] : undefined,
      note: aboutData.role || '',
    },
    {
      id: 'CV',
      t: 'CV',
      label: 'CV',
      s: '9998',
      e: '9998',
      date: '9998.12',
      form: 'object',
      kind: 'page',
      page: 'cv',
      note: 'Curriculum vitae',
    },
  ];

  const brand = '3Dowon'.split('').map((ch, index) => ({
    id: `BRAND_${index}`,
    t: ch,
    kind: 'brand',
  }));

  const dataJson = JSON.stringify({
    works: practiceWorks,
    labs: practiceLabs,
    pages,
    brand,
    about: aboutData,
    cv: cvData,
    copy,
  }).replace(/</g, '\\u003c');

  const body = `    <div class="sheet" id="sheet" data-practice-grid>
      <div class="paper" aria-hidden="true"></div>
      <canvas class="ink-grid" id="inkGrid" aria-hidden="true"></canvas>
      <div class="stains" aria-hidden="true"></div>
      <div class="fibre" aria-hidden="true"></div>

      <div class="head" id="head">
        <span class="head-lang">${langSwitchLinks(assetPrefix, lang, 'works.html')}</span>
      </div>

      <div class="index" id="index"></div>
      <div class="peek" id="peek" aria-hidden="true">
        <div class="peek-frame" id="peekFrame"></div>
      </div>
      <div class="tagline" id="tagline"></div>

      <div class="detail" id="detail"></div>
      <script type="application/json" id="practiceGridData">${dataJson}</script>
    </div>`;

  return pageShell({
    title: '3Dowon — Works + Lab',
    body,
    header: '',
    extraHead: '',
    lang,
    assetPrefix,
    site,
    pageClass: 'page-catalog page-practice',
  });
}

function buildWorkPage(work, site, lang, works) {
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
  const client = isClientWork(work);

  const body = `    <div class="mg-page post-projects" data-slug="${work.slug}">
      <h1 class="post-title">${escapeHtml(title)}${client ? '<span class="mg-dot mg-dot--client" aria-label="client"></span>' : ''}</h1>
      <p class="post-year">${escapeHtml(work.meta_year || String(work.year || ''))}</p>
      ${video}
      <div class="post-hero">
        <img src="${resolveMediaPath(work.hero_image || work.thumbnail, assetPrefix)}" alt="${escapeHtml(title)}" class="post-hero-image img-blur" />
      </div>
      <div class="post-des">
        ${pick(work, 'description', lang) || ''}
      </div>
      <div class="post-meta">
        <div class="post-meta-row"><span class="post-meta-q">${str.type}</span><span>${escapeHtml(pick(work, 'meta_type', lang) || '')}</span></div>
        <div class="post-meta-row"><span class="post-meta-q">${str.medium}</span><span>${escapeHtml(pick(work, 'meta_medium', lang) || '')}</span></div>
        <div class="post-meta-row"><span class="post-meta-q">${str.tech}</span><span>${escapeHtml(pick(work, 'meta_tech', lang) || '')}</span></div>
        <div class="post-meta-row"><span class="post-meta-q">${str.production}</span><span>${escapeHtml(pick(work, 'meta_production', lang) || '')}</span></div>
      </div>
      <ul class="project-detail-gallery">
${gallery}
      </ul>
    </div>`;

  const header = archiveHeader({
    lang,
    relPath,
    section: title,
    index: '05',
    isWork: true,
    active: 'works',
  });

  return pageShell({
    title: `${escapeHtml(title)} — 3Dowon`,
    body,
    header,
    lang,
    assetPrefix,
    site,
    pageClass: 'page-archive page-archive-work',
  });
}

function practiceDocHead({ lang, assetPrefix, active, role = 'Interactive installation', relPath }) {
  const aboutLabel = lang === 'ko' ? '소개' : 'About';
  const worksLabel = lang === 'ko' ? '작업' : 'Works';
  const mark = (key) => (active === key ? ' class="is-active"' : '');
  return `      <div class="head" id="head">
        <span class="nm">3Dowon <em>— ${escapeHtml(role)}</em></span>
        <a href="works.html"${mark('works')}>${worksLabel}</a>
        <a href="about.html"${mark('about')}>${aboutLabel}</a>
        <a href="cv.html"${mark('cv')}>CV</a>
        <span class="head-lang">${langSwitchLinks(assetPrefix, lang, relPath)}</span>
      </div>`;
}

function practiceDocShell({ title, docHtml, lang, assetPrefix, site, active, relPath, pageExtra = '' }) {
  const body = `    <div class="sheet" id="sheet" data-practice-sheet>
      <div class="paper" aria-hidden="true"></div>
      <canvas class="ink-grid" id="inkGrid" aria-hidden="true"></canvas>
      <div class="stains" aria-hidden="true"></div>
      <div class="fibre" aria-hidden="true"></div>
${practiceDocHead({ lang, assetPrefix, active, relPath })}
      <div class="doc-scroll">
${docHtml}
      </div>
    </div>`;
  return pageShell({
    title,
    body,
    header: '',
    extraHead: '',
    lang,
    assetPrefix,
    site,
    pageClass: `page-catalog page-practice page-practice-doc${pageExtra ? ` ${pageExtra}` : ''}`,
  });
}

function buildAbout(about, site, lang, works) {
  const { assetPrefix } = prefixes(lang, false);
  const target = 'works.html#about';
  const body = `    <p class="visually-hidden">${lang === 'ko' ? '작업 지도의 소개로 이동합니다.' : 'Redirecting to About on the practice map.'}</p>
    <script>location.replace(${JSON.stringify(target)});</script>
    <p><a href="${target}">${lang === 'ko' ? '소개 열기' : 'Open About'}</a></p>`;
  return pageShell({
    title: `${lang === 'ko' ? '소개' : 'About'} — 3Dowon`,
    body,
    header: '',
    lang,
    assetPrefix,
    site,
    pageClass: 'page-catalog page-practice',
  });
}

function buildCv(cv, site, lang, works) {
  const { assetPrefix } = prefixes(lang, false);
  const target = 'works.html#cv';
  const body = `    <p class="visually-hidden">${lang === 'ko' ? '작업 지도의 CV로 이동합니다.' : 'Redirecting to CV on the practice map.'}</p>
    <script>location.replace(${JSON.stringify(target)});</script>
    <p><a href="${target}">${lang === 'ko' ? 'CV 열기' : 'Open CV'}</a></p>`;
  return pageShell({
    title: 'CV — 3Dowon',
    body,
    header: '',
    lang,
    assetPrefix,
    site,
    pageClass: 'page-catalog page-practice',
  });
}

function buildLab(lab, site, lang, works) {
  const relPath = 'lab.html';
  const { assetPrefix } = prefixes(lang, false);
  const items = lab.items
    .map((item) => {
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
    header: archiveHeader({
      lang,
      relPath,
      section: lang === 'ko' ? '실험실' : 'Laboratory',
      index: '04',
      active: 'lab',
    }),
    lang,
    assetPrefix,
    site,
    pageClass: 'page-archive page-archive-lab',
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

  writeOutput(`${outPrefix}index.html`, buildWorks(works, lab, site, lang, about, cv));
  writeOutput(`${outPrefix}works.html`, buildWorks(works, lab, site, lang, about, cv));
  writeOutput(`${outPrefix}about.html`, buildAbout(about, site, lang, works));
  writeOutput(`${outPrefix}cv.html`, buildCv(cv, site, lang, works));
  writeOutput(`${outPrefix}lab.html`, buildLab(lab, site, lang, works));

  for (const work of works) {
    const relPath = `${outPrefix}work/${work.slug}.html`;
    writeOutput(relPath, buildWorkPage(work, site, lang, works));
    allWorkPaths.push(relPath);
  }

  cleanOrphanWorkPages(works.map((work) => work.slug), `${outPrefix}work`);
}

assertWorkPageHeaders(allWorkPaths);

console.log(`Built ${works.length} works × 2 languages and site pages from content/`);
