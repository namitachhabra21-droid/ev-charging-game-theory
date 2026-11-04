/**
 * The bimatrix of payoffs. Rows are Station A's price, columns Station B's.
 * Each cell shows (A's profit, B's profit).
 *   ▲ marks A's best response to that column's B price.
 *   ◆ marks B's best response to that row's A price.
 *   A cell with both marks is a pure Nash equilibrium (thick outline).
 * Heatmap modes colour each cell by one station's profit (one-hue ramp).
 */
import { useState } from "react";
import type { GameResult, MatrixCell } from "../lib/model";
import { formatINR, formatINRCompact, formatPct, priceLabel } from "../lib/format";

type View = "both" | "A" | "B";

// Sequential blue ramp (light → dark) for magnitude.
const RAMP = ["#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281"];

function rampColor(t: number) {
  const k = Math.max(0, Math.min(RAMP.length - 1, Math.round(t * (RAMP.length - 1))));
  return { bg: RAMP[k], dark: k >= 6 };
}

export function PayoffMatrix({ game }: { game: GameResult }) {
  const [view, setView] = useState<View>("both");
  const { prices, cells } = game;

  // Range of the heatmap's profit values, for normalising colours.
  const values = view === "both" ? [] : cells.flat().map((c) => c.outcome[view].profit);
  const lo = Math.min(...values);
  const hi = Math.max(...values);

  const tooltip = (c: MatrixCell) =>
    [
      `A ${priceLabel(c.outcome.A.price)} vs B ${priceLabel(c.outcome.B.price)}`,
      `A: share ${formatPct(c.outcome.A.share)}, profit ${formatINR(c.outcome.A.profit)}`,
      `B: share ${formatPct(c.outcome.B.share)}, profit ${formatINR(c.outcome.B.profit)}`,
      c.isBestResponseA ? "▲ A's best response to B's price" : "",
      c.isBestResponseB ? "◆ B's best response to A's price" : "",
      c.isNash ? "★ Nash equilibrium" : "",
    ]
      .filter(Boolean)
      .join("\n");

  return (
    <div>
      <div className="no-print mb-3 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Matrix view">
        {(
          [
            ["both", "Bimatrix (A, B)"],
            ["A", "Heatmap: A's profit"],
            ["B", "Heatmap: B's profit"],
          ] as [View, string][]
        ).map(([v, label]) => (
          <button
            key={v}
            role="radio"
            aria-checked={view === v}
            onClick={() => setView(v)}
            className={`rounded-full border px-3 py-1 text-sm ${
              view === v ? "border-ink bg-ink text-white" : "border-hairline bg-white text-ink-2 hover:bg-plane"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-hairline">
        <table className="w-full min-w-[920px] border-collapse text-xs tabular-nums sm:text-sm">
          <caption className="sr-only">Payoff matrix: rows are Station A's price, columns are Station B's price</caption>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-plane p-2 text-left text-xs font-medium text-ink-2">
                <span className="text-stationA">A ↓</span> / <span className="text-stationB">B →</span>
              </th>
              {prices.map((p) => (
                <th key={p} scope="col" className="bg-plane p-2 text-center font-semibold text-ink">
                  <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-stationB align-middle" aria-hidden />
                  {priceLabel(p)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cells.map((row, i) => (
              <tr key={prices[i]}>
                <th scope="row" className="sticky left-0 z-10 bg-plane p-2 text-left font-semibold text-ink">
                  <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-stationA align-middle" aria-hidden />
                  {priceLabel(prices[i])}
                </th>
                {row.map((c) => {
                  const heat = view === "both" ? null : rampColor(hi === lo ? 0.5 : (c.outcome[view].profit - lo) / (hi - lo));
                  return (
                    <td
                      key={c.j}
                      title={tooltip(c)}
                      style={heat ? { backgroundColor: heat.bg } : undefined}
                      className={`relative border border-white p-1.5 text-center align-middle ${
                        heat ? (heat.dark ? "text-white" : "text-ink") : c.isNash ? "bg-amber-50" : "bg-white"
                      } ${c.isNash ? "outline outline-[3px] -outline-offset-[3px] outline-ink" : ""}`}
                    >
                      {c.isNash && (
                        <span className="absolute right-0.5 top-0 text-[10px] font-bold" aria-label="Nash equilibrium">
                          ★
                        </span>
                      )}
                      {view === "both" ? (
                        <div className="leading-tight">
                          <div className={c.isBestResponseA ? "font-bold" : "text-ink-2"}>
                            {c.isBestResponseA && <span className="text-stationA">▲ </span>}
                            {formatINR(c.outcome.A.profit)}
                          </div>
                          <div className={c.isBestResponseB ? "font-bold" : "text-ink-2"}>
                            {c.isBestResponseB && <span className="text-stationB">◆ </span>}
                            {formatINR(c.outcome.B.profit)}
                          </div>
                        </div>
                      ) : (
                        <div className={(view === "A" ? c.isBestResponseA : c.isBestResponseB) ? "font-bold" : ""}>
                          {(view === "A" ? c.isBestResponseA : c.isBestResponseB) && "● "}
                          {formatINR(c.outcome[view].profit)}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-2">
        {view === "both" ? (
          <>
            <span>Top value = A's profit, bottom = B's profit</span>
            <span>
              <span className="text-stationA">▲</span> A's best response (best row in that column)
            </span>
            <span>
              <span className="text-stationB">◆</span> B's best response (best column in that row)
            </span>
          </>
        ) : (
          <span className="flex items-center gap-2">
            {formatINRCompact(lo)}
            <span className="inline-block h-2.5 w-28 rounded-sm" style={{ background: `linear-gradient(to right, ${RAMP[0]}, ${RAMP[RAMP.length - 1]})` }} />
            {formatINRCompact(hi)} · ● = Station {view}'s best response
          </span>
        )}
        <span>
          <span className="font-bold">★</span> outlined cell = Nash equilibrium
        </span>
        <span className="no-print">Hover over a cell for details</span>
      </div>
    </div>
  );
}
