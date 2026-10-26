export function validateRelatedProjects(value, currentSlug, slugs) {
  const allowed = new Set(slugs);
  if (!Array.isArray(value) || value.length > 4 || value.some(slug => typeof slug !== 'string' || slug === currentSlug || !allowed.has(slug)) || new Set(value).size !== value.length) {
    throw new Error('다른 작업을 중복 없이 최대 4개까지 선택해주세요.');
  }
  return [...value];
}

export function selectRelatedWorks(work, works) {
  const candidates = works.filter(item => item.slug !== work.slug);
  const saved = Array.isArray(work.related_projects) ? work.related_projects : [];
  const chosen = [...new Set(saved)].map(slug => candidates.find(item => item.slug === slug)).filter(Boolean).slice(0,4);
  if (chosen.length) return chosen;
  const terms = item => new Set(`${item.meta_type_en || item.meta_type || ''},${(item.tags || []).join(',')}`.toLowerCase().split(/[,，]/).map(s => s.trim()).filter(Boolean));
  const currentTerms = terms(work);
  return candidates.map(item => ({item, score:[...terms(item)].filter(term => currentTerms.has(term)).length}))
    .sort((a,b) => b.score-a.score || Math.abs(Number(a.item.year)-Number(work.year))-Math.abs(Number(b.item.year)-Number(work.year)))
    .slice(0,4).map(({item}) => item);
}
