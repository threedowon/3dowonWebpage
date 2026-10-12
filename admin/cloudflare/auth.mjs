import { cookie, readCookie, random, sha256, json, fail } from './common.mjs';
import { githubClient } from './github.mjs';
export const SESSION_COOKIE = '__Host-dowon_session';
const STATE_COOKIE = '__Host-dowon_oauth';
export function validateConfig(env) {
  if (!env.ADMIN_ORIGIN || new URL(env.ADMIN_ORIGIN).origin !== env.ADMIN_ORIGIN || !env.ADMIN_ORIGIN.startsWith('https://') || !env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !/^\d+$/.test(env.ALLOWED_GITHUB_ID || '') || !/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY || '') || !env.DB) fail(503, '온라인 관리자 연결 설정이 아직 완료되지 않았어요.');
}
export async function authRoute(request, env, state, outbound = fetch) {
  const url = new URL(request.url), callback = env.ADMIN_ORIGIN + '/auth/callback';
  if (url.pathname === '/auth/github' && request.method === 'GET') {
    const nonce = random(), verifier = random(), binding = random();
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
    await state.put('oauth:' + nonce, { verifier, binding: await sha256(binding) }, 600);
    const redirect = new URL('https://github.com/login/oauth/authorize');
    redirect.search = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: callback, state: nonce, code_challenge: challenge, code_challenge_method: 'S256', allow_signup: 'false' });
    return new Response(null, { status: 302, headers: { Location: redirect.href, 'Set-Cookie': cookie(STATE_COOKIE, binding, 600, 'Lax') } });
  }
  if (url.pathname === '/auth/callback' && request.method === 'GET') {
    const nonce = url.searchParams.get('state'), code = url.searchParams.get('code'), binding = readCookie(request, STATE_COOKIE);
    if (!/^[a-f0-9]{64}$/.test(nonce || '') || !code || !binding) fail(403, '로그인 요청이 만료됐어요. 처음부터 다시 로그인해주세요.');
    const pending = await state.take('oauth:' + nonce);
    if (!pending || pending.binding !== await sha256(binding)) fail(403, '로그인 요청을 확인하지 못했어요. 다시 로그인해주세요.');
    const response = await outbound('https://github.com/login/oauth/access_token', {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, redirect_uri: callback, code, code_verifier: pending.verifier }), signal: AbortSignal.timeout(20000),
    });
    const access = await response.json();
    if (!response.ok || !access.access_token) fail(401, 'GitHub 로그인을 완료하지 못했어요. 다시 시도해주세요.');
    const api = githubClient(access.access_token, outbound);
    const user = await api('/user');
    if (String(user.id) !== env.ALLOWED_GITHUB_ID) fail(403, '이 계정은 관리자 접근 권한이 없어요.');
    const repo = await api(`/repos/${env.GITHUB_REPOSITORY}`);
    if (!repo.permissions?.push) fail(403, 'GitHub 앱을 이 저장소에 설치하고 Contents 읽기·쓰기 권한을 허용해주세요.');
    const session = random();
    const seconds = Math.min(8 * 3600, Number(access.expires_in) || 8 * 3600);
    const previous = readCookie(request, SESSION_COOKIE);
    if (previous) await state.remove('session:' + await sha256(previous));
    await state.put('session:' + await sha256(session), { token: access.access_token, id: String(user.id), login: user.login }, seconds);
    const headers = new Headers({ Location: '/' });
    headers.append('Set-Cookie', cookie(SESSION_COOKIE, session, seconds));
    headers.append('Set-Cookie', cookie(STATE_COOKIE, '', 0, 'Lax'));
    return new Response(null, { status: 302, headers });
  }
  if (url.pathname === '/auth/logout' && request.method === 'POST') {
    const token = readCookie(request, SESSION_COOKIE);
    if (token) await state.remove('session:' + await sha256(token));
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(SESSION_COOKIE, '', 0) });
  }
  return null;
}
export async function getSession(request, env, state) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!/^[a-f0-9]{64}$/.test(token || '')) return null;
  const session = await state.get('session:' + await sha256(token));
  return session?.id === env.ALLOWED_GITHUB_ID ? session : null;
}
