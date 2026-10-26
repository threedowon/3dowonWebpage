(() => {
  const home = document.querySelector('.featured-home');
  if (!home) return;
  const slides = [...home.querySelectorAll('.featured-slide')];
  if (!slides.length) return;
  const ko = document.documentElement.lang === 'ko';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const playback = home.querySelector('.featured-playback');
  const dots = [...home.querySelectorAll('[data-featured-dot]')];
  const status = home.querySelector('[data-featured-status]');
  let current = 0, paused = reduced.matches, version = 0, muxReady;
  const mediaHost = () => slides[current].querySelector('.featured-media');
  function playbackLabel() {
    playback.textContent = paused ? (ko ? '영상 재생 ▷' : 'Play video ▷') : (ko ? '일시정지 Ⅱ' : 'Pause Ⅱ');
    playback.setAttribute('aria-label',paused ? (ko ? '배경 영상 재생' : 'Play background video') : (ko ? '배경 영상 일시정지' : 'Pause background video'));
  }
  function removePlayer(slide) {
    const host = slide.querySelector('.featured-media');
    host.querySelectorAll('video,mux-player,iframe').forEach(player => { player.pause?.(); player.remove(); });
    host.classList.remove('is-playing');
  }
  function loadMux() {
    if (customElements.get('mux-player')) return Promise.resolve();
    return muxReady ||= new Promise((resolve,reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mux/mux-player@3.8.0';
      script.onload = () => customElements.whenDefined('mux-player').then(resolve);
      script.onerror = () => { muxReady = null; script.remove(); reject(new Error('Video unavailable')); };
      document.head.append(script);
    });
  }
  async function playCurrent() {
    const host = mediaHost(), token = version;
    if (!host.dataset.mediaKind || paused || document.hidden) return;
    try {
      if (host.dataset.mediaKind === 'mux') await loadMux();
      if (token !== version || paused || document.hidden) return;
      let player = host.querySelector('video,mux-player,iframe');
      if (!player) {
        if (host.dataset.mediaKind === 'vimeo') {
          player = document.createElement('iframe');
          player.src = `https://player.vimeo.com/video/${host.dataset.mediaSrc}?background=1&autoplay=1&muted=1&loop=1&dnt=1`;
          player.allow = 'autoplay'; player.title = slides[current].querySelector('h2').textContent;
          player.onload = () => { if (token === version) host.classList.add('is-playing'); };
        } else {
          player = document.createElement(host.dataset.mediaKind === 'mux' ? 'mux-player' : 'video');
          player.muted = true; player.setAttribute('muted',''); player.setAttribute('loop','');
          player.setAttribute('playsinline',''); player.setAttribute('preload','auto');
          if (host.dataset.mediaKind === 'mux') {
            player.setAttribute('playback-id',host.dataset.mediaSrc);
            player.setAttribute('stream-type','on-demand');
            player.setAttribute('nohotkeys',''); player.setAttribute('disable-tracking','');
          } else { player.src = host.dataset.mediaSrc; }
          player.addEventListener('canplay',() => {
            if (token === version && !paused && !document.hidden) player.play().catch(() => { if (token === version) { paused = true; playbackLabel(); } });
          },{once:true});
          player.addEventListener('playing',() => {
            if (token !== version || paused || document.hidden) { player.pause(); return; }
            host.classList.add('is-playing'); playbackLabel();
          });
          player.addEventListener('error',() => {
            if (token !== version) return;
            host.classList.remove('is-playing'); paused = true; playbackLabel();
          });
        }
        player.tabIndex = -1; host.append(player); return;
      }
      if (player.play) await player.play();
    } catch {
      if (token === version) { paused = true; playbackLabel(); }
    }
  }
  function show(index) {
    const next = (index + slides.length) % slides.length;
    if (next === current && version > 0) return;
    version++;
    slides.forEach((slide,i) => {
      if (i !== next) removePlayer(slide);
      slide.hidden = i !== next; slide.classList.toggle('is-active',i === next);
      slide.inert = i !== next;
    });
    current = next;
    dots.forEach((dot,i) => dot.setAttribute('aria-current',String(i === current)));
    status.textContent = `${current+1} / ${slides.length} · ${slides[current].querySelector('h2').textContent}`;
    playback.hidden = !mediaHost().dataset.mediaKind;
    playbackLabel(); playCurrent();
  }
  home.querySelector('[data-featured-next]').addEventListener('click',() => show(current+1));
  home.querySelector('[data-featured-prev]').addEventListener('click',() => show(current-1));
  dots.forEach((dot,index) => dot.addEventListener('click',() => show(index)));
  playback.addEventListener('click',() => {
    paused = !paused; playbackLabel();
    if (paused) {
      const player = mediaHost().querySelector('video,mux-player,iframe');
      if (player?.tagName === 'IFRAME') removePlayer(slides[current]); else player?.pause();
    } else playCurrent();
  });
  document.addEventListener('visibilitychange',() => {
    if (document.hidden) {
      const player = mediaHost().querySelector('video,mux-player,iframe');
      if (player?.tagName === 'IFRAME') removePlayer(slides[current]); else player?.pause();
    } else playCurrent();
  });
  reduced.addEventListener('change',() => {
    paused = reduced.matches; playbackLabel();
    if (paused) removePlayer(slides[current]); else playCurrent();
  });
  home.addEventListener('keydown',event => {
    if (event.altKey || event.ctrlKey || event.metaKey || !['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault(); show(current + (['ArrowDown','ArrowRight'].includes(event.key) ? 1 : -1));
  });
  let wheelTotal = 0, lastWheel = 0, lockedUntil = 0;
  home.addEventListener('wheel',event => {
    if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || document.querySelector('.works-open,.mobile-menu-open')) return;
    event.preventDefault();
    const now = performance.now();
    if (now < lockedUntil) return;
    if (now - lastWheel > 180) wheelTotal = 0;
    lastWheel = now;
    wheelTotal += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    if (Math.abs(wheelTotal) < 60) return;
    show(current + Math.sign(wheelTotal)); wheelTotal = 0; lockedUntil = now+850;
  },{passive:false});
  let touch, suppressClickUntil = 0;
  home.addEventListener('pointerdown',event => {
    if (event.pointerType === 'touch' && !event.target.closest('button')) touch = {x:event.clientX,y:event.clientY};
  });
  home.addEventListener('pointercancel',() => { touch = null; });
  home.addEventListener('pointerup',event => {
    if (!touch) return;
    const dy = event.clientY-touch.y, dx = event.clientX-touch.x; touch = null;
    if (Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx)) {
      suppressClickUntil = performance.now()+500; show(current + (dy < 0 ? 1 : -1));
    }
  });
  home.addEventListener('click',event => { if (performance.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); } },true);
  show(0);
})();
