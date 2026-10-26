// Use the native cursor itself so there is no second DOM cursor to overlap.
const svgCursor = (content, width = 24, height = 24) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${content}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${width / 2} ${height / 2},none`;
};

export function siteCursorHead() {
  const solid = svgCursor('<circle cx="12" cy="12" r="8" fill="#15591f"/>');
  const link = svgCursor('<circle cx="12" cy="12" r="8" fill="#fff"/>');
  const loading = svgCursor('<circle cx="12" cy="12" r="7" fill="none" stroke="#15591f" stroke-width="2" stroke-dasharray="1 3" stroke-linecap="round"/>');
  const arrow = direction => svgCursor(`<path fill="#15591f" d="M0 0h30v12H0z"/><path fill="none" stroke="#fff" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" d="${direction === 'previous' ? 'M28 6H2m8-4L2 6l8 4' : 'M2 6h26m-8-4 8 4-8 4'}"/>`, 30, 12);
  return `<style>
@media(hover:hover) and (pointer:fine){
html:root{cursor:${solid}!important}
html:root *,html:root::before,html:root::after,html:root *::before,html:root *::after{cursor:inherit!important}
html:root :is(a[href],button,summary,select,input,label,[role="button"],[role="link"],[contenteditable="true"],video,mux-player,iframe,audio,.post-video-frame){cursor:${link}!important}
html:root body :is(.detail-image-prev,.portfolio-prev){cursor:${arrow('previous')}!important}
html:root body :is(.detail-image-next,.portfolio-next){cursor:${arrow('next')}!important}
html:root:is(.page-loading,.page-navigating),html:root:is(.page-loading,.page-navigating) *,html:root:is(.page-loading,.page-navigating)::before,html:root:is(.page-loading,.page-navigating)::after{cursor:${loading}!important}
}
</style><script>(${setupShadowCursors.toString()})();</script>`;
}

function setupShadowCursors() {
  const seen = new WeakSet();
  function prepare(scope = document) {
    for (const element of scope.querySelectorAll('*')) {
      const shadow = element.shadowRoot;
      if (!shadow) continue;
      if (!seen.has(shadow)) {
        const style = document.createElement('style');
        style.textContent = '@media(hover:hover) and (pointer:fine){*,*::before,*::after{cursor:inherit!important}}';
        shadow.append(style);
        seen.add(shadow);
      }
      prepare(shadow);
    }
  }
  document.addEventListener('DOMContentLoaded', () => prepare(), {once:true});
  customElements.whenDefined('mux-player').then(() => prepare());
  document.addEventListener('pointerover', event => {
    for (const node of event.composedPath()) {
      if (node instanceof Element && node.shadowRoot) prepare(node.getRootNode());
    }
  }, {capture:true,passive:true});
}
