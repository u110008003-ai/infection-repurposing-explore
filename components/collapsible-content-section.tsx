import { ReferenceAwareText, type ReferenceEntry } from "@/components/reference-aware-text";
type Tone = "neutral" | "gold" | "success" | "warning" | "info";

export function CollapsibleContentSection({
  label,
  description,
  value,
  tone,
  references,
  defaultOpen = false,
  compact = false,
  badge,
  surface = "dark",
}: {
  label: string;
  description?: string;
  value: string;
  tone: Tone;
  references: ReferenceEntry[];
  defaultOpen?: boolean;
  compact?: boolean;
  badge?: string;
  surface?: "dark" | "light";
}) {
  const isDark = surface === "dark";
  const cardClass =
    tone === "success"
      ? isDark
        ? "border-[oklch(0.65_0.12_140_/_0.2)] bg-[color-mix(in_oklch,#6daa45_6%,#1c1b19)]"
        : "border-[oklch(0.65_0.12_140_/_0.15)] bg-[color-mix(in_oklch,#6daa45_5%,white)]"
      : tone === "warning"
        ? isDark
          ? "border-[oklch(0.65_0.1_40_/_0.2)] bg-[color-mix(in_oklch,#bb653b_6%,#1c1b19)]"
          : "border-[oklch(0.65_0.1_40_/_0.16)] bg-[color-mix(in_oklch,#bb653b_5%,white)]"
        : tone === "gold"
          ? isDark
            ? "border-[oklch(0.75_0.15_80_/_0.25)] bg-[color-mix(in_oklch,#d19900_8%,#1c1b19)]"
            : "border-[oklch(0.75_0.15_80_/_0.18)] bg-[color-mix(in_oklch,#d19900_6%,white)]"
          : tone === "info"
            ? isDark
              ? "border-[oklch(0.65_0.08_240_/_0.22)] bg-[color-mix(in_oklch,#4f7cff_7%,#1c1b19)]"
              : "border-[oklch(0.65_0.08_240_/_0.16)] bg-[color-mix(in_oklch,#4f7cff_5%,white)]"
            : isDark
              ? "border-white/10 bg-[var(--color-surface-card)]"
              : "border-stone-200 bg-stone-50";

  const titleClass =
    tone === "success"
      ? "text-[var(--color-success)]"
      : tone === "warning"
        ? "text-[var(--color-warning)]"
        : tone === "gold"
          ? "text-[var(--color-gold)]"
          : tone === "info"
            ? "text-[oklch(0.75_0.12_245)]"
            : "text-[var(--color-text-muted)]";

  return (
    <details open={defaultOpen} className={`group rounded-[1.5rem] border ${cardClass}`}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={`text-sm font-medium uppercase tracking-[0.24em] ${titleClass}`}>{label}</h2>
            {badge ? (
              <span className="rounded-full border border-white/10 bg-black/10 px-2 py-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
                {badge}
              </span>
            ) : null}
          </div>
          {description ? (
            <p className={`mt-2 text-sm leading-7 ${isDark ? "text-[var(--color-text-muted)]" : "text-stone-500"}`}>
              {description}
            </p>
          ) : null}
        </div>
        <span className={`text-sm transition group-open:rotate-180 ${isDark ? "text-[var(--color-text-muted)]" : "text-stone-500"}`}>
          ▾
        </span>
      </summary>

      <div className={`px-5 pb-5 pt-4 ${isDark ? "border-t border-white/10" : "border-t border-stone-200"}`}>
        <ReferenceAwareText value={value} tone={tone} references={references} compact={compact} />
      </div>
    </details>
  );
}
