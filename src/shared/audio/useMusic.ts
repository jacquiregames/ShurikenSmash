import { useSyncExternalStore } from "react";
import { isMusicOn, subscribeMusic } from "./music";

/** Whether the background music is switched on. */
export const useMusicOn = () => useSyncExternalStore(subscribeMusic, isMusicOn, () => true);
