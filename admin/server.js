import { installContentRoutes } from './content-routes.mjs';
import { installMuxRoutes } from './mux.mjs';
import { authConfig, installAuth } from './auth.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { saveLabVideo } from './lab-video.mjs';
import { translationStatus, saveTranslationKey, autoTranslateLab, autoTranslateWorks } from './translation.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.ADMIN_REPO_DIR || path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const WORKS_DIR = path.join(CONTENT_DIR, 'works');
const UPLOADS_DIR = path.join(ROOT, 'assets', 'uploads');
const PUBLIC_UPLOADS_PREFIX = '/3dowonWebpage/assets/uploads'; // must match admin/config.yml's public_folder
const PORT = process.env.PORT || 4848;
const AUTH = authConfig();
const HOST = AUTH.online ? '0.0.0.0' : '127.0.0.1';
const TECH_OPTIONS_FILE = path.join(ROOT, 'admin', 'tech-options.json');
const DEFAULT_TECH_OPTIONS = ['Unreal', 'Unity', 'Arduino', '3ds Max', 'Depth Camera'];
const TECH_TRANSLATIONS = { '영상 스케줄링': 'video scheduling', '센서': 'sensors', '프로젝션': 'projection', '실시간 그래픽': 'real-time graphics', '시리얼 통신': 'serial communication' };

const app = express();
installAuth(app, AUTH);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/site/assets', express.static(path.join(ROOT, 'assets')));

function loadJson(relPath) {
  const full = path.join(ROOT, relPath);
  const raw = fs.readFileSync(full, 'utf8');
  if (/^<<<<<<< /m.test(raw)) {
    throw new Error(`${relPath}에 git 병합 충돌 표시(<<<<<<<)가 남아 있어요. 파일을 먼저 정리해주세요.`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`${relPath} JSON을 읽을 수 없어요: ${err.message}`);
  }
}
function saveJson(relPath, data) {
  fs.writeFileSync(path.join(ROOT, relPath), JSON.stringify(data, null, 2) + '\n');
}
function build() {
  try {
    execFileSync('node', ['scripts/build.mjs'], { cwd: ROOT, stdio: 'inherit' });
  } catch {
    throw new Error('사이트 빌드에 실패했어요. content/*.json에 문법 오류가 있는지 확인해주세요.');
  }
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

function resizeAndCompress(buffer) {
  return sharp(buffer)
    .rotate() // apply EXIF orientation before stripping metadata
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}

// Some iPhone Portrait-mode HEIC files embed enough auxiliary images (depth
// maps, thumbnails) to trip libheif's built-in security limit on item
// references, which sharp has no option to raise. macOS's own `sips` tool
// decodes them fine (different decoder, no such limit), so fall back to it
// — converting to a plain JPEG first — before giving up.
async function convertViaSips(buffer) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-heic-'));
  try {
    const inPath = path.join(tmpDir, 'input');
    const outPath = path.join(tmpDir, 'output.jpg');
    fs.writeFileSync(inPath, buffer);
    execFileSync('sips', ['-s', 'format', 'jpeg', inPath, '--out', outPath], { timeout: 30000 });
    return fs.readFileSync(outPath);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function saveImage(buffer, slugPrefix = '') {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (/^GIF8[79]a$/.test(buffer.subarray(0,6).toString())) {
    await sharp(buffer, {animated:true}).metadata();
    const filename=`${slugPrefix || 'image'}-${randomUUID()}.gif`;
    fs.writeFileSync(path.join(UPLOADS_DIR,filename),buffer);
    return filename;
  }
  let filename;
  do {
    filename = `${slugPrefix ? `${slugPrefix}-` : ''}${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
  } while (fs.existsSync(path.join(UPLOADS_DIR, filename)));

  let jpeg;
  try {
    jpeg = await resizeAndCompress(buffer);
  } catch (err) {
    if (process.platform !== 'darwin') throw err;
    try {
      jpeg = await resizeAndCompress(await convertViaSips(buffer));
    } catch {
      throw err; // fallback didn't help either — surface the original sharp error
    }
  }

  fs.writeFileSync(path.join(UPLOADS_DIR, filename), jpeg);
  return filename;
}

function publicUploadPath(filename) {
  return `${PUBLIC_UPLOADS_PREFIX}/${filename}`;
}

// Wraps async route handlers so a rejected promise (e.g. sharp failing on a
// malformed image) becomes a normal error response instead of an unhandled
// rejection that crashes the whole server (Node terminates the process on
// those by default) — one bad upload shouldn't take the admin tool down.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error(err);
      const isImageError = /heif|jpeg|png|webp|corrupt|Input buffer|unsupported image format/i.test(err.message || '');
      const message = isImageError
        ? '이미지 파일을 처리할 수 없어요 (손상되었거나 지원하지 않는 형식/구조일 수 있어요 — 아이폰 인물사진 모드 HEIC에서 종종 발생해요). 사진 앱에서 JPG로 내보낸 뒤 다시 올려보시거나 다른 사진으로 시도해주세요.'
        : err.message || '요청 처리 중 오류가 발생했어요.';
      res.status(400).json({ error: message });
    });
  };
}

// The same uploaded file can legitimately be reused across multiple fields/works
// (e.g. thumbnail and hero_image pointing at the same photo), so before deleting
// an old file on replace/remove we confirm nothing else on disk still points to it.
function isImagePathReferenced(publicPath) {
  for (const slug of listWorkSlugs()) {
    const w = loadWork(slug);
    if ([w.cover_image, w.hover_image, w.thumbnail, w.preview_bg, w.hero_image, ...(w.gallery || []),...(w.process_media || []),...(w.process || []).flatMap(entry=>entry.images||[])].includes(publicPath)) return true;
  }
  if (loadJson('content/about.json').image === publicPath) return true;
  if (loadJson('content/portfolio.json').images.includes(publicPath)) return true;
  if (loadJson('content/lab.json').items.some((item) => item.image === publicPath || item.video === publicPath)) return true;
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

const galleryUpload = multer({storage:multer.memoryStorage(),limits:{fileSize:150*1024*1024,files:20}}).array('images',20);
const receiveGallery = (req,res,next) => galleryUpload(req,res,error=>error?res.status(400).json({error:'한 번에 20개, 파일당 150MB까지 올릴 수 있어요.'}):next());

const pdfUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024, files: 6 } }).array('pdfs', 6);
const receivePdfs = (req, res, next) => pdfUpload(req, res, error => error ? res.status(400).json({ error: 'PDF는 한 번에 6개까지, 파일당 50MB까지 올릴 수 있어요.' }) : next());

const labUpload = multer({storage:multer.memoryStorage(),limits:{fileSize:150*1024*1024}}).single('image');
const receiveLabFile = (req,res,next) => labUpload(req,res,error => error ? res.status(400).json({error:'파일은 150MB 이하로 올려주세요.'}) : next());

installContentRoutes(app, { fs, ROOT, WORKS_DIR, UPLOADS_DIR, TECH_OPTIONS_FILE, DEFAULT_TECH_OPTIONS, loadJson, saveJson, listWorkSlugs, loadWork, build, upload, receiveGallery, receivePdfs, receiveLabFile, asyncHandler, saveImage, saveLabVideo, publicUploadPath, removeUploadedFile, translationStatus, saveTranslationKey, autoTranslateLab, autoTranslateWorks });

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
    if (AUTH.online) {
      git(['fetch', 'origin', branch]);
      try { git(['merge-base', '--is-ancestor', `origin/${branch}`, 'HEAD']); }
      catch { return res.status(409).json({ error: 'GitHub에 새로운 변경이 있어요. 서버의 초안을 보존한 상태에서 최신 내용과 병합한 뒤 다시 배포해주세요.' }); }
    }
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
    res.status(500).json({ error: AUTH.online ? '배포하지 못했어요. 저장된 내용은 유지됩니다. 서버의 GitHub 연결 권한과 변경 충돌을 확인해주세요.' : detail });
  }
});

// Defense in depth: a rejected promise anywhere we forgot to catch should log
// and keep running, not take down the whole admin server on one bad request.
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection (server stayed up):', err);
});

installMuxRoutes(app, {loadJson,saveJson,listWorkSlugs,loadWork,build,root:ROOT,origin:AUTH.origin});

app.listen(PORT, HOST, () => {
  console.log(`Admin running at ${AUTH.online ? AUTH.origin : `http://localhost:${PORT}`} (${AUTH.online ? 'login required' : 'local only'})`);
});
