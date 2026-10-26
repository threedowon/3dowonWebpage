const videoFile = /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i;

export function featuredMedia(work) {
  if (/^[a-zA-Z0-9]+$/.test(work.mux?.playback_id || '')) return {kind:'mux',src:work.mux.playback_id};
  const src = [work.video,...(work.gallery || [])].find(value => typeof value === 'string' && videoFile.test(value));
  if (src) return {kind:'video',src};
  const id = String(work.vimeo_url || '').match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
  return id ? {kind:'vimeo',src:id} : null;
}

export function selectFeaturedWorks(works, projects = []) {
  const selected = [...new Set(projects)].map(slug => works.find(work => work.slug === slug)).filter(Boolean).slice(0,10);
  return selected.length ? selected : works.filter(featuredMedia).slice(0,5);
}

export function validateFeaturedProjects(projects, slugs) {
  const allowed = new Set(slugs);
  if (!Array.isArray(projects) || projects.length < 1 || projects.length > 10 ||
      projects.some(slug => typeof slug !== 'string' || !allowed.has(slug)) || new Set(projects).size !== projects.length) {
    throw new Error('대표 프로젝트를 중복 없이 1개부터 10개까지 선택해주세요.');
  }
  return [...projects];
}
