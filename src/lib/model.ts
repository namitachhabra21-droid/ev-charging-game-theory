/**
 * Game-theoretic model of price competition between two EV charging stations.
 *
 * The game is a two-player, simultaneous-move, normal-form game:
 *   - Players:    Station A and Station B
 *   - Strategies: a price per kWh chosen from a finite list (PRICES)
 *   - Payoffs:    each station's profit, which depends on BOTH prices because
 *                 customers split between the stations via a logit choice model.
 *
 * Everything in this file is pure (no React), so it can be unit-tested and
 * reused by the charts, the CSV export and the scenario comparison.
 */

/** The strategy set: prices (₹ per kWh) each station may choose. */
export const PRICES = [10, 12, 14, 16, 18, 20, 22, 24] as const;

export type StationId = "A" | "B";

/** Characteristics of one charging station. */
export interface StationParams {
  marginalCost: number; // ₹ per kWh (cost of electricity etc.)
  fixedCost: number; // ₹ per period (rent, staff, maintenance)
  quality: number; // service-quality score (0–10)
  waitTime: number; // average waiting time in minutes
  speed: number; // charging speed in kW
}

/** How strongly customers react to each attribute (logit coefficients). */
export interface Sensitivities {
  price: number;
  wait: number;
  quality: number;
  speed: number;
}

/** All inputs to one simulation run. */
export interface ModelParams {
  totalCustomers: number;
  energyPerCustomer: number; // kWh bought by each customer
  A: StationParams;
  B: StationParams;
  sens: Sensitivities;
}

export const DEFAULT_PARAMS: ModelParams = {
  totalCustomers: 1000,
  energyPerCustomer: 20,
  A: { marginalCost: 8, fixedCost: 2000, quality: 8, waitTime: 10, speed: 60 },
  B: { marginalCost: 8, fixedCost: 2000, quality: 7, waitTime: 12, speed: 50 },
  sens: { price: 0.25, wait: 0.05, quality: 0.15, speed: 0.01 },
};

/** Deep copy so callers can never mutate the defaults by accident. */
export function cloneParams(p: ModelParams): ModelParams {
  return {
    totalCustomers: p.totalCustomers,
    energyPerCustomer: p.energyPerCustomer,
    A: { ...p.A },
    B: { ...p.B },
    sens: { ...p.sens },
  };
}

/** Full financial outcome for one station at one price pair. */
export interface StationOutcome {
  price: number;
  utility: number;
  share: number; // 0–1
  demand: number; // customers
  energySold: number; // kWh
  revenue: number; // ₹
  variableCost: number; // ₹
  totalCost: number; // ₹ (variable + fixed)
  profit: number; // ₹
}

export interface Outcome {
  A: StationOutcome;
  B: StationOutcome;
}

/**
 * Deterministic utility a customer gets from a station.
 *   U_i = −β_p·price_i − β_w·wait_i + β_q·quality_i + β_s·speed_i
 * Higher price and longer waits lower utility; better quality and faster
 * charging raise it.
 */
export function utility(price: number, s: StationParams, sens: Sensitivities): number {
  return (
    -sens.price * price -
    sens.wait * s.waitTime +
    sens.quality * s.quality +
    sens.speed * s.speed
  );
}

/**
 * Multinomial-logit market shares, computed in a numerically stable way.
 *
 * Share_i = exp(U_i) / Σ_j exp(U_j)
 *
 * exp() overflows for large utilities (e.g. exp(800) = Infinity), so we use
 * the "log-sum-exp" trick: subtract the largest utility from every utility
 * first. This multiplies the numerator and denominator by the same constant,
 * so the shares are unchanged, but the largest exponent becomes exp(0) = 1.
 */
export function logitShares(utilities: number[]): number[] {
  const max = Math.max(...utilities);
  const exps = utilities.map((u) => Math.exp(u - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

function stationOutcome(
  price: number,
  u: number,
  share: number,
  s: StationParams,
  p: ModelParams,
): StationOutcome {
  const demand = p.totalCustomers * share;
  const energySold = demand * p.energyPerCustomer;
  const revenue = price * energySold;
  const variableCost = s.marginalCost * energySold;
  const totalCost = variableCost + s.fixedCost;
  // Profit_i = (price_i − MC_i) × demand_i × energy − fixedCost_i
  const profit = revenue - totalCost;
  return { price, utility: u, share, demand, energySold, revenue, variableCost, totalCost, profit };
}

/** Compute demand, shares, revenue, cost and profit for one price pair. */
export function computeOutcome(priceA: number, priceB: number, p: ModelParams): Outcome {
  const uA = utility(priceA, p.A, p.sens);
  const uB = utility(priceB, p.B, p.sens);
  const [sA, sB] = logitShares([uA, uB]);
  return {
    A: stationOutcome(priceA, uA, sA, p.A, p),
    B: stationOutcome(priceB, uB, sB, p.B, p),
  };
}

/** One cell of the bimatrix: row = A's price index, column = B's price index. */
export interface MatrixCell {
  i: number;
  j: number;
  outcome: Outcome;
  isBestResponseA: boolean; // A's price is a best response to B's price
  isBestResponseB: boolean; // B's price is a best response to A's price
  isNash: boolean;
}

export interface NashEquilibrium {
  i: number;
  j: number;
  priceA: number;
  priceB: number;
  outcome: Outcome;
}

export interface GameResult {
  params: ModelParams;
  prices: readonly number[];
  /** cells[i][j]: A plays prices[i], B plays prices[j]. */
  cells: MatrixCell[][];
  /** For each B price index j: the A price indices that maximise A's profit. */
  bestResponseA: number[][];
  /** For each A price index i: the B price indices that maximise B's profit. */
  bestResponseB: number[][];
  equilibria: NashEquilibrium[];
}

/**
 * Tolerance for treating two profits as "equal" when finding best responses.
 * Floating-point arithmetic can make mathematically equal profits differ in
 * the last digits; without a tolerance a genuine tie could be missed.
 */
const EPS = 1e-6;

/** Indices of the maximum values in an array (all of them, in case of ties). */
function argmaxAll(values: number[]): number[] {
  const max = Math.max(...values);
  const tol = EPS * Math.max(1, Math.abs(max));
  return values.flatMap((v, k) => (v >= max - tol ? [k] : []));
}

/**
 * Solve the game:
 *  1. Build the full 8 × 8 payoff (bi)matrix.
 *  2. Best response of A: for each column (B's price), the row(s) giving A
 *     the highest profit. Best response of B: for each row, the column(s)
 *     giving B the highest profit.
 *  3. A cell is a pure-strategy Nash equilibrium when it is a best response
 *     for BOTH players at once — neither station can raise its profit by
 *     changing only its own price.
 */
export function solveGame(p: ModelParams, prices: readonly number[] = PRICES): GameResult {
  const n = prices.length;
  const outcomes: Outcome[][] = prices.map((pa) => prices.map((pb) => computeOutcome(pa, pb, p)));

  const bestResponseA: number[][] = [];
  for (let j = 0; j < n; j++) {
    bestResponseA.push(argmaxAll(outcomes.map((row) => row[j].A.profit)));
  }
  const bestResponseB: number[][] = [];
  for (let i = 0; i < n; i++) {
    bestResponseB.push(argmaxAll(outcomes[i].map((o) => o.B.profit)));
  }

  const equilibria: NashEquilibrium[] = [];
  const cells: MatrixCell[][] = outcomes.map((row, i) =>
    row.map((outcome, j) => {
      const isBestResponseA = bestResponseA[j].includes(i);
      const isBestResponseB = bestResponseB[i].includes(j);
      const isNash = isBestResponseA && isBestResponseB;
      if (isNash) equilibria.push({ i, j, priceA: prices[i], priceB: prices[j], outcome });
      return { i, j, outcome, isBestResponseA, isBestResponseB, isNash };
    }),
  );

  return { params: p, prices, cells, bestResponseA, bestResponseB, equilibria };
}

/** Result of checking whether a station gains by deviating alone. */
export interface DeviationCheck {
  station: StationId;
  currentPrice: number;
  currentProfit: number;
  bestAlternativePrice: number;
  bestAlternativeProfit: number;
  /** bestAlternativeProfit − currentProfit (≤ 0 at a Nash equilibrium). */
  gain: number;
}

/**
 * Unilateral-deviation test at cell (i, j): hold the rival's price fixed and
 * try every OTHER price for the station. If no alternative is better, the
 * station has no incentive to deviate.
 */
export function deviationCheck(game: GameResult, i: number, j: number, station: StationId): DeviationCheck {
  const { cells, prices } = game;
  const current = cells[i][j].outcome[station].profit;
  let bestK = -1;
  let bestProfit = -Infinity;
  for (let k = 0; k < prices.length; k++) {
    if (station === "A" ? k === i : k === j) continue;
    const profit = station === "A" ? cells[k][j].outcome.A.profit : cells[i][k].outcome.B.profit;
    if (profit > bestProfit) {
      bestProfit = profit;
      bestK = k;
    }
  }
  return {
    station,
    currentPrice: station === "A" ? prices[i] : prices[j],
    currentProfit: current,
    bestAlternativePrice: prices[bestK],
    bestAlternativeProfit: bestProfit,
    gain: bestProfit - current,
  };
}

/* ------------------------------------------------------------------ */
/* Input validation                                                    */
/* ------------------------------------------------------------------ */

/** Allowed range for every numeric input. Used by both the UI and validation. */
export interface FieldSpec {
  label: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  integer?: boolean;
}

export const GLOBAL_FIELDS: Record<"totalCustomers" | "energyPerCustomer", FieldSpec> = {
  totalCustomers: { label: "Total customers", min: 1, max: 1_000_000, step: 50, integer: true },
  energyPerCustomer: { label: "Energy per customer", unit: "kWh", min: 1, max: 200, step: 1 },
};

export const STATION_FIELDS: Record<keyof StationParams, FieldSpec> = {
  marginalCost: { label: "Marginal cost", unit: "₹/kWh", min: 0, max: 30, step: 0.5 },
  fixedCost: { label: "Fixed operating cost", unit: "₹", min: 0, max: 100_000, step: 100 },
  quality: { label: "Service-quality score", unit: "/10", min: 0, max: 10, step: 0.5 },
  waitTime: { label: "Waiting time", unit: "min", min: 0, max: 120, step: 1 },
  speed: { label: "Charging speed", unit: "kW", min: 1, max: 350, step: 5 },
};

export const SENS_FIELDS: Record<keyof Sensitivities, FieldSpec> = {
  price: { label: "Price sensitivity", min: 0, max: 2, step: 0.01 },
  wait: { label: "Waiting-time sensitivity", min: 0, max: 1, step: 0.01 },
  quality: { label: "Quality sensitivity", min: 0, max: 2, step: 0.01 },
  speed: { label: "Speed sensitivity", min: 0, max: 0.2, step: 0.001 },
};

/** Validate a single value; returns an error message or null. */
export function validateValue(value: number, spec: FieldSpec): string | null {
  if (!Number.isFinite(value)) return "Enter a number";
  if (value < spec.min) return `Must be ≥ ${spec.min.toLocaleString("en-IN")}`;
  if (value > spec.max) return `Must be ≤ ${spec.max.toLocaleString("en-IN")}`;
  if (spec.integer && !Number.isInteger(value)) return "Must be a whole number";
  return null;
}

/** Map of field path (e.g. "A.speed") → error message. Empty when valid. */
export function validateParams(p: ModelParams): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const key of Object.keys(GLOBAL_FIELDS) as (keyof typeof GLOBAL_FIELDS)[]) {
    const e = validateValue(p[key], GLOBAL_FIELDS[key]);
    if (e) errors[key] = e;
  }
  for (const st of ["A", "B"] as const) {
    for (const key of Object.keys(STATION_FIELDS) as (keyof StationParams)[]) {
      const e = validateValue(p[st][key], STATION_FIELDS[key]);
      if (e) errors[`${st}.${key}`] = e;
    }
  }
  for (const key of Object.keys(SENS_FIELDS) as (keyof Sensitivities)[]) {
    const e = validateValue(p.sens[key], SENS_FIELDS[key]);
    if (e) errors[`sens.${key}`] = e;
  }
  return errors;
}

/**
 * When several pure equilibria exist (common on a discrete price grid), pick
 * one to feature in the results: the one with the highest joint profit. If it
 * gives BOTH stations at least as much as every other equilibrium, it is
 * "payoff-dominant" — the natural focal point both stations would prefer.
 */
export function featuredEquilibriumIndex(eqs: NashEquilibrium[]): number {
  if (eqs.length === 0) return -1;
  let best = 0;
  eqs.forEach((e, k) => {
    const joint = e.outcome.A.profit + e.outcome.B.profit;
    const bestJoint = eqs[best].outcome.A.profit + eqs[best].outcome.B.profit;
    if (joint > bestJoint) best = k;
  });
  return best;
}

export function isPayoffDominant(eqs: NashEquilibrium[], k: number): boolean {
  const e = eqs[k];
  return eqs.every(
    (o) => e.outcome.A.profit >= o.outcome.A.profit - EPS && e.outcome.B.profit >= o.outcome.B.profit - EPS,
  );
}

/** Contribution of each attribute to the utility gap U_A − U_B. */
export interface UtilityBreakdown {
  price: number;
  wait: number;
  quality: number;
  speed: number;
  total: number;
}

export function utilityGap(priceA: number, priceB: number, p: ModelParams): UtilityBreakdown {
  const { sens, A, B } = p;
  const price = -sens.price * (priceA - priceB);
  const wait = -sens.wait * (A.waitTime - B.waitTime);
  const quality = sens.quality * (A.quality - B.quality);
  const speed = sens.speed * (A.speed - B.speed);
  return { price, wait, quality, speed, total: price + wait + quality + speed };
}
