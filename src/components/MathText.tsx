"use client";

// Renders inline fractions: "5/6" → stacked fraction, other text stays as-is.
// Handles multiple fractions in a single string.
// Only renders fractions that look like N/M (integers, no spaces).

const FRAC_RE = /(-?\d+)\/(-?\d+)/g;

interface MathTextProps {
  text: string;
  className?: string;
}

export function MathFrac({ num, den }: { num: string; den: string }) {
  return (
    <span
      className="inline-flex flex-col items-center leading-none align-middle mx-0.5"
      style={{ verticalAlign: "middle", fontSize: "0.85em", lineHeight: 1 }}
    >
      <span className="px-0.5 border-b border-current leading-tight">{num}</span>
      <span className="px-0.5 leading-tight">{den}</span>
    </span>
  );
}

export default function MathText({ text, className }: MathTextProps) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  FRAC_RE.lastIndex = 0;

  while ((match = FRAC_RE.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    parts.push(
      <MathFrac key={match.index} num={match[1]} den={match[2]} />
    );
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return (
    <span className={className}>
      {parts}
    </span>
  );
}
