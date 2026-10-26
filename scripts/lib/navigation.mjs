import { escapeHtml as esc } from './html.mjs';

export function siteNavigation({home = '', languageHref, lang, active, site = {}}) {
  const link = (key, label) => `<a href="${home}${key}.html"${active === key ? ' aria-current="page"' : ''}>${label}</a>`;
  const menuLabel = lang === 'ko' ? '주 메뉴' : 'Main navigation';
  const filters = site.work_filters || {types:[],years:[]};
  const worksHref = `${home}works.html`;
  const filterLinks = filters.types.map(type => `<a data-work-filter href="${worksHref}?type=${encodeURIComponent(type.value)}">${esc(type.en)}</a>`).join('');
  const worksMenu = `<div class="works-menu"><a class="works-trigger${active === 'works' ? ' is-current' : ''}" href="${worksHref}" aria-expanded="false" aria-controls="works-submenu">Works</a><div class="works-submenu" id="works-submenu" lang="en" hidden><div class="works-categories"><a data-work-filter href="${worksHref}?menu=all">All</a>${filterLinks}</div></div></div>`;
  const socialLinks = [['Instagram', site.instagram], ['YouTube', site.youtube], ['GitHub', site.github], ['Naver Blog', site.naver_blog]]
    .filter(([, href]) => href)
    .map(([label, href]) => `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`).join('');
  const mobileSocials = `<nav class="mobile-menu-socials" aria-label="Social links" lang="en">${socialLinks}</nav>`;
  const language = (className) => active === 'home' || !languageHref ? '' : `<a class="${className}" href="${esc(languageHref)}" hreflang="${lang === 'en' ? 'ko' : 'en'}" data-language="${lang === 'en' ? 'ko' : 'en'}" aria-label="${lang === 'en' ? '한국어로 전환' : 'Switch to English'}">${lang === 'en' ? 'KR' : 'EN'}</a>`;
  return `<div class="site-menu"><a class="desktop-wordmark menu-wordmark" href="${home}index.html">3Dowon</a><div class="mobile-menu-bar"><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-menu-panel" aria-haspopup="dialog" hidden><span class="menu-toggle-icon" aria-hidden="true"></span><span class="menu-toggle-label">Menu</span></button><a class="menu-wordmark" href="${home}index.html">3Dowon</a>${language('mobile-menu-language')}</div><dialog class="mobile-menu-dialog" aria-label="${menuLabel}"></dialog><div class="menu-panel" id="site-menu-panel"><div class="menu-panel-header"><a class="menu-wordmark" href="${home}index.html">3Dowon</a><button class="menu-close" type="button" aria-label="${lang === 'ko' ? '메뉴 닫기' : 'Close menu'}"><span class="menu-toggle-icon" aria-hidden="true"></span></button></div><nav class="menu-links" aria-label="${menuLabel}">${link('about','About')}${worksMenu}${link('lab','Lab')}${link('portfolio','Portfolio')}${link('cv','CV')}</nav>${mobileSocials}</div>${language('menu-language')}</div>`;
}

export function siteFooter({site, lang, home = ''}) {
  const assets = home + (lang === 'ko' ? '../' : '');
  const updated = new Date(site.updated_at || Date.now());
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(updated).map(part => [part.type,part.value]));
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  const questions = '<p>How do familiar objects change our experience of space? How do familiar actions change our experience of space?</p>';
  return `<footer class="site-footer" lang="en" data-footer>
    <div class="footer-question-wrap"><button class="footer-toggle" type="button" aria-controls="footer-questions" aria-expanded="false">What if?</button><div class="footer-question-inline" id="footer-questions" hidden>${questions}</div></div>
    <span class="footer-copyright">© ${parts.year} 3Dowon. All rights reserved.</span>
    <dialog class="footer-question-sheet" aria-label="What if?">
      <div class="footer-question-copy">${questions}</div>
      <div class="footer-question-bottom"><button class="footer-question-close" type="button" aria-label="Close questions">What if?</button><span class="footer-copyright">© ${parts.year} 3Dowon. All rights reserved.</span></div>
    </dialog>
  </footer>`;
}
