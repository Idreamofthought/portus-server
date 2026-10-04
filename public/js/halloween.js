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
      // Separate stick/slip strokes, with silence between catches.
      // No continuous bass oscillator or broadband hiss.
      const strokes = [
        { start: .03, length: .61, from: 520, to: 1120, level: .75 },
        { start: .70, length: .73, from: 1080, to: 680, level: 1 },
        { start: 1.52, length: .54, from: 650, to: 240, level: .85 },
        { start: 2.16, length: .22, from: 280, to: 150, level: .5 }
      ];
      for (const stroke of strokes) {
        let phase = 0;
        let jitter = 0;
        const first = Math.floor(stroke.start * audio.sampleRate);
        const frames = Math.floor(stroke.length * audio.sampleRate);
        for (let frame = 0; frame < frames; frame++) {
          const u = frame / frames;
          const t = frame / audio.sampleRate;
          jitter += .015 * ((Math.random() * 2 - 1) - jitter);
          const bend = u < .52 ? u * .8 : .416 + (u - .52) * 1.22;
          const hz = stroke.from + (stroke.to - stroke.from) * bend;
          phase += 2 * Math.PI * hz * (1 + jitter * .08) / audio.sampleRate;
          const attack = Math.min(t / .018, 1);
          const release = Math.min((stroke.length - t) / .065, 1);
          // Friction catches irregularly instead of a motor-like even tremolo.
          const catch1 = Math.exp(-(((u - .23) / .035) ** 2));
          const catch2 = Math.exp(-(((u - .68) / .06) ** 2));
          const grip = 1 - .91 * catch1 - .85 * catch2;
          const squeak = Math.sin(phase) * .32
            + Math.sin(phase * 2) * .13
            + Math.sin(phase * 3) * .075
            + Math.sin(phase * 5) * .025;
          data[first + frame] += attack * release * grip * stroke.level * squeak;
        }
      }
      // Two brief wood/iron ticks as the hinge catches and settles.
      for (const start of [.66, 2.40]) {
        let lastNoise = 0;
        for (let frame = 0; frame < audio.sampleRate * .065; frame++) {
          const t = frame / audio.sampleRate;
          const noise = Math.random() * 2 - 1;
          const click = (noise - lastNoise) * .08 + Math.sin(2 * Math.PI * 175 * t) * .11;
          lastNoise = noise;
          data[Math.floor(start * audio.sampleRate) + frame] += click * Math.exp(-t * 95) * Math.min(t * 1500, 1);
        }
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
