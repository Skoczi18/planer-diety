import { InventoryCatalogItemRecord, ShoppingGroup } from "../types";
import { buildItemKey, normalizeProductName, normalizeUnit } from "../lib/shoppingNormalize";

type BaseProductDef = {
  nazwa: string;
  jednostka: string;
  grupa: ShoppingGroup;
};

const BASE_PRODUCTS: BaseProductDef[] = [
  { nazwa: "Skyr naturalny", jednostka: "g", grupa: "nabial_i_jaja" },
  { nazwa: "Twaróg półtłusty", jednostka: "g", grupa: "nabial_i_jaja" },
  { nazwa: "Ser mozzarella light", jednostka: "g", grupa: "nabial_i_jaja" },
  { nazwa: "Jaja", jednostka: "szt.", grupa: "nabial_i_jaja" },
  { nazwa: "Mleko 0,5%", jednostka: "ml", grupa: "nabial_i_jaja" },
  { nazwa: "Pierś z kurczaka", jednostka: "g", grupa: "mieso_i_ryby" },
  { nazwa: "Udo z kurczaka bez skóry", jednostka: "g", grupa: "mieso_i_ryby" },
  { nazwa: "Mięso mielone z indyka", jednostka: "g", grupa: "mieso_i_ryby" },
  { nazwa: "Polędwiczka wieprzowa", jednostka: "g", grupa: "mieso_i_ryby" },
  { nazwa: "Chleb żytni", jednostka: "g", grupa: "pieczywo_i_zboza" },
  { nazwa: "Chleb pełnoziarnisty", jednostka: "g", grupa: "pieczywo_i_zboza" },
  { nazwa: "Tortille pełnoziarniste", jednostka: "szt.", grupa: "pieczywo_i_zboza" },
  { nazwa: "Ryż basmati", jednostka: "g", grupa: "pieczywo_i_zboza" },
  { nazwa: "Kasza gryczana", jednostka: "g", grupa: "pieczywo_i_zboza" },
  { nazwa: "Kasza pęczak", jednostka: "g", grupa: "pieczywo_i_zboza" },
  { nazwa: "Płatki owsiane", jednostka: "g", grupa: "pieczywo_i_zboza" },
  { nazwa: "Musli bez cukru", jednostka: "g", grupa: "pieczywo_i_zboza" },
  { nazwa: "Granola bez cukru", jednostka: "g", grupa: "pieczywo_i_zboza" },
  { nazwa: "Ziemniaki", jednostka: "g", grupa: "warzywa_i_owoce" },
  { nazwa: "Bataty", jednostka: "g", grupa: "warzywa_i_owoce" },
  { nazwa: "Brokuł", jednostka: "g", grupa: "warzywa_i_owoce" },
  { nazwa: "Marchew", jednostka: "g", grupa: "warzywa_i_owoce" },
  { nazwa: "Cukinia", jednostka: "g", grupa: "warzywa_i_owoce" },
  { nazwa: "Papryka", jednostka: "g", grupa: "warzywa_i_owoce" },
  { nazwa: "Cebula", jednostka: "g", grupa: "warzywa_i_owoce" },
  { nazwa: "Pomidor", jednostka: "g", grupa: "warzywa_i_owoce" },
  { nazwa: "Ogórek", jednostka: "g", grupa: "warzywa_i_owoce" },
  { nazwa: "Sałata", jednostka: "g", grupa: "warzywa_i_owoce" },
  { nazwa: "Awokado", jednostka: "g", grupa: "warzywa_i_owoce" },
  { nazwa: "Banan", jednostka: "g", grupa: "warzywa_i_owoce" },
  { nazwa: "Jabłko", jednostka: "g", grupa: "warzywa_i_owoce" },
  { nazwa: "Borówki", jednostka: "g", grupa: "warzywa_i_owoce" },
  { nazwa: "Truskawki", jednostka: "g", grupa: "warzywa_i_owoce" },
  { nazwa: "Oliwa z oliwek", jednostka: "ml", grupa: "tluszcze_i_dodatki" },
  { nazwa: "Masło orzechowe 100%", jednostka: "g", grupa: "tluszcze_i_dodatki" },
  { nazwa: "Orzechy włoskie", jednostka: "g", grupa: "tluszcze_i_dodatki" },
  { nazwa: "Orzechy nerkowca", jednostka: "g", grupa: "tluszcze_i_dodatki" },
  { nazwa: "Orzechy laskowe", jednostka: "g", grupa: "tluszcze_i_dodatki" },
  { nazwa: "Migdały", jednostka: "g", grupa: "tluszcze_i_dodatki" },
  { nazwa: "Miód", jednostka: "g", grupa: "tluszcze_i_dodatki" },
  { nazwa: "Kakao 100%", jednostka: "g", grupa: "tluszcze_i_dodatki" },
  { nazwa: "Woda", jednostka: "ml", grupa: "napoje_i_plyny" },
  { nazwa: "Sok z cytryny", jednostka: "ml", grupa: "napoje_i_plyny" },
  { nazwa: "Sól", jednostka: "g", grupa: "przyprawy_i_dodatki_kuchenne" },
  { nazwa: "Pieprz", jednostka: "g", grupa: "przyprawy_i_dodatki_kuchenne" },
  { nazwa: "Papryka słodka", jednostka: "g", grupa: "przyprawy_i_dodatki_kuchenne" },
  { nazwa: "Czosnek granulowany", jednostka: "g", grupa: "przyprawy_i_dodatki_kuchenne" },
  { nazwa: "Zioła prowansalskie", jednostka: "g", grupa: "przyprawy_i_dodatki_kuchenne" },
  { nazwa: "Curry", jednostka: "g", grupa: "przyprawy_i_dodatki_kuchenne" },
  { nazwa: "Przyprawa BBQ", jednostka: "g", grupa: "przyprawy_i_dodatki_kuchenne" },
  { nazwa: "Cynamon", jednostka: "g", grupa: "przyprawy_i_dodatki_kuchenne" },
  { nazwa: "Erytrytol", jednostka: "g", grupa: "przyprawy_i_dodatki_kuchenne" }
];

export const BASE_INVENTORY_CATALOG: InventoryCatalogItemRecord[] = BASE_PRODUCTS.map((item) => {
  const normalized = normalizeProductName(item.nazwa);
  const jednostka = normalizeUnit(item.jednostka);
  return {
    id: buildItemKey(normalized.productKey, jednostka),
    productKey: normalized.productKey,
    nazwa: item.nazwa,
    jednostka,
    grupa: item.grupa,
    bazowyZPlanu: true,
    source: "diet_base",
    aktywny: true,
    updatedAt: new Date().toISOString()
  };
});
