import { Buffer } from 'node:buffer';
import { fail, json, readJSON, sha256 } from './common.mjs';
import { snapshotServices } from './content.mjs';

export async function muxRequest(request, repo, env, state, outbound = fetch) {
  const url = new URL(request.url), route = url.pathname.slice('/api/mux/'.length);
  const body = request.method === 'GET' ? {} : await readJSON(request);
  const call = async (path, method = 'GET', data) => {
    if (!env.MUX_TOKEN_ID || !env.MUX_TOKEN_SECRET) fail(400, 'Cloudflare에 MUX_TOKEN_ID와 MUX_TOKEN_SECRET 비밀 설정을 등록해주세요.');
    const response = await outbound('https://api.mux.com/video/v1/' + path, {
      method, headers: { Authorization: 'Basic ' + Buffer.from(env.MUX_TOKEN_ID + ':' + env.MUX_TOKEN_SECRET).toString('base64'), 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}), signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      let detail = '';
      try {
        const payload = await response.json();
        const error = payload?.error || payload;
        detail = [error?.type, error?.code, error?.message || error?.error].filter(Boolean).join(': ');
      } catch {
        try { detail = (await response.text()).trim(); } catch {}
      }
      fail(502, `Mux 요청 실패 (${response.status})${detail ? `: ${detail}` : ': 연결 권한과 사용량을 확인해주세요.'}`);
    }
    return (await response.json()).data;
  };
  if (route === 'settings') {
    if (request.method !== 'GET') fail(400, '온라인 Mux 키는 Cloudflare 비밀 설정에서 등록해주세요.');
    return json({ configured: Boolean(env.MUX_TOKEN_ID && env.MUX_TOKEN_SECRET) });
  }
  if (route === 'uploads' && request.method === 'GET') return json(await state.list('mux:'));
  const snapshot = await repo.snapshot(), services = snapshotServices(snapshot);
  const targets = [...services.listWorkSlugs().map(slug => ({ key: 'works:' + slug, item: services.loadWork(slug) })), ...services.loadJson('content/lab.json').items.map((item, index) => ({ key: 'lab:' + index, item }))];
  if (route === 'targets' && request.method === 'GET') return json(await Promise.all(targets.map(async ({ key, item }) => ({ key, version: await sha256(JSON.stringify(item)), title: item.title || item.caption || key, video: item.video || '', vimeo: item.vimeo_url || '', mux: item.mux || null }))), 200, { 'X-Admin-Revision': snapshot.sha });
  if (route === 'uploads' && request.method === 'POST') {
    if (!targets.some(t => t.key === body.target)) fail(400, '프로젝트를 찾지 못했어요.');
    const title = String(body.title || 'Video').slice(0, 512);
    const upload = await call('uploads', 'POST', { cors_origin: env.ADMIN_ORIGIN, timeout: 86400, new_asset_settings: { playback_policies: ['public'], video_quality: 'basic', max_resolution_tier: '2160p', meta: { title } } });
    await state.put('mux:' + upload.id, { id: upload.id, target: body.target, title, created: new Date().toISOString() }, 90 * 86400);
    return json({ id: upload.id, url: upload.url });
  }
  if (route === 'local-download' && request.method === 'GET') {
    const item = targets.find(t => t.key === url.searchParams.get('target'))?.item;
    const src = url.searchParams.get('field') === 'thumbnail' ? item?.thumbnail : url.searchParams.get('src') || item?.video;
    if (!src || ![item?.video, item?.image, item?.thumbnail, ...(item?.gallery || [])].includes(src)) fail(400, '이 프로젝트의 파일이 아니에요.');
    const response = await repo.asset(src.replace(/^\/3dowonWebpage\//, '').replace(/^\//, ''));
    return new Response(response.body, { headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment' } });
  }
  const match = route.match(/^uploads\/([a-zA-Z0-9_-]+)(?:\/(attach|download))?$/);
  let asset, upload;
  if (match) {
    if (!await state.get('mux:' + match[1])) fail(404, '업로드 기록을 찾지 못했어요.');
    upload = await call('uploads/' + match[1]);
    if (upload.asset_id) asset = await call('assets/' + upload.asset_id);
    if (!match[2] && request.method === 'GET') return json({ status: asset?.status || upload.status, asset_id: asset?.id, playback_id: asset?.playback_ids?.find(p => p.policy === 'public')?.id, aspect_ratio: asset?.aspect_ratio });
    if (match[2] === 'attach' && request.method === 'POST') {
      if (request.headers.get('If-Match') !== snapshot.sha) fail(409, '내용이 변경됐어요. 새로고침 후 영상을 연결해주세요.');
      const target = targets.find(t => t.key === body.target), playback = asset?.playback_ids?.find(p => p.policy === 'public');
      if (asset?.status !== 'ready' || !playback) fail(400, '영상 변환이 완료된 뒤 연결해주세요.');
      if (!target || await sha256(JSON.stringify(target.item)) !== body.version) fail(409, '프로젝트가 변경됐어요. 새로고침 후 다시 연결해주세요.');
      target.item.mux = { upload_id: match[1], asset_id: asset.id, playback_id: playback.id, aspect_ratio: asset.aspect_ratio || '16:9' };
      if (target.key.startsWith('works:')) services.saveJson('content/works/' + target.key.slice(6) + '.json', target.item);
      else { const lab = services.loadJson('content/lab.json'); lab.items[Number(target.key.slice(4))] = target.item; services.saveJson('content/lab.json', lab); }
      const revision = await repo.save(snapshot.sha, services.changes, 'Connect Mux video from online admin');
      return json({ ok: true }, 200, { 'X-Admin-Revision': revision });
    }
  }
  if (route === 'project-download' && request.method === 'POST') {
    const id = targets.find(t => t.key === body.target)?.item?.mux?.asset_id;
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) fail(400, '연결된 Mux 영상이 없어요.');
    asset = await call('assets/' + id);
  }
  if (request.method === 'POST' && (route === 'project-download' || match?.[2] === 'download')) {
    if (asset?.status !== 'ready') fail(400, '영상 변환이 완료되지 않았어요.');
    if (!['ready', 'preparing'].includes(asset.master?.status)) { await call(`assets/${asset.id}/master-access`, 'PUT', { master_access: 'temporary' }); asset = await call('assets/' + asset.id); }
    const link = asset.master?.status === 'ready' ? new URL(asset.master.url) : null;
    if (link) link.searchParams.set('download', 'video.mp4');
    return json({ status: asset.master?.status || 'preparing', url: link?.href || null });
  }
  fail(404, '영상 기능을 찾지 못했어요.');
}
