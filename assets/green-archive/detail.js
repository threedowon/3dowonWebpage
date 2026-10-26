(() => {
  const gallery = document.querySelector('.page-work:not(.page-study) .detail-gallery');
  if (!gallery) return;
  const track = gallery.querySelector('.detail-media-grid');
  const items = [...track.children].filter(item => item.matches('.project-image,.post-video'));
  const controls = gallery.querySelector('.detail-controls');
  if (!items.length) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width:920px)');
  const status = controls.querySelector('[role=status]');
  const pagination = controls.querySelector('.detail-pagination');
  const korean = document.documentElement.lang === 'ko';
  const imageLinks = [...track.querySelectorAll('a[data-viewer]')].map(link => ({link,label:link.getAttribute('aria-label')}));
  // Keep the hit areas outside the scrolling slides so the cursor never changes mid-transition.
  const stage = document.createElement('div');
  stage.className = 'detail-media-stage';
  track.before(stage);
  stage.append(track);
  const imageSteps = [];
  if (items.length > 1) {
    for (const direction of [-1, 1]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `detail-image-step detail-image-${direction < 0 ? 'prev' : 'next'}`;
      button.setAttribute('aria-label', direction < 0
        ? (korean ? '이전 이미지' : 'Previous image')
        : (korean ? '다음 이미지' : 'Next image'));
      button.addEventListener('click', () => go((current + direction + items.length) % items.length));
      stage.append(button);
      imageSteps.push({button, direction});
    }
  }
  const thumbnails = items.map((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'detail-thumbnail';
    button.setAttribute('aria-label', korean ? `미디어 ${index + 1} / ${items.length} 보기` : `Show media ${index + 1} of ${items.length}`);
    const sourceImage = item.querySelector('img');
    const video = item.querySelector('video,mux-player,iframe');
    const playbackId = item.querySelector('mux-player')?.getAttribute('playback-id');
    const src = sourceImage?.getAttribute('src') || video?.getAttribute('poster') ||
      (playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=2` : track.querySelector('img')?.getAttribute('src'));
    if (src) {
      const preview = document.createElement('img');
      preview.src = src;
      preview.alt = '';
      preview.loading = 'lazy';
      preview.decoding = 'async';
      button.append(preview);
    }
    if (video || !src) {
      const label = document.createElement('span');
      label.className = 'detail-thumbnail-label';
      label.textContent = video ? '▷' : String(index + 1);
      label.setAttribute('aria-hidden','true');
      button.append(label);
    }
    button.addEventListener('click', () => go(index));
    button.addEventListener('keydown', event => {
      const targets = {ArrowUp:index - 1,ArrowDown:index + 1,Home:0,End:items.length - 1};
      if (!(event.key in targets)) return;
      event.preventDefault();
      const target = Math.max(0,Math.min(targets[event.key],items.length - 1));
      thumbnails[target].focus({preventScroll:true});
      go(target);
    });
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
    // Every work shares the same frame, regardless of its images' aspect ratios.
    const galleryTop = track.getBoundingClientRect().top + window.scrollY;
    const menuBottom = document.querySelector('.site-menu')?.getBoundingClientRect().bottom || 0;
    const outerGap = Math.max(0, galleryTop - menuBottom);
    document.body.style.setProperty('--detail-outer-gap', `${outerGap}px`);
    const availableHeight = Math.max(240, innerHeight - galleryTop - outerGap);
    const height = Math.round(availableHeight);
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
    const media = items[current].querySelector('.post-video-frame,video,mux-player,iframe');
    const mediaBounds = media?.getBoundingClientRect();
    imageSteps.forEach(({button, direction}) => {
      button.hidden = Boolean(mediaBounds && direction < 0);
      // Video gutters all advance; image slides retain their left/right halves.
      if (mediaBounds && direction > 0 && !mobile.matches) button.style.width = '100%';
      else button.style.removeProperty('width');
      if (button.hidden || !mediaBounds || mobile.matches) {
        button.style.removeProperty('clip-path');
        return;
      }
      // Cut the player out of each fixed arrow area so its controls stay clickable.
      const bounds = button.getBoundingClientRect();
      const x1 = Math.max(0, Math.min(bounds.width, mediaBounds.left - bounds.left));
      const x2 = Math.max(0, Math.min(bounds.width, mediaBounds.right - bounds.left));
      const y1 = Math.max(0, Math.min(bounds.height, mediaBounds.top - bounds.top));
      const y2 = Math.max(0, Math.min(bounds.height, mediaBounds.bottom - bounds.top));
      const outer = `M0 0H${bounds.width}V${bounds.height}H0Z`;
      const hole = x2 > x1 && y2 > y1 ? `M${x1} ${y1}H${x2}V${y2}H${x1}Z` : '';
      button.style.clipPath = `path(evenodd, "${outer}${hole}")`;
    });
    thumbnails.forEach((thumbnail, index) => {
      if (index === current) thumbnail.setAttribute('aria-current', 'true');
      else thumbnail.removeAttribute('aria-current');
    });
    const thumbBounds = thumbnails[current].getBoundingClientRect();
    const listBounds = pagination.getBoundingClientRect();
    if (matchMedia('(max-width:920px)').matches) {
      if (thumbBounds.left < listBounds.left) pagination.scrollLeft += thumbBounds.left - listBounds.left;
      else if (thumbBounds.right > listBounds.right) pagination.scrollLeft += thumbBounds.right - listBounds.right;
    } else {
      if (thumbBounds.top < listBounds.top) pagination.scrollTop += thumbBounds.top - listBounds.top;
      else if (thumbBounds.bottom > listBounds.bottom) pagination.scrollTop += thumbBounds.bottom - listBounds.bottom;
    }
    items[current].querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
  }
  function go(index, behavior = reducedMotion.matches ? 'instant' : 'smooth') {
    const target = items[Math.max(0, Math.min(index, items.length - 1))];
    const offset = target.getBoundingClientRect().left - track.getBoundingClientRect().left;
    track.scrollTo({left: track.scrollLeft + offset, behavior});
  }
  stage.addEventListener('keydown', event => {
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
    imageLinks.forEach(({link,label}) => {
      if (mobile.matches) {
        link.setAttribute('href',link.dataset.viewer);
        link.removeAttribute('tabindex');
        if (label) link.setAttribute('aria-label',label);
      } else {
        link.removeAttribute('href');
        link.setAttribute('tabindex','-1');
        link.removeAttribute('aria-label');
      }
    });
    controls.hidden = items.length < 2;
    gallery.classList.toggle('has-thumbnails', items.length > 1);
    fitGallery();
    gallery.style.setProperty('--detail-preview-height', `${track.clientHeight}px`);
    track.tabIndex = items.length > 1 ? 0 : -1;
    if (track.clientWidth !== trackWidth) {
      trackWidth = track.clientWidth;
      go(current, 'instant');
    }
    update();
  }
  new ResizeObserver(resize).observe(track);
  const mediaResize = new ResizeObserver(update);
  track.querySelectorAll('.post-video-frame,video,mux-player,iframe').forEach(media => mediaResize.observe(media));
  track.querySelectorAll('img').forEach(image => image.addEventListener('load', resize));
  track.querySelectorAll('video').forEach(video => video.addEventListener('loadedmetadata', resize));
  window.addEventListener('resize', resize);
  resize();
})();
