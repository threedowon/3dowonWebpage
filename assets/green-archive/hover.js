// Reveal a second image only after it has loaded; the cover stays underneath.
document.querySelectorAll('.work-hover-image').forEach(image => {
  const ready = () => image.classList.toggle('is-loaded', image.naturalWidth > 0);
  image.addEventListener('load', ready);
  image.addEventListener('error', () => image.classList.remove('is-loaded'));
  if (image.complete) ready();
});
