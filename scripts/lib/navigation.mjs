import { escapeHtml as esc } from './html.mjs';

export function siteNavigation({home = '', languageHref, lang, active}) {
  const link = (key, label) => `<a href="${home}${key}.html"${active === key ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<div class="site-menu"><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-menu-panel" hidden><span>Menu</span><span class="menu-toggle-icon" aria-hidden="true"></span></button><div class="menu-panel" id="site-menu-panel"><nav class="menu-links" aria-label="${lang === 'ko' ? '주 메뉴' : 'Main navigation'}">${link('about','About')}${link('works','Works')}${link('lab','Lab')}${link('portfolio','Portfolio')}${link('cv','CV')}</nav><a class="menu-language" href="${esc(languageHref)}" hreflang="${lang === 'en' ? 'ko' : 'en'}" data-language="${lang === 'en' ? 'ko' : 'en'}" aria-label="${lang === 'en' ? '한국어로 전환' : 'Switch to English'}">${lang === 'en' ? 'KR' : 'EN'}</a></div></div>`;
}

export function siteSidebar({home = '', assets = '', lang, active, languageHref, className = 'persistent-identity'}) {
  return `<aside class="${className}" aria-label="3Dowon"><a class="logo" href="${home}index.html" aria-label="3Dowon Home"><img src="${assets}assets/green-archive/3dowon.png" alt="3Dowon" width="82" height="82" /></a><div class="identity-note"><span>3Dowon / Interactive media artist</span><span>How do familiar objects change our experience of space?</span><span>How do familiar actions change our experience of space?</span></div>${siteNavigation({home,lang,active,languageHref})}</aside>`;
}

export function siteFooter({home = '', site, lang}) {
  const links = [['Instagram', site.instagram], ['YouTube', site.youtube], ['GitHub', site.github], ['Naver Blog', site.naver_blog]]
    .filter(([, href]) => href)
    .map(([label, href]) => `<a href="${esc(href)}" target="_blank" rel="noopener">${label} ↗</a>`).join('');
  return `<footer class="site-footer"><div><a class="footer-wordmark" href="${home}index.html">3Dowon</a><p>${lang === 'ko' ? '인터랙티브 미디어 아티스트' : 'Interactive media artist'}</p>${site.email ? `<a class="footer-email" href="mailto:${esc(site.email)}">${esc(site.email)}</a>` : ''}</div><div class="footer-links">${links}</div><div class="footer-end"><a href="#main">${lang === 'ko' ? '맨 위로' : 'Back to top'} ↑</a><p>© ${new Date().getFullYear()} 3Dowon</p></div></footer>`;
}
