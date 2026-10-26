import { escapeHtml as esc } from './html.mjs';

// Inline the small first-paint guard so it runs before any page content is drawn.
export function pageLoadingHead(assets, lang) {
  return `<link rel="preload" href="${esc(assets)}assets/fonts/InterVariable.woff2" as="font" type="font/woff2" crossorigin>${lang === 'ko' ? `<link rel="preload" href="${esc(assets)}assets/fonts/PretendardVariable.woff2" as="font" type="font/woff2" crossorigin>` : ''}
<style>
html.page-loading body{visibility:hidden}
html.page-loading::before{content:'';position:fixed;inset:0;z-index:2147483000;background:#fff}
html.page-loading::after{content:'';position:fixed;left:50%;top:50%;z-index:2147483001;width:24px;height:24px;margin:-12px;border:1.5px solid #15591f26;border-top-color:#15591f;border-radius:50%;box-sizing:border-box;opacity:0;animation:page-loader-spin .8s linear infinite,page-loader-show 0s .15s forwards}
html.page-loaded body{animation:page-content-in .16s ease-out}
@keyframes page-loader-spin{to{transform:rotate(360deg)}}
@keyframes page-loader-show{to{opacity:1}}
@keyframes page-content-in{from{opacity:0}to{opacity:1}}
@media(prefers-reduced-motion:reduce){html.page-loaded body{animation:none}html.page-loading::after{animation:page-loader-show 0s .15s forwards}}
</style>
<script>(()=>{const root=document.documentElement;root.classList.add('page-loading');root.setAttribute('aria-busy','true');let timer;const finish=()=>{clearTimeout(timer);if(!root.classList.contains('page-loading'))return;root.classList.remove('page-loading');root.classList.add('page-loaded');root.removeAttribute('aria-busy');};timer=setTimeout(finish,3000);document.addEventListener('site:ready',finish,{once:true});window.addEventListener('beforeunload',()=>root.classList.add('page-navigating'));window.addEventListener('pageshow',event=>{root.classList.remove('page-navigating');if(event.persisted)finish();});})();</script>
<script src="${esc(assets)}assets/green-archive/page-loading.js?v=1" defer></script>`;
}
