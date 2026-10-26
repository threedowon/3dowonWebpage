export const videoTheme = `<template id="portfolio-video-theme">
<style>
:host{display:block;width:100%;height:100%;--media-tooltip-display:none;--media-primary-color:var(--detail-paper,#fff);--media-icon-color:var(--media-primary-color);--media-control-background:transparent;--media-control-hover-background:transparent;--media-control-padding:8px;--media-control-height:18px;--media-button-icon-width:18px;--media-button-icon-height:18px;--media-range-track-height:4px;--media-range-bar-color:var(--media-accent-color,var(--media-primary-color));--media-range-thumb-background:var(--media-primary-color);--media-range-thumb-width:8px;--media-range-thumb-height:8px;--media-time-range-buffered-color:#777;--media-range-track-background:#444;--media-menu-background:rgba(20,20,20,.96);--media-menu-color:#fff;--media-preview-time-background:#fff;--media-preview-time-color:#111;--media-preview-time-border-radius:3px;--media-font-family:InterVariable,Inter,sans-serif}
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
</template>
<template id="margin-video-theme">
<style>
:host{display:block;width:100%;height:100%;--media-tooltip-display:none;--media-primary-color:#fff;--media-icon-color:#fff;--media-control-background:transparent;--media-control-hover-background:transparent;--media-font-family:InterVariable,Inter,sans-serif;--media-font-size:12px;--media-button-icon-width:22px;--media-button-icon-height:22px;--media-control-padding:10px;--media-range-track-height:2px;--media-range-bar-color:#fff;--media-range-thumb-background:#fff;--media-range-thumb-width:8px;--media-range-thumb-height:8px;--media-range-track-background:#555;--media-time-range-buffered-color:#888}
media-controller{width:100%;height:100%;background:#000}
.center-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:72px;height:72px;--media-button-icon-width:42px;--media-button-icon-height:42px;--media-control-padding:15px;background:transparent;transition:opacity .2s}
media-loading-indicator{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none}
media-controller:not([mediapaused]) .center-play{opacity:0}
media-controller:not([mediapaused]):hover .center-play,media-controller:not([mediapaused]) .center-play:focus-visible{opacity:1}
.controls{display:flex;flex-direction:column;width:100%;box-sizing:border-box;padding:12px 20px 10px;background:#000}
media-time-range{width:100%;height:22px;--media-range-padding:0}
media-control-bar{display:flex;align-items:center;width:100%;background:#000;min-height:36px}
media-time-display{margin-right:auto;--media-control-padding:0;font-family:InterVariable,Inter,sans-serif;font-size:12px;font-variant-numeric:tabular-nums}
media-fullscreen-button{margin-right:-10px}
@media(max-width:920px){
 :host{--media-focus-box-shadow:none;-webkit-tap-highlight-color:transparent}
 media-play-button,media-mute-button,media-fullscreen-button{outline:none!important;box-shadow:none!important;-webkit-tap-highlight-color:transparent}
 .controls{padding:8px 14px 6px}.center-play{--media-button-icon-width:36px;--media-button-icon-height:36px}
}
@media(prefers-reduced-motion:reduce){.center-play{transition:none}}
</style>
<media-controller defaultstreamtype="on-demand" keyboardforwardseekoffset="5" keyboardbackwardseekoffset="5">
<slot name="media" slot="media"></slot><slot name="poster" slot="poster"></slot>
<media-play-button class="center-play" slot="centered-chrome" part="center play button"><svg slot="play" viewBox="0 0 48 48" aria-hidden="true"><path d="M14 7 39 24 14 41Z" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round"/></svg><svg slot="pause" viewBox="0 0 48 48" aria-hidden="true"><path d="M17 9V39M31 9V39" fill="none" stroke="currentColor" stroke-width="3"/></svg></media-play-button>
<media-loading-indicator slot="centered-chrome" noautohide></media-loading-indicator>
<media-error-dialog slot="dialog"></media-error-dialog>
<div class="controls">
<media-time-range aria-label="Seek"></media-time-range>
<media-control-bar>
<media-time-display showduration></media-time-display>
<media-mute-button><svg slot="high" viewBox="0 0 24 24"><path d="M3 9h4l5-4v14l-5-4H3ZM16 8q5 4 0 8M19 5q8 7 0 14" fill="none" stroke="currentColor" stroke-width="1.4"/></svg><svg slot="off" viewBox="0 0 24 24"><path d="M3 9h4l5-4v14l-5-4H3ZM17 9l5 6m0-6-5 6" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></media-mute-button>
<media-fullscreen-button><svg slot="enter" viewBox="0 0 24 24"><path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></media-fullscreen-button>
</media-control-bar>
</div>
</media-controller>
</template>`;
