(() => {
  const rows = document.getElementById('featuredProjectRows');
  const add = document.getElementById('addFeaturedProject');
  const save = document.getElementById('saveFeaturedProjects');
  const status = document.getElementById('featuredProjectsStatus');
  let projects = [], works = [], dirty = false, busy = false, media, cover;
  function render() {
    rows.replaceChildren();
    projects.forEach((slug,index) => {
      const work = works.find(item => item.slug === slug);
      const row = document.createElement('div'); row.className = 'featured-admin-row';
      const image = document.createElement('img');
      const source = cover(work) || (media(work)?.kind === 'mux' ? `https://image.mux.com/${media(work).src}/thumbnail.jpg?time=2` : '');
      if (source) image.src = imgUrl(source); image.alt = work.title; row.append(image);
      const label = document.createElement('label'); label.textContent = `${String(index+1).padStart(2,'0')} · 대표 프로젝트`;
      const select = document.createElement('select'); select.setAttribute('aria-label',`${index+1}번 대표 프로젝트`);
      works.forEach(candidate => {
        const option = document.createElement('option'); option.value = candidate.slug;
        option.textContent = `${candidate.title} · ${candidate.year || ''} · ${media(candidate) ? '영상' : '이미지'}`;
        option.disabled = projects.includes(candidate.slug) && candidate.slug !== slug;
        select.append(option);
      });
      select.value = slug; select.disabled = busy;
      select.onchange = () => { projects[index] = select.value; changed(); };
      label.append(select); row.append(label);
      const actions = document.createElement('div'); actions.className = 'featured-admin-row-actions';
      for (const [offset,text] of [[-1,'↑ 위로'],[1,'↓ 아래로'],[0,'제외']]) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
        button.setAttribute('aria-label',`${index+1}번 대표 프로젝트 ${text}`);
        button.disabled = busy || (offset < 0 && index === 0) || (offset > 0 && index === projects.length-1) || (offset === 0 && projects.length === 1);
        button.onclick = () => {
          if (offset) [projects[index],projects[index+offset]] = [projects[index+offset],projects[index]];
          else projects.splice(index,1);
          changed();
        };
        actions.append(button);
      }
      row.append(actions); rows.append(row);
    });
    add.disabled = busy || projects.length >= Math.min(10,works.length);
    save.disabled = busy || !dirty || projects.length === 0;
  }
  function changed() { dirty = true; status.textContent = '변경사항이 있어요. 대표 프로젝트 저장을 눌러주세요.'; render(); }
  async function load() {
    if (busy || dirty) return;
    busy = true; add.disabled = true; status.textContent = '대표 프로젝트를 불러오는 중…';
    try {
      const [list,config,helpers,images] = await Promise.all([api('/api/works'),api('/api/featured-projects'),import('./featured-projects.mjs?v=1'),import('./work-images.mjs?v=1')]);
      works = list; media = helpers.featuredMedia; cover = images.workCoverImage;
      projects = config.projects.filter(slug => works.some(work => work.slug === slug));
      status.textContent = '첫 번째 작품부터 홈에 표시됩니다.';
    } catch(error) { status.textContent = error.message; }
    finally { busy = false; if (media) render(); }
  }
  add.onclick = () => {
    const candidate = works.find(work => !projects.includes(work.slug) && media(work)) || works.find(work => !projects.includes(work.slug));
    if (candidate && projects.length < 10) { projects.push(candidate.slug); changed(); }
  };
  save.onclick = async () => {
    if (busy || !dirty) return;
    busy = true; render(); status.textContent = '저장 중…';
    try {
      const result = await api('/api/featured-projects',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({projects})});
      projects = result.projects; dirty = false; status.textContent = '대표 프로젝트와 순서를 저장했어요.';
    } catch(error) { status.textContent = error.message; }
    finally { busy = false; render(); }
  };
  document.querySelector('[data-tab="home"]').addEventListener('click',load);
  window.addEventListener('beforeunload',event => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } });
})();
