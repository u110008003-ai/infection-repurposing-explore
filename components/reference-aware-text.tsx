export type ReferenceEntry = {
  index: number;
  label: string;
  href: string;
};

type Tone = "neutral" | "gold" | "success" | "warning" | "info";

export function parseReferenceLinks(value: string): ReferenceEntry[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const cleaned = line.replace(/^\(?\d+\)?[.)\]]?\s*/, "").trim();
      const [maybeLabel, maybeHref] = cleaned.includes("|")
        ? cleaned.split("|", 2).map((part) => part.trim())
        : [cleaned, cleaned];
      const href = /^https?:\/\//i.test(maybeHref) ? maybeHref : `https://${maybeHref}`;
      const label = cleaned.includes("|") ? maybeLabel : cleaned;

      return {
        index: index + 1,
        label,
        href,
      };
    });
}

export function ReferenceAwareText({
  value,
  tone,
  references,
  compact = false,
}: {
  value: string;
  tone: Tone;
  references: ReferenceEntry[];
  compact?: boolean;
}) {
  const content = value?.trim();

  if (!content) {
    return (
      <p className={compact ? "text-sm leading-6 text-stone-500" : "text-base leading-8 text-stone-500"}>
        尚未整理
      </p>
    );
  }

  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const isBulletList = lines.every((line) => line.startsWith("- "));
  const bulletColorClass =
    tone === "success"
      ? "bg-[var(--color-success)]"
      : tone === "warning"
        ? "bg-[var(--color-warning)]"
        : tone === "gold"
          ? "bg-[var(--color-gold)]"
          : tone === "info"
            ? "bg-[oklch(0.75_0.12_245)]"
            : "bg-[var(--color-text-muted)]";

  if (isBulletList) {
    return (
      <ul className={compact ? "space-y-2 text-sm leading-6 text-stone-700" : "space-y-3 text-base leading-8 text-[var(--color-text)]"}>
        {lines.map((line) => (
          <li key={line} className="flex gap-3">
            <span className={`mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full ${bulletColorClass}`} />
            <span>{renderWithReferences(line.slice(2), references)}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p className={compact ? "whitespace-pre-wrap text-sm leading-6 text-stone-700" : "whitespace-pre-wrap text-base leading-8 text-[var(--color-text)]"}>
      {renderWithReferences(content, references)}
    </p>
  );
}

function renderWithReferences(text: string, references: ReferenceEntry[]) {
  const parts: Array<string | { index: number }> = [];
  const regex = /(\(|（)(\d+)(\)|）)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    parts.push({ index: Number(match[2]) });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.map((part, index) => {
    if (typeof part === "string") {
      return <span key={`text-${index}`}>{part}</span>;
    }

    const reference = references.find((item) => item.index === part.index);

    if (!reference) {
      return <span key={`ref-missing-${index}`}>({part.index})</span>;
    }

    return (
      <a
        key={`ref-${index}`}
        href={`#reference-${reference.index}`}
        className="font-semibold text-[var(--color-gold)] underline decoration-[var(--color-gold)]/50 underline-offset-4"
        aria-label={`跳到參考連結 ${reference.index}`}
      >
        ({reference.index})
      </a>
    );
  });
}
