export function parseWorkDate(value) {
  const match = String(value ?? '').trim().match(/^(\d{4})(?:[.-](0?[1-9]|1[0-2]))?$/);
  if (!match) return null;
  return { year: Number(match[1]), month: match[2] ? Number(match[2]) : null };
}

export function compareWorkDates(a, b) {
  const key = work => Number(work.year || 0) * 12 + Number(work.month || 0);
  return key(b) - key(a) || String(a.title || '').localeCompare(String(b.title || ''), 'ko');
}
