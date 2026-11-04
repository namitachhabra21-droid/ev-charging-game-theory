/**
 * Parameter controls. Edits go into a *draft* copy of the parameters; the
 * simulation only re-runs when the user presses "Run Simulation", so the
 * results on screen always correspond to one consistent set of inputs.
 */
import { useEffect, useState } from "react";
import {
  GLOBAL_FIELDS,
  SENS_FIELDS,
  STATION_FIELDS,
  validateValue,
  type FieldSpec,
  type ModelParams,
  type Sensitivities,
  type StationParams,
} from "../lib/model";
import { SCENARIOS } from "../lib/scenarios";
import { Button, StationTag } from "./ui";

interface Props {
  draft: ModelParams;
  onChange: (p: ModelParams) => void;
  errors: Record<string, string>;
  dirty: boolean;
  scenarioId: string;
  onScenario: (id: string) => void;
  onRun: () => void;
  onReset: () => void;
}

/** Slider + number box bound to one numeric value. */
function NumberField({
  id,
  spec,
  value,
  onChange,
}: {
  id: string;
  spec: FieldSpec;
  value: number;
  onChange: (v: number) => void;
}) {
  // Keep the raw text so users can type freely (e.g. clear the box, type "0.").
  const [text, setText] = useState(String(value));
  useEffect(() => {
    // Sync when the value changes from outside (slider, reset, scenario).
    if (Number.isFinite(value) && (text.trim() === "" || Number(text) !== value)) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const error = validateValue(value, spec);
  const sliderValue = Number.isFinite(value) ? Math.min(spec.max, Math.max(spec.min, value)) : spec.min;
  // The slider covers a sensible range; the number box accepts the full valid range.
  const sliderMax = spec.max > 10_000 ? Math.min(spec.max, 20_000) : spec.max;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm text-ink-2">
          {spec.label}
          {spec.unit && <span className="text-ink-muted"> ({spec.unit})</span>}
        </label>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={spec.min}
          max={spec.max}
          step={spec.step}
          value={text}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => {
            setText(e.target.value);
            onChange(e.target.value.trim() === "" ? NaN : Number(e.target.value));
          }}
          className={`w-24 rounded-md border px-2 py-1 text-right text-sm tabular-nums focus:outline-none focus:ring-2 ${
            error ? "border-red-500 focus:ring-red-300" : "border-hairline focus:ring-stationA/40"
          }`}
        />
      </div>
      <input
        type="range"
        aria-label={spec.label}
        min={spec.min}
        max={sliderMax}
        step={spec.step}
        value={Math.min(sliderValue, sliderMax)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full"
      />
      {error && (
        <p id={`${id}-err`} className="text-xs text-red-700" role="alert">
          ⚠ {error}
        </p>
      )}
    </div>
  );
}

export function ParameterControls({ draft, onChange, errors, dirty, scenarioId, onScenario, onRun, onReset }: Props) {
  const errorCount = Object.keys(errors).length;

  const setStation = (st: "A" | "B", key: keyof StationParams, v: number) =>
    onChange({ ...draft, [st]: { ...draft[st], [key]: v } });
  const setSens = (key: keyof Sensitivities, v: number) => onChange({ ...draft, sens: { ...draft.sens, [key]: v } });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="scenario" className="text-sm font-medium text-ink">
            Scenario preset
          </label>
          <select
            id="scenario"
            value={scenarioId}
            onChange={(e) => onScenario(e.target.value)}
            className="mt-1 w-full rounded-md border border-hairline bg-white px-2 py-2 text-sm"
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            {scenarioId === "custom" && <option value="custom">Custom (edited)</option>}
          </select>
          <p className="mt-1 text-xs text-ink-2">
            {SCENARIOS.find((s) => s.id === scenarioId)?.description ?? "You have edited the parameters by hand."}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <fieldset className="rounded-lg border border-hairline p-4">
          <legend className="px-1 text-sm font-semibold text-ink">Market</legend>
          <div className="space-y-3">
            {(Object.keys(GLOBAL_FIELDS) as (keyof typeof GLOBAL_FIELDS)[]).map((k) => (
              <NumberField key={k} id={k} spec={GLOBAL_FIELDS[k]} value={draft[k]} onChange={(v) => onChange({ ...draft, [k]: v })} />
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-hairline p-4">
          <legend className="px-1 text-sm font-semibold text-ink">Customer sensitivities (logit coefficients)</legend>
          <div className="space-y-3">
            {(Object.keys(SENS_FIELDS) as (keyof Sensitivities)[]).map((k) => (
              <NumberField key={k} id={`sens-${k}`} spec={SENS_FIELDS[k]} value={draft.sens[k]} onChange={(v) => setSens(k, v)} />
            ))}
          </div>
        </fieldset>

        {(["A", "B"] as const).map((st) => (
          <fieldset key={st} className="rounded-lg border border-hairline p-4">
            <legend className="px-1 text-sm">
              <StationTag id={st} />
            </legend>
            <div className="space-y-3">
              {(Object.keys(STATION_FIELDS) as (keyof StationParams)[]).map((k) => (
                <NumberField key={k} id={`${st}-${k}`} spec={STATION_FIELDS[k]} value={draft[st][k]} onChange={(v) => setStation(st, k, v)} />
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-hairline bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button variant="primary" onClick={onRun} disabled={errorCount > 0}>
          ▶ Run Simulation
        </Button>
        <Button onClick={onReset}>↺ Reset to defaults</Button>
        <span className="text-sm" aria-live="polite">
          {errorCount > 0 ? (
            <span className="text-red-700">
              ⚠ Fix {errorCount} invalid {errorCount === 1 ? "field" : "fields"} to run.
            </span>
          ) : dirty ? (
            <span className="text-ink-2">● Parameters changed. Press Run to update the results.</span>
          ) : (
            <span className="text-ink-muted">✓ The results below match these parameters.</span>
          )}
        </span>
      </div>
    </div>
  );
}
