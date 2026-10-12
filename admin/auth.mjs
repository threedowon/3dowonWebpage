import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

const derive = promisify(scrypt);
const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) throw new Error('비밀번호는 12~256자로 설정해주세요.');
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${(await derive(password, salt, 64, options)).toString('hex')}`;
}

export function authConfig(env = process.env) {
  const online = env.ADMIN_MODE === 'online';
  if (env.ADMIN_MODE && !['online', 'local'].includes(env.ADMIN_MODE)) throw new Error('ADMIN_MODE must be local or online');
  const username = env.ADMIN_USERNAME || '';
  const passwordHash = env.ADMIN_PASSWORD_HASH || '';
  if ((online || username || passwordHash) && (!username || !/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(passwordHash))) {
    throw new Error('Set ADMIN_USERNAME and a valid ADMIN_PASSWORD_HASH before starting the admin.');
  }
  let origin = '';
  if (online) {
    const url = new URL(env.ADMIN_ORIGIN);
    if (url.protocol !== 'https:' || url.origin !== env.ADMIN_ORIGIN || url.username || url.password) throw new Error('ADMIN_ORIGIN must be an exact HTTPS origin, e.g. https://admin.example.com');
    origin = url.origin;
  }
  return { online, username, passwordHash, origin, enabled: Boolean(username) };
}

// Runs before static files, JSON parsers, uploads and every content/API route.
export function installAuth(app, config = authConfig(), { now = Date.now, sessionMs = 8 * 60 * 60 * 1000 } = {}) {
  const sessions = new Map();
  const attempts = new Map();
  const cookieName = config.online ? '__Host-admin_session' : 'admin_session';
  const cookieOptions = { httpOnly: true, secure: config.online, sameSite: 'strict', path: '/' };
  let activeLogins = 0;
  let windowStart = now(), totalAttempts = 0;
  const tokenFor = req => (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  const sessionFor = req => {
    const token = tokenFor(req), expires = sessions.get(token);
    if (!expires || expires <= now()) { sessions.delete(token); return false; }
    return true;
  };
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin', 'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" });
    const host = req.get('host') || '';
    const expected = config.online ? config.origin : `http://${host}`;
    if (config.online ? host !== new URL(expected).host : !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return res.status(403).json({ error: '허용되지 않은 관리자 주소입니다.' });
    if (config.online) res.set('Strict-Transport-Security', 'max-age=31536000');
    if ((req.get('origin') && req.get('origin') !== expected) || req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({ error: '관리자 페이지에서 다시 시도해주세요.' });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('origin') !== expected) return res.status(403).json({ error: '요청 출처를 확인할 수 없어요.' });
    next();
  });
  app.get('/login', (req, res) => (!config.enabled || sessionFor(req)) ? res.redirect('/') : res.sendFile(path.join(publicDir, 'login.html')));
  app.get('/login.js', (req, res) => res.sendFile(path.join(publicDir, 'login.js')));
  app.get('/login.css', (req, res) => res.sendFile(path.join(publicDir, 'login.css')));
  app.post('/auth/login', express.json({ limit: '4kb' }), async (req, res, next) => {
    if (!config.enabled) return res.status(404).end();
    const time = now();
    for (const [key, value] of attempts) if (value.until <= time) attempts.delete(key);
    if (time - windowStart >= 15 * 60 * 1000) { windowStart = time; totalAttempts = 0; }
    const key = req.ip;
    const attempt = attempts.get(key) || { count: 0, until: time + 15 * 60 * 1000 };
    if (attempt.count >= 10 || totalAttempts >= 50 || activeLogins >= 2) return res.status(429).set('Retry-After', '900').json({ error: '로그인 시도가 많아요. 15분 뒤 다시 시도해주세요.' });
    attempt.count++; totalAttempts++; attempts.set(key, attempt);
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string' || password.length > 256) return res.status(401).json({ error: '아이디 또는 비밀번호가 맞지 않아요.' });
    activeLogins++;
    try {
      const [, salt, hash] = config.passwordHash.split(':');
      const derived = await derive(password, salt, 64, options);
      const matches = timingSafeEqual(derived, Buffer.from(hash, 'hex'));
      if (!matches || username !== config.username) return res.status(401).json({ error: '아이디 또는 비밀번호가 맞지 않아요.' });
      attempts.delete(key);
      for (const [token, expiry] of sessions) if (expiry <= time) sessions.delete(token);
      sessions.delete(tokenFor(req));
      if (sessions.size >= 100) sessions.delete(sessions.keys().next().value);
      const token = randomBytes(32).toString('hex');
      sessions.set(token, now() + sessionMs);
      res.cookie(cookieName, token, { ...cookieOptions, maxAge: sessionMs }).json({ ok: true });
    } catch (error) { next(error); } finally { activeLogins--; }
  });
  app.post('/auth/logout', (req, res) => {
    sessions.delete(tokenFor(req));
    res.clearCookie(cookieName, cookieOptions).json({ ok: true });
  });
  app.use((req, res, next) => {
    if (!config.enabled || sessionFor(req)) return next();
    if (req.path.startsWith('/api/') || !['GET', 'HEAD'].includes(req.method)) return res.status(401).json({ error: '로그인이 필요해요. 다시 로그인해주세요.' });
    res.redirect('/login');
  });
  app.get('/auth/session', (req, res) => res.json({ authenticated: config.enabled, username: config.username }));
}
