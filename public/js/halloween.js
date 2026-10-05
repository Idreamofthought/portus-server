(() => {
  const door = document.querySelector('.hollow-door');
  const collection = document.querySelector('#collection');
  const toggle = document.querySelector('#sound-toggle');
  const skip = document.querySelector('#skip-entrance');
  if (!door || !collection || !toggle || !skip) return;
  let sound = true;
  let entering = false;
  const activeAudio = new Audio('/audio/alex-jauk-creepy-noisy-basement-door-421302.mp3');
  activeAudio.preload = 'auto';
  activeAudio.volume = 0.65;
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    sound = !sound;
    if (!sound) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }
    toggle.setAttribute('aria-pressed', String(sound));
    toggle.textContent = `Sound: ${sound ? 'on' : 'off'}`;
  });
  async function creak() {
    if (!sound) return;
    try {
      activeAudio.currentTime = 0;
      await activeAudio.play();
    } catch {
      // The entrance still works if playback is unavailable.
    }
  }
  function showCollection() {
    collection.focus({ preventScroll: true });
    collection.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', '#collection');
  }
  door.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (entering) return;
    entering = true;
    door.classList.add('door-open');
    void creak();
    window.setTimeout(() => { showCollection(); entering = false; }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1450);
  });
  skip.addEventListener('click', event => { event.preventDefault(); showCollection(); });
})();
