// Scenario/goal definitions, extracted from protected/game.html.
// progress() takes an explicit ctx object rather than closing over
// game.html's globals, for the same reason as quests.js.

export const SCENARIOS = [
  {id:'growth', name:'Growth Race', ic:'👥', desc:'Reach a population of 40.',
    target:40, progress:(ctx)=>ctx.pop.count, format:v=>`${Math.floor(v)}/40 citizens`},
  {id:'trade', name:'Trade Empire', ic:'🪙', desc:'Bank 300 coin.',
    target:300, progress:(ctx)=>ctx.coin, format:v=>`${Math.floor(v)}/300 coin`},
  {id:'builder', name:'Master Builder', ic:'🏗️', desc:'Construct 15 buildings.',
    target:15, progress:(ctx)=>ctx.placedBuildings.length, format:v=>`${Math.floor(v)}/15 buildings`},
  {id:'survivor', name:'Survivor', ic:'🛡️', desc:'Live through 5 disasters without happiness dropping below 20.',
    target:5, progress:(ctx)=>ctx.scenarioState.disastersSurvived, format:v=>`${Math.floor(v)}/5 disasters survived`},
];
