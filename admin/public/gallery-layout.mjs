export function galleryRows(work) {
  const gallery = work.gallery || [];
  const remaining = new Set(gallery);
  const rows = [];
  const source = Array.isArray(work.detail_rows) ? work.detail_rows : Array.from({length: Math.ceil(gallery.length / (Number(work.detail_columns) || 1))}, (_, i) => gallery.slice(i * (Number(work.detail_columns) || 1), (i + 1) * (Number(work.detail_columns) || 1)));
  for (const row of source) {
    const valid = row.filter(src => remaining.has(src)).slice(0, 3);
    valid.forEach(src => remaining.delete(src));
    if (valid.length) rows.push(valid);
  }
  for (const src of remaining) rows.push([src]);
  return rows;
}
export function groupSelection(rows, selected, ungroup = false) {
  const picked = rows.flat().filter(src => selected.includes(src));
  const result = []; let inserted = false;
  for (const row of rows) {
    if (!row.some(src => picked.includes(src))) { result.push(row); continue; }
    if (!inserted && !ungroup) { result.push(picked); inserted = true; }
    for (const src of row) if (ungroup || !picked.includes(src)) result.push([src]);
  }
  return result;
}
export function moveRow(rows, from, to) {
  const result = rows.map(row => [...row]);
  if (from === to || from < 0 || to < 0 || to >= rows.length) return result;
  result.splice(to, 0, result.splice(from, 1)[0]);
  return result;
}
