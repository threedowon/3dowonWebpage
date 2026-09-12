// Prefer MP4; use an animated image when autoplay is denied or never starts.
export function setupLabMotion(container, { autostart = true, reduceMotion = false } = {}) {
  const video = container.querySelector('video');
  const fallback = container.querySelector('.lab-motion-fallback');
  let framePending = false, playPending = false, disposed = false, usingFallback = false;
  let enabled = autostart;
  let frameId, waitTimer;
  const listeners = new AbortController();
  const on = (name, callback) => video.addEventListener(name, callback, { signal: listeners.signal });
  const clearWait = () => { clearTimeout(waitTimer); waitTimer = undefined; };
  const showPreview = state => {
    if (disposed || usingFallback) return;
    container.dataset.playback = state;
    container.classList.remove('is-playing');
  };
  const showFallback = () => {
    if (disposed || usingFallback || reduceMotion || !fallback?.dataset.src) return;
    usingFallback = true;
    clearWait();
    container.classList.remove('is-playing');
    container.dataset.playback = 'fallback-loading';
    video.pause();
    const ready = () => {
      if (disposed || !fallback.naturalWidth) return;
      container.dataset.playback = 'animated-image';
      container.classList.add('is-fallback');
    };
    fallback.addEventListener('load', ready, { once: true, signal: listeners.signal });
    fallback.addEventListener('error', () => {
      if (!disposed) container.dataset.playback = 'error';
    }, { once: true, signal: listeners.signal });
    fallback.src = fallback.dataset.src;
    if (fallback.complete && fallback.naturalWidth) ready();
  };
  const waitForPlayback = () => {
    if (enabled && waitTimer === undefined && !usingFallback && !reduceMotion) waitTimer = setTimeout(showFallback, 4000);
  };
  const reveal = () => {
    if (disposed || usingFallback || video.paused || video.readyState < 2) return;
    clearWait();
    container.dataset.playback = 'playing';
    container.classList.add('is-playing');
  };
  const frameReady = () => {
    if (framePending || usingFallback || video.paused || video.readyState < 2) return;
    if (video.requestVideoFrameCallback) {
      framePending = true;
      frameId = video.requestVideoFrameCallback(() => { framePending = false; reveal(); });
    } else reveal();
  };
  const play = () => {
    if (disposed || usingFallback || reduceMotion) return;
    enabled = true;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.controls = false;
    waitForPlayback();
    if (playPending) return;
    if (!video.paused) { frameReady(); return; }
    playPending = true;
    try {
      Promise.resolve(video.play()).catch(error => {
        if (disposed || !video.paused) return;
        showPreview(error.name === 'NotAllowedError' ? 'blocked' : 'loading');
        if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') showFallback();
      }).finally(() => { playPending = false; });
    } catch {
      playPending = false;
      showPreview('blocked');
      showFallback();
    }
  };
  on('playing', frameReady);
  // Safari may advance playback without delivering a requested frame callback.
  on('timeupdate', () => { if (video.currentTime > 0) reveal(); });
  on('waiting', () => { showPreview('loading'); waitForPlayback(); });
  on('pause', () => showPreview('paused'));
  on('emptied', () => { showPreview('loading'); waitForPlayback(); });
  on('error', () => { showPreview('error'); showFallback(); });
  on('loadeddata', () => { if (enabled) play(); });
  container.addEventListener('pointerdown', play, { passive: true, signal: listeners.signal });
  const suspend = () => { enabled = false; clearWait(); video.pause(); };
  if (reduceMotion) { video.removeAttribute('autoplay'); suspend(); }
  else if (autostart) play();
  return { play, suspend, dispose() {
    disposed = true;
    clearWait();
    listeners.abort();
    if (framePending) video.cancelVideoFrameCallback?.(frameId);
  } };
}

if (typeof document !== 'undefined') {
  const players = new Map();
  const visible = new Set();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) { visible.add(entry.target); if (!document.hidden) players.get(entry.target)?.play(); }
      else { visible.delete(entry.target); players.get(entry.target)?.suspend(); }
    }
  });
  const init = () => {
    for (const [container, player] of players) if (!container.isConnected) {
      player.dispose(); observer?.unobserve(container); players.delete(container); visible.delete(container);
    }
    document.querySelectorAll('[data-lab-motion]').forEach(container => {
      if (players.has(container)) return;
      players.set(container, setupLabMotion(container, { autostart: !observer, reduceMotion }));
      if (observer) observer.observe(container); else visible.add(container);
    });
  };
  document.addEventListener('lab:navigated', init);
  document.addEventListener('visibilitychange', () => {
    for (const [container, player] of players) {
      if (!document.hidden && visible.has(container)) player.play(); else player.suspend();
    }
  });
  init();
}
