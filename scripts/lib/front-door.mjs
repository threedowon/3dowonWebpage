import { escapeHtml as esc } from './html.mjs';

// A separate entrance keeps every archive and project URL available.
export function frontDoorPage(site, lang) {
  const ko = lang === 'ko';
  const assets = ko ? '../' : '';
  const note = ko
    ? '익숙한 사물은 공간의 경험을 어떻게 바꿀까요? 익숙한 행동은 공간의 경험을 어떻게 바꿀까요?'
    : 'How do familiar objects change our experience of space? How do familiar actions change our experience of space?';
  const items = [['Works', 'works.html'], ['Lab', 'lab.html'], ['About', 'about.html'], ['Portfolio', 'portfolio.html'], ['CV', 'cv.html'], ['Contact', `mailto:${site.email}`]];
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#626d59" />
  <meta name="description" content="${esc(note)}" />
  <title>3Dowon — ${ko ? '인터랙티브 미디어 아티스트' : 'Interactive media artist'}</title>
  <link rel="preload" href="${assets}assets/front-door/landscape.webp" as="image" />
  <link rel="stylesheet" href="${assets}assets/front-door/home.css?v=2" />
</head>
<body>
  <a class="skip-link" href="#folders">${ko ? '메뉴로 이동' : 'Skip to navigation'}</a>
  <main class="desktop">
    <header class="intro">
      <h1>3Dowon <span class="title-spark" aria-hidden="true">✳</span></h1>
      <p>${esc(note)}</p>
    </header>
    <a class="language" href="${ko ? '../index.html' : 'ko/index.html'}" hreflang="${ko ? 'en' : 'ko'}" aria-label="${ko ? 'Switch to English' : '한국어로 전환'}">${ko ? 'EN' : 'KR'} <span aria-hidden="true">↗</span></a>
    <nav class="folders" id="folders" aria-label="${ko ? '주 메뉴' : 'Main navigation'}">
      ${items.map(([label, href], i) => `<a class="desktop-item item-${i + 1}" href="${esc(href)}"><span class="folder" aria-hidden="true"><span class="folder-paper"></span><span class="folder-front"></span>${label === 'Contact' ? '<span class="folder-symbol">↗</span>' : ''}</span><span class="folder-label">${label}</span></a>`).join('\n      ')}
    </nav>
    <footer><span>© ${new Date().getFullYear()} 3Dowon</span><span>${ko ? '폴더를 열어 둘러보세요.' : 'A small window into my world.'}</span><a href="${esc(site.instagram)}" target="_blank" rel="noopener">Instagram ↗</a></footer>
  </main>
</body>
</html>`;
}
