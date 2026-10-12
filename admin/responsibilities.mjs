export function validateResponsibilities(items) {
  if (!Array.isArray(items) || items.length > 50) throw new Error('주요 업무는 최대 50개까지 추가할 수 있어요.');
  const ids = new Set();
  return items.map(item => {
    if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(item.id) || ids.has(item.id) || ['title','title_en','description','description_en'].some(key => typeof item[key] !== 'string' || item[key].length > 50000)) throw new Error('주요 업무의 제목과 내용을 확인해주세요.');
    ids.add(item.id);
    return Object.fromEntries(['id','title','title_en','description','description_en'].map(key => [key, item[key]]));
  });
}
