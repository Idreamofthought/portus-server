const PORTUS_SCALE = [146.83, 174.61, 196, 220, 261.63, 293.66, 329.63];
const state = {
  context: null,
  master: null,
  timer: null,
  step: 0,
  active: false,
  voices: new Set(),
  controls: new Map()
};

function ensureAudio(){
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if(!AudioContext) return false;
  if(!state.context){
    state.context = new AudioContext();
    state.master = state.context.createGain();
    state.master.gain.value = 0.0001;
    state.master.connect(state.context.destination);
  }
  return true;
}

function playNote(frequency, duration, volume, type = 'sine'){
  const oscillator = state.context.createOscillator();
  const gain = state.context.createGain();
  const now = state.context.currentTime;
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.25);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain).connect(state.master);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.05);
  state.voices.add(oscillator);
  oscillator.addEventListener('ended', () => state.voices.delete(oscillator), { once: true });
}

function scheduleBar(){
  if(!state.active) return;
  const root = PORTUS_SCALE[state.step % 4];
  playNote(root / 2, 4.5, 0.11, 'triangle');
  playNote(PORTUS_SCALE[(state.step * 2 + 1) % PORTUS_SCALE.length], 3.2, 0.055);
  if(state.step % 2 === 0){
    playNote(PORTUS_SCALE[(state.step * 3 + 3) % PORTUS_SCALE.length], 2.4, 0.025, 'sine');
  }
  state.step++;
}

export function createPortusMusic(button, playingLabel){
  if(!button) return;
  const isStatus = button.id === 'musicToggle';
  const labels = {
    on: playingLabel || (isStatus ? 'Soundscape: Pause' : 'Pause Portus soundscape'),
    off: isStatus ? 'Soundscape: Play' : 'Play Portus soundscape'
  };
  const updateLabel = () => {
    state.controls.forEach((copy, control) => {
      control.textContent = state.active ? copy.on : copy.off;
      control.setAttribute('aria-pressed', String(state.active));
    });
  };
  state.controls.set(button, labels);
  button.onclick = async () => {
    if(!ensureAudio()) return;
    if(state.active){
      state.active = false;
      clearInterval(state.timer);
      state.timer = null;
      state.master.gain.cancelScheduledValues(state.context.currentTime);
      state.master.gain.exponentialRampToValueAtTime(0.0001, state.context.currentTime + 0.35);
    } else {
      try{ await state.context.resume(); }catch(e){ return; }
      if(state.context.state === 'suspended') return;
      state.active = true;
      state.master.gain.cancelScheduledValues(state.context.currentTime);
      state.master.gain.setValueAtTime(0.0001, state.context.currentTime);
      state.master.gain.exponentialRampToValueAtTime(0.6, state.context.currentTime + 0.8);
      scheduleBar();
      state.timer = setInterval(scheduleBar, 4800);
    }
    updateLabel();
  };
  updateLabel();
}

function addPoemControl(){
  if(!/^\/writing\/poetry\/[^/]+\.html$/.test(window.location.pathname)) return;
  const poem = document.querySelector('.container');
  if(!poem || document.querySelector('.portus-music-control')) return;
  const music = poem.querySelector('.poem-music') || document.createElement('div');
  music.classList.add('poem-music');
  // The three legacy MP3s are empty placeholders; do not show a player that cannot play.
  music.querySelectorAll('audio').forEach(audio => audio.remove());
  if(!music.parentNode) (poem.querySelector('.intro') || poem.querySelector('h1')).after(music);
  const button = document.createElement('button');
  button.className = 'poem-mute-toggle portus-music-control';
  button.type = 'button';
  button.setAttribute('aria-label', 'Play optional background music');
  music.append(button);
  createPortusMusic(button);
}

if(typeof document !== 'undefined'){
  document.addEventListener('DOMContentLoaded', addPoemControl);
}
