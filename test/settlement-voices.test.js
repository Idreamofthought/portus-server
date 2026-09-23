import test from 'node:test';
import assert from 'node:assert/strict';
import { settlementVoice } from '../protected/js/settlement-voices.js';
import { BUILDINGS } from '../protected/js/buildings.js';

test('voices recommend actual missing buildings in production chains', () => {
  const wheat = settlementVoice('fields', ['fields'], 'wheat');
  assert.equal(wheat.next, 'mill');
  assert.equal(settlementVoice('fields', ['fields', 'mill'], 'wheat').next, 'baker');
  assert.equal(settlementVoice('fields', ['fields', 'mill', 'baker'], 'wheat'), null);
  assert.equal(settlementVoice('fields', ['fields'], 'olives'), null);
  for(const id of ['cowpasture', 'goatpasture', 'pigpasture', 'hunterlodge', 'claypit', 'quarry']){
    const voice = settlementVoice(id, [id]);
    assert.ok(BUILDINGS.some(building => building.id === voice.next), `${id} needs a real destination`);
  }
  assert.match(settlementVoice('hunterlodge', ['hunterlodge']).text, /salt/i);
  assert.equal(settlementVoice('house', ['house']), null);
});
