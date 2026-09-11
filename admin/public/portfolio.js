(() => {
  const grid = document.getElementById('portfolioImages');
  const input = document.getElementById('portfolioUpload');
  const status = document.getElementById('portfolioStatus');
  let images = [], busy = false, dragged = -1;
  function setBusy(value) {
    busy = value;
    input.disabled = value;
    grid.querySelectorAll('button').forEach(button => { button.disabled = value; });
  }
  async function save(next) {
    if (busy) return;
    setBusy(true);
    status.textContent = '저장 중…';
    try {
      const result = await api('/api/portfolio/images', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ images: next, expected: images }) });
      images = result.images;
      render();
      status.textContent = '저장했어요.';
    } catch (error) { status.textContent = error.message; }
    finally { setBusy(false); }
  }
  function move(from, to) {
    if (busy || from < 0 || to < 0 || to >= images.length || from === to) return;
    const next = [...images];
    next.splice(to, 0, next.splice(from, 1)[0]);
    save(next);
  }
  function render() {
    grid.replaceChildren();
    images.forEach((src, index) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      item.draggable = true;
      item.innerHTML = `<img src="${escapeAttr(imgUrl(src))}" alt="Portfolio ${index + 1}" loading="lazy" /><span class="portfolio-page-number">${index + 1}</span><div class="portfolio-controls"><button type="button" aria-label="${index + 1}번 이미지 앞으로">←</button><button type="button" aria-label="${index + 1}번 이미지 뒤로">→</button><button type="button" aria-label="${index + 1}번 이미지 삭제">삭제</button></div>`;
      const [prev, next, remove] = item.querySelectorAll('button');
      prev.addEventListener('click', () => move(index, index - 1));
      next.addEventListener('click', () => move(index, index + 1));
      remove.addEventListener('click', () => { if (confirm(`${index + 1}번 이미지를 Portfolio에서 삭제할까요?`)) save(images.filter((_, i) => i !== index)); });
      item.addEventListener('dragstart', event => { if (busy) { event.preventDefault(); return; } dragged = index; event.dataTransfer.setData('text/plain', String(index)); event.dataTransfer.effectAllowed = 'move'; });
      item.addEventListener('dragover', event => { if (!busy && dragged >= 0) { event.preventDefault(); item.classList.add('drag-over'); } });
      item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
      item.addEventListener('drop', event => { event.preventDefault(); item.classList.remove('drag-over'); move(dragged, index); dragged = -1; });
      item.addEventListener('dragend', () => { dragged = -1; grid.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over')); });
      grid.append(item);
    });
  }
  input.addEventListener('change', async () => {
    const files = [...input.files];
    if (!files.length || busy) return;
    if (files.length > 20) { status.textContent = '한 번에 최대 20장까지 선택해주세요.'; input.value = ''; return; }
    const data = new FormData();
    files.forEach(file => data.append('images', file));
    setBusy(true); status.textContent = `${files.length}장 업로드 중…`;
    try {
      images = (await api('/api/portfolio/images', { method: 'POST', body: data })).images;
      render(); status.textContent = '업로드했어요. Portfolio 페이지에서 확인할 수 있어요.';
    } catch (error) { status.textContent = error.message; }
    finally { input.value = ''; setBusy(false); }
  });
  setBusy(true);
  api('/api/portfolio').then(data => { images = data.images; render(); }).catch(error => { status.textContent = error.message; }).finally(() => setBusy(false));
})();
