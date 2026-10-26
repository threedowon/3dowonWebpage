import { escapeHtml as esc } from './html.mjs';

export function siteNavigation({home = '', languageHref, lang, active, site = {}}) {
  const link = (key, label) => `<a href="${home}${key}.html"${active === key ? ' aria-current="page"' : ''}>${label}</a>`;
  const menuLabel = lang === 'ko' ? '주 메뉴' : 'Main navigation';
  const filters = site.work_filters || {types:[],years:[]};
  const worksHref = `${home}works.html`;
  const filterLinks = filters.types.map(type => `<a data-work-filter href="${worksHref}?type=${encodeURIComponent(type.value)}">${esc(type[lang])}</a>`).join('');
  const worksMenu = `<div class="works-menu"><a class="works-trigger${active === 'works' ? ' is-current' : ''}" href="${worksHref}" aria-expanded="false" aria-controls="works-submenu">Works</a><button type="button" class="works-submenu-toggle" aria-label="${lang === 'ko' ? '작품 카테고리' : 'Work categories'}" aria-expanded="false" aria-controls="works-submenu"><span aria-hidden="true"></span></button><div class="works-submenu" id="works-submenu" hidden><div class="works-categories"><a data-work-filter href="${worksHref}">All</a>${filterLinks}</div></div></div>`;
  const language = (className) => `<a class="${className}" href="${esc(languageHref)}" hreflang="${lang === 'en' ? 'ko' : 'en'}" data-language="${lang === 'en' ? 'ko' : 'en'}" aria-label="${lang === 'en' ? '한국어로 전환' : 'Switch to English'}">${lang === 'en' ? 'KR' : 'EN'}</a>`;
  return `<div class="site-menu"><a class="desktop-wordmark menu-wordmark" href="${home}index.html">3Dowon</a><div class="mobile-menu-bar"><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-menu-panel" aria-haspopup="dialog" hidden><span class="menu-toggle-icon" aria-hidden="true"></span><span class="menu-toggle-label">Menu</span></button><a class="menu-wordmark" href="${home}index.html">3Dowon</a>${language('mobile-menu-language')}</div><dialog class="mobile-menu-dialog" aria-label="${menuLabel}"></dialog><div class="menu-panel" id="site-menu-panel"><div class="menu-panel-header"><a class="menu-wordmark" href="${home}index.html">3Dowon</a><button class="menu-close" type="button" aria-label="${lang === 'ko' ? '메뉴 닫기' : 'Close menu'}"><span aria-hidden="true"></span></button></div><nav class="menu-links" aria-label="${menuLabel}">${link('about','About')}${worksMenu}${link('lab','Lab')}${link('portfolio','Portfolio')}${link('cv','CV')}</nav>${language('menu-language')}</div></div>`;
}

export function siteFooter({site, lang, home = ''}) {
  const assets = home + (lang === 'ko' ? '../' : '');
  const updated = new Date(site.updated_at || Date.now());
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(updated).map(part => [part.type,part.value]));
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  return `<footer class="site-footer">
    <div class="footer-about"><div class="footer-profile"><a class="footer-logo" href="${home}index.html" aria-label="${lang === 'ko' ? '3Dowon 홈' : '3Dowon home'}"><img src="${assets}assets/green-archive/3dowon.png" alt="3Dowon" width="64" height="64" loading="lazy" decoding="async"></a><div class="footer-identity"><p class="footer-wordmark">3Dowon</p><p class="footer-role">Interactive Media Artist</p>${site.email ? `<a class="footer-email" href="mailto:${esc(site.email)}">${esc(site.email)}</a>` : ''}</div></div></div>
    <div class="footer-practice"><p class="footer-note"><span>How do familiar objects change our experience of space?</span><span>How do familiar actions change our experience of space?</span></p></div>
    <div class="footer-meta"><div class="footer-updated">${lang === 'ko' ? '최근 업데이트' : 'Last updated'} · <time datetime="${day}">${day.replaceAll('-','.')}</time></div><div class="footer-rights">© ${parts.year} 3Dowon. ${lang === 'ko' ? '모든 저작권은 3Dowon에게 있습니다.' : 'All rights reserved.'}</div></div>
  </footer>`;
}
