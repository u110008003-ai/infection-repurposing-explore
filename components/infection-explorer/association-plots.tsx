import type { AnalysisResult, GeneAssociationPoint, QQPoint } from "@/lib/infection-explorer";

type Props = {
  visuals: NonNullable<AnalysisResult["association_visuals"]>;
};

const plotHeight = 240;
const plotWidth = 760;
const margin = { top: 18, right: 18, bottom: 34, left: 42 };

export function AssociationPlots({ visuals }: Props) {
  return (
    <section className="grid gap-4">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Association visual summaries</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">PrediXcan / TWAS style plots</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          These figures are generated from imported summary-level gene association results. They support publication-style review without claiming individual-level expression prediction performance.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <PlotCard
          title="Gene Manhattan plot"
          description="Imported gene-level associations arranged by chromosome with a Bonferroni-style threshold."
        >
          <ManhattanPlot
            points={visuals.gene_associations}
            significanceThreshold={visuals.significance_threshold_logp}
          />
        </PlotCard>

        <PlotCard
          title="QQ plot"
          description="Observed versus expected -log10(P) from imported association results."
        >
          <QQPlot points={visuals.qq_points} />
        </PlotCard>
      </div>

      <PlotCard
        title="Chromosome hit burden"
        description="Number of imported associated genes per chromosome in the current evidence file."
      >
        <ChromosomeBurdenPlot points={visuals.gene_associations} />
      </PlotCard>

      <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-950">About expression scatter plots</p>
        <p className="mt-2 text-sm leading-7 text-amber-900">
          Predicted-versus-observed expression scatter plots require individual-level model evaluation or held-out expression data. The current app uses summary-level PrediXcan/TWAS outputs, so it renders Manhattan and QQ style summaries honestly and leaves sample-level scatter out of the default product flow.
        </p>
      </div>
    </section>
  );
}

function PlotCard(props: { title: string; description: string; children: React.ReactNode }) {
  return (
    <article className="rounded-[2rem] border border-[color:var(--color-line)] bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{props.title}</p>
      <p className="mt-3 text-sm leading-7 text-slate-600">{props.description}</p>
      <div className="mt-5 overflow-x-auto">{props.children}</div>
    </article>
  );
}

function ManhattanPlot(props: {
  points: GeneAssociationPoint[];
  significanceThreshold: number;
}) {
  const domainMaxY = Math.max(
    props.significanceThreshold + 1,
    ...props.points.map((point) => -Math.log10(point.p_value)),
    4,
  );

  const chromosomeOffsets = new Map<number, number>();
  let cursor = 0;
  const chromosomes = Array.from(new Set(props.points.map((point) => point.chromosome))).sort((a, b) => a - b);

  chromosomes.forEach((chromosome) => {
    chromosomeOffsets.set(chromosome, cursor);
    const lastPosition = Math.max(
      ...props.points
        .filter((point) => point.chromosome === chromosome)
        .map((point) => point.position_mb),
      1,
    );
    cursor += lastPosition + 10;
  });

  const totalSpan = Math.max(cursor, 1);
  const innerWidth = plotWidth - margin.left - margin.right;
  const innerHeight = plotHeight - margin.top - margin.bottom;

  return (
    <svg viewBox={`0 0 ${plotWidth} ${plotHeight}`} className="min-w-[720px]">
      <rect x="0" y="0" width={plotWidth} height={plotHeight} rx="22" fill="#f8fbfd" />

      {[0, 2, 4, 6, 8, 10].map((tick) => {
        const y = margin.top + innerHeight - (Math.min(tick, domainMaxY) / domainMaxY) * innerHeight;
        return (
          <g key={tick}>
            <line x1={margin.left} x2={plotWidth - margin.right} y1={y} y2={y} stroke="#d9e3ec" strokeDasharray="4 6" />
            <text x={10} y={y + 4} fontSize="10" fill="#64748b">
              {tick}
            </text>
          </g>
        );
      })}

      <line
        x1={margin.left}
        x2={plotWidth - margin.right}
        y1={margin.top + innerHeight - (props.significanceThreshold / domainMaxY) * innerHeight}
        y2={margin.top + innerHeight - (props.significanceThreshold / domainMaxY) * innerHeight}
        stroke="#2563eb"
        strokeWidth="1.5"
      />

      {props.points.map((point, index) => {
        const xOffset = chromosomeOffsets.get(point.chromosome) ?? 0;
        const absolute = xOffset + point.position_mb;
        const x = margin.left + (absolute / totalSpan) * innerWidth;
        const yValue = -Math.log10(point.p_value);
        const y = margin.top + innerHeight - (yValue / domainMaxY) * innerHeight;
        const fill = point.chromosome % 2 === 0 ? "#0f172a" : "#64748b";
        const isTopHit = visualsTopHit(props.points) === point.gene_symbol;

        return (
          <g key={`${point.gene_symbol}-${index}`}>
            <circle cx={x} cy={y} r={isTopHit ? 3.4 : 2.2} fill={fill} opacity={0.9} />
            {isTopHit ? (
              <text x={x + 5} y={y - 6} fontSize="10" fill="#0f172a">
                {point.gene_symbol}
              </text>
            ) : null}
          </g>
        );
      })}

      {chromosomes.map((chromosome) => {
        const chromosomePoints = props.points.filter((point) => point.chromosome === chromosome);
        const minPosition = Math.min(...chromosomePoints.map((point) => point.position_mb));
        const maxPosition = Math.max(...chromosomePoints.map((point) => point.position_mb));
        const start = (chromosomeOffsets.get(chromosome) ?? 0) + minPosition;
        const end = (chromosomeOffsets.get(chromosome) ?? 0) + maxPosition;
        const mid = (start + end) / 2;
        const x = margin.left + (mid / totalSpan) * innerWidth;
        return (
          <text key={chromosome} x={x - 4} y={plotHeight - 10} fontSize="10" fill="#475569">
            {chromosome}
          </text>
        );
      })}

      <text x={plotWidth / 2 - 38} y={plotHeight - 2} fontSize="11" fill="#334155">
        Chromosome
      </text>
      <text x={12} y={16} fontSize="11" fill="#334155">
        -log10(P)
      </text>
    </svg>
  );
}

function QQPlot(props: { points: QQPoint[] }) {
  const maxValue = Math.max(
    4,
    ...props.points.map((point) => Math.max(point.expected, point.observed)),
  );
  const innerWidth = plotWidth - margin.left - margin.right;
  const innerHeight = plotHeight - margin.top - margin.bottom;

  return (
    <svg viewBox={`0 0 ${plotWidth} ${plotHeight}`} className="min-w-[720px]">
      <rect x="0" y="0" width={plotWidth} height={plotHeight} rx="22" fill="#f8fbfd" />
      <line
        x1={margin.left}
        x2={plotWidth - margin.right}
        y1={margin.top + innerHeight}
        y2={margin.top}
        stroke="#ef4444"
        strokeWidth="1.5"
      />

      {props.points.map((point, index) => {
        const x = margin.left + (point.expected / maxValue) * innerWidth;
        const y = margin.top + innerHeight - (point.observed / maxValue) * innerHeight;
        return <circle key={index} cx={x} cy={y} r={2.2} fill="#0f172a" opacity={0.85} />;
      })}

      <text x={plotWidth / 2 - 64} y={plotHeight - 2} fontSize="11" fill="#334155">
        Expected -log10(P)
      </text>
      <text x={12} y={16} fontSize="11" fill="#334155">
        Observed -log10(P)
      </text>
    </svg>
  );
}

function ChromosomeBurdenPlot(props: { points: GeneAssociationPoint[] }) {
  const counts = Array.from({ length: 22 }, (_, index) => ({
    chromosome: index + 1,
    count: props.points.filter((point) => point.chromosome === index + 1).length,
  }));
  const maxCount = Math.max(1, ...counts.map((entry) => entry.count));
  const innerWidth = plotWidth - margin.left - margin.right;
  const innerHeight = plotHeight - margin.top - margin.bottom;
  const barWidth = innerWidth / counts.length - 6;

  return (
    <svg viewBox={`0 0 ${plotWidth} ${plotHeight}`} className="min-w-[720px]">
      <rect x="0" y="0" width={plotWidth} height={plotHeight} rx="22" fill="#f8fbfd" />
      {counts.map((entry, index) => {
        const height = (entry.count / maxCount) * innerHeight;
        const x = margin.left + index * (barWidth + 6);
        const y = margin.top + innerHeight - height;
        return (
          <g key={entry.chromosome}>
            <rect x={x} y={y} width={barWidth} height={height} rx="5" fill={entry.count > 0 ? "#0f766e" : "#cbd5e1"} />
            <text x={x + barWidth / 2 - 3} y={plotHeight - 10} fontSize="9" fill="#475569">
              {entry.chromosome}
            </text>
          </g>
        );
      })}
      <text x={plotWidth / 2 - 38} y={plotHeight - 2} fontSize="11" fill="#334155">
        Chromosome
      </text>
      <text x={12} y={16} fontSize="11" fill="#334155">
        Hits
      </text>
    </svg>
  );
}

function visualsTopHit(points: GeneAssociationPoint[]) {
  return [...points].sort((left, right) => left.p_value - right.p_value)[0]?.gene_symbol;
}
