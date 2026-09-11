(() => {
  const list = document.getElementById('materialsList');
  const upload = document.getElementById('materialsUpload');
  const saveButton = document.getElementById('saveMaterials');
  const status = document.getElementById('materialsStatus');
  let items = [], saved = [], busy = true, dirty = false;
  const setBusy = value => {
    busy = value;
    upload.disabled = value;
    saveButton.disabled = value;
    list.querySelectorAll('input,button').forEach(el => { el.disabled = value; });
  };
  function accept(data) {
    saved = structuredClone(data.items);
    items = structuredClone(data.items);
    dirty = false;
    render();
  }
  async function persist() {
    if (!dirty) return;
    const data = await api('/api/teaching-materials', {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({items,expected:saved})});
    accept(data);
  }
  async function run(action) {
    if (busy) return;
    setBusy(true); status.textContent = '저장 중…';
    try { await action(); status.textContent = '저장했어요.'; }
    catch(error) { status.textContent = error.message; }
    finally { setBusy(false); }
  }
  function render() {
    list.replaceChildren();
    items.forEach((item, index) => {
      const row = document.createElement('section');
      row.className = 'material-editor admin-form';
      row.innerHTML = `<h3>PDF ${index + 1}</h3><label>제목<input class="material-title" value="${escapeAttr(item.title)}" maxlength="200" required /></label><label>제목 (EN, 선택)<input class="material-title-en" value="${escapeAttr(item.title_en || '')}" maxlength="200" /></label><div class="field-row"><a href="${escapeAttr(imgUrl(item.file))}" target="_blank" rel="noopener">PDF 보기 ↗</a><button type="button" class="move-up">↑</button><button type="button" class="move-down">↓</button><button type="button" class="remove-material">목록에서 삭제</button></div><label>PDF 교체<input class="replace-pdf" type="file" accept="application/pdf,.pdf" /></label>`;
      row.querySelector('.material-title').addEventListener('input', e => { item.title = e.target.value; dirty = true; });
      row.querySelector('.material-title-en').addEventListener('input', e => { item.title_en = e.target.value; dirty = true; });
      const move = offset => { const next = index + offset; if (next < 0 || next >= items.length) return; [items[index],items[next]] = [items[next],items[index]]; dirty = true; render(); };
      row.querySelector('.move-up').addEventListener('click', () => move(-1));
      row.querySelector('.move-down').addEventListener('click', () => move(1));
      row.querySelector('.remove-material').addEventListener('click', () => { items.splice(index,1); dirty = true; render(); status.textContent = '목록 저장을 누르면 삭제가 반영됩니다.'; });
      row.querySelector('.replace-pdf').addEventListener('change', e => {
        const file = e.target.files[0]; if (!file) return;
        run(async () => { await persist(); const data = new FormData(); data.append('pdfs',file); accept(await api(`/api/teaching-materials/${item.id}/file`,{method:'POST',body:data})); });
      });
      list.append(row);
    });
    setBusy(busy);
  }
  upload.addEventListener('change', () => {
    const files = [...upload.files]; if (!files.length) return;
    if (files.length > 6 || files.some(file => file.size > 50 * 1024 * 1024)) { status.textContent = '한 번에 6개, 파일당 50MB까지 선택해주세요.'; upload.value = ''; return; }
    run(async () => { await persist(); const data = new FormData(); files.forEach(file => data.append('pdfs',file)); accept(await api('/api/teaching-materials',{method:'POST',body:data})); upload.value = ''; });
  });
  saveButton.addEventListener('click', () => run(persist));
  window.addEventListener('beforeunload', event => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } });
  setBusy(true);
  api('/api/teaching-materials').then(data => { accept(data); setBusy(false); }).catch(error => { status.textContent = error.message; });
})();
