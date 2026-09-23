const PORTUS_SCALE = [146.83, 174.61, 196, 220, 261.63, 293.66, 329.63];
const state = {
  context: null,
  master: null,
  timer: null,
  step: 0,
  active: false,
  voices: new Set(),
  controls: new Set()
};

function ensureAudio(){
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if(!AudioContext) return false;
  state.context ||= new AudioContext();
  state.master ||= state.context.createGain();
  state.master.gain.value = 0.0001;
  state.master.connect(state.context.destination);
  return true;
}

function playNote(frequency, duration, volume, type = 'sine'){
  const oscillator = state.context.createOscillator();
  const gain = state.context.createGain();
  const now = state.context.currentTime;
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.04);
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
  playNote(root / 2, 2.8, 0.035, 'triangle');
  playNote(PORTUS_SCALE[(state.step * 2 + 1) % PORTUS_SCALE.length], 1.4, 0.018);
  if(state.step % 2 === 0){
    playNote(PORTUS_SCALE[(state.step * 3 + 3) % PORTUS_SCALE.length] * 2, 0.65, 0.012, 'sine');
  }
  state.step++;
}

export function createPortusMusic(button, playingLabel = 'Pause Portus music'){
  if(!button) return;
  const updateLabel = () => {
    state.controls.forEach(control => {
      control.textContent = state.active ? playingLabel : 'Play Portus music';
      control.setAttribute('aria-pressed', String(state.active));
    });
  };
  state.controls.add(button);
  button.onclick = async () => {
    if(!ensureAudio()) return;
    if(state.active){
      state.active = false;
      clearInterval(state.timer);
      state.timer = null;
      state.master.gain.cancelScheduledValues(state.context.currentTime);
      state.master.gain.exponentialRampToValueAtTime(0.0001, state.context.currentTime + 0.35);
    } else {
      await state.context.resume();
      state.active = true;
      state.master.gain.cancelScheduledValues(state.context.currentTime);
      state.master.gain.exponentialRampToValueAtTime(0.18, state.context.currentTime + 0.8);
      scheduleBar();
      state.timer = setInterval(scheduleBar, 2800);
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
