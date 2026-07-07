// 사이트 필터에서는 유형(설치~전시)과 태그(인터랙티브/프로젝션)가 한 목록으로 합쳐져 보이므로
// admin에서도 이 6개를 하나의 다중선택으로 다룬다.
const TYPE_OPTIONS = ['설치', '영상', '퍼포먼스', '전시', '인터랙티브', '프로젝션'];
const TECH_OPTIONS = ['Unreal', 'Unity', 'Arduino', '3ds Max'];
const PRODUCTION_OPTIONS = ['개인', '공동', '회사'];

function imgUrl(p) {
  if (!p) return '';
  if (p.startsWith('http')) return p;
  // content JSON stores paths like /3dowonWebpage/assets/uploads/x.jpg — map to local /site/assets/...
  const m = p.match(/\/assets\/(.*)$/);
  return m ? `/site/assets/${m[1]}` : p;
}

async function api(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `${res.status} ${res.statusText}`);
  }
  return res.status === 204 ? null : res.json();
}

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
function checkboxGroup(name, options, selected) {
  return options
    .map(
      (opt) => `<label class="chk"><input type="checkbox" name="${name}" value="${escapeAttr(opt)}" ${
        selected.includes(opt) ? 'checked' : ''
      } />${escapeHtml(opt)}</label>`
    )
    .join('');
}
function selectOptions(options, value) {
  return options.map((opt) => `<option ${opt === value ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('');
}

// ── Tabs ──
document.querySelectorAll('.admin-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

// ── Works ──
async function loadWorks() {
  const works = await api('/api/works');
  const list = document.getElementById('worksList');
  list.innerHTML = '';
  works.forEach((work) => list.appendChild(renderWorkCard(work)));
}

function renderWorkCard(work) {
  const card = document.createElement('div');
  card.className = 'work-card';
  card.innerHTML = `
    <div class="work-card-head">
      <h3>${escapeHtml(work.title)} <span>${work.year} · ${escapeHtml(work.type)}</span></h3>
      <span>${escapeHtml(work.slug)}</span>
    </div>
    <div class="work-card-body">
      <div class="thumb-row">
        <div>
          <img src="${imgUrl(work.thumbnail)}" alt="" />
          <div class="thumb-label">썸네일 (그리드/미리보기/히어로 공통)<input type="file" accept="image/*" class="img-input" data-field="thumbnail" /></div>
        </div>
      </div>
      <form class="admin-form edit-form">
        <div class="field-row">
          <label>작업명<input name="title" value="${escapeAttr(work.title)}" /></label>
          <label>연도<input name="year" type="number" value="${escapeAttr(work.year)}" /></label>
        </div>
        <label>유형<div class="chk-group">${checkboxGroup('types', TYPE_OPTIONS, [work.type, ...(work.tags || [])])}</div></label>
        <label>제작<select name="production">${selectOptions(PRODUCTION_OPTIONS, work.production)}</select></label>
        <label>기술<div class="chk-group">${checkboxGroup('tech', TECH_OPTIONS, work.tech || [])}</div></label>
        <label>상세-기술<input name="meta_tech" value="${escapeAttr(work.meta_tech)}" /></label>
        <label>설명 (엔터로 줄바꿈)<textarea name="description" rows="4">${escapeHtml(work.description)}</textarea></label>
        <label>Vimeo URL<input name="vimeo_url" value="${escapeAttr(work.vimeo_url)}" /></label>
        <div class="field-row">
          <button type="submit">저장</button>
          <button type="button" class="danger delete-work">삭제</button>
        </div>
      </form>
      <h4>갤러리 이미지</h4>
      <div class="gallery-grid"></div>
      <input type="file" accept="image/*" multiple class="gallery-input" />
    </div>
  `;

  const galleryGrid = card.querySelector('.gallery-grid');
  (work.gallery || []).forEach((src, i) => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.innerHTML = `<img src="${imgUrl(src)}" alt="" /><button type="button">×</button>`;
    item.querySelector('button').addEventListener('click', async () => {
      await api(`/api/works/${work.slug}/gallery/${i}`, { method: 'DELETE' });
      loadWorks();
    });
    galleryGrid.appendChild(item);
  });

  card.querySelector('.work-card-head').addEventListener('click', () => card.classList.toggle('open'));

  card.querySelector('.edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await api(`/api/works/${work.slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: fd.get('title'),
        year: fd.get('year'),
        types: fd.getAll('types'),
        production: fd.get('production'),
        tech: fd.getAll('tech'),
        meta_tech: fd.get('meta_tech'),
        description: fd.get('description'),
        vimeo_url: fd.get('vimeo_url'),
      }),
    });
    loadWorks();
  });

  card.querySelector('.delete-work').addEventListener('click', async () => {
    if (!confirm(`"${work.title}"을(를) 삭제할까요?`)) return;
    await api(`/api/works/${work.slug}`, { method: 'DELETE' });
    loadWorks();
  });

  card.querySelectorAll('.img-input').forEach((input) => {
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('image', file);
      await api(`/api/works/${work.slug}/${input.dataset.field}`, { method: 'POST', body: fd });
      loadWorks();
    });
  });

  card.querySelector('.gallery-input').addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    const fd = new FormData();
    for (const f of files) fd.append('images', f);
    await api(`/api/works/${work.slug}/gallery`, { method: 'POST', body: fd });
    loadWorks();
  });

  return card;
}

document.getElementById('newWorkTypes').innerHTML = checkboxGroup('types', TYPE_OPTIONS, []);

document.getElementById('newWorkForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await api('/api/works', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: fd.get('slug'),
        title: fd.get('title'),
        year: fd.get('year'),
        types: fd.getAll('types'),
      }),
    });
    e.target.reset();
    loadWorks();
  } catch (err) {
    alert(err.message);
  }
});

// ── About ──
async function loadAbout() {
  const { about } = await api('/api/site');
  const form = document.getElementById('aboutForm');
  form.name.value = about.name;
  form.meta.value = about.meta;
  form.body.value = about.body;
  document.getElementById('aboutImagePreview').src = imgUrl(about.image);
}

document.getElementById('aboutForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  await api('/api/about', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: fd.get('name'), meta: fd.get('meta'), body: fd.get('body') }),
  });
  alert('저장했어요.');
});

document.getElementById('aboutImageInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('image', file);
  await api('/api/about/image', { method: 'POST', body: fd });
  loadAbout();
});

// ── CV ──
let cvData = null;

async function loadCv() {
  const { cv } = await api('/api/site');
  cvData = cv;
  renderCv();
}

function renderCv() {
  const container = document.getElementById('cvSections');
  container.innerHTML = '';
  cvData.sections.forEach((section, si) => {
    const card = document.createElement('div');
    card.className = 'cv-section-card';
    card.innerHTML = `
      <div class="field-row">
        <label>섹션 제목<input class="section-title" value="${escapeAttr(section.title)}" /></label>
        <button type="button" class="danger remove-section">섹션 삭제</button>
      </div>
      <div class="cv-entries"></div>
      <button type="button" class="secondary add-entry">항목 추가</button>
    `;
    card.querySelector('.section-title').addEventListener('input', (e) => {
      section.title = e.target.value;
    });
    card.querySelector('.remove-section').addEventListener('click', () => {
      cvData.sections.splice(si, 1);
      renderCv();
    });

    const entriesBox = card.querySelector('.cv-entries');
    section.entries.forEach((entry, ei) => {
      const row = document.createElement('div');
      row.className = 'cv-entry-row';
      row.innerHTML = `
        <input value="${escapeAttr(entry.year)}" placeholder="연도" />
        <input value="${escapeAttr(entry.description)}" placeholder="내용 (HTML 가능, 예: <em>제목</em>, 장소)" />
        <button type="button" class="danger">×</button>
      `;
      const [yearInput, descInput, removeBtn] = row.children;
      yearInput.addEventListener('input', (e) => { entry.year = e.target.value; });
      descInput.addEventListener('input', (e) => { entry.description = e.target.value; });
      removeBtn.addEventListener('click', () => {
        section.entries.splice(ei, 1);
        renderCv();
      });
      entriesBox.appendChild(row);
    });

    card.querySelector('.add-entry').addEventListener('click', () => {
      section.entries.push({ year: '', description: '' });
      renderCv();
    });

    container.appendChild(card);
  });
}

document.getElementById('addCvSection').addEventListener('click', () => {
  cvData.sections.push({ title: '새 섹션', entries: [] });
  renderCv();
});

document.getElementById('saveCv').addEventListener('click', async () => {
  await api('/api/cv', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sections: cvData.sections }),
  });
  alert('저장했어요.');
});

// ── Lab ──
async function loadLab() {
  const { lab } = await api('/api/site');
  const list = document.getElementById('labList');
  list.innerHTML = '';
  lab.items.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'lab-card thumb-row';
    card.innerHTML = `
      <img src="${imgUrl(item.image)}" alt="" />
      <input value="${escapeAttr(item.caption)}" class="lab-caption" />
      <button type="button" class="danger">삭제</button>
    `;
    const [img, captionInput, removeBtn] = card.children;
    captionInput.addEventListener('change', async () => {
      const items = lab.items.map((it, idx) => (idx === i ? { ...it, caption: captionInput.value } : it));
      await api('/api/lab', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
    });
    removeBtn.addEventListener('click', async () => {
      await api(`/api/lab/items/${i}`, { method: 'DELETE' });
      loadLab();
    });
    list.appendChild(card);
  });
}

document.getElementById('newLabForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = document.getElementById('labImageInput').files[0];
  if (!file) return alert('이미지를 선택하세요.');
  const fd = new FormData();
  fd.append('image', file);
  fd.append('caption', e.target.caption.value);
  await api('/api/lab/items', { method: 'POST', body: fd });
  e.target.reset();
  loadLab();
});

// ── Site (contact/SNS) ──
async function loadSiteInfo() {
  const { site } = await api('/api/site');
  const form = document.getElementById('siteForm');
  form.email.value = site.email;
  form.instagram.value = site.instagram;
  form.vimeo.value = site.vimeo;
  form.youtube.value = site.youtube;
}

document.getElementById('siteForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  await api('/api/site', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: fd.get('email'),
      instagram: fd.get('instagram'),
      vimeo: fd.get('vimeo'),
      youtube: fd.get('youtube'),
    }),
  });
  alert('저장했어요.');
});

loadWorks();
loadAbout();
loadCv();
loadLab();
loadSiteInfo();
