const labels = {
  '인터랙티브':'Interactive', '설치':'Installation', '영상':'Video',
  '전시':'Exhibition', '퍼포먼스':'Performance', 'VR/AR':'VR/AR',
  '프로젝션':'Projection', '웹':'Web', '모바일':'Mobile',
};
const canonical = value => value === 'VR' || value === 'AR' ? 'VR/AR' : value;

export function workFilterTypes(work) {
  const values = [work.type, work.meta_type, ...(work.tags || [])];
  return [...new Set(values.flatMap(value => typeof value === 'string' ? value.split(',') : [])
    .map(value => canonical(value.trim())).filter(Boolean))];
}

export function buildWorkFilters(works) {
  const translations = new Map(Object.entries(labels));
  for (const work of works) {
    const ko = String(work.meta_type || '').split(',').map(value => value.trim());
    const en = String(work.meta_type_en || '').split(',').map(value => value.trim());
    if (ko.length === en.length) ko.forEach((value,index) => {
      const key = canonical(value);
      if (key && en[index] && !translations.has(key)) translations.set(key,en[index]);
    });
  }
  const present = new Set(works.flatMap(workFilterTypes));
  const ordered = [...Object.keys(labels).filter(value => present.has(value)),
    ...[...present].filter(value => !Object.hasOwn(labels,value)).sort()];
  return {
    types:ordered.map(value => ({value,ko:value,en:translations.get(value) || value})),
    years:[...new Set(works.map(work => String(work.year || '')).filter(Boolean))].sort((a,b) => Number(b)-Number(a)),
  };
}
