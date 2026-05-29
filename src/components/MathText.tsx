"use client";

// Enhanced math renderer — handles:
//   √N       → radical with overline bar over radicand
//   N²  x³   → <sup> superscript (Unicode ²³⁴⁵ → HTML sup)
//   N/M      → CSS stacked fraction
// No external library required; fully backward-compatible with existing data.

const SUPER: Record<string, string> = { "²": "2", "³": "3", "⁴": "4", "⁵": "5" };

// Combined regex — alternatives matched left-to-right:
//   1. √(\d+)                  square root
//   2. (\d+)([²³⁴⁵])           number with superscript (e.g. 2², 32³)
//   3. ([a-zA-Z])([²³⁴⁵])      letter with superscript (e.g. x², n³)
//   4. (-?\d+)\/(-?\d+)        stacked fraction (e.g. 2/3, -1/4)
const MATH_RE = /√(\d+)|(\d+)([²³⁴⁵])|([a-zA-Z])([²³⁴⁵])|(-?\d+)\/(-?\d+)/g;

interface MathTextProps {
  text: string;
  className?: string;
  /** Larger size — suited for question headings */
  large?: boolean;
}

function MathRoot({ radicand, large }: { radicand: string; large?: boolean }) {
  return (
    <span
      className="inline-flex items-center"
      style={{ verticalAlign: "middle", lineHeight: 1 }}
    >
      <span style={{ fontSize: large ? "1.1em" : "0.95em", fontWeight: 500, marginRight: "1px" }}>
        √
      </span>
      <span
        style={{
          borderTop: "2px solid currentColor",
          paddingTop: "1px",
          paddingLeft: "2px",
          paddingRight: "3px",
          fontSize: large ? "1em" : "0.9em",
          lineHeight: 1.25,
        }}
      >
        {radicand}
      </span>
    </span>
  );
}

function MathSup({ base, expChar, large }: { base: string; expChar: string; large?: boolean }) {
  return (
    <span className="inline-flex items-end" style={{ lineHeight: 1, fontSize: large ? "1em" : "inherit" }}>
      {base}
      <sup style={{ fontSize: "0.6em", lineHeight: 1, marginLeft: "1px", marginBottom: "1px" }}>
        {SUPER[expChar] ?? expChar}
      </sup>
    </span>
  );
}

export function MathFrac({ num, den, large }: { num: string; den: string; large?: boolean }) {
  return (
    <span
      className="inline-flex flex-col items-center leading-none align-middle mx-1"
      style={{ verticalAlign: "middle", fontSize: large ? "1em" : "0.85em", lineHeight: 1 }}
    >
      <span
        className="leading-tight"
        style={{
          borderBottom: "2px solid currentColor",
          paddingLeft: large ? "4px" : "2px",
          paddingRight: large ? "4px" : "2px",
        }}
      >
        {num}
      </span>
      <span
        style={{ paddingLeft: large ? "4px" : "2px", paddingRight: large ? "4px" : "2px" }}
        className="leading-tight"
      >
        {den}
      </span>
    </span>
  );
}

export default function MathText({ text, className, large }: MathTextProps) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  MATH_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = MATH_RE.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }

    if (match[1] !== undefined) {
      // √N
      parts.push(<MathRoot key={key++} radicand={match[1]} large={large} />);
    } else if (match[2] !== undefined) {
      // digit² — e.g. 2², 32³
      parts.push(<MathSup key={key++} base={match[2]} expChar={match[3]} large={large} />);
    } else if (match[4] !== undefined) {
      // letter² — e.g. x², n³
      parts.push(<MathSup key={key++} base={match[4]} expChar={match[5]} large={large} />);
    } else if (match[6] !== undefined) {
      // N/M — stacked fraction
      parts.push(<MathFrac key={key++} num={match[6]} den={match[7]} large={large} />);
    }

    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));

  return <span className={className}>{parts.length ? parts : text}</span>;
}
