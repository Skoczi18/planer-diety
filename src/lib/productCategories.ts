import { ShoppingGroup } from "../types";

export const CATEGORY_OPTIONS: Array<{ id: ShoppingGroup; label: string }> = [
  { id: "nabial_i_jaja", label: "Nabiał i jaja" },
  { id: "mieso_i_ryby", label: "Mięso i ryby" },
  { id: "pieczywo_i_zboza", label: "Pieczywo i zboża" },
  { id: "warzywa_i_owoce", label: "Warzywa i owoce" },
  { id: "tluszcze_i_dodatki", label: "Tłuszcze i dodatki" },
  { id: "przyprawy_i_dodatki_kuchenne", label: "Przyprawy i dodatki kuchenne" },
  { id: "napoje_i_plyny", label: "Napoje i płyny" },
  { id: "inne", label: "Inne" }
];

export const CATEGORY_LABELS: Record<ShoppingGroup, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((entry) => [entry.id, entry.label])
) as Record<ShoppingGroup, string>;

const LEGACY_GROUP_MAP: Record<string, ShoppingGroup> = {
  mieso: "mieso_i_ryby",
  nabial_i_jaja: "nabial_i_jaja",
  pieczywo_i_zboza: "pieczywo_i_zboza",
  warzywa_i_owoce: "warzywa_i_owoce",
  tluszcze_i_dodatki: "tluszcze_i_dodatki",
  przyprawy: "przyprawy_i_dodatki_kuchenne",
  inne: "inne",
  mieso_i_ryby: "mieso_i_ryby",
  przyprawy_i_dodatki_kuchenne: "przyprawy_i_dodatki_kuchenne",
  napoje_i_plyny: "napoje_i_plyny"
};

export function normalizeCategoryId(input: string | undefined): ShoppingGroup | undefined {
  if (!input) return undefined;
  return LEGACY_GROUP_MAP[input];
}
