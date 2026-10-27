import path from 'node:path';
import { validateResponsibilities } from './responsibilities.mjs';
import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { englishTechnology } from './technology.mjs';
import { uniqueWorkSlug } from './work-slug.mjs';
import { parseWorkDate, compareWorkDates } from '../scripts/lib/work-date.mjs';
import { workImageCandidates, workHoverCandidates } from './public/work-images.mjs';
import { validateRelatedProjects } from './public/related-works.mjs';
import { selectFeaturedWorks, validateFeaturedProjects } from './public/featured-projects.mjs';

// Shared editing behavior. Storage, uploads and publication are environment adapters.
export function installContentRoutes(app, services) {
const { fs, ROOT, WORKS_DIR, UPLOADS_DIR, TECH_OPTIONS_FILE, DEFAULT_TECH_OPTIONS, loadJson, saveJson, listWorkSlugs, loadWork, build, upload, receiveGallery, receivePdfs, receiveLabFile, asyncHandler, saveImage, saveLabVideo, publicUploadPath, removeUploadedFile, translationStatus, saveTranslationKey, autoTranslateLab, autoTranslateWorks } = services;
const TYPE_EN = {
  '모바일': 'Mobile',
  '설치': 'Installation',
  '영상': 'Video',
  '퍼포먼스': 'Performance',
  '전시': 'Exhibition',
  'VR/AR': 'VR/AR',
  '인터랙티브': 'Interactive',
  '피지컬 컴퓨팅': 'Physical Computing',
  '프로젝션': 'Projection',
};
const PRODUCTION_EN = { '개인': 'Solo', '공동': 'Collaborative', '회사': 'Company' };

// 유형/태그는 사이트 필터에서 하나로 합쳐져 보이므로 admin에서도 다중선택 하나로 다룬다.
// 선택된 값 전체가 tags(필터용)로 들어가고, type/grid_type_label/index_type_label/meta_type은
// 그 선택값들로부터 자동으로 채워진다. 필터링에 쓰이는 type/tags는 언어와 무관하게 한국어
// 원본 값을 유지하고, 화면에 보여지는 라벨만 영문 버전(_en)을 함께 채운다.
function applySelectedTypes(work, selected) {
  const types = Array.isArray(selected) ? selected.filter(Boolean) : [];
  const options=typeOptions();
  const typesEn = types.map((t) => options.find(o=>o.name===t)?.en || TYPE_EN[t] || t);
  work.type = types[0] || '';
  work.tags = types;
  work.grid_type_label = types.join(', ');
  work.index_type_label = types.join(', ');
  work.meta_type = types.join(', ');
  work.meta_medium = types.join(', ');
  work.grid_type_label_en = typesEn.join(', ');
  work.index_type_label_en = typesEn.join(', ');
  work.meta_type_en = typesEn.join(', ');
  work.meta_medium_en = typesEn.join(', ');
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

// ── Works ──

app.get('/api/featured-projects', (req,res) => {
  const saved = fs.existsSync(path.join(ROOT,'content','featured-projects.json')) ? loadJson('content/featured-projects.json') : {projects:[]};
  res.json({projects:selectFeaturedWorks(listWorkSlugs().map(loadWork).sort(compareWorkDates),saved.projects).map(work => work.slug)});
});
app.put('/api/featured-projects', (req,res) => {
  let projects;
  try { projects = validateFeaturedProjects(req.body.projects,listWorkSlugs()); }
  catch(error) { return res.status(400).json({error:error.message}); }
  saveJson('content/featured-projects.json',{projects});
  build(); res.json({projects});
});

function technologyOptions() {
  if (fs.existsSync(TECH_OPTIONS_FILE)) return JSON.parse(fs.readFileSync(TECH_OPTIONS_FILE, 'utf8'));
  const names = new Set(DEFAULT_TECH_OPTIONS);
  for (const slug of listWorkSlugs()) {
    const work = loadWork(slug);
    [...(work.tech || []), ...String(work.meta_tech || '').split(','), ...String(work.meta_tech_en || '').split(',')]
      .map((value) => value.trim()).filter(Boolean).forEach((value) => names.add(value));
  }
  return [...new Set([...names].map(englishTechnology))].map(name=>({name,en:name}));
}


const TYPE_OPTIONS_FILE=path.join(ROOT,'admin','type-options.json');
function typeOptions(){
 if(fs.existsSync(TYPE_OPTIONS_FILE))return JSON.parse(fs.readFileSync(TYPE_OPTIONS_FILE,'utf8'));
 return Object.entries(TYPE_EN).map(([name,en])=>({name,en}));
}
app.get('/api/type-options',(req,res)=>res.json(typeOptions()));
app.put('/api/type-options',(req,res)=>{
 const options=req.body.options;
 if(!Array.isArray(options)||!options.length||options.length>100||options.some(o=>!o||typeof o.name!=='string'||!o.name.trim()||o.name.length>100||typeof o.en!=='string'||o.en.length>100))return res.status(400).json({error:'유형 이름을 입력해주세요. 최소 1개, 최대 100개까지 가능합니다.'});
 const values=options.map(o=>({name:o.name.trim(),en:o.en.trim()||o.name.trim()}));
 if(new Set(values.map(o=>o.name)).size!==values.length)return res.status(400).json({error:'중복된 유형 이름이 있어요.'});
 fs.writeFileSync(TYPE_OPTIONS_FILE,JSON.stringify(values,null,2)+'\n');res.json(values);
});

app.get('/api/tech-options', (req, res) => res.json(technologyOptions()));
app.put('/api/tech-options', (req, res) => {
  const options = req.body.options;
  if (!Array.isArray(options) || options.length > 200 || options.some((item) => !item || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 100)) {
    return res.status(400).json({ error: '기술 이름을 입력해주세요. 항목은 최대 200개, 이름은 100자까지 사용할 수 있어요.' });
  }
  const normalized = options.map(({name})=>({name:englishTechnology(name),en:englishTechnology(name)}));
  if (new Set(normalized.map((item) => item.name)).size !== normalized.length) return res.status(400).json({ error: '중복된 기술 이름이 있어요.' });
  fs.writeFileSync(TECH_OPTIONS_FILE, JSON.stringify(normalized, null, 2) + '\n');
  res.json(normalized);
});

function adminWork(work) {
  const result={...work};
  for(const key of ['description','description_en','responsibilities','responsibilities_en','lessons','lessons_en']) result[key]=descriptionHtmlToPlainText(work[key]);
  result.process=(work.process||[]).map(entry=>({...entry,description:descriptionHtmlToPlainText(entry.description),description_en:descriptionHtmlToPlainText(entry.description_en)}));
  return result;
}
app.get('/api/works', (req, res) => {
  const works = listWorkSlugs().map(loadWork);
  works.sort(compareWorkDates);
  res.json(works.map(adminWork));
});

app.post('/api/works', (req, res) => {
  const { title, year, types } = req.body;
  if(typeof title!=='string'||!title.trim()) return res.status(400).json({error:'작업명을 입력해주세요.'});
  const slug=uniqueWorkSlug(title,listWorkSlugs());

  const date = parseWorkDate(year || String(new Date().getFullYear()));
  if (!date) return res.status(400).json({ error: '날짜는 2025 또는 2025.03 형식으로 입력해주세요.' });
  const resolvedYear = date.year;
  const work = {
    slug,
    title: title || '',
    year: resolvedYear,
    month: date.month,
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
    meta_tech_en: '',
    meta_production: '개인',
    meta_production_en: PRODUCTION_EN['개인'],
    description: '',
    description_en: '',
    vimeo_url: '',
    gallery: [],
  };
  applySelectedTypes(work, types && types.length ? types : ['인터랙티브']);
  saveJson(`content/works/${slug}.json`, work);
  build();
  res.json(work);
});

app.put('/api/works/:slug', asyncHandler(async (req, res) => {
  if (!listWorkSlugs().includes(req.params.slug)) return res.status(404).json({ error: 'not found' });
  const work = loadWork(req.params.slug);
  const previous = structuredClone(work);
  if (req.body.year !== undefined) {
    const date = parseWorkDate(req.body.year);
    if (!date) return res.status(400).json({ error: '날짜는 2025 또는 2025.03 형식으로 입력해주세요.' });
    work.year = date.year;
    work.month = date.month;
  }
  if (req.body.detail_background !== undefined) {
    if (typeof req.body.detail_background !== 'string' || !/^#[0-9a-f]{6}$/i.test(req.body.detail_background)) return res.status(400).json({ error: '배경색은 올바른 HEX 색상이어야 해요.' });
    work.detail_background = req.body.detail_background.toLowerCase();
  }
  if (req.body.detail_columns !== undefined) {
    if (![1, 2, 3].includes(req.body.detail_columns)) return res.status(400).json({ error: '상세 이미지 배치는 1장, 2장, 3장 중 선택해주세요.' });
    work.detail_columns = req.body.detail_columns;
  }
  if (req.body.tech !== undefined) {
    if (!Array.isArray(req.body.tech) || req.body.tech.some((value) => typeof value !== 'string' || value.length > 100)) return res.status(400).json({ error: '기술 선택값이 올바르지 않아요.' });
    const options = technologyOptions();
    work.tech = [...new Set(req.body.tech.map(englishTechnology).filter(Boolean))];
    work.meta_tech = work.tech.join(', ');
    work.meta_tech_en = work.meta_tech;
  }
  for (const key of ['responsibilities','responsibilities_en','lessons','lessons_en','company']) {
    if(req.body[key] === undefined) continue;
    if(typeof req.body[key] !== 'string' || req.body[key].length > 50000) return res.status(400).json({error:'입력 내용을 확인해주세요.'});
    work[key] = key === 'company' ? req.body[key].trim() : plainTextToDescriptionHtml(req.body[key]);
  }
  if (req.body.responsibility_items !== undefined) {
    try { work.responsibility_items = validateResponsibilities(req.body.responsibility_items); }
    catch (error) { return res.status(400).json({ error: error.message }); }
  }
  if(req.body.process !== undefined) {
    const entries=req.body.process;
    if(!Array.isArray(entries)||entries.length>50) return res.status(400).json({error:'제작 과정은 최대 50개까지 추가할 수 있어요.'});
    const used=new Set();
    const allowedMedia=new Set([...(work.gallery||[]),...(work.process_media||[]),...(work.process||[]).flatMap(entry=>entry.images||[])]);
    for(const entry of entries){
      if(!entry || (entry.columns!==undefined && ![1,2,3].includes(entry.columns)) || ['title','title_en','description','description_en'].some(key=>typeof entry[key]!=='string'||entry[key].length>50000) || !Array.isArray(entry.images) || entry.images.some(src=>!allowedMedia.has(src)||used.has(src))) return res.status(400).json({error:'과정의 미디어가 삭제되었거나 중복 선택됐어요. 선택 내용을 확인해주세요.'});
      for(const src of entry.images){if(used.has(src))return res.status(400).json({error:'같은 미디어를 중복 선택할 수 없어요.'});used.add(src);}
    }
    work.process=entries.filter(entry=>entry.title.trim()||entry.title_en.trim()||entry.description.trim()||entry.description_en.trim()||entry.images.length).map(entry=>({title:entry.title.trim(),title_en:entry.title_en.trim(),description:plainTextToDescriptionHtml(entry.description),description_en:plainTextToDescriptionHtml(entry.description_en),images:entry.images,columns:entry.columns||1}));
  }
  const editable = ['title', 'production', 'vimeo_url'];
  for (const key of editable) {
    if (req.body[key] !== undefined) work[key] = req.body[key];
  }
  if (req.body.description !== undefined) work.description = plainTextToDescriptionHtml(req.body.description);
  if (req.body.description_en !== undefined) work.description_en = plainTextToDescriptionHtml(req.body.description_en);
  if (work.year !== undefined) work.year = Number(work.year) || work.year;
  if (req.body.types !== undefined) applySelectedTypes(work, req.body.types);
  // 상세 페이지의 연도/매체/제작은 항상 목록 연도·유형·제작과 같게 유지한다.
  work.meta_year = String(work.year);
  work.meta_production = work.production;
  work.meta_production_en = PRODUCTION_EN[work.production] || work.production;
  if(work.production === '회사' && work.company){work.meta_production += `. ${work.company}`;work.meta_production_en += `. ${work.company}`;}
  saveJson(`content/works/${req.params.slug}.json`, work);
  const snapshot=JSON.stringify([work.description,work.description_en,work.responsibilities,work.responsibilities_en,work.lessons,work.lessons_en,work.process,work.responsibility_items]);
  const warning=await autoTranslateWorks(work,previous);
  if(!listWorkSlugs().includes(req.params.slug))return res.status(404).json({error:'번역 중 프로젝트가 삭제되었어요.'});
  const latest=loadWork(req.params.slug);
  if(JSON.stringify([latest.description,latest.description_en,latest.responsibilities,latest.responsibilities_en,latest.lessons,latest.lessons_en,latest.process,latest.responsibility_items])!==snapshot){
    build();return res.json({...adminWork(latest),translationWarning:'다른 화면에서 내용이 변경되어 이전 번역을 적용하지 않았어요.'});
  }
  latest.works_translation_pending=work.works_translation_pending;
  latest.description_en=work.description_en;latest.responsibilities_en=work.responsibilities_en;
  latest.lessons_en=work.lessons_en;
  if (work.responsibility_items) latest.responsibility_items = work.responsibility_items;
  (latest.process||[]).forEach((entry,i)=>{entry.title_en=work.process[i].title_en;entry.description_en=work.process[i].description_en;});
  saveJson(`content/works/${req.params.slug}.json`,latest);
  build();
  res.json({...adminWork(latest),translationWarning:warning});
}));

app.delete('/api/works/:slug', (req, res) => {
  const file = path.join(WORKS_DIR, `${req.params.slug}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'not found' });
  const work = loadWork(req.params.slug);
  fs.unlinkSync(file); // remove the JSON first so the reference check below doesn't see its own entries
  [work.cover_image, work.hover_image, work.thumbnail, work.preview_bg, work.hero_image, ...(work.gallery || []),...(work.process_media || []),...(work.process || []).flatMap(entry=>entry.images||[])].forEach(removeUploadedFile);
  build();
  res.json({ ok: true });
});

app.put('/api/works/:slug/related', (req, res) => {
  const slugs = listWorkSlugs();
  if (!slugs.includes(req.params.slug)) return res.status(404).json({error:'작업을 찾을 수 없어요.'});
  let selected;
  try { selected = validateRelatedProjects(req.body.related_projects, req.params.slug, slugs); }
  catch (error) { return res.status(400).json({error:error.message}); }
  const work = loadWork(req.params.slug);
  if (selected.length) work.related_projects = selected;
  else delete work.related_projects;
  saveJson(`content/works/${work.slug}.json`, work);
  build();
  res.json({related_projects:selected});
});

// Archive images are independent of the authored detail gallery and its order.
for (const [slot, field, label] of [['cover', 'cover_image', '대표 이미지'], ['hover', 'hover_image', '서브 이미지']]) {
app.put(`/api/works/:slug/${slot}`, (req, res) => {
  if (!listWorkSlugs().includes(req.params.slug)) return res.status(404).json({error:'작업을 찾을 수 없어요.'});
  const work = loadWork(req.params.slug);
  const { src } = req.body;
  const candidates = slot === 'hover' ? workHoverCandidates(work) : workImageCandidates(work);
  const automatic = slot === 'hover' && src === '';
  if (!automatic && (typeof src !== 'string' || !candidates.includes(src))) {
    return res.status(400).json({error:slot === 'hover' ? '대표 이미지와 다른 등록 이미지를 선택해주세요.' : '이 작업에 등록된 이미지 중에서 선택해주세요.'});
  }
  if (automatic) delete work[field];
  else work[field] = src;
  saveJson(`content/works/${work.slug}.json`, work);
  build();
  res.json({[field]:work[field] || ''});
});

app.post(`/api/works/:slug/${slot}`, upload.single('image'), asyncHandler(async (req, res) => {
  if (!listWorkSlugs().includes(req.params.slug)) return res.status(404).json({error:'작업을 찾을 수 없어요.'});
  if (!req.file || !/^image\//i.test(req.file.mimetype)) return res.status(400).json({error:`${label}로 사용할 사진을 선택해주세요.`});
  const filename = await saveImage(req.file.buffer, req.params.slug);
  const src = publicUploadPath(filename);
  if (!listWorkSlugs().includes(req.params.slug)) {
    removeUploadedFile(src);
    return res.status(404).json({error:'업로드 중 작업이 삭제되었어요.'});
  }
  const work = loadWork(req.params.slug);
  const previous = work[field];
  work[field] = src;
  saveJson(`content/works/${work.slug}.json`, work);
  if (previous && previous !== src) removeUploadedFile(previous);
  build();
  res.json({[field]:work[field]});
}));
}

// Legacy thumbnail upload retained for older admin clients.
app.post('/api/works/:slug/thumbnail', upload.single('image'), asyncHandler(async (req, res) => {
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
}));

// Process uploads belong to their project without adding cards to the Works gallery.
app.post('/api/works/:slug/process/media', receiveGallery, asyncHandler(async (req,res)=>{
  if(!listWorkSlugs().includes(req.params.slug)) return res.status(404).json({error:'작업을 찾을 수 없어요.'});
  if(!req.files?.length || req.files.some(file=>!/^image\//.test(file.mimetype)&&!/^video\//.test(file.mimetype)&&!/\.(mp4|mov|webm|m4v)$/i.test(file.originalname))) return res.status(400).json({error:'이미지 또는 영상 파일을 선택해주세요.'});
  const added=[];
  try{
    for(const file of req.files){
      const video=/^video\//.test(file.mimetype)||/\.(mp4|mov|webm|m4v)$/i.test(file.originalname);
      const filename=video?await saveLabVideo(file.buffer,UPLOADS_DIR):await saveImage(file.buffer,req.params.slug);
      added.push(publicUploadPath(filename));
    }
    if(!listWorkSlugs().includes(req.params.slug)) throw new Error('업로드 중 프로젝트가 삭제되었어요.');
    const work=loadWork(req.params.slug);work.process_media=[...new Set([...(work.process_media||[]),...added])];
    saveJson(`content/works/${req.params.slug}.json`,work);
    res.json({added});
  }catch(error){added.forEach(removeUploadedFile);throw error;}
}));
app.post('/api/works/:slug/gallery', receiveGallery, asyncHandler(async (req, res) => {
  if(!listWorkSlugs().includes(req.params.slug))return res.status(404).json({error:'작업을 찾을 수 없어요.'});
  if(!req.files?.length || req.files.some(file=>!/^image\//.test(file.mimetype) && !/^video\//.test(file.mimetype) && !/\.(mp4|mov|webm|m4v)$/i.test(file.originalname)))return res.status(400).json({error:'이미지 또는 영상 파일을 선택해주세요.'});
  const added=[];
  try {
    for (const file of req.files) {
      const isVideo=/^video\//.test(file.mimetype)||/\.(mp4|mov|webm|m4v)$/i.test(file.originalname);
      const filename=isVideo?await saveLabVideo(file.buffer,UPLOADS_DIR):await saveImage(file.buffer,req.params.slug);
      added.push(publicUploadPath(filename));
    }
  } catch(error) { added.forEach(removeUploadedFile);throw error; }
  const work=loadWork(req.params.slug);
  work.gallery ||= []; work.gallery.push(...added);
  saveJson(`content/works/${req.params.slug}.json`, work);
  build();res.json(work);
}));

app.put('/api/works/:slug/gallery/visibility', (req, res) => {
  if (!listWorkSlugs().includes(req.params.slug)) return res.status(404).json({ error: '작업을 찾을 수 없어요.' });
  const work = loadWork(req.params.slug);
  const { src, visible } = req.body;
  if (typeof visible !== 'boolean' || !(work.gallery || []).includes(src)) return res.status(400).json({ error: '이미지와 표시 여부를 확인해주세요.' });
  const hidden = new Set(work.works_hidden_images || []);
  if (visible) hidden.delete(src); else hidden.add(src);
  work.works_hidden_images = [...hidden];
  saveJson(`content/works/${req.params.slug}.json`, work);
  build();
  res.json(work);
});

app.put('/api/works/:slug/gallery/layout', (req, res) => {
  if (!listWorkSlugs().includes(req.params.slug)) return res.status(404).json({error:'작업을 찾을 수 없어요.'});
  const work = loadWork(req.params.slug);
  const { rows, expected, expectedRows } = req.body;
  if (JSON.stringify(expected) !== JSON.stringify(work.gallery) || JSON.stringify(expectedRows ?? null) !== JSON.stringify(work.detail_rows ?? null)) return res.status(409).json({error:'갤러리가 변경됐어요. 새로고침한 뒤 다시 시도해주세요.'});
  if (!Array.isArray(rows) || rows.some(row => !Array.isArray(row) || row.length < 1 || row.length > 3)) return res.status(400).json({error:'한 줄에는 1~3장을 배치해주세요.'});
  const flat = rows.flat();
  if (flat.length !== work.gallery.length || new Set(flat).size !== flat.length || flat.some(src => !work.gallery.includes(src))) return res.status(400).json({error:'갤러리 이미지 목록이 올바르지 않아요.'});
  work.gallery = flat; work.detail_rows = rows; work.detail_columns = 1;
  saveJson(`content/works/${work.slug}.json`, work); build(); res.json(work);
});

app.put('/api/works/:slug/gallery/order', (req, res) => {
  if (!listWorkSlugs().includes(req.params.slug)) return res.status(404).json({ error: '작업을 찾을 수 없어요.' });
  const work = loadWork(req.params.slug);
  const gallery = work.gallery || [];
  const { order, expected } = req.body;
  if (JSON.stringify(expected) !== JSON.stringify(gallery)) return res.status(409).json({ error: '갤러리가 다른 화면에서 변경됐어요. 페이지를 새로고침한 뒤 다시 시도해주세요.' });
  if (!Array.isArray(order) || order.length !== gallery.length || new Set(order).size !== gallery.length || order.some((index) => !Number.isInteger(index) || index < 0 || index >= gallery.length)) {
    return res.status(400).json({ error: '이미지 순서가 올바르지 않아요.' });
  }
  work.gallery = order.map((index) => gallery[index]);
  saveJson(`content/works/${req.params.slug}.json`, work);
  build();
  res.json(work);
});

app.delete('/api/works/:slug/gallery/:index', (req, res) => {
  const work = loadWork(req.params.slug);
  const [removed] = work.gallery.splice(Number(req.params.index), 1);
  for(const entry of work.process || []) entry.images=(entry.images||[]).filter(src=>src!==removed);
  saveJson(`content/works/${req.params.slug}.json`, work);
  removeUploadedFile(removed);
  build();
  res.json(work);
});

// ── Site content (about / cv / lab / site) ──

app.get('/api/portfolio', (req, res) => res.json(loadJson('content/portfolio.json')));
app.post('/api/portfolio/images', upload.array('images', 20), asyncHandler(async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: '이미지를 선택해주세요.' });
  const added = [];
  for (const file of req.files) added.push(publicUploadPath(await saveImage(file.buffer, 'portfolio')));
  const portfolio = loadJson('content/portfolio.json');
  portfolio.images.push(...added);
  saveJson('content/portfolio.json', portfolio);
  build();
  res.json(portfolio);
}));
app.put('/api/portfolio/images', (req, res) => {
  const portfolio = loadJson('content/portfolio.json');
  const { images, expected } = req.body;
  if (JSON.stringify(expected) !== JSON.stringify(portfolio.images)) return res.status(409).json({ error: '목록이 변경됐어요. 새로고침 후 다시 시도해주세요.' });
  if (!Array.isArray(images) || new Set(images).size !== images.length || images.some(src => !portfolio.images.includes(src))) return res.status(400).json({ error: '이미지 목록이 올바르지 않아요.' });
  portfolio.images = images;
  saveJson('content/portfolio.json', portfolio);
  build();
  res.json(portfolio);
});

app.post('/api/works/:slug/documents', receivePdfs, asyncHandler(async (req, res) => {
  if (!listWorkSlugs().includes(req.params.slug)) return res.status(404).json({ error: '작업을 찾을 수 없어요.' });
  if (!req.files?.length || req.files.some(file => file.buffer.subarray(0, 5).toString() !== '%PDF-')) return res.status(400).json({ error: '올바른 PDF 파일을 선택해주세요.' });
  const work = loadWork(req.params.slug);
  const directory = path.join(ROOT, 'assets', 'documents');
  fs.mkdirSync(directory, { recursive: true });
  work.documents ||= [];
  for (const file of req.files) {
    const id = randomUUID();
    fs.writeFileSync(path.join(directory, `${id}.pdf`), file.buffer);
    const decoded = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const name = (decoded.includes('\uFFFD') ? file.originalname : decoded).slice(0, 200);
    work.documents.push({ id, name, file: `/3dowonWebpage/assets/documents/${id}.pdf` });
  }
  saveJson(`content/works/${work.slug}.json`, work);
  build();
  res.json(work.documents);
}));
app.delete('/api/works/:slug/documents/:id', (req, res) => {
  if (!listWorkSlugs().includes(req.params.slug)) return res.status(404).json({ error: '작업을 찾을 수 없어요.' });
  const work = loadWork(req.params.slug);
  work.documents = (work.documents || []).filter(item => item.id !== req.params.id);
  saveJson(`content/works/${work.slug}.json`, work);
  build();
  res.json(work.documents);
});

app.get('/api/teaching-materials', (req, res) => res.json(loadJson('content/teaching-materials.json')));
app.post('/api/teaching-materials', receivePdfs, asyncHandler(async (req, res) => {
  if (!req.files?.length || req.files.some(file => file.buffer.subarray(0, 5).toString() !== '%PDF-')) return res.status(400).json({ error: '올바른 PDF 파일을 선택해주세요.' });
  const materials = loadJson('content/teaching-materials.json');
  const directory = path.join(ROOT, 'assets', 'documents');
  fs.mkdirSync(directory, { recursive: true });
  for (const file of req.files) {
    const id = randomUUID();
    fs.writeFileSync(path.join(directory, `${id}.pdf`), file.buffer);
    const decodedName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const title = (decodedName.includes('\uFFFD') ? file.originalname : decodedName).replace(/\.pdf$/i, '').slice(0, 200);
    materials.items.push({ id, title, title_en: '', file: `/3dowonWebpage/assets/documents/${id}.pdf` });
  }
  saveJson('content/teaching-materials.json', materials);
  build();
  res.json(materials);
}));
app.post('/api/teaching-materials/:id/file', receivePdfs, asyncHandler(async (req, res) => {
  const materials = loadJson('content/teaching-materials.json');
  const item = materials.items.find(item => item.id === req.params.id);
  if (!item) return res.status(404).json({ error: '자료를 찾을 수 없어요.' });
  if (req.files?.length !== 1 || req.files[0].buffer.subarray(0, 5).toString() !== '%PDF-') return res.status(400).json({ error: '교체할 PDF 한 개를 선택해주세요.' });
  const directory = path.join(ROOT, 'assets', 'documents');
  fs.mkdirSync(directory, { recursive: true });
  const filename = `${randomUUID()}.pdf`;
  fs.writeFileSync(path.join(directory, filename), req.files[0].buffer);
  item.file = `/3dowonWebpage/assets/documents/${filename}`;
  saveJson('content/teaching-materials.json', materials);
  build();
  res.json(materials);
}));
app.put('/api/teaching-materials', (req, res) => {
  const materials = loadJson('content/teaching-materials.json');
  if (JSON.stringify(req.body.expected) !== JSON.stringify(materials.items)) return res.status(409).json({ error: '다른 화면에서 변경됐어요. 새로고침 후 다시 시도해주세요.' });
  const items = req.body.items;
  if (!Array.isArray(items) || new Set(items.map(item => item?.id)).size !== items.length || items.some(item => !item || !materials.items.some(old => old.id === item.id) || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 200 || typeof item.title_en !== 'string' || item.title_en.length > 200)) return res.status(400).json({ error: '자료 제목과 목록을 확인해주세요. 제목은 200자까지 입력할 수 있어요.' });
  materials.items = items.map(item => ({ ...materials.items.find(old => old.id === item.id), title: item.title.trim(), title_en: item.title_en.trim() }));
  saveJson('content/teaching-materials.json', materials);
  build();
  res.json(materials);
});

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

app.post('/api/about/image', upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '이미지 파일이 필요해요.' });
  const about = loadJson('content/about.json');
  const oldImage = about.image;
  const filename = await saveImage(req.file.buffer);
  about.image = publicUploadPath(filename);
  saveJson('content/about.json', about);
  removeUploadedFile(oldImage);
  build();
  res.json(about);
}));

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

app.get('/api/lab/translation', (req,res) => res.json(translationStatus()));
app.put('/api/lab/translation', (req,res) => {
  const key = typeof req.body.key === 'string' ? req.body.key.trim() : '';
  if (!key || key.length > 256 || /\s/.test(key)) return res.status(400).json({error:'DeepL API 키를 입력해주세요.'});
  saveTranslationKey(key);
  res.json(translationStatus());
});
app.put('/api/lab/items/:index', asyncHandler(async (req,res) => {
  const lab = loadJson('content/lab.json');
  const item = lab.items[Number(req.params.index)];
  if (!item) return res.status(404).json({error:'항목을 찾을 수 없어요.'});
  const previous = {...item};
  const date = req.body.date ? parseWorkDate(req.body.date) : null;
  if (req.body.date && !date) return res.status(400).json({error:'날짜는 2026.03 형식으로 입력해주세요.'});
  Object.assign(item, {caption:req.body.caption || '', caption_en:req.body.caption_en || '', year:date?.year || '', month:date?.month || null});
  for (const key of ['description', 'description_en']) if (typeof req.body[key] === 'string') item[key] = req.body[key];
  saveJson('content/lab.json',lab);
  const warning = await autoTranslateLab(item, previous);
  const latest = loadJson('content/lab.json');
  const current = latest.items[Number(req.params.index)];
  if (!current || current.image !== item.image || current.video !== item.video || current.description !== item.description || current.description_en !== (req.body.description_en ?? previous.description_en)) {
    build();
    return res.json({...latest, translationWarning:'내용이 변경되어 이전 번역 결과를 적용하지 않았어요.'});
  }
  current.description_en = item.description_en;
  saveJson('content/lab.json', latest);
  build();
  res.json({...latest, translationWarning:warning});
}));
app.post('/api/lab/items/:index/file', receiveLabFile, asyncHandler(async (req,res) => {
  const index = Number(req.params.index);
  const previous = loadJson('content/lab.json').items[index];
  if (!previous) return res.status(404).json({error:'항목을 찾을 수 없어요.'});
  if (!req.file) return res.status(400).json({error:'파일을 선택해주세요.'});
  const isVideo = req.file.mimetype.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(req.file.originalname);
  if (!isVideo && !req.file.mimetype.startsWith('image/')) return res.status(400).json({error:'이미지 또는 영상을 선택해주세요.'});
  const filename = isVideo ? await saveLabVideo(req.file.buffer,UPLOADS_DIR) : await saveImage(req.file.buffer);
  const lab = loadJson('content/lab.json');
  const item = lab.items[index];
  if (!item || item.image !== previous.image || item.video !== previous.video) {
    removeUploadedFile(publicUploadPath(filename));
    return res.status(409).json({error:'항목이 변경되었어요. 새로고침 후 다시 시도해주세요.'});
  }
  delete item.image;
  delete item.video;
  item[isVideo ? 'video' : 'image'] = publicUploadPath(filename);
  saveJson('content/lab.json',lab);
  removeUploadedFile(previous.image);
  removeUploadedFile(previous.video);
  build();
  res.json(lab);
}));
app.post('/api/lab/items', receiveLabFile, asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '이미지 또는 영상 파일이 필요해요.' });
  const date = req.body.date ? parseWorkDate(req.body.date) : null;
  if (req.body.date && !date) return res.status(400).json({error:'날짜는 2026.03 형식으로 입력해주세요.'});
  const isVideo = req.file.mimetype.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(req.file.originalname);
  if (!isVideo && !req.file.mimetype.startsWith('image/')) return res.status(400).json({error:'이미지 또는 영상 파일을 선택해주세요.'});
  const filename = isVideo ? await saveLabVideo(req.file.buffer, UPLOADS_DIR) : await saveImage(req.file.buffer);
  const draft = {description:req.body.description || '', description_en:req.body.description_en || ''};
  const warning = await autoTranslateLab(draft);
  const lab = loadJson('content/lab.json');
  lab.items.push({ [isVideo ? 'video' : 'image']: publicUploadPath(filename), caption: req.body.caption || '', caption_en: req.body.caption_en || '', ...draft, year:date?.year || '', month:date?.month || null });
  saveJson('content/lab.json', lab);
  build();
  res.json({...lab, translationWarning:warning});
}));

app.delete('/api/lab/items/:index', (req, res) => {
  const lab = loadJson('content/lab.json');
  const [removed] = lab.items.splice(Number(req.params.index), 1);
  saveJson('content/lab.json', lab);
  if (removed) {
    removeUploadedFile(removed.image);
    removeUploadedFile(removed.video);
  }
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


}
