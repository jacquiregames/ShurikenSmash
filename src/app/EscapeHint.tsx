interface EscapeHintProps {
  /** When Escape was last pressed mid-match; each new press replays the hint. */
  armedAt: number | null;
}

/** "Press Esc again to quit": fades out by itself, the same length as the confirm window. */
export function EscapeHint({ armedAt }: EscapeHintProps) {
  if (armedAt === null) return null;
  return (
    <div className="escape-hint" key={armedAt} role="status">
      Press Esc again to quit
    </div>
  );
}
