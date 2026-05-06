"use client";

// Renders inline fractions: "5/6" → stacked fraction, other text stays as-is.
// Handles multiple fractions in a single string.
// Only renders fractions that look like N/M (integers, no spaces).

const FRAC_RE = /(-?\d+)\/(-?\d+)/g;

interface MathTextProps {
  text: string;
  className?: string;
  /** Use larger fraction rendering — suited for question headings */
  large?: boolean;
}

export function MathFrac({ num, den, large }: { num: string; den: string; large?: boolean }) {
  return (
    <span
      className="inline-flex flex-col items-center leading-none align-middle mx-1"
      style={{ verticalAlign: "middle", fontSize: large ? "1em" : "0.85em", lineHeight: 1 }}
    >
      <span
        className="leading-tight"
        style={{ borderBottom: "2px solid currentColor", paddingLeft: large ? "4px" : "2px", paddingRight: large ? "4px" : "2px" }}
      >
        {num}
      </span>
      <span style={{ paddingLeft: large ? "4px" : "2px", paddingRight: large ? "4px" : "2px" }} className="leading-tight">
        {den}
      </span>
    </span>
  );
}

export default function MathText({ text, className, large }: MathTextProps) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  FRAC_RE.lastIndex = 0;

  while ((match = FRAC_RE.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    parts.push(
      <MathFrac key={match.index} num={match[1]} den={match[2]} large={large} />
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
