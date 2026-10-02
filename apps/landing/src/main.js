document.querySelectorAll("details").forEach((detail) => {
  detail.addEventListener("toggle", () => {
    if (!detail.open) {
      return;
    }

    document.querySelectorAll("details").forEach((other) => {
      if (other !== detail) {
        other.open = false;
      }
    });
  });
});

// Progressive enhancement: content remains visible without JavaScript.
if (document.body.classList.contains('landing')) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let manuallyPaused = false;
  let depthFrame = 0;
  const depthElements = document.querySelectorAll('.scene-doodle, .scene-sticker, .phone-spark, .manifesto-star, .join-star');
  function updateDepth() {
    depthFrame = 0;
    const paused = manuallyPaused || reducedMotion.matches;
    document.dispatchEvent(new CustomEvent('mates:depth', { detail: { paused } }));
    depthElements.forEach(element => {
      const bounds = element.parentElement.getBoundingClientRect();
      const localDepth = paused ? 0 : Math.max(-1, Math.min(1, (window.innerHeight / 2 - bounds.top - bounds.height / 2) / window.innerHeight));
      element.style.setProperty('--scroll-drift', `${Math.round(localDepth * 22)}px`);
    });
  }
  function scheduleDepth() {
    if (!depthFrame && !manuallyPaused && !reducedMotion.matches && !document.hidden) depthFrame = requestAnimationFrame(updateDepth);
  }
  window.addEventListener('scroll', scheduleDepth, { passive: true });
  window.addEventListener('resize', scheduleDepth, { passive: true });
  const toggle = document.querySelector('.motion-toggle');
  function updateMotion() {
    const paused = manuallyPaused || reducedMotion.matches;
    document.body.classList.toggle('motion-paused', paused);
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'Activer les animations' : 'Mettre les animations en pause');
    toggle.innerHTML = paused ? '<span aria-hidden="true">▶</span> Animer' : '<span aria-hidden="true">Ⅱ</span> Pause';
    toggle.disabled = reducedMotion.matches;
    if (reducedMotion.matches) toggle.setAttribute('aria-label', 'Animations désactivées selon vos préférences système');
    document.dispatchEvent(new CustomEvent('mates:motion', { detail: { paused } }));
    updateDepth();
  }
  toggle.addEventListener('click', () => { manuallyPaused = !manuallyPaused; updateMotion(); });
  reducedMotion.addEventListener('change', updateMotion);
  updateMotion();
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: .08 });
    document.body.classList.add('js-motion');
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
  }
}
