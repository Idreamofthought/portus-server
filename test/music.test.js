import test from 'node:test';
import assert from 'node:assert/strict';

test('music control plays audible notes and toggles without reconnecting the output', async () => {
  const frequencies = [];
  let connections = 0;
  const gain = () => ({
    value: 0,
    setValueAtTime(){},
    exponentialRampToValueAtTime(){},
    cancelScheduledValues(){}
  });
  class AudioContext {
    currentTime = 0;
    destination = {};
    state = 'suspended';
    createGain(){ return { gain: gain(), connect(){ connections++; return this; } }; }
    createOscillator(){
      return {
        frequency: { set value(value){ frequencies.push(value); } },
        connect(target){ return target; },
        start(){}, stop(){}, addEventListener(){}
      };
    }
    async resume(){ this.state = 'running'; }
  }
  globalThis.window = { AudioContext };
  const { createPortusMusic } = await import('../public/music.js');
  const button = { id:'musicToggle', setAttribute(){}, textContent:'' };
  createPortusMusic(button);
  assert.equal(button.textContent, 'Music: Off');
  await button.onclick();
  assert.equal(button.textContent, 'Music: On');
  assert.ok(frequencies.length > 0 && frequencies.every(hz => hz >= 290));
  await button.onclick();
  await button.onclick();
  assert.equal(button.textContent, 'Music: On');
  // Each note connects its own gain; only one additional connection is the master output.
  assert.equal(connections - frequencies.length, 1);
  await button.onclick();
  delete globalThis.window;
});
