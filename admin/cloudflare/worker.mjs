import { authRoute, getSession, validateConfig } from './auth.mjs';
import { Repository } from './github.mjs';
import { contentRequest } from './content.mjs';
import { muxRequest } from './mux.mjs';
import { fail, json, stateStore } from './common.mjs';

const loginHTML = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>3DOWON · 관리자 로그인</title><link rel="stylesheet" href="/login.css"></head><body><main><p class="brand">3DOWON <span>STUDIO</span></p><h1>관리자 로그인</h1><p class="intro">GitHub 계정으로 로그인하고<br>작업과 소식을 관리하세요.</p><a href="/auth/github" style="display:block;text-align:center;background:#465c32;color:white;padding:14px;border-radius:7px;text-decoration:none">GitHub로 로그인</a><p class="intro" style="margin:24px 0 0">등록된 관리자 계정만 접근할 수 있습니다.</p></main></body></html>`;

export async function handle(request, env, outbound = fetch) {
  validateConfig(env);
  const url = new URL(request.url);
  if (url.origin !== env.ADMIN_ORIGIN) fail(403, '등록된 관리자 주소에서 접속해주세요.');
  if (!['GET', 'HEAD'].includes(request.method) && request.headers.get('Origin') !== env.ADMIN_ORIGIN) fail(403, '관리자 페이지에서 다시 시도해주세요.');
  if (request.headers.get('Sec-Fetch-Site') === 'cross-site' && url.pathname !== '/auth/callback' && !['GET', 'HEAD'].includes(request.method)) fail(403, '허용되지 않은 요청입니다.');
  const state = stateStore(env.DB);
  const auth = await authRoute(request, env, state, outbound);
  if (auth) return auth;
  if (url.pathname === '/login' && request.method === 'GET') return new Response(loginHTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  if (url.pathname === '/login.css' && request.method === 'GET') return env.ASSETS.fetch(request);
  const session = await getSession(request, env, state);
  if (!session) return url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/') ? json({ error: '로그인이 만료됐어요. 새 탭에서 다시 로그인한 뒤 저장해주세요.', login: '/login' }, 401) : new Response(null, { status: 302, headers: { Location: '/login' } });
  if (url.pathname === '/auth/session') return json({ authenticated: true, username: session.login, mode: 'github' });
  const repo = new Repository(env, session.token, outbound);
  if (url.pathname.startsWith('/site/assets/') && request.method === 'GET') {
    const path = decodeURIComponent(url.pathname.slice('/site/'.length));
    const asset = await repo.asset(path);
    const ext = path.split('.').pop().toLowerCase();
    const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', mp4: 'video/mp4', webm: 'video/webm', pdf: 'application/pdf' }[ext];
    return new Response(asset.body, { headers: { 'Content-Type': mime || 'application/octet-stream', ...(mime ? {} : { 'Content-Disposition': 'attachment' }) } });
  }
  if (url.pathname === '/api/deploy' && request.method === 'POST') {
    if (request.headers.get('If-Match') !== await repo.head()) fail(409, '초안이 변경됐어요. 새로고침 후 확인하고 배포해주세요.');
    return json(await repo.publish());
  }
  if (url.pathname.startsWith('/api/mux/')) return muxRequest(request, repo, env, state, outbound);
  if (url.pathname.startsWith('/api/')) return contentRequest(request, repo, env, outbound);
  if (!['GET', 'HEAD'].includes(request.method)) fail(405, '허용되지 않은 요청입니다.');
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env) {
    let response;
    try { response = await handle(request, env); }
    catch (error) { response = json({ error: error.status ? error.message : '요청을 처리하지 못했어요. 저장 여부를 확인하고 다시 시도해주세요.' }, error.status || 500); }
    const secured = new Response(response.body, response);
    for (const [key, value] of Object.entries({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Strict-Transport-Security': 'max-age=31536000', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: blob: data:; media-src 'self' https: blob:; connect-src 'self' https://*.mux.com; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" })) secured.headers.set(key, value);
    return secured;
  },
  async scheduled(event, env) { await stateStore(env.DB).clean(); },
};
