/** All Recharts visualisations: profit curves, equilibrium bars and the best-response graph. */
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { GameResult, StationId } from "../lib/model";
import { formatINR, formatINRCompact, formatPct, priceLabel } from "../lib/format";

export const COLORS = { A: "#2a78d6", B: "#eb6834" } as const;
const INK = { muted: "#898781", grid: "#e1e0d9", axis: "#c3c2b7", primary: "#0b0b0b" };
const axisProps = { stroke: INK.axis, tick: { fill: INK.muted, fontSize: 12 }, tickLine: false };

function ChartCard({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
  return (
    <figure className="avoid-break min-w-0 rounded-lg border border-hairline bg-white p-3 sm:p-4">
      <figcaption className="mb-2">
        <div className="text-sm font-semibold text-ink">{title}</div>
        {caption && <div className="text-xs text-ink-2">{caption}</div>}
      </figcaption>
      {children}
    </figure>
  );
}

/** Shared tooltip shell so all charts look the same. */
function TipBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-hairline bg-white px-3 py-2 text-xs shadow-sm tabular-nums">{children}</div>;
}

/** Profit of one station across its own prices, holding the rival's price fixed. */
function ProfitCurve({ game, station, rivalPrice }: { game: GameResult; station: StationId; rivalPrice: number }) {
  const { prices, cells, bestResponseA, bestResponseB } = game;
  const r = prices.indexOf(rivalPrice);
  const data = prices.map((p, k) => {
    const c = station === "A" ? cells[k][r] : cells[r][k];
    return { price: p, profit: c.outcome[station].profit, share: c.outcome[station].share };
  });
  const brIdx = station === "A" ? bestResponseA[r] : bestResponseB[r];
  const rival = station === "A" ? "B" : "A";

  return (
    <ChartCard
      title={`Station ${station}: profit vs its own price`}
      caption={`Station ${rival}'s price held at ${priceLabel(rivalPrice)}. The large dot marks ${station}'s best response.`}
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 16, right: 16, bottom: 20, left: 8 }}>
          <CartesianGrid stroke={INK.grid} vertical={false} />
          <XAxis
            dataKey="price"
            type="number"
            domain={[prices[0], prices[prices.length - 1]]}
            ticks={[...prices]}
            tickFormatter={priceLabel}
            {...axisProps}
            label={{ value: `Station ${station}'s price (₹/kWh)`, position: "insideBottom", offset: -12, fill: INK.muted, fontSize: 12 }}
          />
          <YAxis
            tickFormatter={formatINRCompact}
            width={64}
            {...axisProps}
            label={{ value: "Profit (₹)", angle: -90, position: "insideLeft", offset: 4, fill: INK.muted, fontSize: 12, dy: 30 }}
          />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TipBox>
                  <div className="font-semibold">Station {station} at {priceLabel(payload[0].payload.price)}</div>
                  <div>Profit: {formatINR(payload[0].payload.profit)}</div>
                  <div>Market share: {formatPct(payload[0].payload.share)}</div>
                </TipBox>
              ) : null
            }
          />
          <Line type="monotone" dataKey="profit" stroke={COLORS[station]} strokeWidth={2} dot={{ r: 4, fill: COLORS[station] }} activeDot={{ r: 6 }} isAnimationActive={false} />
          {brIdx.map((k) => (
            <ReferenceDot key={k} x={prices[k]} y={data[k].profit} r={8} fill={COLORS[station]} stroke="#fff" strokeWidth={2} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** Two-bar comparison at the equilibrium (one bar per station, coloured by station). */
function EquilibriumBars({
  title,
  values,
  format,
  axisFormat,
  yLabel,
  domain,
}: {
  title: string;
  values: { A: number; B: number };
  format: (v: number) => string;
  axisFormat: (v: number) => string;
  yLabel: string;
  domain?: [number, number | "auto"];
}) {
  const data = (["A", "B"] as const).map((s) => ({ name: `Station ${s}`, id: s, value: values[s] }));
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 24, right: 16, bottom: 4, left: 8 }} barCategoryGap="30%">
          <CartesianGrid stroke={INK.grid} vertical={false} />
          <XAxis dataKey="name" {...axisProps} />
          <YAxis
            tickFormatter={axisFormat}
            domain={domain ?? [0, "auto"]}
            width={64}
            {...axisProps}
            label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 4, fill: INK.muted, fontSize: 12, dy: 30 }}
          />
          <Tooltip
            cursor={{ fill: "rgba(11,11,11,0.04)" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TipBox>
                  <div className="font-semibold">{payload[0].payload.name}</div>
                  <div>{format(payload[0].payload.value)}</div>
                </TipBox>
              ) : null
            }
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={72} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.id} fill={COLORS[d.id]} />
            ))}
            <LabelList dataKey="value" position="top" formatter={format} style={{ fill: INK.primary, fontSize: 12, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** Five-point star drawn at the data point, larger than the line markers so it sits on top. */
function StarShape(props: { cx?: number; cy?: number }) {
  const { cx = 0, cy = 0 } = props;
  const pts = Array.from({ length: 10 }, (_, k) => {
    const r = k % 2 === 0 ? 11 : 4.5;
    const a = (Math.PI / 5) * k - Math.PI / 2;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");
  return <polygon points={pts} fill={INK.primary} stroke="#fff" strokeWidth={1.5} />;
}

/**
 * Best-response graph in (A's price, B's price) space.
 *   Blue:   for each B price, the A price that maximises A's profit.
 *   Orange: for each A price, the B price that maximises B's profit.
 * Where the two curves meet, both stations are best-responding: a Nash equilibrium.
 */
function BestResponseGraph({ game }: { game: GameResult }) {
  const { prices, bestResponseA, bestResponseB, equilibria } = game;
  const brA = bestResponseA.flatMap((is, j) => is.map((i) => ({ pA: prices[i], pB: prices[j] })));
  const brB = bestResponseB.flatMap((js, i) => js.map((j) => ({ pA: prices[i], pB: prices[j] })));
  const ne = equilibria.map((e) => ({ pA: e.priceA, pB: e.priceB }));
  const domain: [number, number] = [prices[0] - 1, prices[prices.length - 1] + 1];

  return (
    <ChartCard
      title="Best-response functions"
      caption="Each line shows one station's profit-maximising price for every price the rival might set. Nash equilibria (★) lie where the lines cross."
    >
      <ResponsiveContainer width="100%" height={340}>
        <ScatterChart margin={{ top: 10, right: 16, bottom: 24, left: 8 }}>
          <CartesianGrid stroke={INK.grid} />
          <XAxis
            type="number"
            dataKey="pA"
            domain={domain}
            ticks={[...prices]}
            tickFormatter={priceLabel}
            {...axisProps}
            label={{ value: "Station A's price (₹/kWh)", position: "insideBottom", offset: -14, fill: INK.muted, fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey="pB"
            domain={domain}
            ticks={[...prices]}
            tickFormatter={priceLabel}
            width={56}
            {...axisProps}
            label={{ value: "Station B's price (₹/kWh)", angle: -90, position: "insideLeft", offset: 4, fill: INK.muted, fontSize: 12, dy: 70 }}
          />
          <ZAxis range={[70, 70]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TipBox>
                  <div className="font-semibold">{payload[0].name}</div>
                  <div>
                    A {priceLabel(payload[0].payload.pA)}, B {priceLabel(payload[0].payload.pB)}
                  </div>
                </TipBox>
              ) : null
            }
          />
          <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: 12 }} />
          <Scatter name="A's best response to B" data={brA} fill={COLORS.A} line={{ stroke: COLORS.A, strokeWidth: 2 }} shape="circle" isAnimationActive={false} />
          <Scatter name="B's best response to A" data={brB} fill={COLORS.B} line={{ stroke: COLORS.B, strokeWidth: 2 }} shape="diamond" isAnimationActive={false} />
          {ne.length > 0 && (
            <Scatter name="Nash equilibrium" data={ne} fill={INK.primary} shape={StarShape} legendType="star" isAnimationActive={false} />
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function Charts({ game, eqIndex }: { game: GameResult; eqIndex: number }) {
  const { prices, equilibria } = game;
  const eq = equilibria[eqIndex];

  // Rival price used in the profit curves: the equilibrium price by default.
  const fallback = prices[Math.floor(prices.length / 2)];
  const [rivalB, setRivalB] = useState<number>(eq?.priceB ?? fallback);
  const [rivalA, setRivalA] = useState<number>(eq?.priceA ?? fallback);
  useEffect(() => {
    setRivalB(eq?.priceB ?? fallback);
    setRivalA(eq?.priceA ?? fallback);
  }, [eq?.priceA, eq?.priceB, fallback]);

  const select = (label: string, value: number, onChange: (v: number) => void) => (
    <label className="flex items-center gap-2 text-sm text-ink-2">
      {label}
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="rounded-md border border-hairline bg-white px-2 py-1 tabular-nums">
        {prices.map((p) => (
          <option key={p} value={p}>
            {priceLabel(p)}
            {eq && ((label.includes("B") && p === eq.priceB) || (label.includes("A") && p === eq.priceA)) ? " (equilibrium)" : ""}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap gap-4">
        {select("Hold B's price at", rivalB, setRivalB)}
        {select("Hold A's price at", rivalA, setRivalA)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ProfitCurve game={game} station="A" rivalPrice={rivalB} />
        <ProfitCurve game={game} station="B" rivalPrice={rivalA} />
      </div>

      {eq ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <EquilibriumBars
            title={`Equilibrium market shares at (A ${priceLabel(eq.priceA)}, B ${priceLabel(eq.priceB)})`}
            values={{ A: eq.outcome.A.share, B: eq.outcome.B.share }}
            format={(v) => formatPct(v)}
            axisFormat={(v) => formatPct(v, 0)}
            yLabel="Market share"
            domain={[0, 1]}
          />
          <EquilibriumBars
            title={`Equilibrium profits at (A ${priceLabel(eq.priceA)}, B ${priceLabel(eq.priceB)})`}
            values={{ A: eq.outcome.A.profit, B: eq.outcome.B.profit }}
            format={formatINR}
            axisFormat={formatINRCompact}
            yLabel="Profit (₹)"
            domain={[Math.min(0, eq.outcome.A.profit, eq.outcome.B.profit), "auto"]}
          />
        </div>
      ) : (
        <p className="rounded-lg border border-hairline bg-plane p-3 text-sm text-ink-2">
          The equilibrium share and profit charts are hidden because no pure-strategy Nash equilibrium exists.
        </p>
      )}

      <BestResponseGraph game={game} />
    </div>
  );
}
