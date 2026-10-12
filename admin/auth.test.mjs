import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { installMuxRoutes } from './mux.mjs';
import { authConfig, hashPassword, installAuth } from './auth.mjs';

const password = 'test-only-password-123!';
const passwordHash = await hashPassword(password);
function rawRequest(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request(url, { method, headers }, response => {
      response.resume();
      response.on('end', () => resolve({ status: response.statusCode, headers: { get: name => {
        const value = response.headers[name.toLowerCase()];
        return Array.isArray(value) ? value.join('; ') : value;
      } } }));
    });
    request.on('error', reject); request.end(body);
  });
}
test('online configuration fails closed without credentials or HTTPS', () => {
  assert.throws(() => authConfig({ ADMIN_MODE: 'online' }));
  assert.throws(() => authConfig({ ADMIN_MODE: 'oops' }));
  assert.throws(() => authConfig({ ADMIN_USERNAME: 'owner' }));
  assert.throws(() => authConfig({ ADMIN_MODE: 'online', ADMIN_USERNAME: 'owner', ADMIN_PASSWORD_HASH: passwordHash, ADMIN_ORIGIN: 'http://admin.example.com' }));
  assert.equal(authConfig({}).enabled, false);
});

test('login protects pages and all API methods; logout revokes cookie; sessions expire', async () => {
  let time = Date.now();
  const app = express();
  installAuth(app, authConfig({ ADMIN_USERNAME: 'owner', ADMIN_PASSWORD_HASH: passwordHash }), { now: () => time, sessionMs: 1000 });
  app.all('/api/content', (req, res) => res.json({ private: true }));
  app.get('/', (req, res) => res.send('editor'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = body => fetch(base + '/auth/login', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    assert.equal((await fetch(base, { redirect: 'manual' })).headers.get('location'), '/login');
    assert.equal((await fetch(base + '/login')).status, 200);
    for (const method of ['GET', 'POST', 'PUT', 'DELETE']) assert.equal((await fetch(base + '/api/content', { method, headers: { Origin: base } })).status, 401);
    assert.equal((await login({ username: 'owner', password: 'wrong' })).status, 401);
    assert.equal((await login({ username: 'other', password })).status, 401);
    const response = await login({ username: 'owner', password });
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/);
    const headers = { Cookie: cookie.split(';')[0], Origin: base };
    assert.equal((await fetch(base + '/api/content', { headers })).status, 200);
    assert.equal((await fetch(base + '/api/content', { method: 'PUT', headers: { ...headers, Origin: 'https://evil.example' } })).status, 403);
    assert.equal((await fetch(base + '/api/content', { method: 'PUT', headers: { Cookie: headers.Cookie } })).status, 403);
    assert.equal((await rawRequest(base + '/api/content', { headers: { ...headers, Host: 'evil.example' } })).status, 403);
    assert.equal((await fetch(base + '/auth/logout', { method: 'POST', headers })).status, 200);
    assert.equal((await fetch(base + '/api/content', { headers })).status, 401);
    const again = await login({ username: 'owner', password });
    time += 1001;
    assert.equal((await fetch(base + '/api/content', { headers: { Cookie: again.headers.get('set-cookie').split(';')[0] } })).status, 401);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('online cookie is secure; invalid login attempts are limited', async () => {
  const app = express();
  const origin = 'https://admin.example.com';
  installAuth(app, authConfig({ ADMIN_MODE: 'online', ADMIN_ORIGIN: origin, ADMIN_USERNAME: 'owner', ADMIN_PASSWORD_HASH: passwordHash }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = password => rawRequest(base + '/auth/login', { method: 'POST', headers: { Host: 'admin.example.com', Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'owner', password }) });
  try {
    const good = await login(password);
    assert.match(good.headers.get('set-cookie'), /^__Host-admin_session=.*Secure/);
    for (let i = 0; i < 10; i++) assert.equal((await login('wrong')).status, 401);
    assert.equal((await login(password)).status, 429);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('online Mux requires login and uploads use the exact HTTPS admin origin', async () => {
  const origin = 'https://admin.3dowon.com';
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'online-mux-'));
  let uploadSettings;
  const app = express();
  installAuth(app, authConfig({ ADMIN_MODE: 'online', ADMIN_ORIGIN: origin, ADMIN_USERNAME: 'owner', ADMIN_PASSWORD_HASH: passwordHash }));
  app.use(express.json());
  installMuxRoutes(app, { root: directory, stateDirectory: directory, origin,
    listWorkSlugs: () => [], loadJson: () => ({ items: [] }),
    client: { call: async (route, method, body) => { uploadSettings = body; return { id: 'test-upload', url: 'https://example.com/upload' }; } },
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { Host: 'admin.3dowon.com', Origin: origin, 'Content-Type': 'application/json' };
  try {
    assert.equal((await rawRequest(base + '/api/mux/uploads', { method: 'POST', headers, body: '{}' })).status, 401);
    const login = await rawRequest(base + '/auth/login', { method: 'POST', headers, body: JSON.stringify({ username: 'owner', password }) });
    const authenticated = { ...headers, Cookie: login.headers.get('set-cookie').split(';')[0] };
    assert.equal((await rawRequest(base + '/api/mux/uploads', { method: 'POST', headers: authenticated, body: '{}' })).status, 200);
    assert.equal(uploadSettings.cors_origin, origin);
    assert.equal((await rawRequest(base + '/api/mux/uploads', { method: 'POST', headers: { ...authenticated, Origin: 'https://www.3dowon.com' }, body: '{}' })).status, 403);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
