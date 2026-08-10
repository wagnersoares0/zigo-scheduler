import type { Block } from "../types";
import { getBlockReason } from "./appointment-fields";
import { normalizeNullableText } from "./format";

const TIME_OFF_PATTERN = /\b(folga|time off|day off)\b/i;
const DEFAULT_BLOCK_PATTERN = /^(bloqueio(?: de hor[a\u00e1]rio)?|blocked time|block)$/i;

export type BlockDisplayInfo = {
  isTimeOff: boolean;
  /** @deprecated Use `isTimeOff`. */
  isFolga: boolean;
  title: string;
  shortLabel: string;
  subtitle: string;
  ariaKind: string;
};

export const isTimeOffBlock = (block: Block): boolean =>
  TIME_OFF_PATTERN.test(getBlockReason(block) ?? "");

/** @deprecated Use `isTimeOffBlock`. */
export const isFolgaBloqueio = isTimeOffBlock;

export const getBlockDisplayInfo = (block: Block): BlockDisplayInfo => {
  const reason = normalizeNullableText(getBlockReason(block));

  const isTimeOff = isTimeOffBlock(block);
  const title = isTimeOff ? "Time off" : "Blocked time";
  const normalizedReason = reason?.normalize("NFD").replace(/[\u0300-\u036f]/g, "") ?? "";
  const shouldShowReason =
    Boolean(reason) &&
    !TIME_OFF_PATTERN.test(reason ?? "") &&
    !DEFAULT_BLOCK_PATTERN.test(normalizedReason);

  return {
    isTimeOff,
    isFolga: isTimeOff,
    title,
    shortLabel: isTimeOff ? "Time off" : "Block",
    subtitle: shouldShowReason ? reason ?? "" : "",
    ariaKind: isTimeOff ? "time off" : "blocked time",
  };
};

/** @deprecated Use `BlockDisplayInfo`. */
export type BloqueioDisplayInfo = BlockDisplayInfo;

/** @deprecated Use `getBlockDisplayInfo`. */
export const getBloqueioDisplayInfo = getBlockDisplayInfo;
