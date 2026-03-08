export type StatusDnia = "nie_rozpoczety" | "w_trakcie" | "zrealizowany" | "odstepstwo";

export type TrybDnia = "automatyczny" | "reczny";

export type Makro = {
  kcal: number;
  bialko: number;
  tluszcz: number;
  weglowodany: number;
};

export type Skladnik = {
  nazwa: string;
  ilosc: number;
  jednostka: string;
  notatka?: string;
};

export type PartiaPosilku = {
  id: string;
  liczbaPorcji: number;
  indeksPorcji: number;
  opis: string;
};

export type Posilek = {
  id: string;
  nazwa: string;
  makro: Makro;
  skladniki: Skladnik[];
  przygotowanie: string[];
  etykietaPorcji?: string;
  partia?: PartiaPosilku;
};

export type DzienDiety = {
  id: string;
  numerDnia: number;
  nazwa: string;
  kalorie: number;
  makro: Makro;
  posilki: Posilek[];
  listaZakupow: Skladnik[];
};

export type TypOdstepstwa =
  | "zjadlem_cos_dodatkowo"
  | "nie_zjadlem_jednego_posilku"
  | "zamienilem_posilek"
  | "dzien_poza_planem"
  | "inne";

export type LogOdstepstwa = {
  id: string;
  typ: TypOdstepstwa;
  tekst: string;
  createdAt: string;
};

export type DzienRealizacjiRecord = {
  id: string;
  data: string;
  dzienDietyId: string;
  numerDniaDiety: number;
  statusManualny?: "odstepstwo";
  wagaKg?: number;
  notatka?: string;
  logiOdstepstw: LogOdstepstwa[];
  updatedAt: string;
};

export type RealizacjaPosilkuRecord = {
  id: string;
  data: string;
  dzienDietyId: string;
  posilekId: string;
  przygotowany: boolean;
  zjedzony: boolean;
  notatka?: string;
  updatedAt: string;
};

export type ShoppingMode = "dzien" | "tydzien" | "wiele";

export type ShoppingFilter = "wszystko" | "ukryj_kupione" | "ukryj_mam" | "tylko_brakujace" | "tylko_nieodhaczone";

export type ShoppingGroup =
  | "mieso"
  | "nabial_i_jaja"
  | "pieczywo_i_zboza"
  | "warzywa_i_owoce"
  | "tluszcze_i_dodatki"
  | "przyprawy"
  | "inne";

export type StanZakupuRecord = {
  id: string;
  listKey: string;
  productKey: string;
  kupione: boolean;
  mamWDomu: boolean;
};

export type SpizarniaItemRecord = {
  id: string;
  productKey: string;
  label: string;
  aktywny: boolean;
  updatedAt: string;
};

export type ShoppingManualItemRecord = {
  id: string;
  listKey: string;
  itemKey: string;
  productKey: string;
  nazwa: string;
  ilosc: number;
  jednostka: string;
  notatka?: string;
  grupa?: ShoppingGroup;
  typ: "custom" | "override";
  usuniety: boolean;
  updatedAt: string;
};

export type UstawieniaAplikacji = {
  key: "appSettings";
  startDate: string;
  jezyk: "pl";
  trybDnia: TrybDnia;
  recznyNumerDnia: number;
};

export type NotatkaRecord = {
  id: string;
  data: string;
  tekst: string;
};

export type MetaRecord = {
  key: string;
  value: string;
};

export type ExportAplikacji = {
  version: number;
  exportedAt: string;
  data: {
    dietDays: DzienDiety[];
    dayLogs: DzienRealizacjiRecord[];
    mealLogs: RealizacjaPosilkuRecord[];
    shoppingStates: StanZakupuRecord[];
    pantryItems: SpizarniaItemRecord[];
    shoppingManualItems: ShoppingManualItemRecord[];
    settings: UstawieniaAplikacji[];
    notes: NotatkaRecord[];
    meta: MetaRecord[];
    dayStatuses?: unknown[];
    mealStatuses?: unknown[];
  };
};
