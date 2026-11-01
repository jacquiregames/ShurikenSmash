import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { BAR_CM, BULLSEYE_D, ZONES } from "../game/config";
import { usePlayers } from "../players";
import type { KunaiPhase, Run } from "../game/engine";

interface Props {
  index: number;
  run: Run;
  phase: KunaiPhase;
  setMarkerEl: (i: number, el: HTMLElement | null) => void;
  onPress: (i: number) => void;
}

export default function AimLane({ index, run, phase, setMarkerEl, onPress }: Props) {
  const p = usePlayers()[index];
  const padRef = useRef<HTMLButtonElement | null>(null);

  const armed = phase === "live" && run.status === "aiming";
  const locked = run.status === "flying" || run.status === "landed";

  /* Physical key feedback on the mechanical cap */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.code !== p.code) return;
      padRef.current?.classList.add("down");
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== p.code) return;
      padRef.current?.classList.remove("down");
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [p.code]);

  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let cm = -BAR_CM; cm <= BAR_CM; cm += 4) out.push(50 + (cm / BAR_CM) * 45);
    return out;
  }, []);

  const status =
    run.status === "landed"
      ? run.bull
        ? "🎯 BULLSEYE!"
        : `${ZONES[run.zone].label} (+${run.points})`
      : run.status === "flying"
        ? "⚡ In Flight..."
        : armed
          ? "PRESS TO THROW!"
          : phase === "countdown"
            ? "STEADY..."
            : "STAND BY";

  const cls = [
    "lane",
    armed ? "is-active" : "",
    locked ? "locked" : "",
    phase === "countdown" ? "waiting" : "",
    run.bull && locked ? "bull" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cls}
      style={{ ["--c" as string]: p.color } as CSSProperties}
      onPointerDown={() => armed && onPress(index)}
    >
      {/* Player Lane Header */}
      <div className="lane-head">
        <button
          type="button"
          ref={padRef}
          className="pad"
          tabIndex={-1}
          aria-label={`${p.label} throw key ${p.key}`}
          title={`Press [${p.key}] or tap here to throw`}
          onPointerDown={(e) => {
            e.stopPropagation();
            padRef.current?.classList.add("down");
            onPress(index);
          }}
          onPointerUp={() => padRef.current?.classList.remove("down")}
          onPointerLeave={() => padRef.current?.classList.remove("down")}
        >
          <span className="pad-surface">
            <span className="pad-key">{p.key}</span>
          </span>
        </button>

        <div className="lane-name">
          <div className="t">
            <span className="p-nm">{p.name}</span>
          </div>
        </div>

        <div
          className={`lane-status${armed ? " ready" : run.status === "landed" ? " landed" : " idle"}`}
        >
          {status}
        </div>
      </div>

      {/* Target Aiming Track */}
      <div className="track-container">
        <div className="track">
          {/* Target Zone Ring overlays */}
          <div className="zone-band">
            <span className="zb-wood left" />
            <span className="zb-outer left" />
            <span className="zb-mid left" />
            <span className="zb-inner" />
            <span className="zb-mid right" />
            <span className="zb-outer right" />
            <span className="zb-wood right" />
          </div>

          {/* Grid calibration ticks */}
          {ticks.map((left, i) => (
            <span key={`t${i}`} className="grid-tick" style={{ left: `${left}%` }} />
          ))}
          {ticks.map((left, i) => (
            <span key={`b${i}`} className="grid-tick b" style={{ left: `${left}%` }} />
          ))}

          {/* Central Golden Bullseye Gate */}
          <div className="track-center">
            <span className="tc-notch top" />
            <span className="tc-core" />
            <span className="tc-notch btm" />
          </div>

          {/* Sliding Kunai Reticle Marker */}
          <div
            className="marker"
            ref={(el) => {
              setMarkerEl(index, el);
            }}
          ></div>

          {/* Flash line on release */}
          {locked && <div className="track-lock-pulse" />}
        </div>

        {/* Ruler scale labels */}
        <div className="track-scale">
          <span>−{BAR_CM}cm</span>
          <span className="scale-mid">
            🎯 的中 BULLSEYE (±{(BULLSEYE_D * BAR_CM).toFixed(1)}cm)
          </span>
          <span>+{BAR_CM}cm</span>
        </div>
      </div>

      {/* Live Result Readout */}
      <div className="lane-readout">
        {locked ? (
          <div className="readout-locked">
            <span className="cm">
              {run.bull ? "🎯 0.0" : run.cm.toFixed(1)}
              <small>cm</small>
            </span>
            <span
              className="zone-pill"
              style={{ borderColor: ZONES[run.zone].color, color: ZONES[run.zone].color }}
            >
              {ZONES[run.zone].label}
            </span>
            <span className="pts">
              <b>+{run.points}</b> PTS
            </span>
            {run.auto && <span className="auto-tag">fuse timeout</span>}
          </div>
        ) : (
          <span className="empty">
            {armed ? (
              <span className="prompt-throw">
                PRESS <b className="highlight-key">[{p.key}]</b> TO LOOSE KUNAI
              </span>
            ) : (
              "Awaiting throw signal..."
            )}
          </span>
        )}
      </div>
    </div>
  );
}
