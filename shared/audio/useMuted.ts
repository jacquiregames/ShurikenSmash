import { useSyncExternalStore } from "react";
import { isMuted, subscribeMuted } from "./context";

/** The app-wide mute state. */
export const useMuted = () => useSyncExternalStore(subscribeMuted, isMuted, () => false);
