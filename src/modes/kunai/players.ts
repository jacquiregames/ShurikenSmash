import { createContext, useContext } from "react";
import type { KunaiPlayer } from "./game/config";

/** The seats in the current match (3 or 4), shared by every Kunai component. */
export const PlayersContext = createContext<readonly KunaiPlayer[]>([]);

export const usePlayers = () => useContext(PlayersContext);
