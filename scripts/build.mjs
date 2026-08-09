import { assertWorkPageHeaders, cleanOrphanWorkPages, loadJson, loadWorks, writeOutput } from './lib/content.mjs';
import { dataAttrs, escapeHtml, vimeoEmbedHtml } from './lib/html.mjs';

const CSS_VERSION = '704';
const JS_VERSION = '404';

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

function pageShell({ title, body, header = '', extraHead = '', lang, assetPrefix, site, pageClass = '' }) {
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
  </div>
  <script src="${assetPrefix}script.js?v=${JS_VERSION}"></script>
</body>
</html>
`;
}

function aboutPageBody(about, lang, assetPrefix) {
  const paragraphs = String(pick(about, 'body', lang) || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n').map((line) => escapeHtml(line));
      return `<p>${lines.join('<br />\n              ')}</p>`;
    });
  const metaLines = String(pick(about, 'meta', lang) || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const role = metaLines[0] || '';
  const origin = metaLines[1] || '';
  const labels =
    lang === 'ko'
      ? {
          profile: '프로필',
          practice: '작업',
          approach: '방식',
          fields: '다루는 매체',
          image: '관찰 · 상호작용 · 기억',
          fieldItems: ['인터랙티브 설치', '피지컬 컴퓨팅', '실시간 그래픽', '센서 기술'],
        }
      : {
          profile: 'Profile',
          practice: 'Practice',
          approach: 'Approach',
          fields: 'Working with',
          image: 'Observation · interaction · memory',
          fieldItems: ['Interactive installation', 'Physical computing', 'Real-time graphics', 'Sensor technology'],
        };
  const practice = paragraphs.slice(0, 2).join('\n            ');
  const approach = paragraphs.slice(2).join('\n            ');
  const fields = labels.fieldItems
    .map((item, index) => `<li><span>0${index + 1}</span>${escapeHtml(item)}</li>`)
    .join('\n              ');

  return `    <div class="about-page about-editorial">
      <header class="about-intro reveal">
        <div class="about-section-label">
          <i aria-hidden="true"></i>
          <span>00</span>
          <span>${labels.profile}</span>
        </div>
        <h1 class="about-page-title">${escapeHtml(pick(about, 'name', lang))}</h1>
        <div class="about-intro-meta">
          ${role ? `<p>${escapeHtml(role)}</p>` : ''}
          ${origin ? `<p>${escapeHtml(origin)}</p>` : ''}
        </div>
      </header>

      <div class="about-composition">
        <figure class="about-specimen reveal" data-about-media>
          <div class="about-image-shell">
            <img class="about-img img-blur" src="${resolveMediaPath(about.image, assetPrefix)}" alt="${escapeHtml(pick(about, 'name', lang))}" loading="lazy" />
            <span class="about-image-reticle" aria-hidden="true"></span>
          </div>
          <figcaption>${labels.image}</figcaption>
        </figure>

        <div class="about-narrative">
          <article class="about-section reveal">
            <header class="about-section-head">
              <i aria-hidden="true"></i>
              <span>01</span>
              <h2>${labels.practice}</h2>
            </header>
            <div class="about-page-body">
              ${practice}
            </div>
          </article>

          <article class="about-section reveal">
            <header class="about-section-head">
              <i aria-hidden="true"></i>
              <span>02</span>
              <h2>${labels.approach}</h2>
            </header>
            <div class="about-page-body">
              ${approach}
            </div>
          </article>

          <section class="about-section about-fields reveal">
            <header class="about-section-head">
              <i aria-hidden="true"></i>
              <span>03</span>
              <h2>${labels.fields}</h2>
            </header>
            <ul>
              ${fields}
            </ul>
          </section>
        </div>
      </div>
    </div>`;
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

  return `    <main class="record-page" aria-labelledby="record-title">
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

      <a class="record-about-link" href="about.html">${lang === 'ko' ? '작가 소개 읽기' : 'Read full profile'} ↗</a>
    </main>`;
}

function stableSeed(value) {
  return [...String(value)].reduce((total, char, index) => total + char.charCodeAt(0) * (index + 3), 0);
}

function clampCoordinate(value) {
  return Math.max(9, Math.min(91, value));
}

const CATALOG_SKILLS = [
  { key: 'installation', en: 'Installation', ko: '설치', x: 9, y: 12 },
  { key: 'interactive', en: 'Interactive', ko: '인터랙티브', x: 31, y: 9 },
  { key: 'unreal', en: 'Unreal', ko: 'Unreal', x: 55, y: 12 },
  { key: 'sensors', en: 'Sensors / Arduino', ko: '센서 / Arduino', x: 82, y: 10 },
  { key: 'projection', en: 'Projection', ko: '프로젝션', x: 13, y: 90 },
  { key: 'realtime', en: 'Real-time graphics', ko: '실시간 그래픽', x: 50, y: 91 },
  { key: 'moving-image', en: 'Moving image', ko: '영상', x: 84, y: 88 },
];

function workSkillKeys(work) {
  const terms = `${(work.tags || []).join(' ')} ${work.type || ''} ${work.meta_type || ''} ${
    work.meta_type_en || ''
  }`.toLowerCase();
  const tech = `${(work.tech || []).join(' ')} ${work.meta_tech || ''} ${work.meta_tech_en || ''}`.toLowerCase();
  const skills = [];
  if (/설치|installation|exhibition/.test(terms)) skills.push('installation');
  if (/인터랙티브|interactive/.test(terms)) skills.push('interactive');
  if (/unreal/.test(tech)) skills.push('unreal');
  if (/arduino|sensor|센서|physical/.test(tech)) skills.push('sensors');
  if (/프로젝션|projection|mapping/.test(`${terms} ${tech}`)) skills.push('projection');
  if (/touchdesigner|shader|real.?time|실시간/.test(tech)) skills.push('realtime');
  if (/영상|video|moving|premiere/.test(`${terms} ${tech}`)) skills.push('moving-image');
  return [...new Set(skills.length ? skills : ['realtime'])];
}

function labSkillKeys(item) {
  const caption = `${item.caption || ''} ${item.caption_en || ''}`.toLowerCase();
  const skills = [];
  if (/installation|on-site|설치|현장/.test(caption)) skills.push('installation');
  if (/interaction|touch|인터랙션|터치/.test(caption)) skills.push('interactive');
  if (/unreal/.test(caption)) skills.push('unreal');
  if (/sensor|arduino|plant|servo|circuit|센서|식물|서보|회로/.test(caption)) skills.push('sensors');
  if (/projection|mapping|light|water|프로젝션|맵핑|조명|물/.test(caption)) skills.push('projection');
  if (/shader|audio|dmx|real-time|셰이더|오디오|실시간/.test(caption)) skills.push('realtime');
  if (/archive|아카이브/.test(caption)) skills.push('moving-image');
  return [...new Set(skills.length ? skills : ['realtime'])];
}

function timelineCoordinates(work) {
  const seed = stableSeed(work.slug);
  const year = Number(work.year) || 2024;
  const x = 11 + ((Math.max(2018, Math.min(2025, year)) - 2018) / 7) * 78 + ((seed % 13) - 6);
  const skills = workSkillKeys(work);
  let y = skills.includes('installation') ? 31 : skills.includes('moving-image') ? 68 : 49;
  if (skills.includes('interactive')) y = 43;
  if (skills.includes('projection')) y += 9;
  y += (Math.floor(seed / 13) % 15) - 7;
  return [Math.max(9, Math.min(87, x)), Math.max(22, Math.min(78, y))];
}

function labTimelineCoordinates(item, index) {
  const seed = stableSeed(item.caption_en || item.caption || index);
  const x = 12 + (index % 8) * 10.8 + ((seed % 7) - 3);
  const y = 79 + Math.floor(index / 8) * 5 + ((Math.floor(seed / 7) % 7) - 3);
  return [clampCoordinate(x), Math.max(75, Math.min(87, y))];
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

function buildWorks(works, lab, site, lang) {
  const { assetPrefix } = prefixes(lang, false);
  const first = works[0];
  const firstTitle = escapeHtml(workTitle(first, lang));
  const firstMeta = escapeHtml(
    `${first.year || ''} · ${pick(first, 'meta_type', lang) || pick(first, 'grid_type_label', lang) || ''}`
  );
  const firstImage = resolveMediaPath(first.hero_image || first.thumbnail, assetPrefix);
  const workPoints = works
    .map((work) => {
      const [x, y] = timelineCoordinates(work);
      const skills = workSkillKeys(work).join(' ');
      const title = escapeHtml(workTitle(work, lang));
      const meta = escapeHtml(pick(work, 'meta_type', lang) || pick(work, 'grid_type_label', lang) || '');
      const image = resolveMediaPath(work.hero_image || work.thumbnail, assetPrefix);
      return `        <a class="catalog-point catalog-point--work"
          href="work/${work.slug}.html"
          style="--x:${x}%;--y:${y}%"
          data-kind="work"
          data-year="${work.year || ''}"
          data-skills="${skills}"
          data-title="${title}"
          data-meta="${escapeHtml(`${work.year || ''} · ${meta}`)}"
          data-image="${image}">
          <span>${title}</span>
        </a>`;
    })
    .join('\n');
  const labPoints = lab.items
    .map((item, index) => {
      const [x, y] = labTimelineCoordinates(item, index);
      const skills = labSkillKeys(item).join(' ');
      const caption = escapeHtml(pick(item, 'caption', lang) || '');
      const image = resolveMediaPath(item.image, assetPrefix);
      return `        <button class="catalog-point catalog-point--lab" type="button"
          style="--x:${x}%;--y:${y}%"
          data-kind="lab"
          data-year="2026"
          data-skills="${skills}"
          data-title="${caption}"
          data-meta="${lang === 'ko' ? 'LAB · 진행 중인 실험' : 'LAB · ongoing experiment'}"
          data-image="${image}">
          <span>${caption}</span>
        </button>`;
    })
    .join('\n');
  const skillHubs = CATALOG_SKILLS.map(
    (skill) => `        <button class="catalog-skill" type="button"
          style="--x:${skill.x}%;--y:${skill.y}%"
          data-skill="${skill.key}">[${escapeHtml(skill[lang])}]</button>`
  ).join('\n');
  const yearLabels = Array.from(
    { length: 8 },
    (_, index) =>
      `        <span style="--x:${11 + (index / 7) * 78}%">${2018 + index}</span>`
  ).join('\n');
  const copy =
    lang === 'ko'
      ? {
          title: '작업 시스템',
          all: '전체',
          works: '작업',
          lab: '실험',
          instruction: '프로젝트 호버: 이미지 · 클릭: 상세 페이지 · 역량 호버: 연결 강조',
          timeline: '개발 흐름',
          labLine: '실험 / 다음 단계',
        }
      : {
          title: 'Practice system',
          all: 'all',
          works: 'works',
          lab: 'lab',
          instruction: 'Hover project: image · click: detail · hover skill: trace relationships',
          timeline: 'development flow',
          labLine: 'experiments / next',
        };
  const body = `    <main class="catalog-page" id="catalogPage">
      <header class="catalog-header">
        <a class="catalog-brand" href="index.html">3Dowon</a>
        <div>
          <span class="catalog-kicker">3D / 01</span>
          <h1>${copy.title}</h1>
        </div>
        <nav class="catalog-nav" aria-label="Sections">
          <a href="about.html">${lang === 'ko' ? '소개' : 'About'}</a>
          <a href="cv.html">CV</a>
        </nav>
      </header>

      <div class="catalog-tools">
        <div class="catalog-filters" role="group" aria-label="Filter">
          <button type="button" class="is-active" data-catalog-filter="all">[●] ${copy.all}</button>
          <button type="button" data-catalog-filter="work">[ ] ${copy.works}</button>
          <button type="button" data-catalog-filter="lab">[ ] ${copy.lab}</button>
        </div>
        <p>${copy.instruction}</p>
      </div>

      <section class="catalog-map" aria-label="${copy.title}">
        <div class="catalog-year-axis" aria-hidden="true">
          <b>${copy.timeline}</b>
${yearLabels}
        </div>
        <span class="catalog-lab-line">${copy.labLine}</span>
        <svg class="catalog-connections" id="catalogConnections" aria-hidden="true"></svg>
        <div class="catalog-skills">
${skillHubs}
        </div>
        <div class="catalog-points">
${workPoints}
${labPoints}
        </div>
      </section>

      <aside class="catalog-preview" id="catalogPreview" aria-live="polite">
        <div class="catalog-preview-media">
          <img id="catalogPreviewImage" src="${firstImage}" alt="" />
        </div>
        <div class="catalog-preview-info">
          <strong id="catalogPreviewTitle">${firstTitle}</strong>
          <span id="catalogPreviewMeta">${firstMeta}</span>
        </div>
      </aside>
    </main>`;
  return pageShell({
    title: '3Dowon — Works + Lab',
    body,
    header: '',
    lang,
    assetPrefix,
    site,
    pageClass: 'page-catalog',
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

  const header = pageChrome({
    works,
    activeNav: 'works',
    activeSlug: work.slug,
    lang,
    relPath,
    isWork: true,
    project: true,
    backLabel: str.back,
  });

  return pageShell({
    title: `${escapeHtml(title)} — 3Dowon`,
    body,
    header,
    lang,
    assetPrefix,
    site,
  });
}

function buildAbout(about, site, lang, works) {
  const { assetPrefix } = prefixes(lang, false);
  const relPath = 'about.html';
  // About lives on home (3Dowon); keep about.html as the same content for old links.
  const body = aboutPageBody(about, lang, assetPrefix);
  return pageShell({
    title: '3Dowon',
    body,
    header: pageChrome({ works, activeNav: 'home', lang, relPath }),
    lang,
    assetPrefix,
    site,
  });
}

function buildCv(cv, site, lang, works) {
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
    header: pageChrome({ works, activeNav: 'cv', lang, relPath }),
    lang,
    assetPrefix,
    site,
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
    header: pageChrome({ works, activeNav: 'lab', lang, relPath }),
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

  writeOutput(`${outPrefix}index.html`, buildHome(works, site, lang, about, lab));
  writeOutput(`${outPrefix}works.html`, buildWorks(works, lab, site, lang));
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
