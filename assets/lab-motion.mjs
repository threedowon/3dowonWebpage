// Keep the poster over native video UI until a frame is actually being played.
export function setupLabMotion(container) {
  const video = container.querySelector('video');
  let framePending = false;
  let playPending = false;
  let disposed = false;
  let frameId;
  const listeners = new AbortController();
  const on = (name, callback) => video.addEventListener(name, callback, { signal: listeners.signal });
  const showPreview = state => {
    container.dataset.playback = state;
    container.classList.remove('is-playing');
  };
  const reveal = () => {
    if (disposed || video.paused || video.readyState < 2) return;
    container.dataset.playback = 'playing';
    container.classList.add('is-playing');
  };
  const frameReady = () => {
    if (framePending || video.paused || video.readyState < 2) return;
    if (video.requestVideoFrameCallback) {
      framePending = true;
      frameId = video.requestVideoFrameCallback(() => { framePending = false; reveal(); });
    } else reveal();
  };
  const play = () => {
    if (disposed || playPending) return;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.controls = false;
    if (!video.paused) { frameReady(); return; }
    playPending = true;
    try {
      Promise.resolve(video.play()).catch(error => {
        if (!disposed && video.paused) showPreview(error.name === 'NotAllowedError' ? 'blocked' : 'loading');
      }).finally(() => { playPending = false; });
    } catch {
      playPending = false;
      showPreview('blocked');
    }
  };
  on('playing', frameReady);
  on('timeupdate', () => { if (!container.classList.contains('is-playing')) frameReady(); });
  on('waiting', () => showPreview('loading'));
  on('pause', () => showPreview('paused'));
  on('emptied', () => showPreview('loading'));
  on('error', () => showPreview('error'));
  on('loadeddata', play);
  container.addEventListener('pointerdown', play, { passive: true, signal: listeners.signal });
  play();
  return { play, dispose() {
    disposed = true;
    listeners.abort();
    if (framePending) video.cancelVideoFrameCallback?.(frameId);
  } };
}

if (typeof document !== 'undefined') {
  const players = new Map();
  const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) players.get(entry.target)?.play();
  });
  const init = () => {
    for (const [container, player] of players) if (!container.isConnected) {
      player.dispose(); observer?.unobserve(container); players.delete(container);
    }
    document.querySelectorAll('[data-lab-motion]').forEach(container => {
      if (players.has(container)) return;
      players.set(container, setupLabMotion(container));
      observer?.observe(container);
    });
  };
  document.addEventListener('lab:navigated', init);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) for (const player of players.values()) player.play();
  });
  init();
}
