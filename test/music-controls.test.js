import test from 'node:test';
import assert from 'node:assert/strict';
import { createPortusMusic } from '../public/music.js';

test('soundscape buttons share playback and connect the master only once', async () => {
  const connections = [];
  const oscillators = [];
  const param = () => ({ value: 0, setValueAtTime(){}, exponentialRampToValueAtTime(){}, cancelScheduledValues(){} });
  class AudioContext {
    currentTime = 0;
    state = 'running';
    destination = {};
    createGain(){ return { gain: param(), connect(target){ connections.push(target); return target; } }; }
    createOscillator(){
      const voice = { frequency: param(), connect(target){ return target; }, start(){ oscillators.push(this); }, stop(){}, addEventListener(){} };
      return voice;
    }
    async resume(){}
  }
  globalThis.window = { AudioContext };
  const button = id => ({ id, textContent: '', attributes: {}, setAttribute(key, value){ this.attributes[key] = value; } });
  const title = button('musicBtn');
  const status = button('musicToggle');
  createPortusMusic(title);
  createPortusMusic(status);
  try{
    await status.onclick();
    assert.equal(title.textContent, 'Pause Portus soundscape');
    assert.equal(status.textContent, 'Soundscape: Pause');
    assert.ok(oscillators.length >= 2);
    await title.onclick();
    assert.equal(status.attributes['aria-pressed'], 'false');
    await status.onclick();
    assert.equal(connections.length, 1 + oscillators.length);
  } finally {
    if(status.attributes['aria-pressed'] === 'true') await status.onclick();
    delete globalThis.window;
  }
});
