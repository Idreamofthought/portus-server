(() => {
  const door = document.querySelector('.hollow-door');
  const collection = document.querySelector('#collection');
  const toggle = document.querySelector('#sound-toggle');
  const skip = document.querySelector('#skip-entrance');
  if (!door || !collection || !toggle || !skip) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let sound = true;
  let entering = false;
  let activeAudio = null;
  if (AudioContext) toggle.hidden = false;
  else document.querySelector('#entrance-note').textContent = 'Open the door to explore the collection.';
  toggle.addEventListener('click', () => {
    sound = !sound;
    if (!sound && activeAudio && activeAudio.state !== 'closed') void activeAudio.close().catch(() => {});
    toggle.setAttribute('aria-pressed', String(sound));
    toggle.textContent = `Sound: ${sound ? 'on' : 'off'}`;
  });
  async function creak() {
    if (!sound || !AudioContext) return;
    let audio;
    try {
      audio = new AudioContext();
      activeAudio = audio;
      await audio.resume();
      if (!sound || audio.state === 'closed') return;
      const duration = 2.6;
      const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * duration), audio.sampleRate);
      const data = buffer.getChannelData(0);
      let lowPhase = 0;
      let highPhase = 0;
      let scrape = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / audio.sampleRate;
        const progress = t / duration;
        // An iron hinge strains upward, then drops into a rusty groan.
        const strain = Math.sin(Math.PI * progress) ** 1.4;
        const lowHz = 82 + 38 * strain + 12 * Math.sin(t * 13);
        const highHz = 300 + 1250 * strain + 65 * Math.sin(t * 21) + 23 * Math.sin(t * 113);
        lowPhase += 2 * Math.PI * lowHz / audio.sampleRate;
        highPhase += 2 * Math.PI * highHz / audio.sampleRate;
        scrape = .72 * scrape + .28 * (Math.random() * 2 - 1);
        const stickSlip = .55 + .45 * Math.sin(t * (31 + 18 * progress)) ** 8;
        const envelope = Math.min(t / .08, 1) * Math.min((duration - t) / .35, 1);
        const groan = .28 * Math.sin(lowPhase) + .13 * Math.sin(lowPhase * 3.01);
        const shriek = (.3 + .7 * strain) * (.24 * Math.sin(highPhase) + .13 * Math.sin(highPhase * 2.017) + .07 * Math.sin(highPhase * 3.93));
        const rasp = scrape * (.2 + .18 * strain);
        const finalKnock = t > 2.24 ? .22 * Math.exp(-(t - 2.24) * 34) * Math.sin(2 * Math.PI * 64 * (t - 2.24)) : 0;
        data[i] = envelope * stickSlip * (groan + shriek + rasp) + finalKnock;
      }
      const source = audio.createBufferSource();
      source.buffer = buffer;
      const gain = audio.createGain();
      gain.gain.value = .38;
      source.connect(gain).connect(audio.destination);
      source.onended = () => {
        if (activeAudio === audio) activeAudio = null;
        if (audio.state !== 'closed') void audio.close().catch(() => {});
      };
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
