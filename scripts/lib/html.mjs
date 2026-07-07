export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function dataAttrs(work) {
  const tags = work.tags?.length ? ` data-tags="${escapeHtml(work.tags.join(','))}"` : '';
  const tech = work.tech?.length ? work.tech.join(',') : '';
  return `data-production="${escapeHtml(work.production)}" data-tech="${escapeHtml(tech)}" data-year="${work.year}" data-type="${escapeHtml(work.type)}"${tags}`;
}

export function vimeoIdFromUrl(url) {
  if (!url) return '';
  const value = String(url).trim();
  const match =
    value.match(/player\.vimeo\.com\/video\/(\d+)/) ||
    value.match(/vimeo\.com\/(?:channels\/[^/]+\/|groups\/[^/]+\/videos\/|video\/)?(\d+)/);
  return match?.[1] || '';
}

export function vimeoEmbedHtml(url, title = 'Video') {
  const id = vimeoIdFromUrl(url);
  if (!id) return '';
  return `<div class="post-video reveal">
        <div class="post-video-frame">
          <iframe src="https://player.vimeo.com/video/${id}?title=0&amp;byline=0&amp;portrait=0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy" title="${escapeHtml(title)}"></iframe>
        </div>
      </div>`;
}
