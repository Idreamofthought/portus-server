const state = {
  context: null,
  master: null,
  timer: null,
  step: 0,
  active: false,
  voices: new Set(),
  controls: new Map(),
  mood: 'settlement',
  scene: 'game',
  accent: null
};

const SCENES = {
  game: { volume: 0.55, notes: [146.83,174.61,196,220,261.63,293.66,329.63] },
  sky: { volume: 0.28, notes: [146.83,196,220,261.63,293.66] },
  earth: { volume: 0.28, notes: [130.81,174.61,196,261.63,293.66] },
  memory: { volume: 0.24, notes: [130.81,146.83,174.61,196,261.63] },
  poetry: { volume: 0.25, notes: [146.83,174.61,196,220,261.63] }
};

export function poemSoundTheme(tags = ''){
  if(/sky|season|bird|wind|rain|river|sea|autumn|spring/i.test(tags)) return 'sky';
  if(/garden|flower|fruit|tree|nature|earth|wood/i.test(tags)) return 'earth';
  if(/memory|death|grief|loss|dream|time/i.test(tags)) return 'memory';
  return 'poetry';
}

export function setPortusMood(mood){
  state.mood = mood;
  if(state.active && state.scene === 'game' && ['flood','route','harvest','mourning'].includes(mood)){
    clearTimeout(state.accent);
    state.accent = setTimeout(() => {
      if(!state.active || state.scene !== 'game') return;
      const base = mood === 'flood' ? 65.41 : mood === 'mourning' ? 98 : 146.83;
      playNote(base, mood === 'flood' ? 5 : 3.5, 0.085, 'triangle');
    }, 200);
  }
}

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
  gain.gain.exponentialRampToValueAtTime(volume, now + Math.min(0.8, duration / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain).connect(state.master);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.05);
  state.voices.add(oscillator);
  oscillator.addEventListener('ended', () => state.voices.delete(oscillator), { once: true });
}

function scheduleBar(){
  if(!state.active) return;
  const notes = SCENES[state.scene].notes;
  const root = notes[state.step % Math.min(4, notes.length)];
  // A sustained low string, a slow pad, and occasional soft pulses share one motif.
  playNote(root / 2, 6, 0.12, 'triangle');
  playNote(notes[(state.step * 2 + 1) % notes.length], 4.2, 0.055);
  if(state.scene === 'game' && (state.mood === 'route' || state.mood === 'harvest' || state.step % 4 === 3))
    playNote(notes[(state.step * 3 + 2) % notes.length] * 2, 1.4, 0.015);
  if(state.step % 3 === 2)
    playNote(notes[(state.step + 2) % notes.length], 2.8, 0.022);
  state.step++;
}

export function createPortusMusic(button, playingLabel, scene = 'game'){
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
      clearTimeout(state.accent);
      state.timer = null;
      state.master.gain.cancelScheduledValues(state.context.currentTime);
      state.master.gain.exponentialRampToValueAtTime(0.0001, state.context.currentTime + 0.35);
    } else {
      try{ await state.context.resume(); }catch(e){ return; }
      if(state.context.state === 'suspended') return;
      state.scene = SCENES[scene] ? scene : 'game';
      state.active = true;
      state.master.gain.cancelScheduledValues(state.context.currentTime);
      state.master.gain.setValueAtTime(0.0001, state.context.currentTime);
      state.master.gain.exponentialRampToValueAtTime(SCENES[state.scene].volume, state.context.currentTime + 0.8);
      scheduleBar();
      state.timer = setInterval(scheduleBar, 6000);
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
  const tags = poem.querySelector('.meta')?.textContent || '';
  const theme = poemSoundTheme(tags);
  button.title = `Play optional ${theme === 'poetry' ? '' : theme + ' '}poem soundscape`;
  createPortusMusic(button, undefined, theme);
}

if(typeof document !== 'undefined'){
  document.addEventListener('DOMContentLoaded', addPoemControl);
}
