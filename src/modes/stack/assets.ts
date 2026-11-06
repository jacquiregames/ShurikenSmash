import { getStackRowImageUrl } from "../../shared/config/assets";

/** Art overlaid on a stack block. Blocks are 1-3 cells wide. */
export const getRowImageUrl = (width: number) => {
  const cells = Math.min(3, Math.max(1, Math.round(width)));
  return getStackRowImageUrl(cells);
};
