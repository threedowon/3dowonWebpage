// Hover and keyboard focus use CSS; touch reveals a caption before following its link.
const labGrid = document.querySelector('.page-lab .overview-grid');
if (labGrid) {
  const tapLayout = window.matchMedia('(max-width:700px), (hover:none)');
  const clearCaptions = () => labGrid.querySelectorAll('.is-caption-visible').forEach(card => card.classList.remove('is-caption-visible'));

  labGrid.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    const card = link?.closest('.lab-entry');
    if (!card || event.defaultPrevented || event.button !== 0 || event.detail === 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!tapLayout.matches && event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    if (card.classList.contains('is-caption-visible')) return;
    event.preventDefault();
    clearCaptions();
    card.classList.add('is-caption-visible');
  });

  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.lab-entry.is-caption-visible')) clearCaptions();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') clearCaptions();
  });
  tapLayout.addEventListener('change', clearCaptions);
  window.addEventListener('pageshow', clearCaptions);
}
