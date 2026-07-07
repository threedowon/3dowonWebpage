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
