/** Equilibrium prices, demand, share and profit, plus the unilateral-deviation test. */
import { deviationCheck, isPayoffDominant, type GameResult } from "../lib/model";
import { formatINR, formatINR2, formatNum, formatPct, priceLabel } from "../lib/format";
import { StationTag } from "./ui";

interface Props {
  game: GameResult;
  eqIndex: number;
  onSelect: (k: number) => void;
}

export function NashResults({ game, eqIndex, onSelect }: Props) {
  const { equilibria } = game;

  if (equilibria.length === 0) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-ink" role="status">
        <p className="font-semibold">⚠ No pure-strategy Nash equilibrium exists for these parameters.</p>
        <p className="mt-2 text-ink-2">
          Every price pair has at least one station that could earn more by changing its own price. The best responses
          cycle instead of meeting. By Nash's theorem, an equilibrium still exists in <em>mixed</em> strategies, where
          stations randomise over prices. Try a different price sensitivity, or compare the costs of the two stations.
        </p>
      </div>
    );
  }

  const eq = equilibria[eqIndex];
  const rows: [string, (s: "A" | "B") => string][] = [
    ["Equilibrium price", (s) => `${formatINR2(eq.outcome[s].price)} / kWh`],
    ["Market share", (s) => formatPct(eq.outcome[s].share)],
    ["Customer demand", (s) => `${formatNum(eq.outcome[s].demand, 1)} customers`],
    ["Energy sold", (s) => `${formatNum(eq.outcome[s].energySold)} kWh`],
    ["Revenue", (s) => formatINR(eq.outcome[s].revenue)],
    ["Variable cost", (s) => formatINR(eq.outcome[s].variableCost)],
    ["Fixed cost", (s) => formatINR(game.params[s].fixedCost)],
    ["Total cost", (s) => formatINR(eq.outcome[s].totalCost)],
    ["Profit", (s) => formatINR(eq.outcome[s].profit)],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-ink px-3 py-1 font-medium text-white">
          {equilibria.length} pure Nash {equilibria.length === 1 ? "equilibrium" : "equilibria"} found
        </span>
        {equilibria.length > 1 &&
          equilibria.map((e, k) => (
            <button
              key={k}
              onClick={() => onSelect(k)}
              aria-pressed={k === eqIndex}
              className={`no-print rounded-full border px-3 py-1 tabular-nums ${
                k === eqIndex ? "border-ink bg-amber-50 font-semibold" : "border-hairline bg-white text-ink-2 hover:bg-plane"
              }`}
            >
              ★ (A {priceLabel(e.priceA)}, B {priceLabel(e.priceB)})
              {isPayoffDominant(equilibria, k) ? " · payoff-dominant" : ""}
            </button>
          ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm tabular-nums">
          <thead>
            <tr className="border-b border-hairline text-left">
              <th className="py-2 pr-4 font-medium text-ink-2">At (A {priceLabel(eq.priceA)}, B {priceLabel(eq.priceB)})</th>
              <th className="py-2 pr-4 text-right">
                <StationTag id="A" />
              </th>
              <th className="py-2 text-right">
                <StationTag id="B" />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, f]) => (
              <tr key={label} className={`border-b border-hairline/70 ${label === "Profit" ? "font-semibold" : ""}`}>
                <td className="py-1.5 pr-4 text-ink-2">{label}</td>
                <td className="py-1.5 pr-4 text-right">{f("A")}</td>
                <td className="py-1.5 text-right">{f("B")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink">Unilateral-deviation test</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["A", "B"] as const).map((s) => {
            const d = deviationCheck(game, eq.i, eq.j, s);
            return (
              <div key={s} className="rounded-lg border border-hairline bg-white p-3 text-sm">
                <StationTag id={s} />
                <p className="mt-1 text-ink-2">
                  Current profit at {priceLabel(d.currentPrice)}: <b className="text-ink">{formatINR(d.currentProfit)}</b>
                  <br />
                  Best alternative ({priceLabel(d.bestAlternativePrice)}): {formatINR(d.bestAlternativeProfit)}
                </p>
                <p className="mt-1 font-medium text-[#006300]">
                  ✓ No profitable deviation (change {formatINR(d.gain)})
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
