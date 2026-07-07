// Local-only content admin for the site. Do not expose this beyond localhost —
// it writes directly to the filesystem with no authentication.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const WORKS_DIR = path.join(CONTENT_DIR, 'works');
const UPLOADS_DIR = path.join(ROOT, 'assets', 'uploads');
const PUBLIC_UPLOADS_PREFIX = '/3dowonWebpage/assets/uploads'; // must match admin/config.yml's public_folder
const PORT = process.env.PORT || 4848;
const HOST = '127.0.0.1'; // localhost only — this server has no auth

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/site/assets', express.static(path.join(ROOT, 'assets')));

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}
function saveJson(relPath, data) {
  fs.writeFileSync(path.join(ROOT, relPath), JSON.stringify(data, null, 2) + '\n');
}
function build() {
  execFileSync('node', ['scripts/build.mjs'], { cwd: ROOT, stdio: 'inherit' });
}
function isValidSlug(slug) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

// 유형/태그는 사이트 필터에서 하나로 합쳐져 보이므로 admin에서도 다중선택 하나로 다룬다.
// 선택된 값 전체가 tags(필터용)로 들어가고, type/grid_type_label/index_type_label/meta_type은
// 그 선택값들로부터 자동으로 채워진다.
function applySelectedTypes(work, selected) {
  const types = Array.isArray(selected) ? selected.filter(Boolean) : [];
  work.type = types[0] || '';
  work.tags = types;
  work.grid_type_label = types.join(', ');
  work.index_type_label = types.join(', ');
  work.meta_type = types.join(', ');
  work.meta_medium = types.join(', ');
}
function listWorkSlugs() {
  fs.mkdirSync(WORKS_DIR, { recursive: true });
  return fs.readdirSync(WORKS_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
}
function loadWork(slug) {
  return loadJson(`content/works/${slug}.json`);
}

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// The description field is stored as HTML for scripts/build.mjs to drop in as-is,
// but the admin only exposes a plain-text box (each Enter = a new paragraph).
function plainTextToDescriptionHtml(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('\n            ');
}
function descriptionHtmlToPlainText(html) {
  return String(html || '')
    .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

// Images are held in memory, then re-encoded to JPEG (resized, compressed) before
// hitting disk — normalizes PNG/HEIC/WebP uploads and keeps file sizes reasonable.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    cb(null, /^image\//.test(file.mimetype));
  },
});

const MAX_DIMENSION = 2400;
const JPEG_QUALITY = 82;

async function saveImage(buffer, slugPrefix = '') {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const filename = `${slugPrefix ? `${slugPrefix}-` : ''}${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
  const jpeg = await sharp(buffer)
    .rotate() // apply EXIF orientation before stripping metadata
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), jpeg);
  return filename;
}

function publicUploadPath(filename) {
  return `${PUBLIC_UPLOADS_PREFIX}/${filename}`;
}

// The same uploaded file can legitimately be reused across multiple fields/works
// (e.g. thumbnail and hero_image pointing at the same photo), so before deleting
// an old file on replace/remove we confirm nothing else on disk still points to it.
function isImagePathReferenced(publicPath) {
  for (const slug of listWorkSlugs()) {
    const w = loadWork(slug);
    if ([w.thumbnail, w.preview_bg, w.hero_image, ...(w.gallery || [])].includes(publicPath)) return true;
  }
  if (loadJson('content/about.json').image === publicPath) return true;
  if (loadJson('content/lab.json').items.some((item) => item.image === publicPath)) return true;
  return false;
}

// Call this only AFTER the content JSON no longer references publicPath (i.e. after
// saveJson), otherwise the reference check will always find it and refuse to delete.
function removeUploadedFile(publicPath) {
  if (!publicPath || !publicPath.startsWith(PUBLIC_UPLOADS_PREFIX)) return;
  if (isImagePathReferenced(publicPath)) return;
  const filename = publicPath.slice(PUBLIC_UPLOADS_PREFIX.length + 1);
  fs.rmSync(path.join(UPLOADS_DIR, filename), { force: true });
}

// ── Works ──

app.get('/api/works', (req, res) => {
  const works = listWorkSlugs().map(loadWork);
  works.sort((a, b) => b.year - a.year || String(a.title).localeCompare(String(b.title), 'ko'));
  res.json(works.map((w) => ({ ...w, description: descriptionHtmlToPlainText(w.description) })));
});

app.post('/api/works', (req, res) => {
  const { slug, title, year, types } = req.body;
  if (!isValidSlug(slug)) return res.status(400).json({ error: '슬러그는 영문 소문자/숫자/하이픈만 가능해요.' });
  if (listWorkSlugs().includes(slug)) return res.status(400).json({ error: '이미 존재하는 슬러그예요.' });

  const resolvedYear = Number(year) || new Date().getFullYear();
  const work = {
    slug,
    title: title || '',
    year: resolvedYear,
    type: '',
    tags: [],
    tech: [],
    production: '개인',
    thumbnail: '',
    grid_type_label: '',
    index_type_label: '',
    preview_bg: '',
    hero_image: '',
    meta_year: String(resolvedYear),
    meta_type: '',
    meta_medium: '',
    meta_tech: '',
    meta_production: '개인',
    description: '',
    vimeo_url: '',
    gallery: [],
  };
  applySelectedTypes(work, types && types.length ? types : ['설치']);
  saveJson(`content/works/${slug}.json`, work);
  build();
  res.json(work);
});

app.put('/api/works/:slug', (req, res) => {
  if (!listWorkSlugs().includes(req.params.slug)) return res.status(404).json({ error: 'not found' });
  const work = loadWork(req.params.slug);
  const editable = ['title', 'year', 'tech', 'production', 'meta_tech', 'vimeo_url'];
  for (const key of editable) {
    if (req.body[key] !== undefined) work[key] = req.body[key];
  }
  if (req.body.description !== undefined) work.description = plainTextToDescriptionHtml(req.body.description);
  if (work.year !== undefined) work.year = Number(work.year) || work.year;
  if (req.body.types !== undefined) applySelectedTypes(work, req.body.types);
  // 상세 페이지의 연도/매체/제작은 항상 목록 연도·유형·제작과 같게 유지한다.
  work.meta_year = String(work.year);
  work.meta_production = work.production;
  saveJson(`content/works/${req.params.slug}.json`, work);
  build();
  res.json(work);
});

app.delete('/api/works/:slug', (req, res) => {
  const file = path.join(WORKS_DIR, `${req.params.slug}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'not found' });
  const work = loadWork(req.params.slug);
  fs.unlinkSync(file); // remove the JSON first so the reference check below doesn't see its own entries
  [work.thumbnail, work.preview_bg, work.hero_image, ...(work.gallery || [])].forEach(removeUploadedFile);
  build();
  res.json({ ok: true });
});

// 썸네일 / 인덱스 미리보기 / 상세 히어로 이미지는 항상 같은 사진을 쓴다.
app.post('/api/works/:slug/thumbnail', upload.single('image'), async (req, res) => {
  const work = loadWork(req.params.slug);
  if (!req.file) return res.status(400).json({ error: '이미지 파일이 필요해요.' });
  const oldPaths = [work.thumbnail, work.preview_bg, work.hero_image];
  const filename = await saveImage(req.file.buffer, req.params.slug);
  const newPath = publicUploadPath(filename);
  work.thumbnail = newPath;
  work.preview_bg = newPath;
  work.hero_image = newPath;
  saveJson(`content/works/${req.params.slug}.json`, work);
  oldPaths.forEach(removeUploadedFile);
  build();
  res.json(work);
});

app.post('/api/works/:slug/gallery', upload.array('images', 20), async (req, res) => {
  const work = loadWork(req.params.slug);
  for (const file of req.files || []) {
    const filename = await saveImage(file.buffer, req.params.slug);
    work.gallery.push(publicUploadPath(filename));
  }
  saveJson(`content/works/${req.params.slug}.json`, work);
  build();
  res.json(work);
});

app.delete('/api/works/:slug/gallery/:index', (req, res) => {
  const work = loadWork(req.params.slug);
  const [removed] = work.gallery.splice(Number(req.params.index), 1);
  saveJson(`content/works/${req.params.slug}.json`, work);
  removeUploadedFile(removed);
  build();
  res.json(work);
});

// ── Site content (about / cv / lab / site) ──

app.get('/api/site', (req, res) => {
  res.json({
    about: loadJson('content/about.json'),
    cv: loadJson('content/cv.json'),
    lab: loadJson('content/lab.json'),
    site: loadJson('content/site.json'),
  });
});

app.put('/api/about', (req, res) => {
  const about = loadJson('content/about.json');
  Object.assign(about, req.body);
  saveJson('content/about.json', about);
  build();
  res.json(about);
});

app.post('/api/about/image', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '이미지 파일이 필요해요.' });
  const about = loadJson('content/about.json');
  const oldImage = about.image;
  const filename = await saveImage(req.file.buffer);
  about.image = publicUploadPath(filename);
  saveJson('content/about.json', about);
  removeUploadedFile(oldImage);
  build();
  res.json(about);
});

app.put('/api/cv', (req, res) => {
  saveJson('content/cv.json', { sections: req.body.sections || [] });
  build();
  res.json(loadJson('content/cv.json'));
});

app.put('/api/lab', (req, res) => {
  const lab = loadJson('content/lab.json');
  lab.items = req.body.items || lab.items;
  saveJson('content/lab.json', lab);
  build();
  res.json(lab);
});

app.post('/api/lab/items', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '이미지 파일이 필요해요.' });
  const lab = loadJson('content/lab.json');
  const filename = await saveImage(req.file.buffer);
  lab.items.push({ image: publicUploadPath(filename), caption: req.body.caption || '' });
  saveJson('content/lab.json', lab);
  build();
  res.json(lab);
});

app.delete('/api/lab/items/:index', (req, res) => {
  const lab = loadJson('content/lab.json');
  const [removed] = lab.items.splice(Number(req.params.index), 1);
  saveJson('content/lab.json', lab);
  if (removed) removeUploadedFile(removed.image);
  build();
  res.json(lab);
});

app.put('/api/site', (req, res) => {
  const site = loadJson('content/site.json');
  Object.assign(site, req.body);
  saveJson('content/site.json', site);
  build();
  res.json(site);
});

// ── Deploy (git add + commit + push) ──

function git(args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    timeout: 20000, // fail fast instead of hanging the request if something goes wrong
    // Without this, `git push` over HTTPS with no cached credentials silently waits
    // for a username/password prompt that has nowhere to render (no TTY) and hangs
    // forever — this makes it fail immediately with a clear error instead.
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  }).toString().trim();
}

app.post('/api/deploy', (req, res) => {
  try {
    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
    const status = git(['status', '--porcelain']);
    if (status) {
      git(['add', '-A']);
      const message = (req.body.message || '').trim() || `Update content via admin (${new Date().toISOString()})`;
      git(['commit', '-m', message]);
    }

    // A previous deploy may have committed but failed to push — check for unpushed
    // commits too, not just working-tree changes, so retrying actually retries.
    let ahead = '0';
    try {
      ahead = git(['rev-list', '--count', `origin/${branch}..${branch}`]);
    } catch {
      ahead = '1'; // no upstream info (e.g. never pushed) — attempt the push anyway
    }

    if (!status && ahead === '0') {
      return res.json({ ok: true, deployed: false, message: '변경사항이 없어요.' });
    }

    git(['push', 'origin', branch]);
    res.json({ ok: true, deployed: true, branch, message: `"${branch}" 브랜치로 push 완료했어요. 잠시 후 사이트에 반영돼요.` });
  } catch (err) {
    const detail = err.stderr && err.stderr.length ? err.stderr.toString()
      : err.signal === 'SIGTERM' ? 'git 명령이 응답 없이 멈춰서 중단했어요 (인증 문제일 가능성이 높아요 — 터미널에서 git push가 정상 동작하는지 먼저 확인해주세요).'
      : err.message;
    res.status(500).json({ error: detail });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Admin running at http://localhost:${PORT} (local only)`);
});
