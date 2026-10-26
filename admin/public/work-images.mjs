const imagePattern = /\.(?:avif|bmp|gif|heic|heif|jpe?g|png|svg|tiff?|webp)(?:[?#]|$)/i;
export const isWorkImage = src => typeof src === 'string' && imagePattern.test(src);
const imageKey = src => src.trim().replace(/^(?:\/3dowonWebpage\/|\/(?=assets\/)|\.\/)/, '');

export function workImageCandidates(work) {
  const sources = [work.thumbnail, work.hero_image, work.preview_bg, ...(work.gallery || []),
    ...(work.process_media || []), ...(work.process || []).flatMap(entry => entry.images || []),
    work.cover_image, work.hover_image];
  const seen = new Set();
  return sources.filter(src => {
    if (!isWorkImage(src) || seen.has(imageKey(src))) return false;
    seen.add(imageKey(src));
    return true;
  });
}

export function workCoverImage(work) {
  return [work.cover_image, work.thumbnail, work.hero_image, ...(work.gallery || [])].find(isWorkImage) || '';
}

export function workHoverCandidates(work) {
  const cover = workCoverImage(work);
  return workImageCandidates(work).filter(src => imageKey(src) !== imageKey(cover));
}

export function workHoverImage(work) {
  const candidates = workHoverCandidates(work);
  return candidates.find(src => isWorkImage(work.hover_image) && imageKey(src) === imageKey(work.hover_image))
    || candidates[0] || '';
}
