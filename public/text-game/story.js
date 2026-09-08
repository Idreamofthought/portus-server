/*
 * Story data for the text game. This is the whole game -- scenes,
 * choices, inventory items, and flags. The engine (engine.js) knows
 * nothing about the story itself; it just reads this file.
 *
 * SCENE FORMAT
 * ------------
 * "sceneId": {
 *   text: "What the player reads." | (state => "dynamic text"),
 *   choices: [
 *     {
 *       label: "What the player clicks",
 *       next: "otherSceneId",
 *       requires: state => true,          // optional: hide choice unless true
 *       effect: state => { ... },         // optional: mutate state before moving on
 *     },
 *     ...
 *   ]
 * }
 *
 * `state` is a plain object you control entirely -- put flags,
 * inventory, counters, whatever the story needs on it.
 */

export const TITLE = "Untitled Text Adventure";

export const initialState = {
  flags: {},
  inventory: [],
};

export const startScene = "start";

export const scenes = {
  start: {
    text: "The tide has gone out further than you've ever seen it. Out on the wet sand, something is catching the last light -- a shape too regular to be driftwood.",
    choices: [
      { label: "Walk out to it", next: "shape" },
      { label: "Stay on the shore and watch the light fade", next: "shore" },
    ],
  },
  shape: {
    text: "It's a door. Just a door, standing alone on the sand, salt-bleached and closed. There is no wall, no house, nothing holding it up.",
    choices: [
      { label: "Open it", next: "open_door" },
      { label: "Walk around it", next: "around_door" },
      { label: "Go back to the shore", next: "shore" },
    ],
  },
  around_door: {
    text: "From the back it is unmistakably the same door -- but the grain of the wood runs the wrong way, as though you're looking at its reflection instead of the door itself.",
    choices: [
      { label: "Open it from this side", next: "open_door" },
      { label: "Go back to the shore", next: "shore" },
    ],
  },
  open_door: {
    text: (s) => s.flags.hasKey
      ? "You turn the key you're carrying and the door swings open onto a flight of stairs leading down into the sand."
      : "The handle turns, but the door won't budge. It's locked, and there's no keyhole you can see -- just a smooth brass plate with your own reflection in it.",
    choices: [
      {
        label: "Go down the stairs",
        next: "stairs",
        requires: (s) => s.flags.hasKey,
      },
      {
        label: "Feel along the sand at the base of the door",
        next: "find_key",
        requires: (s) => !s.flags.hasKey,
      },
      { label: "Go back to the shore", next: "shore" },
    ],
  },
  find_key: {
    text: "Half-buried at the foot of the door, your fingers close around something small and cold. A key.",
    choices: [
      {
        label: "Take it",
        next: "shape",
        effect: (s) => { s.flags.hasKey = true; s.inventory.push("a small brass key"); },
      },
    ],
  },
  stairs: {
    text: "The stairs go down further than the tide could ever have reached. It is warm, and it smells like a library after rain.",
    choices: [
      { label: "Keep going", next: "ending_below" },
    ],
  },
  shore: {
    text: "The light is almost gone now. Whatever the shape was, it will still be there tomorrow -- or it won't.",
    choices: [
      { label: "Go back out onto the sand", next: "start" },
    ],
  },
  ending_below: {
    text: "This is as far as the story goes -- for now. You have a key, a door, and a flight of stairs into somewhere the tide has never been. Where they lead is the next thing to write.",
    choices: [],
  },
};
