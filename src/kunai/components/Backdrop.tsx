import { getImageUrl } from "../../game/config";

export default function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div
        className="bg"
        style={{ backgroundImage: `url("${getImageUrl("background")}")` }}
      />
      <div className="bd-vig" />
    </div>
  );
}