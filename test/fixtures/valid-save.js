import { RESOURCE_KEYS } from "../../save-validation.js";
const resourceKeys = [...RESOURCE_KEYS];
export function validSave() {
  return {
    v: 1,
    captain: "Captain",
    res: Object.fromEntries(resourceKeys.map((key) => [key, 0])),
    cap: { general: 150, food: 150 },
    pop: { count: 6, capacity: 10 },
    happiness: 55,
    boats: 0,
    coin: 20,
    research: 0,
    unlockedTechs: [],
    techBonus: { field: 1, quarry: 1, fish: 1, foundry: 1, trade: 1, wood: 1, clay: 1, raid: 1, research: 1 },
    techHappinessBonus: 0,
    questsCompleted: [],
    military: { soldiers: 0, cap: 0 },
    droughtTicksLeft: 0,
    tickCount: 0,
    civicMilestones: [],
    townMemory: [],
    taxRate: 0,
    scenarioId: null,
    scenarioState: { disastersSurvived: 0, failed: false },
    grid: Array.from({ length: 30 }, () => Array.from({ length: 44 }, () => ({ terrain: "grass", deposit: null }))),
    buildings: [{ id: "house", x: 0, y: 0 }]
  };
}

