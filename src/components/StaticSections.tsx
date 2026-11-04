/** Fixed academic content: assumptions, formulas, limitations, and the methodology modal. */
import { useEffect, useRef } from "react";
import { PRICES } from "../lib/model";
import { Button } from "./ui";

export function Assumptions() {
  const items = [
    ["Two players", "Station A and Station B are the only charging options in the local market (a duopoly)."],
    ["Simultaneous moves", "Both stations choose prices at the same time, without seeing the rival's choice (a one-shot normal-form game)."],
    ["Discrete strategies", `Each station picks a price from {${PRICES.map((p) => `₹${p}`).join(", ")}} per kWh.`],
    ["Fixed market size", "Every customer charges at one of the two stations. Nobody leaves the market, even when prices are high."],
    ["Logit customer choice", "Customers weigh price, waiting time, service quality and charging speed. Random taste differences give smooth, probabilistic market shares."],
    ["Constant costs", "Each kWh costs the station a constant marginal cost. Fixed costs are paid regardless of sales."],
    ["Complete information", "Both stations know the demand model, each other's costs and attributes, and the full payoff matrix."],
    ["No capacity limits", "Each station can serve all the customers who choose it. Waiting time is an input, not something that grows with demand."],
  ];
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map(([t, d]) => (
        <div key={t} className="rounded-lg border border-hairline bg-white p-3">
          <dt className="text-sm font-semibold text-ink">{t}</dt>
          <dd className="mt-0.5 text-sm text-ink-2">{d}</dd>
        </div>
      ))}
    </dl>
  );
}

function Formula({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="avoid-break min-w-0">
      <div className="text-sm font-semibold text-ink">{label}</div>
      <pre className="mt-1 overflow-x-auto whitespace-pre rounded-md bg-plane p-3 font-mono text-[13px] leading-relaxed text-ink">{children}</pre>
    </div>
  );
}

export function Formulas() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Formula label="1. Utility of station i">
        {`U_i = −β_p·price_i − β_w·wait_i
      + β_q·quality_i + β_s·speed_i`}
      </Formula>
      <Formula label="2. Logit market share (numerically stable)">
        {`m = max(U_A, U_B)
Share_i = exp(U_i − m) / [exp(U_A − m) + exp(U_B − m)]`}
      </Formula>
      <Formula label="3. Demand and energy sold">
        {`Demand_i = N × Share_i
Energy_i = Demand_i × e        (e = kWh per customer)`}
      </Formula>
      <Formula label="4. Revenue, cost and profit">
        {`Revenue_i = price_i × Energy_i
Cost_i    = MC_i × Energy_i + F_i
Profit_i  = (price_i − MC_i) × Demand_i × e − F_i`}
      </Formula>
      <Formula label="5. Best response">
        {`BR_A(p_B) = argmax over p_A ∈ S of Profit_A(p_A, p_B)
BR_B(p_A) = argmax over p_B ∈ S of Profit_B(p_A, p_B)`}
      </Formula>
      <Formula label="6. Pure-strategy Nash equilibrium">
        {`(p_A*, p_B*) is a Nash equilibrium  ⇔
  p_A* ∈ BR_A(p_B*)  and  p_B* ∈ BR_B(p_A*)
i.e. Profit_A(p_A*, p_B*) ≥ Profit_A(p_A, p_B*) for all p_A
 and Profit_B(p_A*, p_B*) ≥ Profit_B(p_A*, p_B) for all p_B`}
      </Formula>
      <Formula label="7. Continuous benchmark (first-order condition)">
        {`∂Profit_i/∂p_i = 0  ⇒  p_i* = MC_i + 1 / [β_p × (1 − Share_i)]
(the grid equilibrium lies near this value)`}
      </Formula>
      <Formula label="8. Odds ratio interpretation">
        {`Share_A / Share_B = exp(U_A − U_B)
A ₹1 price rise multiplies a station's odds by e^(−β_p)`}
      </Formula>
    </div>
  );
}

export function Limitations() {
  const items = [
    "One-shot game: the model ignores repeated interaction. In a repeated game, stations could sustain higher (tacitly collusive) prices.",
    "Fixed market size: the total demand of N customers does not respond to the price level. Real customers may charge at home or delay charging.",
    "Coarse price grid: with ₹2 steps, equilibria are approximate and several can exist. The continuous equilibrium lies between grid points.",
    "Exogenous waiting time: in reality, cheaper stations attract more cars and queues grow. Modelling this would need a congestion feedback loop.",
    "Identical customers: everyone shares the same sensitivities. Real markets have segments (fleets, commuters, long-distance drivers) with different preferences.",
    "No capacity constraints, location or travel cost, time-of-day pricing, or grid-tariff variation.",
    "Only two firms and pure strategies. Entry by a third station and mixed-strategy equilibria are outside the app's search.",
    "Parameters are illustrative, not estimated. Credible policy conclusions would require calibrating the sensitivities to real survey or transaction data.",
  ];
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-2">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

export function MethodologyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="method-title"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-xl sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="method-title" className="text-xl font-semibold text-ink">
            Methodology
          </h2>
          <Button ref={closeRef} variant="ghost" onClick={onClose} aria-label="Close methodology">
            ✕
          </Button>
        </div>
        <div className="space-y-4 text-sm leading-relaxed text-ink-2">
          <p>
            <b className="text-ink">Step 1: Model customer choice.</b> Each station has a utility that falls with price and
            waiting time and rises with service quality and charging speed. Under the multinomial logit model, a station's
            market share is its exponentiated utility divided by the sum over both stations. Shares are always between 0
            and 1 and add up to 1. To prevent overflow, the app subtracts the larger utility before exponentiating (the
            log-sum-exp trick). This leaves shares unchanged.
          </p>
          <p>
            <b className="text-ink">Step 2: Compute payoffs.</b> For each of the {PRICES.length} × {PRICES.length} ={" "}
            {PRICES.length ** 2} price pairs, the app computes demand (customers × share), energy sold (demand × kWh per
            customer), revenue, variable and fixed costs, and profit. These profits fill the bimatrix.
          </p>
          <p>
            <b className="text-ink">Step 3: Find best responses.</b> For every price Station B might set, the app finds
            the price that maximises A's profit (the best row in that column). It repeats this for B (the best column in
            each row). Ties within a small tolerance (10⁻⁶) all count as best responses.
          </p>
          <p>
            <b className="text-ink">Step 4: Identify Nash equilibria.</b> A cell is a pure-strategy Nash equilibrium when
            it is a best response for both stations at once. At that cell, neither station can raise its profit by changing
            only its own price. The app checks every cell, so it finds all pure equilibria, including multiple ones, or
            reports that none exist.
          </p>
          <p>
            <b className="text-ink">Step 5: Verify.</b> For the featured equilibrium, the unilateral-deviation test lists
            each station's best alternative price and the profit change it would cause. This change is never positive.
          </p>
          <Formulas />
        </div>
      </div>
    </div>
  );
}
