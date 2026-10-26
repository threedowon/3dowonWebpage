import {escapeHtml as esc} from './html.mjs';
import {pick,resolveMediaPath} from './catalog.mjs';
import {siteNavigation} from './navigation.mjs';
import {pageLoadingHead} from './page-loading.mjs';
import {workCoverImage} from '../../admin/public/work-images.mjs';
import {featuredMedia,selectFeaturedWorks} from '../../admin/public/featured-projects.mjs';

export function featuredHomePage(works,site,lang,selection) {
  const ko = lang === 'ko', assets = ko ? '../' : '';
  const selected = selectFeaturedWorks(works,selection.projects);
  const slides = selected.map((work,index) => {
    const title = pick(work,'title','en'), media = featuredMedia(work);
    const cover = resolveMediaPath(workCoverImage(work),assets) || (media?.kind === 'mux' ? `https://image.mux.com/${media.src}/thumbnail.jpg?time=2` : '');
    const type = pick(work,'meta_type','en') || '';
    return `<article class="featured-slide${index === 0 ? ' is-active' : ''}" data-slug="${esc(work.slug)}"${index ? ' hidden' : ''}>
      <a class="featured-project" href="work/${esc(work.slug)}.html" aria-label="${esc(title)} — View project">
        <div class="featured-media" aria-hidden="true"${media ? ` data-media-kind="${media.kind}" data-media-src="${esc(media.kind === 'video' ? resolveMediaPath(media.src,assets) : media.src)}"` : ''}>
          ${cover ? `<img class="featured-poster" src="${esc(cover)}" alt="" ${index ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async">` : ''}
        </div>
        <div class="featured-caption"><p class="featured-eyebrow">Selected project / ${String(index+1).padStart(2,'0')}</p><h2>${esc(title)}</h2><p class="featured-meta">${esc([type,work.year].filter(Boolean).join(' / '))}</p><span class="featured-view">View project ↗</span></div>
      </a>
    </article>`;
  }).join('');
  return `<!doctype html><html id="top" lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${pageLoadingHead(assets, lang)}<meta name="theme-color" content="#101510"><meta name="description" content="3Dowon — Interactive Media Artist. ${ko ? '영상으로 만나는 대표 프로젝트.' : 'Selected interactive projects in motion.'}"><title>3Dowon — Interactive Media Artist</title><link rel="icon" href="${assets}assets/green-archive/3dowon.png"><link rel="stylesheet" href="${assets}assets/green-archive/archive.css?v=13"><link rel="stylesheet" href="${assets}assets/green-archive/menu.css?v=36"><link rel="stylesheet" href="${assets}assets/green-archive/layout.css?v=82"><link rel="stylesheet" href="${assets}assets/green-archive/home.css?v=10"><script src="${assets}assets/green-archive/menu.js?v=26" defer></script><script src="${assets}assets/green-archive/home.js?v=3" defer></script></head>
    <body class="archive-layout page-home"><a class="skip" href="#main" lang="en">Skip to content</a><header>${siteNavigation({site,lang,active:'home'})}</header>
    <main id="main" class="featured-home" lang="en" tabindex="0" aria-label="Selected projects" aria-roledescription="carousel"><h1 class="page-title-hidden">3Dowon — Interactive Media Artist</h1>${slides || `<a class="featured-empty" href="works.html">View all works ↗</a>`}
      <nav class="featured-pagination" aria-label="Choose a featured project">${selected.map((work,index) => `<button type="button" class="featured-dot" data-featured-dot="${index}" aria-label="Project ${index+1}: ${esc(pick(work,'title','en'))}" aria-current="${index === 0 ? 'true' : 'false'}"></button>`).join('')}</nav><span class="page-title-hidden" data-featured-status aria-live="polite" aria-atomic="true"></span>
      <div class="featured-bottom"><span class="featured-signature">Interactive Media Artist</span><nav class="featured-navigation" aria-label="Browse featured projects"${selected.length < 2 ? ' hidden' : ''}><button type="button" data-featured-prev aria-label="Previous project">↑</button><button type="button" data-featured-next aria-label="Next project">↓</button></nav><button type="button" class="featured-playback" hidden></button></div>
    </main></body></html>`;
}
