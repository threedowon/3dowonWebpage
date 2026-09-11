const mobile = matchMedia('(max-width:900px)');
const cards = [...document.querySelectorAll('.teaching-card[data-pdf]')];
const dialog = document.querySelector('.pdf-reader');
const ko = document.documentElement.lang === 'ko';
let library;
const documents = new Map();
async function loadPdf(url) {
  library ||= import('./assets/pdfjs/pdf.mjs').then(pdfjs => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('./assets/pdfjs/pdf.worker.mjs', import.meta.url).href;
    return pdfjs;
  }).catch(error => { library = null; throw error; });
  if (!documents.has(url)) documents.set(url, library.then(pdfjs => pdfjs.getDocument({
    url, cMapUrl:new URL('./assets/pdfjs/cmaps/', import.meta.url).href, cMapPacked:true,
    standardFontDataUrl:new URL('./assets/pdfjs/standard_fonts/', import.meta.url).href,
    wasmUrl:new URL('./assets/pdfjs/wasm/', import.meta.url).href,
  }).promise).catch(error => { documents.delete(url); throw error; }));
  return documents.get(url);
}
async function paint(page, canvas, width) {
  const scale = Math.min(devicePixelRatio || 1, 2);
  const viewport = page.getViewport({scale:width / page.getViewport({scale:1}).width * scale});
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({canvasContext:canvas.getContext('2d'), viewport}).promise;
}
const thumbnails = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting && mobile.matches) {
    thumbnails.unobserve(entry.target);
    const card = entry.target;
    loadPdf(card.dataset.pdf).then(pdf => pdf.getPage(1)).then(page => paint(page, card.querySelector('canvas'), card.clientWidth)).then(() => {
      card.classList.add('pdf-mobile-ready');
      if (mobile.matches) desktopFrames.get(card)?.remove();
    }).catch(() => {
      card.classList.remove('pdf-mobile-ready');
      const frame = desktopFrames.get(card);
      if (frame && !frame.isConnected) card.prepend(frame);
    });
  }
}, {rootMargin:'100px'});
const desktopFrames = new Map(cards.map(card => [card, card.querySelector('iframe')]));
let lastMode;
function syncMode() {
  if (lastMode === mobile.matches) return;
  lastMode = mobile.matches;
  for (const card of cards) {
    const frame = desktopFrames.get(card);
    if (mobile.matches) {
      if (card.classList.contains('pdf-mobile-ready')) frame.remove();
      else thumbnails.observe(card);
    }
    else {
      thumbnails.unobserve(card);
      if (!frame.isConnected) card.prepend(frame);
      if (!frame.getAttribute('src')) frame.src = frame.dataset.src;
    }
  }
  if (!mobile.matches && dialog.open) dialog.close();
}
syncMode();
mobile.addEventListener('change', syncMode);
window.addEventListener('resize', syncMode, {passive:true});
window.addEventListener('pageshow', syncMode);
let pdf, pageNumber = 1, zoom = false, revision = 0, opener;
const stage = dialog.querySelector('.pdf-reader-stage');
const scroll = dialog.querySelector('.pdf-canvas-scroll');
const status = dialog.querySelector('.pdf-page-status');
const error = dialog.querySelector('.pdf-reader-error');
const zoomButton = dialog.querySelector('[data-pdf-zoom]');
let pageObserver;
function updateStatus() {
  if (!pdf) return;
  status.textContent = `${pageNumber} / ${pdf.numPages}`;
  dialog.querySelectorAll('[data-pdf-step]').forEach(button => button.disabled = Number(button.dataset.pdfStep) < 0 ? pageNumber === 1 : pageNumber === pdf.numPages);
}
async function renderPage() {
  if (!pdf || !dialog.open) return;
  const token = ++revision, currentPdf = pdf;
  const restorePage = pageNumber;
  pageObserver?.disconnect();
  error.textContent = '';
  stage.setAttribute('aria-busy','true');
  try {
    const first = await currentPdf.getPage(1);
    if (token !== revision || !dialog.open) return;
    const base = first.getViewport({scale:1});
    const width = Math.max(1, scroll.clientWidth - 28) * (zoom ? 2 : 1);
    const pages = Array.from({length:currentPdf.numPages}, (_, index) => {
      const page = document.createElement('div');
      page.className = 'pdf-scroll-page';
      page.dataset.page = index + 1;
      page.style.width = width + 'px';
      page.style.height = width * base.height / base.width + 'px';
      page.setAttribute('aria-label', `Page ${index + 1}`);
      return page;
    });
    scroll.replaceChildren(...pages);
    pageObserver = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting && !entry.target.dataset.rendering) {
        const slot = entry.target;
        slot.dataset.rendering = 'true';
        currentPdf.getPage(Number(slot.dataset.page)).then(async page => {
          if (token !== revision) return;
          const viewport = page.getViewport({scale:1});
          slot.style.height = width * viewport.height / viewport.width + 'px';
          const canvas = document.createElement('canvas');
          canvas.setAttribute('role','img');
          canvas.setAttribute('aria-label', slot.getAttribute('aria-label'));
          await paint(page, canvas, width);
          if (token !== revision) return;
          canvas.style.width = width + 'px';
          canvas.style.height = 'auto';
          slot.replaceChildren(canvas);
        }).catch(() => {
          if (token === revision) slot.textContent = ko ? '페이지를 불러오지 못했어요. 자료를 다시 열어주세요.' : 'Unable to load page. Please reopen the document.';
        });
      }
    }, {root:scroll, rootMargin:'500px'});
    pages.forEach(page => pageObserver.observe(page));
    scroll.scrollTo(0, pages[restorePage - 1].offsetTop - 12);
    updateStatus();
  } catch { if (token === revision) error.textContent = ko ? '페이지를 표시하지 못했어요. 자료를 다시 열어주세요.' : 'Unable to display this page. Please reopen the document.'; }
  finally { if (token === revision) stage.removeAttribute('aria-busy'); }
}
function turn(delta) {
  if (!pdf) return;
  pageNumber = Math.max(1, Math.min(pdf.numPages, pageNumber + delta));
  const page = scroll.querySelector(`[data-page="${pageNumber}"]`);
  if (page) scroll.scrollTo({top:page.offsetTop - 12, behavior:'smooth'});
  updateStatus();
}
scroll.addEventListener('scroll', () => {
  if (!pdf) return;
  const pages = [...scroll.children];
  const target = scroll.scrollTop + Math.min(scroll.clientHeight * .3, 100);
  const page = pages.findLast(page => page.offsetTop <= target) || pages[0];
  if (page) { pageNumber = Number(page.dataset.page); updateStatus(); }
}, {passive:true});
document.addEventListener('click', async event => {
  const trigger = event.target.closest('[data-open-pdf]');
  if (!trigger) return;
  const card = trigger.closest('.teaching-card');
  if (!mobile.matches) { if (trigger.tagName === 'BUTTON') window.open(card.dataset.pdf,'_blank','noopener'); return; }
  event.preventDefault();
  opener = trigger;
  pdf = null; pageNumber = 1; zoom = false;
  const token = ++revision;
  dialog.classList.remove('is-zoomed'); zoomButton.setAttribute('aria-pressed','false');
  scroll.replaceChildren(); error.textContent='';
  status.textContent = ko ? '불러오는 중…' : 'Loading…';
  dialog.querySelector('.pdf-reader-title').textContent = card.dataset.pdfTitle;
  dialog.showModal(); document.documentElement.classList.add('pdf-reader-open');
  try { const loaded = await loadPdf(card.dataset.pdf); if(token !== revision || !dialog.open) return; pdf=loaded; renderPage(); }
  catch { if(token === revision) { status.textContent=''; error.textContent=ko ? 'PDF를 불러오지 못했어요. 잠시 후 다시 열어주세요.' : 'Unable to load PDF. Please try again.'; } }
});
dialog.querySelector('[data-pdf-close]').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=> { revision++; pageObserver?.disconnect(); pdf=null; document.documentElement.classList.remove('pdf-reader-open'); opener?.focus({preventScroll:true}); });
dialog.querySelectorAll('[data-pdf-step]').forEach(button=>button.addEventListener('click',()=>turn(Number(button.dataset.pdfStep))));
zoomButton.addEventListener('click',()=>{ zoom=!zoom; dialog.classList.toggle('is-zoomed',zoom); zoomButton.setAttribute('aria-pressed',String(zoom)); renderPage(); });
dialog.addEventListener('keydown',event=>{ if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();turn(event.key==='ArrowLeft'?-1:1);} });
let resizeTimer;
new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>renderPage(),120);}).observe(stage);
