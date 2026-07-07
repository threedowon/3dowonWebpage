// Local-only content admin for the site. Do not expose this beyond localhost —
// it writes directly to the filesystem with no authentication.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import express from 'express';
import multer from 'multer';

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
function listWorkSlugs() {
  fs.mkdirSync(WORKS_DIR, { recursive: true });
  return fs.readdirSync(WORKS_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
}
function loadWork(slug) {
  return loadJson(`content/works/${slug}.json`);
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const prefix = req.params.slug ? `${req.params.slug}-` : '';
    cb(null, `${prefix}${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    cb(null, /^image\//.test(file.mimetype));
  },
});
function publicUploadPath(filename) {
  return `${PUBLIC_UPLOADS_PREFIX}/${filename}`;
}
function removeUploadedFile(publicPath) {
  if (!publicPath || !publicPath.startsWith(PUBLIC_UPLOADS_PREFIX)) return;
  const filename = publicPath.slice(PUBLIC_UPLOADS_PREFIX.length + 1);
  fs.rmSync(path.join(UPLOADS_DIR, filename), { force: true });
}

// ── Works ──

app.get('/api/works', (req, res) => {
  const works = listWorkSlugs().map(loadWork);
  works.sort((a, b) => b.year - a.year || String(a.title).localeCompare(String(b.title), 'ko'));
  res.json(works);
});

app.post('/api/works', (req, res) => {
  const { slug, title, year, type } = req.body;
  if (!isValidSlug(slug)) return res.status(400).json({ error: '슬러그는 영문 소문자/숫자/하이픈만 가능해요.' });
  if (listWorkSlugs().includes(slug)) return res.status(400).json({ error: '이미 존재하는 슬러그예요.' });

  const work = {
    slug,
    title: title || '',
    year: Number(year) || new Date().getFullYear(),
    type: type || '설치',
    tags: [],
    tech: [],
    production: '개인',
    thumbnail: '',
    grid_type_label: type || '',
    index_type_label: type || '',
    preview_bg: '',
    hero_image: '',
    meta_year: String(year || ''),
    meta_type: type || '',
    meta_medium: '',
    meta_tech: '',
    meta_production: '',
    description: '',
    vimeo_url: '',
    gallery: [],
  };
  saveJson(`content/works/${slug}.json`, work);
  build();
  res.json(work);
});

app.put('/api/works/:slug', (req, res) => {
  if (!listWorkSlugs().includes(req.params.slug)) return res.status(404).json({ error: 'not found' });
  const work = loadWork(req.params.slug);
  const editable = [
    'title', 'year', 'type', 'tags', 'tech', 'production', 'grid_type_label', 'index_type_label',
    'meta_year', 'meta_type', 'meta_medium', 'meta_tech', 'meta_production', 'description', 'vimeo_url',
  ];
  for (const key of editable) {
    if (req.body[key] !== undefined) work[key] = req.body[key];
  }
  if (work.year !== undefined) work.year = Number(work.year) || work.year;
  saveJson(`content/works/${req.params.slug}.json`, work);
  build();
  res.json(work);
});

app.delete('/api/works/:slug', (req, res) => {
  const file = path.join(WORKS_DIR, `${req.params.slug}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'not found' });
  const work = loadWork(req.params.slug);
  [work.thumbnail, work.preview_bg, work.hero_image, ...(work.gallery || [])].forEach(removeUploadedFile);
  fs.unlinkSync(file);
  build();
  res.json({ ok: true });
});

function singleImageRoute(field) {
  app.post(`/api/works/:slug/${field}`, upload.single('image'), (req, res) => {
    const work = loadWork(req.params.slug);
    if (!req.file) return res.status(400).json({ error: '이미지 파일이 필요해요.' });
    removeUploadedFile(work[field]);
    work[field] = publicUploadPath(req.file.filename);
    saveJson(`content/works/${req.params.slug}.json`, work);
    build();
    res.json(work);
  });
}
singleImageRoute('thumbnail');
singleImageRoute('preview_bg');
singleImageRoute('hero_image');

app.post('/api/works/:slug/gallery', upload.array('images', 20), (req, res) => {
  const work = loadWork(req.params.slug);
  for (const file of req.files || []) {
    work.gallery.push(publicUploadPath(file.filename));
  }
  saveJson(`content/works/${req.params.slug}.json`, work);
  build();
  res.json(work);
});

app.delete('/api/works/:slug/gallery/:index', (req, res) => {
  const work = loadWork(req.params.slug);
  const [removed] = work.gallery.splice(Number(req.params.index), 1);
  removeUploadedFile(removed);
  saveJson(`content/works/${req.params.slug}.json`, work);
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

app.post('/api/about/image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '이미지 파일이 필요해요.' });
  const about = loadJson('content/about.json');
  removeUploadedFile(about.image);
  about.image = publicUploadPath(req.file.filename);
  saveJson('content/about.json', about);
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

app.post('/api/lab/items', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '이미지 파일이 필요해요.' });
  const lab = loadJson('content/lab.json');
  lab.items.push({ image: publicUploadPath(req.file.filename), caption: req.body.caption || '' });
  saveJson('content/lab.json', lab);
  build();
  res.json(lab);
});

app.delete('/api/lab/items/:index', (req, res) => {
  const lab = loadJson('content/lab.json');
  const [removed] = lab.items.splice(Number(req.params.index), 1);
  if (removed) removeUploadedFile(removed.image);
  saveJson('content/lab.json', lab);
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

app.listen(PORT, HOST, () => {
  console.log(`Admin running at http://localhost:${PORT} (local only)`);
});
