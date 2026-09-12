export const videoTheme = `<template id="portfolio-video-theme">
<style>
:host{display:block;width:100%;height:100%;--media-primary-color:var(--detail-paper,#ddd);--media-icon-color:var(--media-primary-color);--media-control-background:transparent;--media-control-hover-background:transparent;--media-control-padding:8px;--media-control-height:18px;--media-button-icon-width:18px;--media-button-icon-height:18px;--media-range-track-height:4px;--media-range-bar-color:var(--media-accent-color,var(--media-primary-color));--media-range-thumb-background:var(--media-primary-color);--media-range-thumb-width:8px;--media-range-thumb-height:8px;--media-time-range-buffered-color:#777;--media-range-track-background:#444;--media-menu-background:rgba(20,20,20,.96);--media-menu-color:#fff;--media-preview-time-background:#fff;--media-preview-time-color:#111;--media-preview-time-border-radius:3px;--media-font-family:Arial,sans-serif}
media-controller{width:100%;height:100%;background:#000}
media-control-bar{display:flex;align-items:center;width:100%;box-sizing:border-box;padding:6px 8px;gap:1px;background:linear-gradient(transparent,rgba(0,0,0,.65));}
media-time-range{flex:1;min-width:30px;--media-range-padding:0 5px;--media-preview-thumbnail-max-width:140px}
media-rendition-menu{--media-menu-flex-direction:column;position:absolute;right:40px;bottom:44px;min-width:130px;max-height:220px;overflow:auto;border-radius:4px}
.volume{display:flex;align-items:center}.volume media-volume-range{width:0;max-width:64px;overflow:hidden;transition:width .15s}.volume:hover media-volume-range,.volume:focus-within media-volume-range{width:64px}
media-playback-rate-button{min-width:34px;font-size:11px}
media-preview-thumbnail{display:block}
@media(max-width:480px){media-control-bar{padding:4px;gap:0;--media-control-padding:7px}.volume:hover media-volume-range,.volume:focus-within media-volume-range{width:44px}}
</style>
<media-controller defaultstreamtype="on-demand" keyboardforwardseekoffset="5" keyboardbackwardseekoffset="5">
<slot name="media" slot="media"></slot><slot name="poster" slot="poster"></slot>
<media-loading-indicator slot="centered-chrome"></media-loading-indicator>
<media-error-dialog slot="dialog"></media-error-dialog>
<media-control-bar>
<media-play-button part="bottom play button"></media-play-button>
<media-time-range part="bottom time range"><media-preview-thumbnail slot="preview"></media-preview-thumbnail><media-preview-time-display slot="preview"></media-preview-time-display></media-time-range>
<div class="volume"><media-mute-button part="bottom mute button"></media-mute-button><media-volume-range part="bottom volume range"></media-volume-range></div>
<media-rendition-menu-button part="bottom rendition button"><svg slot="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m9.5 2-.6 2.4-1.8 1-2.4-.7-2.5 4.3 1.8 1.7v2.1L2.2 15l2.5 4.3 2.4-.7 1.8 1 .6 2.4h5l.6-2.4 1.8-1 2.4.7 2.5-4.3-1.8-2.2v-2.1l1.8-1.7-2.5-4.3-2.4.7-1.8-1-.6-2.4h-5ZM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"/></svg></media-rendition-menu-button>
<media-rendition-menu anchor="auto" hidden part="bottom rendition menu"></media-rendition-menu>
<media-playback-rate-button rates="0.5 0.75 1 1.25 1.5 2" part="bottom playback-rate button"></media-playback-rate-button>
<media-fullscreen-button part="bottom fullscreen button"></media-fullscreen-button>
</media-control-bar>
</media-controller>
</template>`;
