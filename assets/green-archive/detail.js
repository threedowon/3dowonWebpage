(() => {
  const gallery = document.querySelector('.page-work:not(.page-study) .detail-gallery');
  if (!gallery) return;
  const track = gallery.querySelector('.detail-media-grid');
  const items = [...track.children].filter(item => item.matches('.project-image,.post-video'));
  const controls = gallery.querySelector('.detail-controls');
  if (!items.length) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width:700px)');
  const status = controls.querySelector('[role=status]');
  const pagination = controls.querySelector('.detail-pagination');
  const korean = document.documentElement.lang === 'ko';
  // Leave the center available for the existing enlarged-image viewer.
  const imageSteps = [];
  items.forEach((item, index) => {
    if (!item.querySelector('a[data-viewer]')) return;
    for (const direction of [-1, 1]) {
      if (index + direction < 0 || index + direction >= items.length) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `detail-image-step detail-image-${direction < 0 ? 'prev' : 'next'}`;
      button.setAttribute('aria-label', direction < 0
        ? (korean ? '이전 이미지' : 'Previous image')
        : (korean ? '다음 이미지' : 'Next image'));
      button.addEventListener('click', () => go(index + direction));
      item.append(button);
      imageSteps.push({button, index});
    }
  });
  const dots = items.map((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', korean ? `미디어 ${index + 1} / ${items.length} 보기` : `Show media ${index + 1} of ${items.length}`);
    button.addEventListener('click', () => go(index));
    pagination.append(button);
    return button;
  });
  let current = 0;
  let pending = false;
  let trackWidth = 0;

  function fitGallery() {
    if (mobile.matches) {
      track.style.removeProperty('--detail-media-height');
      return;
    }
    const images = items.filter(item => item.querySelector('img'));
    const heights = (images.length ? images : items).map(item => {
      const image = item.querySelector('img');
      const video = item.querySelector('video');
      const width = Number(image?.getAttribute('width')) || image?.naturalWidth || video?.videoWidth;
      const height = Number(image?.getAttribute('height')) || image?.naturalHeight || video?.videoHeight;
      const caption = item.querySelector('figcaption')?.getBoundingClientRect().height || 0;
      if (width && height) return height * Math.min(1, track.clientWidth / width) + caption;
      return item.matches('.post-video,.gallery-video') ? track.clientWidth * 9 / 16 + caption : 0;
    });
    const height = Math.round(Math.min(Math.max(...heights) || track.clientWidth * 4 / 3, innerHeight * .65));
    track.style.setProperty('--detail-media-height', `${height}px`);
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
    const left = track.getBoundingClientRect().left;
    let closest = 0;
    items.forEach((item, i) => {
      if (Math.abs(item.getBoundingClientRect().left - left) < Math.abs(items[closest].getBoundingClientRect().left - left)) closest = i;
    });
    if (current !== closest) pause(items[current]);
    current = closest;
    status.textContent = `${current + 1} / ${items.length}`;
    imageSteps.forEach(({button, index}) => { button.tabIndex = index === current ? 0 : -1; });
    dots.forEach((dot, index) => {
      if (index === current) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    items[current].querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
  }
  function go(index, behavior = reducedMotion.matches ? 'instant' : 'smooth') {
    const target = items[Math.max(0, Math.min(index, items.length - 1))];
    const offset = target.getBoundingClientRect().left - track.getBoundingClientRect().left;
    track.scrollTo({left: track.scrollLeft + offset, behavior});
  }
  track.addEventListener('keydown', event => {
    if (event.target.closest('video,mux-player,iframe')) return;
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
    fitGallery();
    controls.hidden = items.length < 2;
    track.tabIndex = items.length > 1 ? 0 : -1;
    if (track.clientWidth !== trackWidth) {
      trackWidth = track.clientWidth;
      go(current, 'instant');
    }
    update();
  }
  new ResizeObserver(resize).observe(track);
  track.querySelectorAll('img').forEach(image => image.addEventListener('load', resize));
  track.querySelectorAll('video').forEach(video => video.addEventListener('loadedmetadata', resize));
  window.addEventListener('resize', resize);
  resize();
})();
