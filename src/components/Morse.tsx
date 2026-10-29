import { memo } from "react";

interface MorseProps {
  /** "." for dots and "-" for dashes. */
  code: string;
  className?: string;
}

/** Renders a Wabun code as pill-shaped dots and dashes. */
export const Morse = memo(function Morse({ code, className = "" }: MorseProps) {
  return (
    <span className={`morse ${className}`} aria-label={code.replaceAll(".", "dot ").replaceAll("-", "dash ")}>
      {[...code].map((symbol, i) => (
        <span key={i} className={symbol === "-" ? "morse-dash" : "morse-dot"} />
      ))}
    </span>
  );
});
