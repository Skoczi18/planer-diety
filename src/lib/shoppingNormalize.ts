import { ShoppingGroup } from "../types";

export type NormalizedProduct = {
  productKey: string;
  canonicalName: string;
};

const EXACT_ALIASES: Record<string, string> = {
  skyr: "skyr",
  "skyr naturalny": "skyr",
  oliwa: "oliwa z oliwek",
  "oliwa z oliwek": "oliwa z oliwek",
  twarog: "twarog poltlusty",
  "twarog poltlusty": "twarog poltlusty",
  "borowki lub truskawki": "borowki lub truskawki",
  "owoce (truskawki/borowki)": "borowki lub truskawki",
  "pomidor + ogorek": "pomidor i ogorek",
  "truskawki lub jablko": "truskawki lub jablko",
  "borowki": "borowki",
  "owoce (jablko, borowki, truskawki)": "owoce mieszane",
  "warzywa: pomidor + ogorek": "pomidor i ogorek",
  "warzywa: pomidor, ogorek": "pomidor i ogorek",
  "musli/platki": "musli lub platki owsiane",
  "musli bez cukru lub platki owsiane": "musli lub platki owsiane"
};

function stripPolish(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ąćęłńóśżź]/g, (letter) => {
      const map: Record<string, string> = {
        ą: "a",
        ć: "c",
        ę: "e",
        ł: "l",
        ń: "n",
        ó: "o",
        ś: "s",
        ż: "z",
        ź: "z"
      };
      return map[letter] ?? letter;
    })
    .replace(/\s+/g, " ")
    .replace(/[–—]/g, "-")
    .trim();
}

function toTitlePl(input: string): string {
  return input.charAt(0).toUpperCase() + input.slice(1);
}

export function normalizeProductName(name: string): NormalizedProduct {
  const clean = stripPolish(name);

  const byExact = EXACT_ALIASES[clean];
  if (byExact) {
    return {
      productKey: byExact,
      canonicalName: toTitlePl(byExact)
    };
  }

  if (clean.includes("skyr")) return { productKey: "skyr", canonicalName: "Skyr" };
  if (clean.includes("oliwa")) return { productKey: "oliwa z oliwek", canonicalName: "Oliwa z oliwek" };
  if (clean.includes("przypraw")) return { productKey: "przyprawy", canonicalName: "Przyprawy" };

  return {
    productKey: clean,
    canonicalName: toTitlePl(clean)
  };
}

const GROUP_RULES: Array<{ group: ShoppingGroup; tokens: string[] }> = [
  { group: "mieso", tokens: ["kurczak", "indyk", "poledwiczka", "mieso", "udo"] },
  { group: "nabial_i_jaja", tokens: ["skyr", "twarog", "ser", "mozzarella", "jaja", "jogurt"] },
  { group: "pieczywo_i_zboza", tokens: ["chleb", "kasza", "ryz", "platki", "musli", "granola"] },
  { group: "warzywa_i_owoce", tokens: ["warzyw", "pomidor", "ogorek", "brokul", "cukinia", "cebula", "papryka", "borow", "truskawk", "jablko", "banan", "awokado", "salata", "ziemniak", "batat"] },
  { group: "tluszcze_i_dodatki", tokens: ["oliwa", "orzech", "maslo orzechowe", "miod", "kakao"] },
  { group: "przyprawy", tokens: ["przypraw", "sol", "pieprz", "czosnek", "ziola", "cynamon"] }
];

export function resolveShoppingGroup(productName: string): ShoppingGroup {
  const key = stripPolish(productName);
  const matched = GROUP_RULES.find((rule) => rule.tokens.some((token) => key.includes(token)));
  return matched?.group ?? "inne";
}

export function normalizeUnit(unit: string): string {
  const clean = stripPolish(unit).replace(/\.$/, "");
  if (clean === "szt" || clean === "szt.") return "szt.";
  if (clean === "gram" || clean === "gr" || clean === "g") return "g";
  if (clean === "ml") return "ml";
  return unit.trim();
}

export function buildItemKey(productKey: string, unit: string): string {
  return `${productKey}::${normalizeUnit(unit)}`;
}
