/** Small shared building blocks: section card, buttons, station badge. */
import { forwardRef, type ReactNode } from "react";
import type { StationId } from "../lib/model";

export function Section({
  id,
  number,
  title,
  subtitle,
  children,
  className = "",
}: {
  id: string;
  number: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`card scroll-mt-20 ${className}`}>
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-ink sm:text-xl">
          <span className="mr-2 text-ink-muted tabular-nums">{number}.</span>
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost";

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }
>(function Button({ variant = "secondary", className = "", ...props }, ref) {
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-ink text-white hover:bg-ink/85 disabled:bg-ink/30",
    secondary: "border border-hairline bg-white text-ink hover:bg-plane disabled:text-ink-muted",
    ghost: "text-ink-2 hover:bg-plane",
  };
  return (
    <button
      ref={ref}
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-stationA/50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  );
});

/** Colour swatch + name, so station identity is never carried by colour alone. */
export function StationTag({ id, className = "" }: { id: StationId; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium ${className}`}>
      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${id === "A" ? "bg-stationA" : "bg-stationB"}`} aria-hidden />
      Station {id}
    </span>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-white p-3">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-ink sm:text-xl">{value}</div>
      {sub && <div className="text-xs text-ink-2">{sub}</div>}
    </div>
  );
}
