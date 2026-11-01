import { getImageUrl } from "../config/assets";

/**
 * The full-screen background art. With `vignette` it is wrapped in a layer that also
 * darkens the edges (Kunai Bullseye); without it, it is just the art.
 */
export function Backdrop({ vignette = false }: { vignette?: boolean }) {
  const art = (
    <div
      className="bg"
      aria-hidden={vignette ? undefined : true}
      style={{ backgroundImage: `url("${getImageUrl("background")}")` }}
    />
  );
  if (!vignette) return art;
  return (
    <div className="backdrop" aria-hidden="true">
      {art}
      <div className="bd-vig" />
    </div>
  );
}
