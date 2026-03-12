import { ShoppingGroup } from "../types";
import { normalizeCategoryId } from "./productCategories";

export type NormalizedProduct = {
  productKey: string;
  canonicalName: string;
};

const PRODUCT_LABELS: Record<string, string> = {
  "skyr naturalny": "Skyr naturalny",
  "twarog poltlusty": "Twaróg półtłusty",
  "ser mozzarella light": "Ser mozzarella light",
  jaja: "Jaja",
  "mleko 0,5%": "Mleko 0,5%",
  "piers z kurczaka": "Pierś z kurczaka",
  "udo z kurczaka bez skory": "Udo z kurczaka bez skóry",
  "mieso mielone z indyka": "Mięso mielone z indyka",
  "poledwiczka wieprzowa": "Polędwiczka wieprzowa",
  "chleb zytni": "Chleb żytni",
  "chleb pelnoziarnisty": "Chleb pełnoziarnisty",
  "ryz basmati": "Ryż basmati",
  "kasza gryczana": "Kasza gryczana",
  "kasza peczak": "Kasza pęczak",
  "platki owsiane": "Płatki owsiane",
  "musli bez cukru": "Musli bez cukru",
  "granola bez cukru": "Granola bez cukru",
  ziemniaki: "Ziemniaki",
  bataty: "Bataty",
  brokul: "Brokuł",
  marchew: "Marchew",
  cukinia: "Cukinia",
  papryka: "Papryka",
  cebula: "Cebula",
  pomidor: "Pomidor",
  ogorek: "Ogórek",
  salata: "Sałata",
  awokado: "Awokado",
  banan: "Banan",
  jablko: "Jabłko",
  borowki: "Borówki",
  truskawki: "Truskawki",
  "oliwa z oliwek": "Oliwa z oliwek",
  "maslo orzechowe 100%": "Masło orzechowe 100%",
  "orzechy wloskie": "Orzechy włoskie",
  "orzechy nerkowca": "Orzechy nerkowca",
  "orzechy laskowe": "Orzechy laskowe",
  migdaly: "Migdały",
  miod: "Miód",
  "kakao 100%": "Kakao 100%",
  woda: "Woda",
  "sok z cytryny": "Sok z cytryny",
  sol: "Sól",
  pieprz: "Pieprz",
  "papryka slodka": "Papryka słodka",
  "czosnek granulowany": "Czosnek granulowany",
  "ziola prowansalskie": "Zioła prowansalskie",
  curry: "Curry",
  "przyprawa bbq": "Przyprawa BBQ",
  cynamon: "Cynamon",
  erytrytol: "Erytrytol",
  przyprawy: "Przyprawy"
};

const EXACT_ALIASES: Record<string, string> = {
  skyr: "skyr naturalny",
  "skyr naturalny": "skyr naturalny",
  oliwa: "oliwa z oliwek",
  "oliwa z oliwek": "oliwa z oliwek",
  twarog: "twarog poltlusty",
  "twarog poltlusty": "twarog poltlusty",
  "ser mozzarella": "ser mozzarella light",
  "ser mozzarella light": "ser mozzarella light",
  "maslo orzechowe": "maslo orzechowe 100%",
  "maslo orzechowe 100%": "maslo orzechowe 100%",
  granola: "granola bez cukru",
  "musli/platki": "musli bez cukru",
  "musli bez cukru lub platki owsiane": "musli bez cukru",
  "woda lub mleko 0,5%": "mleko 0,5%",
  "woda lub mleko": "mleko 0,5%",
  "przyprawa bbq lub papryka, czosnek, sol": "przyprawa bbq",
  przyprawy: "przyprawy"
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

function canonicalLabel(productKey: string): string {
  return PRODUCT_LABELS[productKey] ?? toTitlePl(productKey);
}

export function normalizeProductName(name: string): NormalizedProduct {
  const clean = stripPolish(name);

  const byExact = EXACT_ALIASES[clean];
  if (byExact) {
    return {
      productKey: byExact,
      canonicalName: canonicalLabel(byExact)
    };
  }

  if (clean.includes("skyr")) return { productKey: "skyr naturalny", canonicalName: canonicalLabel("skyr naturalny") };
  if (clean.includes("oliwa")) return { productKey: "oliwa z oliwek", canonicalName: "Oliwa z oliwek" };
  if (clean.includes("przypraw")) return { productKey: "przyprawy", canonicalName: "Przyprawy" };

  return {
    productKey: clean,
    canonicalName: canonicalLabel(clean)
  };
}

const GROUP_RULES: Array<{ group: ShoppingGroup; tokens: string[] }> = [
  { group: "mieso_i_ryby", tokens: ["kurczak", "indyk", "poledwiczka", "mieso", "udo", "ryba", "losos", "tunczyk"] },
  { group: "nabial_i_jaja", tokens: ["skyr", "twarog", "ser", "mozzarella", "jaja", "jogurt"] },
  { group: "pieczywo_i_zboza", tokens: ["chleb", "kasza", "ryz", "platki", "musli", "granola"] },
  { group: "warzywa_i_owoce", tokens: ["warzyw", "pomidor", "ogorek", "brokul", "cukinia", "cebula", "papryka", "borow", "truskawk", "jablko", "banan", "awokado", "salata", "ziemniak", "batat"] },
  { group: "tluszcze_i_dodatki", tokens: ["oliwa", "orzech", "maslo orzechowe", "miod", "kakao"] },
  { group: "przyprawy_i_dodatki_kuchenne", tokens: ["przypraw", "sol", "pieprz", "czosnek", "ziola", "cynamon", "erytrytol", "bbq", "curry"] },
  { group: "napoje_i_plyny", tokens: ["woda", "mleko", "sok", "napoj"] }
];

export function resolveShoppingGroup(productName: string): ShoppingGroup {
  const key = stripPolish(productName);
  const matched = GROUP_RULES.find((rule) => rule.tokens.some((token) => key.includes(token)));
  return matched?.group ?? "inne";
}

export function normalizeShoppingGroup(input: string | undefined, productNameHint?: string): ShoppingGroup {
  const mapped = normalizeCategoryId(input);
  if (mapped) return mapped;
  if (productNameHint) return resolveShoppingGroup(productNameHint);
  return "inne";
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

export function splitIngredientNameToProducts(name: string): string[] {
  const clean = stripPolish(name);
  if (clean === "pomidor + ogorek" || clean === "warzywa: pomidor + ogorek" || clean === "warzywa: pomidor, ogorek") {
    return ["pomidor", "ogorek"];
  }
  if (clean === "salata + pomidor") {
    return ["salata", "pomidor"];
  }
  if (clean === "borowki lub truskawki" || clean === "owoce (truskawki/borowki)") {
    return ["borowki", "truskawki"];
  }
  if (clean === "truskawki lub jablko") {
    return ["truskawki", "jablko"];
  }
  if (clean === "owoce (jablko, borowki, truskawki)") {
    return ["jablko", "borowki", "truskawki"];
  }
  if (clean === "mieszanka warzyw (marchew, cukinia, papryka, cebula)") {
    return ["marchew", "cukinia", "papryka", "cebula"];
  }
  if (clean === "warzywa (cukinia, papryka, marchew)") {
    return ["cukinia", "papryka", "marchew"];
  }
  if (clean === "warzywa (papryka, cukinia, cebula)") {
    return ["papryka", "cukinia", "cebula"];
  }
  if (clean === "warzywa (marchew, cebula, brokul)") {
    return ["marchew", "cebula", "brokul"];
  }
  return [clean];
}
