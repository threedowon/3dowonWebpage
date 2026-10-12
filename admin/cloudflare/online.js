// Loaded only by the Cloudflare asset build. The local admin never loads this file.
(() => {
  const originalFetch = window.fetch.bind(window);
  let revision = null, queue = Promise.resolve();
  async function compress(file) {
    if (!/^image\//.test(file.type) || file.type === 'image/gif') return file;
    let image;
    try { image = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch { throw Error('이 이미지 형식은 브라우저에서 변환하지 못했어요. JPG로 내보내거나 로컬 관리자를 이용해주세요.'); }
    try {
      const ratio = Math.min(1, 2400 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * ratio)); canvas.height = Math.max(1, Math.round(image.height * ratio));
      const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .82));
      if (!blob) throw Error('이미지를 변환하지 못했어요.');
      return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
    } finally { image.close(); }
  }
  window.fetch = (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return originalFetch(input, options);
    const method = (options.method || 'GET').toUpperCase();
    const write = !['GET', 'HEAD'].includes(method);
    const run = async () => {
      const headers = new Headers(options.headers);
      if (write && revision) headers.set('If-Match', revision);
      let body = options.body;
      if (body instanceof FormData) {
        const prepared = new FormData(); let bytes = 0;
        for (const [key, value] of body) {
          const next = value instanceof File ? await compress(value) : value;
          if (next instanceof File) bytes += next.size;
          prepared.append(key, next);
        }
        if (bytes > 7.8 * 1024 * 1024) throw Error('온라인 업로드는 한 번에 총 8MB까지예요. 나누어 올리거나, 큰 영상은 Mux·로컬 관리자를 이용해주세요.');
        body = prepared;
      }
      const response = await originalFetch(input, { ...options, headers, body });
      const next = response.headers.get('X-Admin-Revision');
      // Reads never silently refresh an existing form's version after someone else saves.
      if (next && response.ok && (!revision || write)) revision = next;
      if (response.status === 401 && !document.getElementById('onlineLoginReminder')) {
        const link = document.createElement('a'); link.id = 'onlineLoginReminder'; link.href = '/login'; link.target = '_blank'; link.rel = 'noopener'; link.textContent = '로그인이 만료됐어요. 여기를 눌러 새 탭에서 로그인한 뒤 다시 저장해주세요.';
        document.querySelector('.admin-header').prepend(link);
      }
      return response;
    };
    if (!write) return run();
    const result = queue.then(run); queue = result.catch(() => {}); return result;
  };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.admin-note').textContent = '온라인 관리자 · 저장은 GitHub 초안에, 배포는 홈페이지에 반영됩니다.';
    const note = document.createElement('p'); note.className = 'panel-intro';
    note.textContent = '이미지는 브라우저에서 크기를 조정합니다. 파일은 한 번에 총 8MB까지, 큰 영상은 각 항목의 Mux 업로드를 이용하세요. 로컬 관리자는 기존처럼 사용할 수 있습니다.';
    document.querySelector('main').prepend(note);
    for (const [id, text] of [['muxSettings', '온라인 Mux 연결 키는 Cloudflare 비밀 설정에서 등록합니다.'], ['labTranslationForm', '온라인 자동 번역 키는 Cloudflare 비밀 설정에서 등록합니다.']]) {
      const form = document.getElementById(id);
      form.querySelectorAll('input,button').forEach(el => { el.disabled = true; });
      const paragraph = document.createElement('p'); paragraph.textContent = text; form.prepend(paragraph);
      form.querySelectorAll('p').forEach(p => { if (p !== paragraph && p.textContent.includes('이 컴퓨터')) p.textContent = '온라인 서비스 연결 설정은 로컬 관리자 설정과 별도로 관리됩니다.'; });
    }
  });
})();
