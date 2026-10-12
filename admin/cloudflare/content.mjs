import { Buffer } from 'node:buffer';
import { installContentRoutes } from '../content-routes.mjs';
import * as translation from '../translation-core.mjs';
import { editablePath } from './github.mjs';
import { fail, json, readJSON } from './common.mjs';

export class Router {
  constructor() { this.routes = []; }
  add(method, route, handlers) { this.routes.push({ method, parts: route.split('/'), handlers }); }
  get(route, ...handlers) { this.add('GET', route, handlers); }
  post(route, ...handlers) { this.add('POST', route, handlers); }
  put(route, ...handlers) { this.add('PUT', route, handlers); }
  delete(route, ...handlers) { this.add('DELETE', route, handlers); }
  async dispatch(request, body, uploads = []) {
    const parts = new URL(request.url).pathname.split('/');
    const route = this.routes.find(r => r.method === request.method && r.parts.length === parts.length && r.parts.every((part, i) => part.startsWith(':') || part === parts[i]));
    if (!route) fail(404, '관리자 기능을 찾지 못했어요.');
    const params = {};
    route.parts.forEach((part, i) => { if (part.startsWith(':')) { const value = decodeURIComponent(parts[i]); if (!/^[a-zA-Z0-9-]+$/.test(value)) fail(400, '잘못된 항목 주소입니다.'); params[part.slice(1)] = value; } });
    if (params.index !== undefined && !/^\d+$/.test(params.index)) fail(400, '잘못된 항목 번호입니다.');
    const req = { params, body, uploads };
    const res = { code: 200, value: null, status(code) { this.code = code; return this; }, json(value) { this.value = value; return this; }, end() { return this; } };
    async function run(index) { const fn = route.handlers[index]; if (fn) await fn(req, res, () => run(index + 1)); }
    await run(0);
    return res;
  }
}

export function snapshotServices(snapshot, outbound = fetch, env = {}) {
  const files = new Map(snapshot.files), changes = new Map();
  const key = value => String(value).replaceAll('\\', '/').replace(/^\/repo\//, '');
  const write = (filename, value) => { const relative = key(filename); if (!editablePath(relative)) fail(400, '수정할 수 없는 파일입니다.'); files.set(relative, value); changes.set(relative, value); };
  const fs = {
    existsSync: filename => files.has(key(filename)),
    readFileSync: filename => { if (!files.has(key(filename))) fail(404, '항목을 찾지 못했어요.'); return files.get(key(filename)); },
    writeFileSync: (filename, value) => write(filename, typeof value === 'string' ? value : { base64: Buffer.from(value).toString('base64') }),
    unlinkSync: filename => { write(filename, null); files.delete(key(filename)); },
    mkdirSync() {},
  };
  const loadJson = filename => JSON.parse(fs.readFileSync(filename));
  const saveJson = (filename, data) => write(filename, JSON.stringify(data, null, 2) + '\n');
  const listWorkSlugs = () => [...files.keys()].filter(p => /^content\/works\/[^/]+\.json$/.test(p)).map(p => p.slice(14, -5));
  const upload = {
    single: field => (req, res, next) => { const found = req.uploads.filter(f => f.fieldname === field); if (found.length !== 1) fail(400, '파일 한 개를 선택해주세요.'); req.file = found[0]; return next(); },
    array: (field, max) => (req, res, next) => { req.files = req.uploads.filter(f => f.fieldname === field); if (!req.files.length || req.files.length > max) fail(400, `파일은 한 번에 ${max}개까지 선택해주세요.`); return next(); },
  };
  const storeFile = (buffer, extension, folder = 'uploads') => { const name = `${crypto.randomUUID()}.${extension}`; fs.writeFileSync(`assets/${folder}/${name}`, buffer); return name; };
  return {
    changes, files, fs, ROOT: '/repo', WORKS_DIR: '/repo/content/works', UPLOADS_DIR: '/repo/assets/uploads', TECH_OPTIONS_FILE: '/repo/admin/tech-options.json', DEFAULT_TECH_OPTIONS: ['Unreal', 'Unity', 'Arduino', '3ds Max', 'Depth Camera'],
    loadJson, saveJson, listWorkSlugs, loadWork: slug => loadJson(`content/works/${slug}.json`), build() {}, upload,
    receiveGallery: upload.array('images', 20), receivePdfs: upload.array('pdfs', 6), receiveLabFile: upload.single('image'), asyncHandler: fn => fn,
    async saveImage(buffer) {
      let extension;
      if (buffer[0] === 0xff && buffer[1] === 0xd8) extension = 'jpg';
      else if (buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) extension = 'png';
      else if (/^GIF8[79]a$/.test(buffer.subarray(0, 6).toString())) extension = 'gif';
      else if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') extension = 'webp';
      else fail(400, '온라인에서는 JPG·PNG·WebP·GIF를 올려주세요. HEIC는 JPG로 내보내거나 로컬 관리자를 이용해주세요.');
      return storeFile(buffer, extension);
    },
    async saveLabVideo(buffer) {
      if (buffer.subarray(4, 8).toString() === 'ftyp') return storeFile(buffer, 'mp4');
      if (buffer.subarray(0, 4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]))) return storeFile(buffer, 'webm');
      fail(400, '온라인 파일 영상은 MP4·WebM을 사용해주세요. 큰 영상은 Mux로 업로드해주세요.');
    },
    publicUploadPath: name => '/3dowonWebpage/assets/uploads/' + name,
    // Keep historical media for local/online references; do not delete shared binaries.
    removeUploadedFile() {},
    translationStatus: () => ({ configured: Boolean(env.DEEPL_API_KEY) }),
    saveTranslationKey: () => fail(400, '온라인 DeepL 키는 Cloudflare의 DEEPL_API_KEY 비밀 설정에서 등록해주세요.'),
    autoTranslateLab: (item, previous) => translation.autoTranslateLab(item, previous, text => translation.translateDescription(text, env.DEEPL_API_KEY, outbound)),
    autoTranslateWorks: (item, previous) => translation.autoTranslateWorks(item, previous, texts => translation.translateWorksTexts(texts, env.DEEPL_API_KEY, outbound)),
  };
}

export async function parseBody(request) {
  if (['GET', 'HEAD'].includes(request.method)) return { body: {}, uploads: [] };
  if (!(request.headers.get('Content-Type') || '').startsWith('multipart/form-data')) return { body: await readJSON(request), uploads: [] };
  const max = 8 * 1024 * 1024;
  const reader = request.body.getReader(); const chunks = []; let size = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > max) { await reader.cancel(); fail(413, '온라인 파일 업로드는 한 번에 총 8MB까지 가능해요. 나누어 올리거나, 큰 영상은 Mux·로컬 관리자를 이용해주세요.'); } chunks.push(value); }
  const data = await new Response(new Blob(chunks), { headers: { 'Content-Type': request.headers.get('Content-Type') } }).formData();
  const body = {}, uploads = [];
  for (const [fieldname, value] of data) {
    if (typeof value === 'string') body[fieldname] = value;
    else uploads.push({ fieldname, mimetype: value.type, originalname: Buffer.from(value.name).toString('latin1'), buffer: Buffer.from(await value.arrayBuffer()) });
  }
  return { body, uploads };
}

export async function contentRequest(request, repo, env, outbound = fetch) {
  const { body, uploads } = await parseBody(request);
  const snapshot = await repo.snapshot();
  if (request.method !== 'GET' && request.headers.get('If-Match') !== snapshot.sha) fail(409, '다른 화면이나 로컬에서 내용이 변경됐어요. 입력 내용을 복사해둔 뒤 새로고침해주세요.');
  const services = snapshotServices(snapshot, outbound, env);
  const router = new Router(); installContentRoutes(router, services);
  const result = await router.dispatch(request, body, uploads);
  let revision = snapshot.sha;
  if (result.code < 400 && services.changes.size) revision = await repo.save(snapshot.sha, services.changes);
  return json(result.value, result.code, { 'X-Admin-Revision': revision });
}
