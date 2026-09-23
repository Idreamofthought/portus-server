// A small set of optional voices. Suggestions follow actual building recipes.
const THREADS = {
  fields: { title: 'The first grain', speaker: 'A miller', steps: [
    { next: 'mill', text: 'Wheat waits in the store. A mill could grind it into flour.' },
    { next: 'baker', text: 'The mill turns now. A baker could turn its flour into bread.' }
  ] },
  mill: { title: 'Flour on the wind', speaker: 'A miller', steps: [
    { next: 'baker', text: 'Flour reaches the store. Who will bake for the people?' }
  ] },
  cowpasture: { title: 'What the herd gives', speaker: 'A herder', steps: [
    { next: 'dairy', text: 'The cows give milk. A dairy could make cheese, butter or cream. The hides could also reach a tanner.' },
    { next: 'tanner', text: 'The milk has found a use. A tanner could still work the hides.' }
  ] },
  goatpasture: { title: 'The hillside herd', speaker: 'A goatherd', steps: [
    { next: 'dairy', text: 'The goats give milk. A dairy could make cheese or yoghurt. A tanner could use their hides.' },
    { next: 'tanner', text: 'The dairy has milk. Hides can still find a use with a tanner.' }
  ] },
  pigpasture: { title: 'After the pasture', speaker: 'A herder', steps: [
    { next: 'tanner', text: 'The pigs give meat and hides. A tanner could turn the hides into leather.' }
  ] },
  hunterlodge: { title: 'The hunter returns', speaker: 'A hunter', steps: [
    { next: 'butcher', text: 'The hunt brings game. A butcher can preserve it when the town has salt.' }
  ] },
  claypit: { title: 'Clay beneath the feet', speaker: 'A digger', steps: [
    { next: 'potter', text: 'There is clay here. A potter could shape it into vessels.' }
  ] },
  quarry: { title: 'Stone for the town', speaker: 'A quarry worker', steps: [
    { next: 'workshop', text: 'Stone is ready. With timber from a Woodcutter, a workshop could make tools.' }
  ] }
};

export function settlementVoice(buildingId, existingIds = [], crop = 'wheat') {
  if(buildingId === 'fields' && crop !== 'wheat') return null;
  const thread = THREADS[buildingId];
  if(!thread) return null;
  const built = new Set(existingIds);
  const step = thread.steps.find(candidate => !built.has(candidate.next));
  return step ? { title: thread.title, speaker: thread.speaker, ...step } : null;
}
