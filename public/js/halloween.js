(() => {
  const door = document.querySelector('.hollow-door');
  const collection = document.querySelector('#collection');
  const toggle = document.querySelector('#sound-toggle');
  const skip = document.querySelector('#skip-entrance');
  if (!door || !collection || !toggle || !skip) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let sound = true;
  let entering = false;
  if (AudioContext) toggle.hidden = false;
  else document.querySelector('#entrance-note').textContent = 'Open the door to explore the collection.';
  toggle.addEventListener('click', () => {
    sound = !sound;
    toggle.setAttribute('aria-pressed', String(sound));
    toggle.textContent = `Sound: ${sound ? 'on' : 'off'}`;
  });
  async function creak() {
    if (!sound || !AudioContext) return;
    let audio;
    try {
      audio = new AudioContext();
      await audio.resume();
      const duration = 1.35;
      const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * duration), audio.sampleRate);
      const data = buffer.getChannelData(0);
      let phase = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / audio.sampleRate;
        phase += 2 * Math.PI * (125 + 40 * Math.sin(t * 7) + 8 * Math.sin(t * 65)) / audio.sampleRate;
        const envelope = Math.min(t * 12, 1) * Math.max(0, 1 - t / duration);
        data[i] = envelope * (Math.sin(phase) * .3 + Math.sin(phase * 2.03) * .12 + (Math.random() * 2 - 1) * .12) * (.6 + .4 * Math.sin(t * 32) ** 2);
      }
      const source = audio.createBufferSource();
      source.buffer = buffer;
      const gain = audio.createGain();
      gain.gain.value = .22;
      source.connect(gain).connect(audio.destination);
      source.onended = () => { void audio.close(); };
      source.start();
    } catch { if (audio && audio.state !== 'closed') void audio.close().catch(() => {}); }
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
