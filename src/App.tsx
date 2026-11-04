/**
 * Game-Theoretic Analysis of EV Charging Station Competition
 *
 * App state:
 *   draft   – what the user is editing in the parameter controls
 *   applied – the parameters of the last "Run Simulation" (what results show)
 * The game is re-solved only when `applied` changes.
 */
import { useCallback, useMemo, useState } from "react";
import {
  DEFAULT_PARAMS,
  PRICES,
  cloneParams,
  featuredEquilibriumIndex,
  solveGame,
  validateParams,
  type ModelParams,
} from "./lib/model";
import { SCENARIOS } from "./lib/scenarios";
import { buildCSV, buildExplanation, buildSummaryText } from "./lib/explain";
import { formatINR, formatNum, formatPct, priceLabel } from "./lib/format";
import { Button, Section, StatTile } from "./components/ui";
import { ParameterControls } from "./components/ParameterControls";
import { PayoffMatrix } from "./components/PayoffMatrix";
import { NashResults } from "./components/NashResults";
import { Charts } from "./components/Charts";
import { ScenarioComparison } from "./components/ScenarioComparison";
import { Assumptions, Formulas, Limitations, MethodologyModal } from "./components/StaticSections";

const NAV = [
  ["intro", "Introduction"],
  ["assumptions", "Assumptions"],
  ["parameters", "Parameters"],
  ["matrix", "Payoff matrix"],
  ["nash", "Nash equilibrium"],
  ["charts", "Charts"],
  ["scenarios", "Scenarios"],
  ["explanation", "Explanation"],
  ["formulas", "Formulas"],
  ["limitations", "Limitations"],
] as const;

/** Copy text to the clipboard, with a fallback for browsers/iframes without the Clipboard API. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob(["﻿" + content], { type }); // BOM so Excel reads ₹ correctly
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const [draft, setDraft] = useState<ModelParams>(() => cloneParams(DEFAULT_PARAMS));
  const [applied, setApplied] = useState<ModelParams>(() => cloneParams(DEFAULT_PARAMS));
  const [scenarioId, setScenarioId] = useState("default");
  const [appliedLabel, setAppliedLabel] = useState(SCENARIOS[0].name);
  const [methodOpen, setMethodOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Solve the 8×8 game for the applied parameters (sample results on first load).
  const game = useMemo(() => solveGame(applied), [applied]);
  const [eqIndex, setEqIndex] = useState(() => featuredEquilibriumIndex(game.equilibria));
  const safeEq = eqIndex >= 0 && eqIndex < game.equilibria.length ? eqIndex : featuredEquilibriumIndex(game.equilibria);
  const eq = game.equilibria[safeEq];

  const errors = useMemo(() => validateParams(draft), [draft]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(applied);
  const explanation = useMemo(() => buildExplanation(game, safeEq), [game, safeEq]);

  const run = useCallback((p: ModelParams, label: string) => {
    if (Object.keys(validateParams(p)).length > 0) return;
    const next = cloneParams(p);
    setApplied(next);
    setAppliedLabel(label);
    setEqIndex(featuredEquilibriumIndex(solveGame(next).equilibria));
  }, []);

  const loadScenario = (id: string) => {
    const s = SCENARIOS.find((x) => x.id === id);
    if (!s) return;
    setDraft(cloneParams(s.params));
    setScenarioId(id);
    run(s.params, s.name);
  };

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const onCopy = async () => flash((await copyText(buildSummaryText(game, safeEq))) ? "✓ Result summary copied" : "Copy failed: your browser blocked clipboard access");
  const onCSV = () => {
    downloadFile(`ev-charging-game-${new Date().toISOString().slice(0, 10)}.csv`, buildCSV(game), "text/csv;charset=utf-8");
    flash("✓ CSV downloaded");
  };

  return (
    <div className="min-h-screen bg-plane text-ink">
      {/* Top bar with section navigation and actions */}
      <div className="no-print sticky top-0 z-40 border-b border-hairline bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:px-6">
          <nav className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto text-sm" aria-label="Sections">
            {NAV.map(([id, label], k) => (
              <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-md px-2 py-1 text-ink-2 hover:bg-plane hover:text-ink">
                <span className="text-ink-muted">{k + 1}.</span> {label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {/* 1. Title and introduction */}
        <section id="intro" className="scroll-mt-20">
          <p className="text-sm font-medium uppercase tracking-wide text-ink-muted">Game Theory · University Project</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight text-ink sm:text-3xl">
            Game-Theoretic Analysis of EV Charging Station Competition
          </h1>
          <p className="mt-3 max-w-3xl text-ink-2">
            Two charging stations compete for the same pool of electric-vehicle drivers by choosing a price per kWh.
            Drivers choose a station using a multinomial logit model of price, waiting time, service quality and
            charging speed. The app builds the full payoff matrix, finds each station's best responses, and identifies
            every pure-strategy Nash equilibrium: the price pairs from which neither station wants to move alone.
          </p>
          <div className="no-print mt-4 flex flex-wrap gap-2">
            <Button onClick={() => setMethodOpen(true)}>ⓘ Methodology</Button>
            <Button onClick={onCopy}>⧉ Copy result summary</Button>
            <Button onClick={onCSV}>⬇ Download CSV</Button>
            <Button onClick={() => window.print()}>⎙ Print results</Button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {eq ? (
              <>
                <StatTile label="Nash equilibrium prices" value={`${priceLabel(eq.priceA)} / ${priceLabel(eq.priceB)}`} sub="A / B per kWh" />
                <StatTile label="Equilibrium market share" value={`${formatPct(eq.outcome.A.share, 0)} / ${formatPct(eq.outcome.B.share, 0)}`} sub="A / B" />
                <StatTile label="Station A profit" value={formatINR(eq.outcome.A.profit)} sub={`${formatNum(eq.outcome.A.demand)} customers`} />
                <StatTile label="Station B profit" value={formatINR(eq.outcome.B.profit)} sub={`${formatNum(eq.outcome.B.demand)} customers`} />
              </>
            ) : (
              <div className="col-span-2 md:col-span-4">
                <StatTile label="Nash equilibrium" value="No pure-strategy equilibrium" sub="See section 5" />
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Showing: {appliedLabel}
            {game.equilibria.length > 1 && ` · ${game.equilibria.length} equilibria found, featured one shown`}
          </p>
        </section>

        <Section id="assumptions" number={2} title="Model assumptions">
          <Assumptions />
        </Section>

        <Section id="parameters" number={3} title="Parameter controls" subtitle="Adjust the inputs, then press Run Simulation. You can also start from a scenario preset.">
          <div className="no-print">
            <ParameterControls
              draft={draft}
              onChange={(p) => {
                setDraft(p);
                setScenarioId("custom");
              }}
              errors={errors}
              dirty={dirty}
              scenarioId={scenarioId}
              onScenario={loadScenario}
              onRun={() => run(draft, scenarioId === "custom" ? "Custom parameters" : SCENARIOS.find((s) => s.id === scenarioId)?.name ?? "Custom")}
              onReset={() => loadScenario("default")}
            />
          </div>
          <PrintParams p={applied} />
        </Section>

        <Section
          id="matrix"
          number={4}
          title="Payoff matrix"
          subtitle={`Profit of each station (₹) for all ${PRICES.length * PRICES.length} price combinations. Rows: Station A's price. Columns: Station B's price.`}
        >
          <PayoffMatrix game={game} />
        </Section>

        <Section id="nash" number={5} title="Nash equilibrium results">
          <NashResults game={game} eqIndex={safeEq} onSelect={setEqIndex} />
        </Section>

        <Section id="charts" number={6} title="Charts and visualisations">
          <Charts game={game} eqIndex={safeEq} />
        </Section>

        <Section id="scenarios" number={7} title="Scenario comparison" subtitle="Equilibria of the three preset scenarios, solved with the same price grid, next to your current run.">
          <ScenarioComparison current={game} currentLabel={appliedLabel} onLoad={loadScenario} />
        </Section>

        <Section id="explanation" number={8} title="Explanation of results" subtitle="Generated automatically from the current simulation.">
          <div className="space-y-4">
            {explanation.map((s) => (
              <div key={s.heading} className="avoid-break">
                <h3 className="font-semibold text-ink">{s.heading}</h3>
                {s.paragraphs.map((p, k) => (
                  <p key={k} className="mt-1.5 text-sm leading-relaxed text-ink-2">
                    {p}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </Section>

        <Section id="formulas" number={9} title="Mathematical formulas">
          <Formulas />
        </Section>

        <Section id="limitations" number={10} title="Limitations of the model">
          <Limitations />
        </Section>

        <footer className="pb-6 text-center text-xs text-ink-muted">
          Game-Theoretic Analysis of EV Charging Station Competition · Runs entirely in your browser
          <span className="print-only"> · Printed {new Date().toLocaleString("en-IN")}</span>
        </footer>
      </main>

      <MethodologyModal open={methodOpen} onClose={() => setMethodOpen(false)} />

      {toast && (
        <div role="status" className="no-print fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-ink px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

/** Compact parameter table that replaces the interactive controls when printing. */
function PrintParams({ p }: { p: ModelParams }) {
  const rows: [string, string, string][] = [
    ["Marginal cost (₹/kWh)", String(p.A.marginalCost), String(p.B.marginalCost)],
    ["Fixed cost", formatINR(p.A.fixedCost), formatINR(p.B.fixedCost)],
    ["Service quality", String(p.A.quality), String(p.B.quality)],
    ["Waiting time (min)", String(p.A.waitTime), String(p.B.waitTime)],
    ["Charging speed (kW)", String(p.A.speed), String(p.B.speed)],
  ];
  return (
    <div className="print-only text-sm">
      <p>
        Customers: {formatNum(p.totalCustomers)} · Energy per customer: {p.energyPerCustomer} kWh · Sensitivities: price{" "}
        {p.sens.price}, wait {p.sens.wait}, quality {p.sens.quality}, speed {p.sens.speed}
      </p>
      <table className="mt-2 w-full tabular-nums">
        <thead>
          <tr className="border-b text-left">
            <th className="py-1">Parameter</th>
            <th className="py-1 text-right">Station A</th>
            <th className="py-1 text-right">Station B</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([l, a, b]) => (
            <tr key={l} className="border-b border-hairline">
              <td className="py-1">{l}</td>
              <td className="py-1 text-right">{a}</td>
              <td className="py-1 text-right">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
