/*
 * Wabun code (Japanese Morse). Codes use "." for a dot and "-" for a dash.
 * Voiced kana (GA, BI, PA…) are sent as the base kana followed by a dakuten (゛)
 * or handakuten (゜) mark, each its own Morse character.
 */

export interface Kana {
  romaji: string;
  kana: string;
  code: string;
}

const k = (romaji: string, kana: string, code: string): Kana => ({ romaji, kana, code });

/** The base kana, laid out for the chart: one column per consonant row, a/i/u/e/o down. */
export const CHART_COLUMNS: readonly (readonly (Kana | null)[])[] = [
  [k("A", "ア", "--.--"), k("I", "イ", ".-"), k("U", "ウ", "..-"), k("E", "エ", "-.---"), k("O", "オ", ".-...")],
  [k("KA", "カ", ".-.."), k("KI", "キ", "-.-.."), k("KU", "ク", "...-"), k("KE", "ケ", "-.--"), k("KO", "コ", "----")],
  [k("SA", "サ", "-.-.-"), k("SHI", "シ", "--.-."), k("SU", "ス", "---.-"), k("SE", "セ", ".---."), k("SO", "ソ", "---.")],
  [k("TA", "タ", "-."), k("CHI", "チ", "..-."), k("TSU", "ツ", ".--."), k("TE", "テ", ".-.--"), k("TO", "ト", "..-..")],
  [k("NA", "ナ", ".-."), k("NI", "ニ", "-.-."), k("NU", "ヌ", "...."), k("NE", "ネ", "--.-"), k("NO", "ノ", "..--")],
  [k("HA", "ハ", "-..."), k("HI", "ヒ", "--..-"), k("FU", "フ", "--.."), k("HE", "ヘ", "."), k("HO", "ホ", "-..")],
  [k("MA", "マ", "-..-"), k("MI", "ミ", "..-.-"), k("MU", "ム", "-"), k("ME", "メ", "-...-"), k("MO", "モ", "-..-.")],
  [k("YA", "ヤ", ".--"), null, k("YU", "ユ", "-..--"), null, k("YO", "ヨ", "--")],
  [k("RA", "ラ", "..."), k("RI", "リ", "--."), k("RU", "ル", "-.--."), k("RE", "レ", "---"), k("RO", "ロ", ".-.-")],
  [k("WA", "ワ", "-.-"), null, null, null, k("WO", "ヲ", ".---")],
  [k("N", "ン", ".-.-."), null, null, null, null],
];

export const DAKUTEN = k("゛", "゛", "..");
export const HANDAKUTEN = k("゜", "゜", "..--.");

const BASE: Record<string, Kana> = Object.fromEntries(
  CHART_COLUMNS.flat()
    .filter((kana): kana is Kana => kana !== null)
    .map((kana) => [kana.romaji, kana])
);

/** Voiced syllable → [base syllable, mark]. */
const VOICED: Record<string, [string, Kana, string]> = {
  GA: ["KA", DAKUTEN, "ガ"], GI: ["KI", DAKUTEN, "ギ"], GU: ["KU", DAKUTEN, "グ"], GE: ["KE", DAKUTEN, "ゲ"], GO: ["KO", DAKUTEN, "ゴ"],
  ZA: ["SA", DAKUTEN, "ザ"], JI: ["SHI", DAKUTEN, "ジ"], ZU: ["SU", DAKUTEN, "ズ"], ZE: ["SE", DAKUTEN, "ゼ"], ZO: ["SO", DAKUTEN, "ゾ"],
  DA: ["TA", DAKUTEN, "ダ"], DE: ["TE", DAKUTEN, "デ"], DO: ["TO", DAKUTEN, "ド"],
  BA: ["HA", DAKUTEN, "バ"], BI: ["HI", DAKUTEN, "ビ"], BU: ["FU", DAKUTEN, "ブ"], BE: ["HE", DAKUTEN, "ベ"], BO: ["HO", DAKUTEN, "ボ"],
  PA: ["HA", HANDAKUTEN, "パ"], PI: ["HI", HANDAKUTEN, "ピ"], PU: ["FU", HANDAKUTEN, "プ"], PE: ["HE", HANDAKUTEN, "ペ"], PO: ["HO", HANDAKUTEN, "ポ"],
};

export interface Syllable {
  romaji: string;
  kana: string;
  /** Morse characters to send for this syllable (two for voiced kana). */
  codes: string[];
}

export function syllable(romaji: string): Syllable {
  const voiced = VOICED[romaji];
  if (voiced) {
    const [base, mark, kana] = voiced;
    return { romaji, kana, codes: [BASE[base].code, mark.code] };
  }
  const base = BASE[romaji];
  if (!base) throw new Error(`Unknown kana: ${romaji}`);
  return { romaji, kana: base.kana, codes: [base.code] };
}

export interface Word {
  english: string;
  syllables: Syllable[];
  /** Every Morse character to send, in order. */
  codes: string[];
}

const word = (romaji: string, english: string): Word => {
  const syllables = romaji.split(" ").map(syllable);
  return { english, syllables, codes: syllables.flatMap((s) => s.codes) };
};

/** Sushi, sashimi and nigiri toppings. */
export const WORDS: readonly Word[] = [
  word("MA GU RO", "Tuna"),
  word("TO RO", "Fatty Tuna"),
  word("SA KE", "Salmon"),
  word("E BI", "Shrimp"),
  word("A MA E BI", "Sweet Shrimp"),
  word("I KA", "Squid"),
  word("TA KO", "Octopus"),
  word("U NI", "Sea Urchin"),
  word("I KU RA", "Salmon Roe"),
  word("HA MA CHI", "Yellowtail"),
  word("KA N PA CHI", "Amberjack"),
  word("U NA GI", "Freshwater Eel"),
  word("A NA GO", "Sea Eel"),
  word("SA BA", "Mackerel"),
  word("A JI", "Horse Mackerel"),
  word("SA WA RA", "Spanish Mackerel"),
  word("HO TA TE", "Scallop"),
  word("A WA BI", "Abalone"),
  word("TA MA GO", "Sweet Omelette"),
  word("TA I", "Sea Bream"),
  word("HI RA ME", "Flounder"),
  word("E N GA WA", "Flounder Fin"),
  word("SU ZU KI", "Sea Bass"),
  word("KA TSU O", "Bonito"),
  word("KO HA DA", "Gizzard Shad"),
  word("KA ZU NO KO", "Herring Roe"),
  word("NE GI TO RO", "Tuna & Scallion"),
  word("I NA RI", "Fried Tofu Pouch"),
];
