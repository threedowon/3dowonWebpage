// Reveal the entire page together, after its fonts and first visible images settle.
// The inline head guard releases the page after three seconds even if this fails.
(() => {
  const reveal = async () => {
    const fonts = document.fonts ? [
      document.fonts.load('600 28px InterVariable', '3Dowon'),
      document.fonts.load('700 16px InterVariable', 'About Works Lab Portfolio CV'),
      document.fonts.ready,
    ] : [];
    const images = [...document.querySelectorAll('#main img[src]')].filter(image => {
      if (image.closest('[hidden]') || image.matches('.work-hover-image,.lab-motion-fallback')) return false;
      const rect = image.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
    }).slice(0, 6).map(image => {
      image.loading = 'eager';
      if (image.decode) return image.decode();
      if (image.complete) return Promise.resolve();
      return new Promise(resolve => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    });
    await Promise.allSettled([...fonts, ...images]);
    requestAnimationFrame(() => document.dispatchEvent(new Event('site:ready')));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reveal, { once: true });
  else reveal();
})();
