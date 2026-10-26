(() => {
  const gallery = document.querySelector('.page-work:not(.page-study) .detail-gallery');
  if (!gallery) return;
  const track = gallery.querySelector('.detail-media-grid');
  const items = [...track.children].filter(item => item.matches('.project-image,.post-video'));
  const controls = gallery.querySelector('.detail-controls');
  if (!items.length) return;
  const mobile = matchMedia('(max-width: 700px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const previous = controls.querySelector('[data-prev]');
  const next = controls.querySelector('[data-next]');
  const status = controls.querySelector('[role=status]');
  let current = 0;
  let pending = false;

  function fitCurrentMedia() {
    const item = items[current];
    const image = item.querySelector('img');
    const video = item.querySelector('video');
    const ratio = image?.naturalWidth ? image.naturalWidth / image.naturalHeight
      : video?.videoWidth ? video.videoWidth / video.videoHeight
      : item.matches('.post-video,.gallery-video') ? 16 / 9 : 3 / 4;
    const caption = item.querySelector('figcaption')?.getBoundingClientRect().height || 0;
    const height = Math.round(Math.min(track.clientWidth / ratio + caption, innerHeight * .65));
    track.style.setProperty('--mobile-media-height', `${height}px`);
  }

  function pause(item) {
    item.querySelectorAll('video,mux-player').forEach(video => video.pause?.());
    item.querySelectorAll('iframe').forEach(frame => {
      // Reload only the media being left, stopping an embedded film without autoplay.
      const src = frame.getAttribute('src');
      if (src) frame.setAttribute('src', src);
    });
  }
  function update() {
    if (!mobile.matches) return;
    const left = track.getBoundingClientRect().left;
    let closest = 0;
    items.forEach((item, i) => {
      if (Math.abs(item.getBoundingClientRect().left - left) < Math.abs(items[closest].getBoundingClientRect().left - left)) closest = i;
    });
    if (current !== closest) pause(items[current]);
    current = closest;
    status.textContent = `${current + 1} / ${items.length}`;
    previous.disabled = current === 0;
    next.disabled = current === items.length - 1;
    items[current].querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
    fitCurrentMedia();
  }
  function go(index) {
    if (!mobile.matches) return;
    const target = items[Math.max(0, Math.min(index, items.length - 1))];
    const offset = target.getBoundingClientRect().left - track.getBoundingClientRect().left;
    track.scrollTo({left: track.scrollLeft + offset, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
  }
  previous.addEventListener('click', () => go(current - 1));
  next.addEventListener('click', () => go(current + 1));
  track.addEventListener('keydown', event => {
    if (!mobile.matches || event.target.closest('video,mux-player,iframe')) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    go(current + (event.key === 'ArrowLeft' ? -1 : 1));
  });
  track.addEventListener('scroll', () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { update(); pending = false; });
  }, {passive:true});
  function resize() {
    controls.hidden = !mobile.matches || items.length < 2;
    track.tabIndex = mobile.matches && items.length > 1 ? 0 : -1;
    if (mobile.matches) update();
  }
  new ResizeObserver(resize).observe(track);
  track.querySelectorAll('img').forEach(image => image.addEventListener('load', resize));
  track.querySelectorAll('video').forEach(video => video.addEventListener('loadedmetadata', resize));
  mobile.addEventListener('change', resize);
  resize();
})();
