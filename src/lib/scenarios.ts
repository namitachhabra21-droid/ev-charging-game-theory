import { DEFAULT_PARAMS, cloneParams, type ModelParams } from "./model";

export interface Scenario {
  id: string;
  name: string;
  description: string;
  params: ModelParams;
}

/** Build a scenario by tweaking a copy of the defaults. */
function variant(tweak: (p: ModelParams) => void): ModelParams {
  const p = cloneParams(DEFAULT_PARAMS);
  tweak(p);
  return p;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "default",
    name: "Baseline (project defaults)",
    description: "A has slightly better quality, shorter waits and faster charging than B; equal costs.",
    params: cloneParams(DEFAULT_PARAMS),
  },
  {
    id: "equal",
    name: "1. Equal Stations",
    description:
      "Both stations are identical (quality 7.5, wait 11 min, 55 kW, ₹8/kWh cost). The game is symmetric.",
    params: variant((p) => {
      const same = { marginalCost: 8, fixedCost: 2000, quality: 7.5, waitTime: 11, speed: 55 };
      p.A = { ...same };
      p.B = { ...same };
    }),
  },
  {
    id: "fastA",
    name: "2. Station A Has Faster Charging",
    description: "A installs 150 kW fast chargers, which also cuts its waiting time to 6 minutes. B is unchanged.",
    params: variant((p) => {
      p.A.speed = 150;
      p.A.waitTime = 6;
    }),
  },
  {
    id: "cheapB",
    name: "3. Station B Has Lower Operating Cost",
    description: "B buys cheaper electricity (₹5/kWh) and has a lower fixed cost (₹1,200). A is unchanged.",
    params: variant((p) => {
      p.B.marginalCost = 5;
      p.B.fixedCost = 1200;
    }),
  },
];
