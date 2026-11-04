/** Solve every preset scenario (plus the current run) and compare their equilibria side by side. */
import { useMemo, useState } from "react";
import { featuredEquilibriumIndex, solveGame, type GameResult } from "../lib/model";
import { SCENARIOS } from "../lib/scenarios";
import { formatINR, formatNum, formatPct, priceLabel } from "../lib/format";
import { Button } from "./ui";

interface Props {
  current: GameResult;
  currentLabel: string;
  onLoad: (id: string) => void;
}

export function ScenarioComparison({ current, currentLabel, onLoad }: Props) {
  const [showAll, setShowAll] = useState(false);
  const rows = useMemo(
    () => [
      ...SCENARIOS.filter((s) => s.id !== "default").map((s) => ({ id: s.id, name: s.name, description: s.description, game: solveGame(s.params) })),
      { id: "current", name: `Current run: ${currentLabel}`, description: "Parameters from the last Run Simulation.", game: current },
    ],
    [current, currentLabel],
  );

  return (
    <div className="space-y-3">
      <label className="no-print flex items-center gap-2 text-sm text-ink-2">
        <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
        Show every equilibrium (not only the featured one)
      </label>
      <div className="overflow-x-auto rounded-lg border border-hairline">
        <table className="w-full min-w-[820px] text-sm tabular-nums">
          <thead className="bg-plane text-left text-xs text-ink-2">
            <tr>
              <th className="p-2 font-medium">Scenario</th>
              <th className="p-2 text-right font-medium">Price A</th>
              <th className="p-2 text-right font-medium">Price B</th>
              <th className="p-2 text-right font-medium">Share A</th>
              <th className="p-2 text-right font-medium">Share B</th>
              <th className="p-2 text-right font-medium">Demand A</th>
              <th className="p-2 text-right font-medium">Demand B</th>
              <th className="p-2 text-right font-medium">Profit A</th>
              <th className="p-2 text-right font-medium">Profit B</th>
              <th className="no-print p-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const eqs = r.game.equilibria;
              const featured = featuredEquilibriumIndex(eqs);
              const shown = showAll ? eqs.map((_, k) => k) : featured >= 0 ? [featured] : [];
              if (shown.length === 0) {
                return (
                  <tr key={r.id} className="border-t border-hairline">
                    <td className="p-2">
                      <div className="font-medium text-ink">{r.name}</div>
                    </td>
                    <td colSpan={8} className="p-2 text-ink-2">
                      No pure-strategy Nash equilibrium
                    </td>
                    <td className="no-print p-2" />
                  </tr>
                );
              }
              return shown.map((k, n) => {
                const e = eqs[k];
                return (
                  <tr key={`${r.id}-${k}`} className={`${n === 0 ? "border-t border-hairline" : ""} ${r.id === "current" ? "bg-amber-50/50" : ""}`}>
                    <td className="p-2 align-top">
                      {n === 0 && (
                        <>
                          <div className="font-medium text-ink">{r.name}</div>
                          <div className="text-xs text-ink-muted">
                            {eqs.length} {eqs.length === 1 ? "equilibrium" : "equilibria"}
                            {!showAll && eqs.length > 1 ? " (highest joint profit shown)" : ""}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="p-2 text-right">{priceLabel(e.priceA)}</td>
                    <td className="p-2 text-right">{priceLabel(e.priceB)}</td>
                    <td className="p-2 text-right">{formatPct(e.outcome.A.share)}</td>
                    <td className="p-2 text-right">{formatPct(e.outcome.B.share)}</td>
                    <td className="p-2 text-right">{formatNum(e.outcome.A.demand)}</td>
                    <td className="p-2 text-right">{formatNum(e.outcome.B.demand)}</td>
                    <td className="p-2 text-right font-medium">{formatINR(e.outcome.A.profit)}</td>
                    <td className="p-2 text-right font-medium">{formatINR(e.outcome.B.profit)}</td>
                    <td className="no-print p-2 text-right">
                      {n === 0 && r.id !== "current" && (
                        <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => onLoad(r.id)}>
                          Load →
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
      <ul className="space-y-1 text-xs text-ink-2">
        {SCENARIOS.filter((s) => s.id !== "default").map((s) => (
          <li key={s.id}>
            <b className="text-ink">{s.name}:</b> {s.description}
          </li>
        ))}
      </ul>
    </div>
  );
}
