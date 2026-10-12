export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const fail = (status, message) => { throw new HttpError(status, message); };
export const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
export const random = () => crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
export const cookie = (name, value, seconds, sameSite = 'Strict') => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=${sameSite}; Max-Age=${seconds}`;
export const readCookie = (request, name) => (request.headers.get('Cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(name + '='))?.slice(name.length + 1);
export const sha256 = async text => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(b => b.toString(16).padStart(2, '0')).join('');
export async function readJSON(request, max = 512 * 1024) {
  if (Number(request.headers.get('Content-Length')) > max) fail(413, '입력 내용이 너무 커요. 나누어 저장해주세요.');
  const reader = request.body?.getReader();
  if (!reader) return {};
  let length = 0; const chunks = [];
  for (;;) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > max) { await reader.cancel(); fail(413, '입력 내용이 너무 커요.'); } chunks.push(value); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { fail(400, '올바른 JSON이 아니에요.'); }
}
export function stateStore(db) {
  return {
    async get(id) { const row = await db.prepare('SELECT data FROM admin_state WHERE id = ? AND expires > ?').bind(id, Date.now()).first(); return row ? JSON.parse(row.data) : null; },
    async take(id) { const row = await db.prepare('DELETE FROM admin_state WHERE id = ? RETURNING data, expires').bind(id).first(); return row && row.expires > Date.now() ? JSON.parse(row.data) : null; },
    async put(id, data, seconds) { await db.prepare('INSERT OR REPLACE INTO admin_state (id,data,expires) VALUES (?,?,?)').bind(id, JSON.stringify(data), Date.now() + seconds * 1000).run(); },
    async remove(id) { await db.prepare('DELETE FROM admin_state WHERE id = ?').bind(id).run(); },
    async list(prefix) { const result = await db.prepare('SELECT data FROM admin_state WHERE id LIKE ? AND expires > ? ORDER BY expires DESC LIMIT 100').bind(prefix + '%', Date.now()).all(); return result.results.map(row => JSON.parse(row.data)); },
    async clean() { await db.prepare('DELETE FROM admin_state WHERE expires <= ?').bind(Date.now()).run(); },
  };
}
