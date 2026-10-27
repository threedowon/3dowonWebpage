// Decode translation entities as text; callers must still escape before rendering HTML.
export function decodeTextEntities(value) {
  const named = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:'\u00a0'};
  return String(value ?? '').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity) => {
    if (entity[0] !== '#') return named[entity.toLowerCase()];
    const hex = entity[1].toLowerCase() === 'x';
    const code = parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : match;
  });
}

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

export function vimeoEmbedHtml(url, title = 'Video', color = '') {
  const id = vimeoIdFromUrl(url);
  if (!id) return '';
  return `<div class="post-video reveal">
        <div class="post-video-frame">
          <iframe src="https://player.vimeo.com/video/${id}?title=0&amp;byline=0&amp;portrait=0${/^#[0-9a-f]{6}$/i.test(color) ? `&amp;color=${color.slice(1)}` : ''}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="eager" title="${escapeHtml(title)}"></iframe>
        </div>
      </div>`;
}
