import type { ProteinStructureRecord } from "@/lib/protein-structures";

type Props = {
  structures: ProteinStructureRecord[];
  provenance: {
    provider: string;
    dataset: string;
    note: string;
  };
};

export function ProteinStructurePanel({ structures, provenance }: Props) {
  if (structures.length === 0) {
    return (
      <section className="rounded-[2rem] border border-[color:var(--color-line)] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Protein structure layer</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">No mapped structure overlay yet</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{provenance.note}</p>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-[color:var(--color-line)] bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Protein structure layer</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">Mapped molecular structure context</h2>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
        This panel is ready for FungAMR-style structure outputs. Right now it renders source-backed structure overlays and residue hotspots so the molecular story can sit next to the drug-pathway explanation.
      </p>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {structures.map((structure) => (
          <article
            key={`${structure.gene_symbol}-${structure.structure_model}`}
            className="rounded-[1.6rem] border border-[color:var(--color-line)] bg-[color:var(--color-panel-soft)] p-4"
          >
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold text-slate-950">{structure.gene_symbol}</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                {structure.protein_name}
              </span>
              <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-900">
                {structure.structure_model}
              </span>
            </div>

            <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-white p-3">
              <ProteinRibbon structure={structure} />
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-600">{structure.note}</p>
            <p className="mt-3 font-mono text-xs text-slate-500">{structure.source}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-[1.4rem] border border-cyan-200 bg-cyan-50 p-4">
        <p className="text-sm font-semibold text-cyan-950">{provenance.provider}</p>
        <p className="mt-2 font-mono text-xs text-cyan-900">{provenance.dataset}</p>
        <p className="mt-2 text-sm leading-7 text-cyan-900">{provenance.note}</p>
      </div>
    </section>
  );
}

function ProteinRibbon({ structure }: { structure: ProteinStructureRecord }) {
  const path = "M36 146 C88 44, 150 42, 198 112 S306 206, 354 126 S456 42, 516 130";

  return (
    <svg viewBox="0 0 560 220" className="w-full">
      <rect x="0" y="0" width="560" height="220" rx="22" fill="#f8fbfd" />
      <path d={path} fill="none" stroke="#cbd5e1" strokeWidth="10" strokeLinecap="round" />
      <path d={path} fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />

      {structure.hotspots.map((hotspot) => (
        <g key={hotspot.residue_label}>
          <circle
            cx={hotspot.x}
            cy={hotspot.y}
            r="7"
            fill={
              hotspot.intensity === "supportive"
                ? "#06b6d4"
                : hotspot.intensity === "caution"
                  ? "#f97316"
                  : "#64748b"
            }
          />
          <text x={hotspot.x + 10} y={hotspot.y - 8} fontSize="11" fill="#0f172a">
            {hotspot.residue_label}
          </text>
        </g>
      ))}
    </svg>
  );
}
