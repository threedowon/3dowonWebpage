const rowNumberDrafts = new Map();
function galleryRows(work) {
  const gallery = work.gallery || [];
  const remaining = new Set(gallery);
  const rows = [];
  const source = Array.isArray(work.detail_rows) ? work.detail_rows : Array.from({length: Math.ceil(gallery.length / (Number(work.detail_columns) || 1))}, (_, i) => gallery.slice(i * (Number(work.detail_columns) || 1), (i + 1) * (Number(work.detail_columns) || 1)));
  for (const row of source) {
    const valid = row.filter(src => remaining.has(src)).slice(0, 3);
    valid.forEach(src => remaining.delete(src));
    if (valid.length) rows.push(valid);
  }
  for (const src of remaining) rows.push([src]);
  return rows;
}
function groupSelection(rows, selected, ungroup = false) {
  const picked = rows.flat().filter(src => selected.includes(src));
  const result = []; let inserted = false;
  for (const row of rows) {
    if (!row.some(src => picked.includes(src))) { result.push(row); continue; }
    if (!inserted && !ungroup) { result.push(picked); inserted = true; }
    for (const src of row) if (ungroup || !picked.includes(src)) result.push([src]);
  }
  return result;
}
function moveRow(rows, from, to) {
  const result = rows.map(row => [...row]);
  if (from === to || from < 0 || to < 0 || to >= rows.length) return result;
  result.splice(to, 0, result.splice(from, 1)[0]);
  return result;
}
// 사이트 필터에서는 유형(설치~전시·VR/AR)과 태그(인터랙티브/프로젝션)가 한 목록으로 합쳐져 보이므로
// admin에서도 이 7개를 하나의 다중선택으로 다룬다.
let TYPE_OPTIONS = ['설치', '영상', '퍼포먼스', '전시', 'VR/AR', '인터랙티브', '프로젝션', '모바일'];
const workDateLabel = work => work.month ? `${work.year}.${String(work.month).padStart(2, '0')}` : String(work.year || '');
let techOptions = [];
let techOptionsDirty = false;
let typeOptionsDirty = false;
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
const openWorkSlugs = new Set();
const dirtyWorks = new Set();
let activeAdminTab = 'works';

document.querySelectorAll('.admin-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const nextTab = tab.dataset.tab;
    if (nextTab !== activeAdminTab && dirtyWorks.size > 0) {
      if (!confirm('저장하지 않은 변경이 있어요. 탭을 바꿀까요?')) return;
      dirtyWorks.clear();
    }
    document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${nextTab}`).classList.add('active');
    activeAdminTab = nextTab;
  });
});

window.addEventListener('beforeunload', (e) => {
  if (dirtyWorks.size > 0 || techOptionsDirty || typeOptionsDirty || rowNumberDrafts.size > 0) {
    e.preventDefault();
    e.returnValue = '';
  }
});

function captureWorkForm(form) {
  const fd = new FormData(form);
  return {
    title: fd.get('title'),
    year: fd.get('year'),
    types: fd.getAll('types'),
    production: fd.get('production'),
    tech: fd.getAll('tech'),
    description: fd.get('description'),
    description_en: fd.get('description_en'),
    vimeo_url: fd.get('vimeo_url'),
    detail_background: fd.get('detail_background'),
    detail_columns: fd.get('detail_columns'),
  };
}

function applyWorkForm(form, draft) {
  if (!draft) return;
  form.title.value = draft.title ?? '';
  form.year.value = draft.year ?? '';
  form.production.value = draft.production ?? '';
  form.description.value = draft.description ?? '';
  form.description_en.value = draft.description_en ?? '';
  form.vimeo_url.value = draft.vimeo_url ?? '';
  form.detail_background.value = draft.detail_background || '#dddddd';
  form.detail_columns.value = draft.detail_columns || '1';
  form.querySelectorAll('input[name="types"]').forEach((input) => {
    input.checked = draft.types.includes(input.value);
  });
  form.querySelectorAll('input[name="tech"]').forEach((input) => {
    input.checked = draft.tech.includes(input.value);
  });
}

function markWorkDirty(slug) {
  dirtyWorks.add(slug);
}

function previewPath(work) {
  return work.gallery?.[0] || (work.mux?.playback_id ? 'https://image.mux.com/'+work.mux.playback_id+'/thumbnail.jpg' : '');
}
function updateWorkCardHead(card, work) {
  card.querySelector('.work-title').textContent = work.title;
  card.querySelector('.work-subtitle').textContent = [workDateLabel(work), work.type].filter(Boolean).join(' · ');
  const preview = card.querySelector('.work-preview');
  if (previewPath(work)) {
    preview.innerHTML = '<img src="' + escapeAttr(imgUrl(previewPath(work))) + '" alt="" loading="lazy" />';
  } else preview.textContent = '이미지 없음';
}
function filterWorks() {
  const query = document.getElementById('workSearch').value.trim().toLocaleLowerCase();
  const cards = [...document.querySelectorAll('.work-card')];
  cards.forEach(card => { card.hidden = !card.querySelector('.work-card-head').textContent.toLocaleLowerCase().includes(query); });
  document.getElementById('workCount').textContent = cards.filter(card => !card.hidden).length + ' / ' + cards.length;
}
document.getElementById('workSearch').addEventListener('input', filterWorks);

function addTechRow(option = {name:'', en:''}) {
  const row = document.createElement('div');
  row.className = 'tech-option-row';
  row.innerHTML = '<label>기술 이름 (영문)<input class="tech-name" required maxlength="100" value="' + escapeAttr(option.name) + '" /></label><button type="button" class="secondary">항목 삭제</button>';
  row.querySelector('button').addEventListener('click', () => { row.remove(); techOptionsDirty = true; });
  document.getElementById('techOptionsRows').appendChild(row);
}
function techCheckboxes(selected) {
  return checkboxGroup('tech', [...new Set([...techOptions.map(option => option.name), ...selected])], selected);
}
async function loadTechnologyOptions() {
  techOptions = await api('/api/tech-options');
  techOptions.forEach(addTechRow);
}
document.getElementById('addTechOption').addEventListener('click', () => {
  addTechRow(); techOptionsDirty = true;
  document.querySelector('#techOptionsRows .tech-option-row:last-child input').focus();
});
document.getElementById('techOptionsForm').addEventListener('input', () => { techOptionsDirty = true; });
document.getElementById('techOptionsForm').addEventListener('submit', async event => {
  event.preventDefault();
  const status = document.getElementById('techOptionsStatus');
  const submit = event.target.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    const options = [...document.querySelectorAll('#techOptionsRows .tech-option-row')].map(row => ({name:row.querySelector('.tech-name').value}));
    techOptions = await api('/api/tech-options', {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({options})});
    document.querySelectorAll('.work-tech-options').forEach(group => {
      const selected = [...group.querySelectorAll(':checked')].map(input => input.value);
      group.innerHTML = techCheckboxes(selected);
    });
    techOptionsDirty = false;
    status.textContent = '기술 목록을 저장했어요.';
  } catch (error) { status.textContent = error.message; }
  finally { submit.disabled = false; }
});

function galleryBusy(grid, busy, message = '') {
  grid.dataset.busy = String(busy);
  const card = grid.closest('.work-card');
  card.querySelector('.gallery-input').disabled = busy;
  grid.querySelectorAll('button, input').forEach(button => { button.disabled = busy; });
  card.querySelector('.gallery-status').textContent = message;
}
function refreshGalleryGrid(galleryGrid, work, gallery) {
  work.gallery = [...gallery];
  galleryGrid.innerHTML = '';
  gallery.forEach((src, i) => appendGalleryItem(galleryGrid, work, src, i));
  decorateGalleryRows(galleryGrid, work);
  updateWorkCardHead(galleryGrid.closest('.work-card'), work);
}
function decorateGalleryRows(grid, work) {
  // Keep tiles in place while numbers are edited; applying is the only regroup action.
  const drafts = rowNumberDrafts.get(work.slug);
  if (drafts) for (const input of grid.querySelectorAll('.gallery-row-number')) {
    const src=work.gallery[Number(input.closest('.gallery-item').dataset.index)];
    if(drafts.has(src)) input.value=drafts.get(src);
  }
}
async function saveGalleryRows(grid, work, rows) {
  if(grid.dataset.busy==='true')return;
  galleryBusy(grid,true,'이미지 배치를 저장하고 있어요…');
  try {
    const updated=await api(`/api/works/${work.slug}/gallery/layout`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({rows,expected:work.gallery,expectedRows:work.detail_rows??null})});
    rowNumberDrafts.delete(work.slug);
    work.detail_rows=updated.detail_rows; work.detail_columns=1;
    refreshGalleryGrid(grid,work,updated.gallery);
    galleryBusy(grid,false,'이미지 배치를 저장했어요.');
  } catch(error){galleryBusy(grid,false,error.message);}
}
async function moveGalleryImage(grid, work, from, to) {
  if(rowNumberDrafts.has(work.slug)){grid.closest('.work-card').querySelector('.gallery-status').textContent='줄 번호를 먼저 배치 적용해주세요.';return;}
  if(to<0 || to>=work.gallery.length)return;
  const rows=galleryRows(work), a=rows.findIndex(row=>row.includes(work.gallery[from]));
  let b=rows.findIndex(row=>row.includes(work.gallery[to]));
  if(a===b) b=a+(to>from?1:-1);
  if(b<0 || b>=rows.length)return;
  await saveGalleryRows(grid,work,moveRow(rows,a,b));
}
function appendGalleryItem(galleryGrid, work, src, index) {
  const item = document.createElement('div');
  item.className = 'gallery-item'; item.draggable = true; item.tabIndex = 0;
  item.dataset.index = String(index);
  item.classList.add('work-gallery-item');
  item.setAttribute('aria-label', '갤러리 이미지 ' + (index + 1) + ', Alt와 방향키로 순서 변경');
  item.innerHTML = '<img src="' + escapeAttr(imgUrl(src)) + '" alt="갤러리 이미지 ' + (index + 1) + '" draggable="false" loading="lazy" /><span class="gallery-number">' + (index + 1) + '</span><button type="button" class="gallery-remove" aria-label="이미지 ' + (index + 1) + ' 삭제">×</button><div class="gallery-move"><button type="button" class="move-previous" aria-label="이미지 ' + (index + 1) + ' 앞으로">←</button><button type="button" class="move-next" aria-label="이미지 ' + (index + 1) + ' 뒤로">→</button></div>';
  const fileLink=document.createElement('a');fileLink.className='gallery-download';fileLink.textContent='이미지 다운로드';fileLink.setAttribute('aria-label','갤러리 이미지 '+(index+1)+' 다운로드');fileLink.href='/api/mux/local-download?target='+encodeURIComponent('works:'+work.slug)+'&src='+encodeURIComponent(src);fileLink.draggable=false;item.append(fileLink);
  const visibility = document.createElement('label');
  visibility.className = 'gallery-visibility';
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.checked = !(work.works_hidden_images || []).includes(src);
  visibility.append(toggle, document.createTextNode('Works에 표시'));
  item.append(visibility);
  const rowLabel=document.createElement('label'); rowLabel.className='gallery-row-input';
  const rowInput=document.createElement('input'); rowInput.className='gallery-row-number';
  rowInput.type='number';rowInput.min='1';rowInput.step='1';rowInput.setAttribute('aria-label',`이미지 ${index+1} 줄 번호`);
  rowInput.value=galleryRows(work).findIndex(row=>row.includes(src))+1;
  rowLabel.append(document.createTextNode('줄 번호'),rowInput);item.append(rowLabel);
  rowInput.addEventListener('input',()=>{
    if(!rowNumberDrafts.has(work.slug))rowNumberDrafts.set(work.slug,new Map());
    const draft=rowNumberDrafts.get(work.slug);
    if(rowInput.value===String(galleryRows(work).findIndex(row=>row.includes(src))+1))draft.delete(src);
    else draft.set(src,rowInput.value);
    if(!draft.size)rowNumberDrafts.delete(work.slug);
    galleryGrid.closest('.work-card').querySelector('.gallery-status').textContent='줄 번호 수정 중 · 배치 적용을 누르면 저장됩니다.';
  });
  item.classList.toggle('works-excluded', !toggle.checked);
  toggle.addEventListener('change', async () => {
    const visible = toggle.checked;
    galleryBusy(galleryGrid, true, '표시 설정을 저장하고 있어요…');
    try {
      const updated = await api('/api/works/' + work.slug + '/gallery/visibility', {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({src,visible})});
      work.works_hidden_images = updated.works_hidden_images;
      item.classList.toggle('works-excluded', !visible);
      galleryBusy(galleryGrid, false, visible ? 'Works에 표시됩니다.' : 'Works에서 숨겼어요. 상세페이지에는 유지됩니다.');
    } catch (error) { toggle.checked = !visible; galleryBusy(galleryGrid, false, error.message); }
  });
  item.querySelector('.gallery-remove').addEventListener('click', async () => {
    if (galleryGrid.dataset.busy === 'true') return;
    galleryBusy(galleryGrid, true, '이미지를 삭제하고 있어요…');
    try {
      const updated = await api('/api/works/' + work.slug + '/gallery/' + item.dataset.index, {method:'DELETE'});
      refreshGalleryGrid(galleryGrid, work, updated.gallery || []);
      galleryBusy(galleryGrid, false, '이미지를 삭제했어요.');
    } catch (error) { galleryBusy(galleryGrid, false, error.message); }
  });
  item.querySelector('.move-previous').addEventListener('click', () => moveGalleryImage(galleryGrid, work, index, index - 1));
  item.querySelector('.move-next').addEventListener('click', () => moveGalleryImage(galleryGrid, work, index, index + 1));
  item.addEventListener('keydown', event => {
    if (event.altKey && ['ArrowLeft','ArrowRight'].includes(event.key)) {
      event.preventDefault(); moveGalleryImage(galleryGrid, work, index, index + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  item.addEventListener('dragstart', event => {
    if (galleryGrid.dataset.busy === 'true' || event.target.closest('button, input, label')) { event.preventDefault(); return; }
    galleryGrid.dataset.dragIndex = String(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', work.slug + ':' + index);
    item.classList.add('dragging');
  });
  item.addEventListener('dragover', event => {
    if (galleryGrid.dataset.dragIndex === undefined || galleryGrid.dataset.busy === 'true') return;
    event.preventDefault(); event.dataTransfer.dropEffect = 'move'; item.classList.add('drop-target');
  });
  item.addEventListener('dragleave', () => item.classList.remove('drop-target'));
  item.addEventListener('drop', event => {
    if (galleryGrid.dataset.dragIndex === undefined) return;
    event.preventDefault(); item.classList.remove('drop-target');
    const from = Number(galleryGrid.dataset.dragIndex);
    delete galleryGrid.dataset.dragIndex;
    if(!galleryRows(work).some(row=>row.includes(work.gallery[from]) && row.includes(src))) moveGalleryImage(galleryGrid, work, from, index);
  });
  item.addEventListener('dragend', () => {
    delete galleryGrid.dataset.dragIndex;
    galleryGrid.querySelectorAll('.gallery-item').forEach(tile => tile.classList.remove('dragging','drop-target'));
  });
  galleryGrid.appendChild(item);
}

// ── Works ──
async function loadWorks() {
  const drafts = new Map();
  document.querySelectorAll('.work-card').forEach((card) => {
    const slug = card.dataset.slug;
    if (slug && dirtyWorks.has(slug)) {
      const form = card.querySelector('.edit-form');
      if (form) drafts.set(slug, captureWorkForm(form));
    }
  });

  const works = await api('/api/works');
  const list = document.getElementById('worksList');
  list.innerHTML = '';
  works.forEach((work) => {
    const card = renderWorkCard(work);
    if (openWorkSlugs.has(work.slug)) card.classList.add('open');
    if (drafts.has(work.slug)) applyWorkForm(card.querySelector('.edit-form'), drafts.get(work.slug));
    list.appendChild(card);
  });
  filterWorks();
}

function renderWorkCard(work) {
  const card = document.createElement('div');
  card.className = 'work-card';
  card.dataset.slug = work.slug;
  card.innerHTML = `
    <button type="button" class="work-card-head" aria-expanded="${openWorkSlugs.has(work.slug)}">
      <span class="work-preview"></span><span class="work-card-caption"><strong class="work-title"></strong><span class="work-subtitle"></span><span class="work-slug">${escapeHtml(work.slug)}</span></span><span class="work-expand" aria-hidden="true">＋</span>
    </button>
    <div class="work-card-body">
      <form class="admin-form edit-form">
        <div class="field-row">
          <label>작업명<input name="title" value="${escapeAttr(work.title)}" /></label>
          <label>연도 / 월<input name="year" type="text" placeholder="2025.03 (월 생략 가능)" value="${escapeAttr(workDateLabel(work))}" required /></label>
        </div>
        <label>유형<div class="chk-group">${checkboxGroup('types', [...new Set([...TYPE_OPTIONS,work.type,...(work.tags||[])].filter(Boolean))], [work.type,...(work.tags||[])])}</div></label>
        <label>제작<select name="production">${selectOptions(PRODUCTION_OPTIONS, work.production)}</select></label>
        <fieldset class="tech-field"><legend>기술 (복수 선택)</legend><div class="chk-group work-tech-options">${techCheckboxes(work.tech || [])}</div><p class="field-help">선택을 바꾸고 저장하면 상세페이지의 기술 정보에도 반영됩니다. 항목은 위의 ‘기술 선택 목록 편집’에서 수정할 수 있어요.</p></fieldset>
        <label>설명 (엔터로 줄바꿈)<textarea name="description" rows="4">${escapeHtml(work.description)}</textarea></label>
        <label>설명 (EN)<textarea name="description_en" rows="4">${escapeHtml(work.description_en)}</textarea></label>
        <label>외부 영상 링크 · Vimeo<input name="vimeo_url" value="${escapeAttr(work.vimeo_url)}" /></label>
        <div class="field-row"><label>상세 이미지 배경색<input type="color" name="detail_background" value="${/^#[0-9a-f]{6}$/i.test(work.detail_background || '') ? work.detail_background : '#dddddd'}" /></label><button type="button" class="reset-detail-background">기본 회색으로</button></div>
        <input type="hidden" name="detail_columns" value="${Number(work.detail_columns || 1)}" />
        <div class="field-row">
          <button type="submit">저장</button>
          <button type="button" class="danger delete-work">삭제</button>
        </div>
      </form>
      <div class="project-video-tools" data-video-target="works:${escapeAttr(work.slug)}"></div>
      <h4>갤러리 이미지</h4><p class="field-help">이미지마다 줄 번호를 입력하고 배치 적용을 눌러주세요. 같은 줄 안에서는 갤러리 순서대로 표시됩니다.</p>
      <div class="gallery-grid"></div>
      <label class="gallery-upload">이미지 여러 장 추가<input type="file" accept="image/*" multiple class="gallery-input" /></label><p class="field-help">Ctrl 또는 Shift로 여러 파일을 선택할 수 있어요. 한 번에 최대 20장까지 추가됩니다.</p><p class="gallery-status" role="status"></p>
    </div>
  `;

  updateWorkCardHead(card, work);
  const galleryGrid = card.querySelector('.gallery-grid');
  (work.gallery || []).forEach((src, i) => appendGalleryItem(galleryGrid, work, src, i));
  decorateGalleryRows(galleryGrid, work);
  const layoutTools=document.createElement('div'); layoutTools.className='gallery-layout-tools';
  layoutTools.innerHTML='<span>같은 줄 번호는 나란히 배치됩니다. 한 줄에 최대 3장 · 작은 번호부터 표시 · 적용 전에는 이미지 위치가 유지됩니다.</span><button type="button" class="primary">배치 적용</button>';
  galleryGrid.before(layoutTools);
  layoutTools.querySelector('button').onclick=()=>{
    const rows=new Map();
    for(const input of galleryGrid.querySelectorAll('.gallery-row-number')){
      const number=Number(input.value);
      if(!Number.isSafeInteger(number)||number<1){input.focus();card.querySelector('.gallery-status').textContent='줄 번호는 1 이상의 정수로 입력해주세요.';return;}
      if(!rows.has(number))rows.set(number,[]);
      rows.get(number).push(work.gallery[Number(input.closest('.gallery-item').dataset.index)]);
    }
    for(const [number,row] of rows)if(row.length>3){card.querySelector('.gallery-status').textContent=`${number}번 줄에 ${row.length}장이 있어요. 한 줄에는 최대 3장까지 배치할 수 있어요.`;return;}
    saveGalleryRows(galleryGrid,work,[...rows].sort((a,b)=>a[0]-b[0]).map(([,row])=>row));
  };

  card.querySelector('.work-card-head').addEventListener('click', () => {
    const willClose = card.classList.contains('open');
    if (willClose && dirtyWorks.has(work.slug)) {
      if (!confirm('저장하지 않은 변경이 있어요. 닫을까요?')) return;
      dirtyWorks.delete(work.slug);
    }
    card.classList.toggle('open');
    card.querySelector('.work-card-head').setAttribute('aria-expanded', String(card.classList.contains('open')));
    if (card.classList.contains('open')) openWorkSlugs.add(work.slug);
    else openWorkSlugs.delete(work.slug);
  });

  const editForm = card.querySelector('.edit-form');
  editForm.id = `work-editor-${work.slug}`;
  const videoSection = document.createElement('section');
  videoSection.className = 'work-video-section';
  const videoLink = editForm.querySelector('[name="vimeo_url"]');
  videoLink.setAttribute('form', editForm.id);
  videoLink.addEventListener('input', () => markWorkDirty(work.slug));
  videoLink.addEventListener('change', () => markWorkDirty(work.slug));
  videoSection.append(card.querySelector('.project-video-tools'), videoLink.closest('label'));
  const actions = editForm.querySelector('[type="submit"]').parentElement;
  actions.className = 'work-actions';
  actions.querySelector('[type="submit"]').setAttribute('form', editForm.id);
  const documentsSection = document.createElement('section');
  documentsSection.className = 'work-documents';
  documentsSection.innerHTML = `<h4>PDF 첨부</h4><p class="field-help">첨부하면 상세 설명 맨 아래에 보도자료 링크가 표시됩니다. 파일당 50MB, 한 번에 6개까지 올릴 수 있어요. 첨부와 제거는 바로 저장됩니다.</p><div class="work-document-list"></div><label>PDF 파일 추가<input type="file" accept="application/pdf,.pdf" multiple /></label><p role="status"></p>`;
  const pdfInput = documentsSection.querySelector('input');
  const pdfStatus = documentsSection.querySelector('[role="status"]');
  const renderDocuments = () => {
    const list = documentsSection.querySelector('.work-document-list');
    list.replaceChildren();
    for (const item of work.documents || []) {
      const row = document.createElement('div');
      const link = document.createElement('a');
      link.textContent = item.name || 'PDF 보기';
      link.href = item.file.replace('/3dowonWebpage/assets/', '/site/assets/'); link.target = '_blank'; link.rel = 'noopener';
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'danger'; remove.textContent = '첨부 제거';
      remove.onclick = async () => {
        if (!confirm('이 PDF 첨부를 제거할까요?')) return;
        remove.disabled = true;
        try {
          work.documents = await api(`/api/works/${work.slug}/documents/${item.id}`, { method: 'DELETE' });
          renderDocuments(); pdfStatus.textContent = '첨부를 제거했어요.';
        } catch (error) { pdfStatus.textContent = error.message; remove.disabled = false; }
      };
      row.append(link, remove); list.append(row);
    }
  };
  pdfInput.onchange = async () => {
    if (!pdfInput.files.length) return;
    const data = new FormData();
    for (const file of pdfInput.files) data.append('pdfs', file);
    pdfInput.disabled = true; pdfStatus.textContent = 'PDF를 첨부하고 있어요…';
    try {
      work.documents = await api(`/api/works/${work.slug}/documents`, { method: 'POST', body: data });
      renderDocuments(); pdfStatus.textContent = 'PDF를 첨부했어요.';
    } catch (error) { pdfStatus.textContent = error.message; }
    finally { pdfInput.disabled = false; pdfInput.value = ''; }
  };
  renderDocuments();
  card.querySelector('.work-card-body').append(videoSection, documentsSection, actions);
  card.querySelector('.reset-detail-background').addEventListener('click', () => {
    editForm.detail_background.value = '#dddddd';
    markWorkDirty(work.slug);
  });
  editForm.addEventListener('input', () => markWorkDirty(work.slug));
  editForm.addEventListener('change', () => markWorkDirty(work.slug));

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveButton = card.querySelector('.work-actions [type="submit"]');
    saveButton.disabled = true;
    try {
    const fd = new FormData(e.target);
    const updated = await api(`/api/works/${work.slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: fd.get('title'),
        year: fd.get('year'),
        types: fd.getAll('types'),
        production: fd.get('production'),
        ...(JSON.stringify(fd.getAll('tech').slice().sort()) !== JSON.stringify((work.tech || []).slice().sort()) ? {tech:fd.getAll('tech')} : {}),
        description: fd.get('description'),
        description_en: fd.get('description_en'),
        vimeo_url: fd.get('vimeo_url'),
        detail_background: fd.get('detail_background'),
        detail_columns: work.detail_rows ? 1 : Number(fd.get('detail_columns')),
      }),
    });
    dirtyWorks.delete(work.slug);
    openWorkSlugs.add(work.slug);
    card.classList.add('open');
    Object.assign(work, updated);
    updateWorkCardHead(card, updated);
    filterWorks();
    alert('저장했어요.');
    } catch (error) { alert(error.message); }
    finally { saveButton.disabled = false; }
  });

  card.querySelector('.delete-work').addEventListener('click', async () => {
    if (!confirm(`"${work.title}"을(를) 삭제할까요?`)) return;
    await api(`/api/works/${work.slug}`, { method: 'DELETE' });
    loadWorks();
  });

  card.querySelector('.gallery-input').addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    if (files.length > 20) { card.querySelector('.gallery-status').textContent = '한 번에 최대 20장까지 선택해주세요.'; e.target.value = ''; return; }
    galleryBusy(galleryGrid, true, files.length + '장의 이미지를 추가하고 있어요…');
    const fd = new FormData();
    for (const f of files) fd.append('images', f);
    try {
      const updated = await api(`/api/works/${work.slug}/gallery`, { method: 'POST', body: fd });
      refreshGalleryGrid(galleryGrid, work, updated.gallery || []);
      galleryBusy(galleryGrid, false, files.length + '장의 이미지를 추가했어요.');
      openWorkSlugs.add(work.slug);
      card.classList.add('open');
      e.target.value = '';
    } catch (err) {
      galleryBusy(galleryGrid, false, err.message);
      e.target.value = '';
    }
  });

  return card;
}

document.getElementById('newWorkTypes').innerHTML = checkboxGroup('types', TYPE_OPTIONS, []);

document.getElementById('newWorkForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const created = await api('/api/works', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: fd.get('title'),
        year: fd.get('year'),
        types: fd.getAll('types'),
      }),
    });
    e.target.reset();
    if (created.slug) openWorkSlugs.add(created.slug);
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
  form.name_en.value = about.name_en || '';
  form.meta.value = about.meta;
  form.meta_en.value = about.meta_en || '';
  form.body.value = about.body;
  form.body_en.value = about.body_en || '';
  document.getElementById('aboutImagePreview').src = imgUrl(about.image);
}

document.getElementById('aboutForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  await api('/api/about', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: fd.get('name'),
      name_en: fd.get('name_en'),
      meta: fd.get('meta'),
      meta_en: fd.get('meta_en'),
      body: fd.get('body'),
      body_en: fd.get('body_en'),
    }),
  });
  alert('저장했어요.');
});

document.getElementById('aboutImageInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('image', file);
  try {
    await api('/api/about/image', { method: 'POST', body: fd });
    loadAbout();
  } catch (err) {
    alert(err.message);
    e.target.value = '';
  }
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
        <input value="${escapeAttr(entry.description_en || '')}" placeholder="내용 (EN)" />
        <button type="button" class="danger">×</button>
      `;
      const [yearInput, descInput, descEnInput, removeBtn] = row.children;
      yearInput.addEventListener('input', (e) => { entry.year = e.target.value; });
      descInput.addEventListener('input', (e) => { entry.description = e.target.value; });
      descEnInput.addEventListener('input', (e) => { entry.description_en = e.target.value; });
      removeBtn.addEventListener('click', () => {
        section.entries.splice(ei, 1);
        renderCv();
      });
      entriesBox.appendChild(row);
    });

    card.querySelector('.add-entry').addEventListener('click', () => {
      section.entries.push({ year: '', description: '', description_en: '' });
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
async function loadLabTranslationStatus() {
  try {
    const status = await api('/api/lab/translation');
    document.getElementById('labTranslationStatus').textContent = status.configured ? 'API 키 등록됨 · 저장 시 자동 번역' : 'API 키를 등록하면 자동 번역을 사용할 수 있어요.';
  } catch (error) { document.getElementById('labTranslationStatus').textContent = error.message; }
}
document.getElementById('labTranslationForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    await api('/api/lab/translation', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({key:form.key.value})});
    form.reset();
    await loadLabTranslationStatus();
  } catch (error) { document.getElementById('labTranslationStatus').textContent = error.message; }
  finally { button.disabled = false; }
});
loadLabTranslationStatus();

async function loadLab() {
  const { lab } = await api('/api/site');
  const list = document.getElementById('labList');
  list.innerHTML = '';
  lab.items.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'lab-card thumb-row';
    card.innerHTML = `
      ${item.video ? `<video src="${escapeAttr(imgUrl(item.video))}" muted autoplay loop playsinline style="width:100px;height:100px;object-fit:cover" aria-label="영상 미리보기"></video>` : `<img src="${escapeAttr(imgUrl(item.image))}" alt="" />`}
      <input value="${escapeAttr(item.caption)}" class="lab-caption" aria-label="제목 (한글)" placeholder="제목 (한글)" />
      <input value="${escapeAttr(item.caption_en || '')}" class="lab-caption" aria-label="제목 (영문)" placeholder="제목 (영문)" />
      <button type="button" class="danger">삭제</button>
      <label>날짜 (연·월)<input class="lab-date" value="${escapeAttr(item.year ? `${item.year}${item.month ? '.' + String(item.month).padStart(2,'0') : ''}` : '')}" placeholder="2026.03" /></label>
      <label>파일 교체<input class="lab-replace" type="file" accept="image/*,video/*,.mp4,.mov,.webm,.m4v" /></label>
      <span class="lab-status" role="status"></span>
      <label>내용<textarea class="lab-description" rows="3">${escapeAttr(item.description || '')}</textarea></label>
      <label>내용 (EN)<textarea class="lab-description-en" rows="3">${escapeAttr(item.description_en || '')}</textarea></label>
    `;
    const download=document.createElement('a');download.textContent='파일 다운로드';download.href='/api/mux/local-download?target='+encodeURIComponent('lab:'+i)+'&src='+encodeURIComponent(item.video||item.image||'');card.append(download);

    const [img, captionInput, captionEnInput, removeBtn] = card.children;
    let saving = false;
    const saveCaptions = async () => {
      if (saving) return;
      saving = true;
      const controls = [...card.querySelectorAll('input, textarea, button')];
      controls.forEach(control => control.disabled = true);
      card.querySelector('.lab-status').textContent = '저장 및 번역 중…';
      try { const result = await api(`/api/lab/items/${i}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption:captionInput.value, caption_en:captionEnInput.value, date:card.querySelector('.lab-date').value.trim(), description:card.querySelector('.lab-description').value, description_en:card.querySelector('.lab-description-en').value }),
      });
      card.querySelector('.lab-description-en').value = result.items[i]?.description_en || '';
      card.querySelector('.lab-status').textContent = result.translationWarning || '저장되었습니다.';
      } catch(error) { card.querySelector('.lab-status').textContent = error.message; }
      finally { saving = false; controls.forEach(control => control.disabled = false); }
    };
    captionInput.addEventListener('change', saveCaptions);
    captionEnInput.addEventListener('change', saveCaptions);
    card.querySelector('.lab-date').addEventListener('change',saveCaptions);
    card.querySelector('.lab-description').addEventListener('change',saveCaptions);
    card.querySelector('.lab-description-en').addEventListener('change',saveCaptions);
    card.querySelector('.lab-replace').addEventListener('change',async (event) => {
      const input = event.target;
      const file = input.files[0];
      if (!file) return;
      if (file.size > 150*1024*1024) { input.value=''; return alert('파일은 150MB 이하로 올려주세요.'); }
      const status = card.querySelector('.lab-status');
      input.disabled = true;
      removeBtn.disabled = true;
      status.textContent = '파일 교체 중입니다. 영상 변환은 잠시 걸릴 수 있어요.';
      const data = new FormData(); data.append('image',file);
      try { await api(`/api/lab/items/${i}/file`,{method:'POST',body:data}); await loadLab(); }
      catch(error) { status.textContent=error.message; }
      finally { input.disabled=false; removeBtn.disabled=false; input.value=''; }
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
  if (!file) return alert('이미지 또는 영상을 선택하세요.');
  if (file.size > 150 * 1024 * 1024) return alert('파일은 150MB 이하로 올려주세요.');
  const fd = new FormData();
  fd.append('image', file);
  fd.append('caption', e.target.caption.value);
  fd.append('caption_en', e.target.caption_en.value);
  fd.append('date', e.target.date.value.trim());
  fd.append('description', e.target.description.value);
  fd.append('description_en', e.target.description_en.value);
  const button = e.target.querySelector('button[type="submit"]');
  const status = document.getElementById('labUploadStatus');
  if (button.disabled) return;
  button.disabled = true;
  status.textContent = '업로드 및 처리 중입니다. 영상 변환은 잠시 걸릴 수 있어요.';
  try {
    const result = await api('/api/lab/items', { method: 'POST', body: fd });
    e.target.reset();
    await loadLab();
    status.textContent = result.translationWarning || '추가되었습니다.';
  } catch (err) {
    status.textContent = '추가하지 못했습니다.';
    alert(err.message);
  } finally {
    button.disabled = false;
  }
});

// ── Site (contact/SNS) ──
async function loadSiteInfo() {
  const { site } = await api('/api/site');
  const form = document.getElementById('siteForm');
  form.instagram.value = site.instagram || '';
  form.youtube.value = site.youtube || '';
  form.github.value = site.github || '';
  form.naver_blog.value = site.naver_blog || '';
}

document.getElementById('siteForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  await api('/api/site', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instagram: fd.get('instagram'),
      youtube: fd.get('youtube'),
      github: fd.get('github'),
      naver_blog: fd.get('naver_blog'),
    }),
  });
  alert('저장했어요.');
});

// ── Deploy ──
document.getElementById('deployBtn').addEventListener('click', async () => {
  const btn = document.getElementById('deployBtn');
  const status = document.getElementById('deployStatus');
  const messageInput = document.getElementById('deployMessage');

  btn.disabled = true;
  status.textContent = '배포 중...';
  status.className = 'deploy-status';
  try {
    const result = await api('/api/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: messageInput.value }),
    });
    status.textContent = result.message;
    status.className = `deploy-status ${result.deployed ? 'ok' : ''}`;
    if (result.deployed) messageInput.value = '';
  } catch (err) {
    status.textContent = `실패: ${err.message}`;
    status.className = 'deploy-status error';
  } finally {
    btn.disabled = false;
  }
});

Promise.all([loadTechnologyOptions(),loadTypeOptions()]).then(loadWorks).catch(error => { document.getElementById('worksList').textContent = error.message; });
loadAbout();
loadCv();
loadLab();
loadSiteInfo();

function addTypeRow(option={name:'',en:''}){
 const row=document.createElement('div');row.className='tech-option-row';row.innerHTML='<label>유형 이름<input class="type-name" required maxlength="100" value="'+escapeAttr(option.name)+'" /></label><label>영문 표기<input class="type-en" maxlength="100" value="'+escapeAttr(option.en)+'" /></label><button type="button" class="danger">목록에서 제거</button>';
 row.querySelector('button').onclick=()=>{row.remove();typeOptionsDirty=true;};document.getElementById('typeOptionsRows').append(row);
}
async function loadTypeOptions(){const options=await api('/api/type-options');TYPE_OPTIONS=options.map(o=>o.name);options.forEach(addTypeRow);document.getElementById('newWorkTypes').innerHTML=checkboxGroup('types',TYPE_OPTIONS,[]);}
document.getElementById('addTypeOption').onclick=()=>{addTypeRow();typeOptionsDirty=true;document.querySelector('#typeOptionsRows .tech-option-row:last-child input').focus();};
document.getElementById('typeOptionsForm').oninput=()=>{typeOptionsDirty=true;};
document.getElementById('typeOptionsForm').onsubmit=async event=>{
 event.preventDefault();const button=event.target.querySelector('[type=submit]'),status=document.getElementById('typeOptionsStatus');button.disabled=true;
 try{const options=[...document.querySelectorAll('#typeOptionsRows .tech-option-row')].map(row=>({name:row.querySelector('.type-name').value,en:row.querySelector('.type-en').value}));const saved=await api('/api/type-options',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({options})});TYPE_OPTIONS=saved.map(o=>o.name);
 document.querySelectorAll('#newWorkTypes,.edit-form .chk-group').forEach(group=>{if(group.id!=='newWorkTypes'&&!group.querySelector('input[name=types]'))return;const selected=[...group.querySelectorAll(':checked')].map(i=>i.value);group.innerHTML=checkboxGroup('types',[...new Set([...TYPE_OPTIONS,...selected])],selected);});typeOptionsDirty=false;status.textContent='유형 목록을 저장했어요.';
 }catch(e){status.textContent=e.message;}finally{button.disabled=false;}
};
