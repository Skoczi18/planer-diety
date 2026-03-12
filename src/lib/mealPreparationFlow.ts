import { DzienDiety, Posilek } from "../types";
import { setMealPreparedWithInventory, WynikPrzygotowaniaPosilku } from "../db/repository";

function buildWarningsText(result: WynikPrzygotowaniaPosilku): string {
  if (!result.ostrzezenia.length) return "";
  const lines = result.ostrzezenia.map((warning) => {
    if (warning.typ === "nieobslugiwana_jednostka") {
      return `- ${warning.skladnikNazwa}: jednostka ${warning.jednostka} nie jest automatycznie rozliczana`;
    }
    return `- ${warning.skladnikNazwa}: potrzeba ${warning.wymaganaIlosc} ${warning.jednostka}, dostępne ${warning.dostepnaIlosc} ${warning.jednostka}`;
  });
  return `Brakuje części składników lub jednostki nie są obsługiwane:\n${lines.join("\n")}\n\nOznaczyć jako przygotowane i odjąć to, co możliwe?`;
}

export async function runPrepareMealFlow(data: string, day: DzienDiety, meal: Posilek): Promise<WynikPrzygotowaniaPosilku> {
  const firstResult = await setMealPreparedWithInventory(data, day, meal, true);
  if (firstResult.status !== "wymaga_potwierdzenia") return firstResult;

  const accepted = window.confirm(buildWarningsText(firstResult));
  if (!accepted) {
    return {
      status: "zapisano",
      ostrzezenia: firstResult.ostrzezenia,
      inventoryDeducted: false,
      inventoryDeductionInfo: "Przygotowanie anulowane z powodu braków w magazynie."
    };
  }

  return setMealPreparedWithInventory(data, day, meal, true, { forceOnWarnings: true });
}
