/**
 * Turns a solved game into plain academic-language paragraphs, a copyable
 * text summary, and CSV. All numbers come straight from the model, so the
 * text always matches what the tables and charts show.
 */
import {
  computeOutcome,
  deviationCheck,
  isPayoffDominant,
  utilityGap,
  type GameResult,
  type NashEquilibrium,
} from "./model";
import { formatINR, formatNum, formatPct, priceLabel } from "./format";

export interface ExplanationSection {
  heading: string;
  paragraphs: string[];
}

const signed = (x: number) => (x >= 0 ? `+${x.toFixed(3)}` : `−${Math.abs(x).toFixed(3)}`);

export function buildExplanation(game: GameResult, eqIndex: number): ExplanationSection[] {
  const { equilibria, prices, params } = game;
  const sections: ExplanationSection[] = [];

  if (equilibria.length === 0) {
    sections.push({
      heading: "No pure-strategy Nash equilibrium",
      paragraphs: [
        `For these parameters no price pair is a mutual best response. Whatever pair is chosen, at least one station can earn more by switching its own price, so the best responses keep cycling (A undercuts, B responds, A responds again…).`,
        `Nash's theorem (1950) guarantees that every finite game has at least one equilibrium in mixed strategies. Here, that means the stations would randomise over prices. This app only searches pure strategies, so it reports none. A finer price grid or different sensitivities usually restores a pure equilibrium.`,
      ],
    });
    return sections;
  }

  const eq = equilibria[eqIndex] ?? equilibria[0];
  const { A, B } = eq.outcome;
  const devA = deviationCheck(game, eq.i, eq.j, "A");
  const devB = deviationCheck(game, eq.i, eq.j, "B");

  // 1. Why this is a Nash equilibrium
  const why: string[] = [
    `At (A = ${priceLabel(eq.priceA)}, B = ${priceLabel(eq.priceB)}) each station is playing a best response to the other's price. Holding B at ${priceLabel(eq.priceB)}, A's profit of ${formatINR(A.profit)} is the highest it can reach. Its best alternative, ${priceLabel(devA.bestAlternativePrice)}, would give ${formatINR(devA.bestAlternativeProfit)}. Holding A at ${priceLabel(eq.priceA)}, B's profit of ${formatINR(B.profit)} beats its best alternative, ${priceLabel(devB.bestAlternativePrice)} (${formatINR(devB.bestAlternativeProfit)}).`,
    `Because neither station gains by changing its price alone, the pair is self-enforcing. That is the definition of a Nash equilibrium.`,
  ];
  if (equilibria.length > 1) {
    const list = equilibria.map((e) => `(${priceLabel(e.priceA)}, ${priceLabel(e.priceB)})`).join(", ");
    why.push(
      `There are ${equilibria.length} pure equilibria: ${list}. Several equilibria are common when prices move in ₹2 steps. The true continuous optimum lies between grid points, so neighbouring pairs can each survive the deviation test. ` +
        (isPayoffDominant(equilibria, eqIndex)
          ? `The one featured here is payoff-dominant: both stations earn at least as much as in any other equilibrium, so it is the natural focal point.`
          : `The featured one has the highest combined profit, but no single equilibrium is best for both stations.`),
    );
  }
  sections.push({ heading: "Why these prices form a Nash equilibrium", paragraphs: why });

  // 2. Price → demand → profit
  const pricePara: string[] = [];
  const up = eq.i + 1 < prices.length ? eq.i + 1 : -1;
  if (up >= 0) {
    const o = computeOutcome(prices[up], eq.priceB, params);
    pricePara.push(
      `Raising A's price from ${priceLabel(eq.priceA)} to ${priceLabel(prices[up])} would cut its market share from ${formatPct(A.share)} to ${formatPct(o.A.share)}. Its demand would fall from ${formatNum(A.demand)} to ${formatNum(o.A.demand)} customers. The margin per kWh rises from ₹${(eq.priceA - params.A.marginalCost).toFixed(2)} to ₹${(prices[up] - params.A.marginalCost).toFixed(2)}, but profit would move to ${formatINR(o.A.profit)} (${o.A.profit >= A.profit ? "higher" : "lower"}).`,
    );
  }
  pricePara.push(
    `This is the core trade-off. A higher price earns more on each customer but drives customers to the rival. Under the logit model, a ₹1 price rise multiplies the odds of choosing that station by e^(−${params.sens.price}) ≈ ${Math.exp(-params.sens.price).toFixed(3)}. The equilibrium price balances the margin gained against the customers lost. Fixed costs of ${formatINR(params.A.fixedCost)} and ${formatINR(params.B.fixedCost)} lower profit by a constant amount, so they do not change which price is best.`,
  );
  sections.push({ heading: "How price affects demand and profit", paragraphs: pricePara });

  // 3. Non-price attributes
  const gap = utilityGap(eq.priceA, eq.priceB, params);
  const nonPrice = gap.wait + gap.quality + gap.speed;
  const leader = nonPrice >= 0 ? "A" : "B";
  sections.push({
    heading: "How service quality, waiting time and speed influence choice",
    paragraphs: [
      `Customers compare stations through the utility gap U_A − U_B = ${signed(gap.total)}. It is made up of price ${signed(gap.price)}, waiting time ${signed(gap.wait)}, service quality ${signed(gap.quality)} and charging speed ${signed(gap.speed)}.`,
      Math.abs(nonPrice) < 1e-9
        ? `The stations are identical on non-price attributes, so price is the only thing that separates them.`
        : `Taken together, the non-price attributes give Station ${leader} an advantage of ${Math.abs(nonPrice).toFixed(3)} utility units. That is worth about ₹${(Math.abs(nonPrice) / params.sens.price).toFixed(2)} per kWh of price difference (advantage ÷ price sensitivity). This lets ${leader} charge ${leader === "A" ? (eq.priceA >= eq.priceB ? "the same or more" : "slightly less") : eq.priceB >= eq.priceA ? "the same or more" : "slightly less"} and still win ${formatPct(leader === "A" ? A.share : B.share)} of the market.`,
    ],
  });

  // 4. Unilateral deviation
  const fmtGain = (g: number) => (g <= 0 ? `would lose at least ${formatINR(-g)}` : `would gain ${formatINR(g)}`);
  sections.push({
    heading: "Can either station increase profit by changing its price alone?",
    paragraphs: [
      `No. If Station A switched to its best alternative price (${priceLabel(devA.bestAlternativePrice)}) it ${fmtGain(devA.gain)}. If Station B switched to ${priceLabel(devB.bestAlternativePrice)} it ${fmtGain(devB.gain)}. Neither station has a reason to move alone, so the outcome is stable.`,
      jointNote(game, eq),
    ],
  });

  return sections;
}

/** Point out whether both stations could do better by raising prices together (prisoner's-dilemma flavour). */
function jointNote(game: GameResult, eq: NashEquilibrium): string {
  let best = { i: eq.i, j: eq.j, joint: eq.outcome.A.profit + eq.outcome.B.profit };
  game.cells.forEach((row) =>
    row.forEach((c) => {
      const better = c.outcome.A.profit > eq.outcome.A.profit && c.outcome.B.profit > eq.outcome.B.profit;
      const joint = c.outcome.A.profit + c.outcome.B.profit;
      if (better && joint > best.joint) best = { i: c.i, j: c.j, joint };
    }),
  );
  if (best.i === eq.i && best.j === eq.j) {
    return `No other price pair on the grid would make both stations better off, so the equilibrium is also Pareto-efficient for the two firms.`;
  }
  const c = game.cells[best.i][best.j].outcome;
  return `Notice, though, that if both stations charged (${priceLabel(c.A.price)}, ${priceLabel(c.B.price)}), both would earn more (${formatINR(c.A.profit)} and ${formatINR(c.B.profit)}). That outcome is not stable, because each would then be tempted to undercut. This is the prisoner's-dilemma logic of price competition, It is why such tacit collusion is hard to sustain, which benefits consumers.`;
}

/** Plain-text summary for the clipboard. */
export function buildSummaryText(game: GameResult, eqIndex: number): string {
  const p = game.params;
  const lines: string[] = [
    "Game-Theoretic Analysis of EV Charging Station Competition — Simulation Summary",
    "",
    `Customers: ${formatNum(p.totalCustomers)} | Energy/customer: ${p.energyPerCustomer} kWh`,
    `Sensitivities: price ${p.sens.price}, wait ${p.sens.wait}, quality ${p.sens.quality}, speed ${p.sens.speed}`,
    `Station A: MC ₹${p.A.marginalCost}/kWh, fixed ${formatINR(p.A.fixedCost)}, quality ${p.A.quality}, wait ${p.A.waitTime} min, ${p.A.speed} kW`,
    `Station B: MC ₹${p.B.marginalCost}/kWh, fixed ${formatINR(p.B.fixedCost)}, quality ${p.B.quality}, wait ${p.B.waitTime} min, ${p.B.speed} kW`,
    "",
  ];
  if (game.equilibria.length === 0) {
    lines.push("No pure-strategy Nash equilibrium exists for these parameters.");
  } else {
    lines.push(`Pure-strategy Nash equilibria found: ${game.equilibria.length}`);
    game.equilibria.forEach((e, k) => {
      const { A, B } = e.outcome;
      lines.push(
        `${k === eqIndex ? "*" : " "} (A ${priceLabel(e.priceA)}, B ${priceLabel(e.priceB)}): ` +
          `A share ${formatPct(A.share)}, demand ${formatNum(A.demand)}, profit ${formatINR(A.profit)} | ` +
          `B share ${formatPct(B.share)}, demand ${formatNum(B.demand)}, profit ${formatINR(B.profit)}`,
      );
    });
    if (game.equilibria.length > 1) lines.push("  (* = featured equilibrium)");
  }
  lines.push("");
  for (const s of buildExplanation(game, eqIndex)) {
    lines.push(s.heading.toUpperCase(), ...s.paragraphs, "");
  }
  return lines.join("\n");
}

const csvCell = (v: string | number | boolean) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvRow = (cells: (string | number | boolean)[]) => cells.map(csvCell).join(",");
const r2 = (x: number) => Math.round(x * 100) / 100;

/** Full results as CSV: parameters, equilibria and the complete payoff matrix in long format. */
export function buildCSV(game: GameResult): string {
  const p = game.params;
  const out: string[] = [];
  out.push("# Parameters");
  out.push(csvRow(["parameter", "station_A", "station_B"]));
  out.push(csvRow(["total_customers", p.totalCustomers, p.totalCustomers]));
  out.push(csvRow(["energy_per_customer_kWh", p.energyPerCustomer, p.energyPerCustomer]));
  for (const k of ["marginalCost", "fixedCost", "quality", "waitTime", "speed"] as const) {
    out.push(csvRow([k, p.A[k], p.B[k]]));
  }
  for (const k of ["price", "wait", "quality", "speed"] as const) {
    out.push(csvRow([`sensitivity_${k}`, p.sens[k], p.sens[k]]));
  }
  out.push("");
  out.push("# Pure-strategy Nash equilibria");
  out.push(csvRow(["price_A", "price_B", "share_A", "share_B", "demand_A", "demand_B", "profit_A_INR", "profit_B_INR"]));
  if (game.equilibria.length === 0) out.push("none");
  for (const e of game.equilibria) {
    const { A, B } = e.outcome;
    out.push(csvRow([e.priceA, e.priceB, r2(A.share * 100) + "%", r2(B.share * 100) + "%", r2(A.demand), r2(B.demand), r2(A.profit), r2(B.profit)]));
  }
  out.push("");
  out.push("# Payoff matrix (all price pairs)");
  out.push(
    csvRow([
      "price_A", "price_B", "utility_A", "utility_B", "share_A", "share_B", "demand_A", "demand_B",
      "revenue_A_INR", "revenue_B_INR", "total_cost_A_INR", "total_cost_B_INR", "profit_A_INR", "profit_B_INR",
      "A_best_response", "B_best_response", "nash_equilibrium",
    ]),
  );
  for (const row of game.cells) {
    for (const c of row) {
      const { A, B } = c.outcome;
      out.push(
        csvRow([
          A.price, B.price, r2(A.utility * 1000) / 1000, r2(B.utility * 1000) / 1000, r2(A.share * 10000) / 10000, r2(B.share * 10000) / 10000,
          r2(A.demand), r2(B.demand), r2(A.revenue), r2(B.revenue), r2(A.totalCost), r2(B.totalCost), r2(A.profit), r2(B.profit),
          c.isBestResponseA, c.isBestResponseB, c.isNash,
        ]),
      );
    }
  }
  return out.join("\n");
}

