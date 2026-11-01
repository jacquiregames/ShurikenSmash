const ICON_PROPS = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export function SoundOn() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

export function SoundOff() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M17 9.5l4 5" />
      <path d="M21 9.5l-4 5" />
    </svg>
  );
}
