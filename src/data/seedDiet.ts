import { DzienDiety } from "../types";

export const SEED_DIETA: DzienDiety[] = [
  {
    id: "d1",
    numerDnia: 1,
    nazwa: "Dzień 1",
    kalorie: 2100,
    makro: { kcal: 2050, bialko: 157, tluszcz: 58, weglowodany: 195 },
    posilki: [
      {
        id: "d1-m1",
        nazwa: "Posiłek I - Skyr z musli i owocami",
        makro: { kcal: 400, bialko: 35, tluszcz: 10, weglowodany: 45 },
        etykietaPorcji: "1 porcja",
        skladniki: [
          { nazwa: "Skyr naturalny", ilosc: 250, jednostka: "g" },
          { nazwa: "Musli bez cukru lub płatki owsiane", ilosc: 40, jednostka: "g" },
          { nazwa: "Borówki lub truskawki", ilosc: 100, jednostka: "g" },
          { nazwa: "Orzechy włoskie", ilosc: 10, jednostka: "g" }
        ],
        przygotowanie: [
          "Wymieszaj wszystkie składniki w misce.",
          "Możesz dodać cynamon lub kilka kropel soku z cytryny."
        ]
      },
      {
        id: "d1-m2",
        nazwa: "Posiłek II - Kurczak z ziemniakami i warzywami z airfryera",
        makro: { kcal: 550, bialko: 45, tluszcz: 13, weglowodany: 50 },
        etykietaPorcji: "1 porcja (z 2 przygotowanych)",
        partia: { id: "d1-batch-main", liczbaPorcji: 2, indeksPorcji: 1, opis: "Posiłek II i III to to samo danie przygotowane od razu w 2 porcjach." },
        skladniki: [
          { nazwa: "Pierś z kurczaka", ilosc: 150, jednostka: "g" },
          { nazwa: "Ziemniaki", ilosc: 200, jednostka: "g" },
          { nazwa: "Oliwa z oliwek", ilosc: 5, jednostka: "g" },
          { nazwa: "Mieszanka warzyw (marchew, cukinia, papryka, cebula)", ilosc: 200, jednostka: "g" },
          { nazwa: "Przyprawy", ilosc: 1, jednostka: "zestaw", notatka: "Papryka słodka, czosnek, zioła prowansalskie, sól" }
        ],
        przygotowanie: [
          "Ziemniaki pokrój w kostkę, skrop oliwą i przypraw.",
          "Włóż ziemniaki do airfryera i piecz 10 min w 190°C.",
          "Dodaj kurczaka i warzywa, wymieszaj.",
          "Piecz kolejne 15-17 min w 190°C.",
          "Połowę zostaw na później (Posiłek III)."
        ]
      },
      {
        id: "d1-m3",
        nazwa: "Posiłek III - Kurczak z ziemniakami i warzywami z airfryera",
        makro: { kcal: 550, bialko: 45, tluszcz: 13, weglowodany: 50 },
        etykietaPorcji: "2 porcja (z przygotowanych 2)",
        partia: { id: "d1-batch-main", liczbaPorcji: 2, indeksPorcji: 2, opis: "Posiłek II i III to to samo danie przygotowane od razu w 2 porcjach." },
        skladniki: [
          { nazwa: "Porcja z wcześniej przygotowanego dania", ilosc: 1, jednostka: "porcja" }
        ],
        przygotowanie: ["Odgrzej drugą porcję przygotowaną wcześniej."]
      },
      {
        id: "d1-m4",
        nazwa: "Posiłek IV - Kanapki z jajkiem, twarogiem i awokado",
        makro: { kcal: 550, bialko: 32, tluszcz: 22, weglowodany: 50 },
        etykietaPorcji: "1 porcja",
        skladniki: [
          { nazwa: "Chleb żytni", ilosc: 80, jednostka: "g" },
          { nazwa: "Jaja", ilosc: 2, jednostka: "szt." },
          { nazwa: "Twaróg półtłusty", ilosc: 100, jednostka: "g" },
          { nazwa: "Awokado", ilosc: 30, jednostka: "g" },
          { nazwa: "Warzywa: pomidor + ogórek", ilosc: 100, jednostka: "g" }
        ],
        przygotowanie: [
          "Jajka ugotuj na twardo lub upiecz w airfryerze (150°C / 15 min).",
          "Twaróg rozgnieć z przyprawami.",
          "Na pieczywie ułóż twaróg, plasterki jajka i awokado."
        ]
      }
    ],
    listaZakupow: [
      { nazwa: "Pierś z kurczaka", ilosc: 300, jednostka: "g" },
      { nazwa: "Ziemniaki", ilosc: 400, jednostka: "g" },
      { nazwa: "Mieszanka warzyw", ilosc: 400, jednostka: "g" },
      { nazwa: "Oliwa z oliwek", ilosc: 10, jednostka: "g" },
      { nazwa: "Skyr", ilosc: 250, jednostka: "g" },
      { nazwa: "Musli/płatki", ilosc: 40, jednostka: "g" },
      { nazwa: "Borówki/truskawki", ilosc: 100, jednostka: "g" },
      { nazwa: "Orzechy włoskie", ilosc: 10, jednostka: "g" },
      { nazwa: "Jaja", ilosc: 2, jednostka: "szt." },
      { nazwa: "Twaróg półtłusty", ilosc: 100, jednostka: "g" },
      { nazwa: "Awokado", ilosc: 30, jednostka: "g" },
      { nazwa: "Chleb żytni", ilosc: 80, jednostka: "g" },
      { nazwa: "Pomidor + ogórek", ilosc: 100, jednostka: "g" }
    ]
  },
  {
    id: "d2",
    numerDnia: 2,
    nazwa: "Dzień 2",
    kalorie: 2050,
    makro: { kcal: 2040, bialko: 160, tluszcz: 61, weglowodany: 195 },
    posilki: [
      {
        id: "d2-m1",
        nazwa: "Posiłek I - Shake skyr + banan + masło orzechowe",
        makro: { kcal: 450, bialko: 35, tluszcz: 15, weglowodany: 45 },
        etykietaPorcji: "1 porcja",
        skladniki: [
          { nazwa: "Skyr", ilosc: 250, jednostka: "g" },
          { nazwa: "Banan", ilosc: 120, jednostka: "g" },
          { nazwa: "Płatki owsiane", ilosc: 40, jednostka: "g" },
          { nazwa: "Masło orzechowe", ilosc: 20, jednostka: "g" },
          { nazwa: "Woda lub mleko 0,5%", ilosc: 100, jednostka: "ml" }
        ],
        przygotowanie: ["Wszystkie składniki zmiksuj w blenderze."]
      },
      {
        id: "d2-m2",
        nazwa: "Posiłek II - Udka z kurczaka + bataty + brokuł (airfryer)",
        makro: { kcal: 520, bialko: 42.5, tluszcz: 14, weglowodany: 45 },
        etykietaPorcji: "1 porcja (z 2 przygotowanych)",
        partia: { id: "d2-batch-main", liczbaPorcji: 2, indeksPorcji: 1, opis: "Posiłek II i III to to samo danie przygotowane od razu w 2 porcjach." },
        skladniki: [
          { nazwa: "Udo z kurczaka bez skóry", ilosc: 180, jednostka: "g" },
          { nazwa: "Bataty", ilosc: 200, jednostka: "g" },
          { nazwa: "Brokuł", ilosc: 150, jednostka: "g" },
          { nazwa: "Oliwa z oliwek", ilosc: 5, jednostka: "g" },
          { nazwa: "Przyprawy", ilosc: 1, jednostka: "zestaw", notatka: "Papryka, pieprz, sól, czosnek" }
        ],
        przygotowanie: [
          "Udka natrzyj przyprawami i odstaw na 15 min.",
          "Bataty pokrój w kostkę i skrop oliwą.",
          "W airfryerze piecz razem 25 min w 185°C.",
          "Brokuły dodaj na ostatnie 5-6 min.",
          "Zrób od razu 2 porcje."
        ]
      },
      {
        id: "d2-m3",
        nazwa: "Posiłek III - Udka z kurczaka + bataty + brokuł (airfryer)",
        makro: { kcal: 520, bialko: 42.5, tluszcz: 14, weglowodany: 45 },
        etykietaPorcji: "2 porcja (z przygotowanych 2)",
        partia: { id: "d2-batch-main", liczbaPorcji: 2, indeksPorcji: 2, opis: "Posiłek II i III to to samo danie przygotowane od razu w 2 porcjach." },
        skladniki: [{ nazwa: "Porcja z wcześniej przygotowanego dania", ilosc: 1, jednostka: "porcja" }],
        przygotowanie: ["Odgrzej drugą porcję przygotowaną wcześniej."]
      },
      {
        id: "d2-m4",
        nazwa: "Posiłek IV - Skyr z granolą i owocami",
        makro: { kcal: 550, bialko: 40, tluszcz: 18, weglowodany: 60 },
        etykietaPorcji: "1 porcja",
        skladniki: [
          { nazwa: "Skyr", ilosc: 250, jednostka: "g" },
          { nazwa: "Granola bez cukru", ilosc: 50, jednostka: "g" },
          { nazwa: "Truskawki lub jabłko", ilosc: 100, jednostka: "g" },
          { nazwa: "Orzechy nerkowca", ilosc: 15, jednostka: "g" }
        ],
        przygotowanie: ["Wymieszaj skyr z granolą i owocami.", "Posyp orzechami."]
      }
    ],
    listaZakupow: [
      { nazwa: "Udo z kurczaka", ilosc: 360, jednostka: "g" },
      { nazwa: "Bataty", ilosc: 400, jednostka: "g" },
      { nazwa: "Brokuł", ilosc: 300, jednostka: "g" },
      { nazwa: "Oliwa z oliwek", ilosc: 10, jednostka: "g" },
      { nazwa: "Skyr", ilosc: 500, jednostka: "g" },
      { nazwa: "Płatki owsiane", ilosc: 40, jednostka: "g" },
      { nazwa: "Masło orzechowe", ilosc: 20, jednostka: "g" },
      { nazwa: "Granola", ilosc: 50, jednostka: "g" },
      { nazwa: "Banan", ilosc: 120, jednostka: "g" },
      { nazwa: "Truskawki lub jabłko", ilosc: 100, jednostka: "g" },
      { nazwa: "Orzechy nerkowca", ilosc: 15, jednostka: "g" }
    ]
  },
  {
    id: "d3",
    numerDnia: 3,
    nazwa: "Dzień 3",
    kalorie: 2100,
    makro: { kcal: 2090, bialko: 165, tluszcz: 65, weglowodany: 180 },
    posilki: [
      {
        id: "d3-m1",
        nazwa: "Posiłek I - Jajka i tosty z serem",
        makro: { kcal: 500, bialko: 35, tluszcz: 25, weglowodany: 35 },
        etykietaPorcji: "1 porcja",
        skladniki: [
          { nazwa: "Jaja", ilosc: 3, jednostka: "szt." },
          { nazwa: "Ser mozzarella light", ilosc: 30, jednostka: "g" },
          { nazwa: "Chleb żytni", ilosc: 80, jednostka: "g" },
          { nazwa: "Pomidor", ilosc: 80, jednostka: "g" }
        ],
        przygotowanie: [
          "Jajka włóż do airfryera (150°C / 15 min).",
          "Zrób tosty z mozzarellą (200°C / 5 min).",
          "Podaj z pomidorem."
        ]
      },
      {
        id: "d3-m2",
        nazwa: "Posiłek II - Klopsiki z indyka + kasza + warzywa",
        makro: { kcal: 520, bialko: 45, tluszcz: 11, weglowodany: 45 },
        etykietaPorcji: "1 porcja (z 2 przygotowanych)",
        partia: { id: "d3-batch-main", liczbaPorcji: 2, indeksPorcji: 1, opis: "Posiłek II i III to to samo danie przygotowane od razu w 2 porcjach." },
        skladniki: [
          { nazwa: "Mięso mielone z indyka", ilosc: 150, jednostka: "g" },
          { nazwa: "Kasza gryczana", ilosc: 50, jednostka: "g" },
          { nazwa: "Warzywa (cukinia, papryka, marchew)", ilosc: 200, jednostka: "g" },
          { nazwa: "Oliwa", ilosc: 5, jednostka: "g" },
          { nazwa: "Przyprawy", ilosc: 1, jednostka: "zestaw", notatka: "Sól, pieprz, papryka, zioła" }
        ],
        przygotowanie: [
          "Mięso przypraw i uformuj klopsiki.",
          "Włóż klopsiki i warzywa do airfryera - 185°C / 18 min.",
          "Kaszę ugotuj."
        ]
      },
      {
        id: "d3-m3",
        nazwa: "Posiłek III - Klopsiki z indyka + kasza + warzywa",
        makro: { kcal: 520, bialko: 45, tluszcz: 11, weglowodany: 45 },
        etykietaPorcji: "2 porcja (z przygotowanych 2)",
        partia: { id: "d3-batch-main", liczbaPorcji: 2, indeksPorcji: 2, opis: "Posiłek II i III to to samo danie przygotowane od razu w 2 porcjach." },
        skladniki: [{ nazwa: "Porcja z wcześniej przygotowanego dania", ilosc: 1, jednostka: "porcja" }],
        przygotowanie: ["Odgrzej drugą porcję przygotowaną wcześniej."]
      },
      {
        id: "d3-m4",
        nazwa: "Posiłek IV - Skyr + owoce + orzechy",
        makro: { kcal: 550, bialko: 40, tluszcz: 18, weglowodany: 55 },
        etykietaPorcji: "1 porcja",
        skladniki: [
          { nazwa: "Skyr", ilosc: 250, jednostka: "g" },
          { nazwa: "Borówki", ilosc: 100, jednostka: "g" },
          { nazwa: "Migdały", ilosc: 15, jednostka: "g" },
          { nazwa: "Miód", ilosc: 5, jednostka: "g", notatka: "Opcjonalnie" }
        ],
        przygotowanie: ["Wymieszaj składniki w misce."]
      }
    ],
    listaZakupow: [
      { nazwa: "Mięso mielone z indyka", ilosc: 300, jednostka: "g" },
      { nazwa: "Kasza gryczana", ilosc: 100, jednostka: "g" },
      { nazwa: "Warzywa (cukinia, marchew, papryka)", ilosc: 400, jednostka: "g" },
      { nazwa: "Oliwa", ilosc: 10, jednostka: "g" },
      { nazwa: "Jaja", ilosc: 3, jednostka: "szt." },
      { nazwa: "Ser mozzarella light", ilosc: 30, jednostka: "g" },
      { nazwa: "Chleb żytni", ilosc: 80, jednostka: "g" },
      { nazwa: "Skyr", ilosc: 250, jednostka: "g" },
      { nazwa: "Borówki", ilosc: 100, jednostka: "g" },
      { nazwa: "Migdały", ilosc: 15, jednostka: "g" }
    ]
  },
  {
    id: "d4",
    numerDnia: 4,
    nazwa: "Dzień 4",
    kalorie: 2050,
    makro: { kcal: 2040, bialko: 157, tluszcz: 62, weglowodany: 185 },
    posilki: [
      {
        id: "d4-m1",
        nazwa: "Posiłek I - Skyr z granolą, owocami i masłem orzechowym",
        makro: { kcal: 450, bialko: 35, tluszcz: 15, weglowodany: 45 },
        etykietaPorcji: "1 porcja",
        skladniki: [
          { nazwa: "Skyr naturalny", ilosc: 250, jednostka: "g" },
          { nazwa: "Granola bez cukru", ilosc: 40, jednostka: "g" },
          { nazwa: "Truskawki lub borówki", ilosc: 100, jednostka: "g" },
          { nazwa: "Masło orzechowe 100%", ilosc: 15, jednostka: "g" }
        ],
        przygotowanie: [
          "Wszystko wymieszaj w misce.",
          "Możesz dodać odrobinę cynamonu lub erytrytolu dla smaku."
        ]
      },
      {
        id: "d4-m2",
        nazwa: "Posiłek II - Burgery z indyka z ziemniakami i warzywami",
        makro: { kcal: 520, bialko: 45, tluszcz: 12.5, weglowodany: 45 },
        etykietaPorcji: "1 porcja (z 2 przygotowanych)",
        partia: { id: "d4-batch-main", liczbaPorcji: 2, indeksPorcji: 1, opis: "Posiłek II i III to to samo danie przygotowane od razu w 2 porcjach." },
        skladniki: [
          { nazwa: "Mięso mielone z indyka", ilosc: 150, jednostka: "g" },
          { nazwa: "Ziemniaki", ilosc: 200, jednostka: "g" },
          { nazwa: "Warzywa (papryka, cukinia, cebula)", ilosc: 200, jednostka: "g" },
          { nazwa: "Oliwa", ilosc: 5, jednostka: "g" },
          { nazwa: "Przyprawy", ilosc: 1, jednostka: "zestaw", notatka: "Sól, pieprz, czosnek, papryka słodka" }
        ],
        przygotowanie: [
          "Mięso dopraw i uformuj burgery.",
          "Ziemniaki pokrój w kostkę, a warzywa w paski. Skrop oliwą.",
          "Wszystko włóż do airfryera i piecz 190°C przez 20 min.",
          "Przygotuj 2 porcje, a drugą zostaw na Posiłek III."
        ]
      },
      {
        id: "d4-m3",
        nazwa: "Posiłek III - Burgery z indyka z ziemniakami i warzywami",
        makro: { kcal: 520, bialko: 45, tluszcz: 12.5, weglowodany: 45 },
        etykietaPorcji: "2 porcja (z przygotowanych 2)",
        partia: { id: "d4-batch-main", liczbaPorcji: 2, indeksPorcji: 2, opis: "Posiłek II i III to to samo danie przygotowane od razu w 2 porcjach." },
        skladniki: [{ nazwa: "Porcja z wcześniej przygotowanego dania", ilosc: 1, jednostka: "porcja" }],
        przygotowanie: ["Odgrzej drugą porcję przygotowaną wcześniej."]
      },
      {
        id: "d4-m4",
        nazwa: "Posiłek IV - Kanapki z jajkiem i awokado",
        makro: { kcal: 550, bialko: 32, tluszcz: 22, weglowodany: 50 },
        etykietaPorcji: "1 porcja",
        skladniki: [
          { nazwa: "Chleb pełnoziarnisty", ilosc: 80, jednostka: "g" },
          { nazwa: "Jaja", ilosc: 2, jednostka: "szt." },
          { nazwa: "Awokado", ilosc: 40, jednostka: "g" },
          { nazwa: "Twaróg półtłusty", ilosc: 80, jednostka: "g" },
          { nazwa: "Warzywa: pomidor, ogórek", ilosc: 100, jednostka: "g" }
        ],
        przygotowanie: [
          "Jajka ugotuj lub przygotuj w airfryerze (150°C / 15 min).",
          "Twaróg rozgnieć z przyprawami.",
          "Posmaruj pieczywo twarogiem, dodaj jajko i awokado."
        ]
      }
    ],
    listaZakupow: [
      { nazwa: "Mięso mielone z indyka", ilosc: 300, jednostka: "g" },
      { nazwa: "Ziemniaki", ilosc: 400, jednostka: "g" },
      { nazwa: "Warzywa (papryka, cukinia, cebula)", ilosc: 400, jednostka: "g" },
      { nazwa: "Oliwa", ilosc: 10, jednostka: "g" },
      { nazwa: "Skyr", ilosc: 250, jednostka: "g" },
      { nazwa: "Granola", ilosc: 40, jednostka: "g" },
      { nazwa: "Owoce (truskawki/borówki)", ilosc: 100, jednostka: "g" },
      { nazwa: "Masło orzechowe", ilosc: 15, jednostka: "g" },
      { nazwa: "Jaja", ilosc: 2, jednostka: "szt." },
      { nazwa: "Chleb pełnoziarnisty", ilosc: 80, jednostka: "g" },
      { nazwa: "Awokado", ilosc: 40, jednostka: "g" },
      { nazwa: "Twaróg", ilosc: 80, jednostka: "g" }
    ]
  },
  {
    id: "d5",
    numerDnia: 5,
    nazwa: "Dzień 5",
    kalorie: 2100,
    makro: { kcal: 2040, bialko: 165, tluszcz: 55, weglowodany: 190 },
    posilki: [
      {
        id: "d5-m1",
        nazwa: "Posiłek I - Shake ze skyrem, płatkami i jabłkiem",
        makro: { kcal: 450, bialko: 35, tluszcz: 10, weglowodany: 50 },
        etykietaPorcji: "1 porcja",
        skladniki: [
          { nazwa: "Skyr naturalny", ilosc: 250, jednostka: "g" },
          { nazwa: "Płatki owsiane", ilosc: 40, jednostka: "g" },
          { nazwa: "Jabłko", ilosc: 150, jednostka: "g" },
          { nazwa: "Woda", ilosc: 100, jednostka: "ml" },
          { nazwa: "Cynamon", ilosc: 1, jednostka: "szczypta" }
        ],
        przygotowanie: ["Wszystko wrzuć do blendera i zmiksuj."]
      },
      {
        id: "d5-m2",
        nazwa: "Posiłek II - Kurczak z ryżem i warzywami z airfryera",
        makro: { kcal: 520, bialko: 42.5, tluszcz: 12.5, weglowodany: 47.5 },
        etykietaPorcji: "1 porcja (z 2 przygotowanych)",
        partia: { id: "d5-batch-main", liczbaPorcji: 2, indeksPorcji: 1, opis: "Posiłek II i III to to samo danie przygotowane od razu w 2 porcjach." },
        skladniki: [
          { nazwa: "Pierś z kurczaka", ilosc: 150, jednostka: "g" },
          { nazwa: "Ryż basmati", ilosc: 50, jednostka: "g" },
          { nazwa: "Mieszanka warzyw (marchew, brokuł, papryka)", ilosc: 200, jednostka: "g" },
          { nazwa: "Oliwa", ilosc: 5, jednostka: "g" }
        ],
        przygotowanie: [
          "Kurczaka dopraw ulubionymi przyprawami.",
          "Ugotuj ryż.",
          "Mięso i warzywa włóż do airfryera i piecz 190°C przez 17 min.",
          "Połącz z ryżem i przygotuj od razu 2 porcje."
        ]
      },
      {
        id: "d5-m3",
        nazwa: "Posiłek III - Kurczak z ryżem i warzywami z airfryera",
        makro: { kcal: 520, bialko: 42.5, tluszcz: 12.5, weglowodany: 47.5 },
        etykietaPorcji: "2 porcja (z przygotowanych 2)",
        partia: { id: "d5-batch-main", liczbaPorcji: 2, indeksPorcji: 2, opis: "Posiłek II i III to to samo danie przygotowane od razu w 2 porcjach." },
        skladniki: [{ nazwa: "Porcja z wcześniej przygotowanego dania", ilosc: 1, jednostka: "porcja" }],
        przygotowanie: ["Odgrzej drugą porcję przygotowaną wcześniej."]
      },
      {
        id: "d5-m4",
        nazwa: "Posiłek IV - Skyr z orzechami i miodem",
        makro: { kcal: 550, bialko: 45, tluszcz: 20, weglowodany: 45 },
        etykietaPorcji: "1 porcja",
        skladniki: [
          { nazwa: "Skyr", ilosc: 250, jednostka: "g" },
          { nazwa: "Orzechy włoskie", ilosc: 20, jednostka: "g" },
          { nazwa: "Miód", ilosc: 5, jednostka: "g" },
          { nazwa: "Borówki", ilosc: 100, jednostka: "g" }
        ],
        przygotowanie: ["Wymieszaj wszystko w misce."]
      }
    ],
    listaZakupow: [
      { nazwa: "Pierś z kurczaka", ilosc: 300, jednostka: "g" },
      { nazwa: "Ryż basmati", ilosc: 100, jednostka: "g" },
      { nazwa: "Mieszanka warzyw", ilosc: 400, jednostka: "g" },
      { nazwa: "Oliwa", ilosc: 10, jednostka: "g" },
      { nazwa: "Skyr", ilosc: 500, jednostka: "g" },
      { nazwa: "Płatki owsiane", ilosc: 40, jednostka: "g" },
      { nazwa: "Jabłko", ilosc: 150, jednostka: "g" },
      { nazwa: "Orzechy włoskie", ilosc: 20, jednostka: "g" },
      { nazwa: "Miód", ilosc: 5, jednostka: "g" },
      { nazwa: "Borówki", ilosc: 100, jednostka: "g" }
    ]
  },
  {
    id: "d6",
    numerDnia: 6,
    nazwa: "Dzień 6",
    kalorie: 2100,
    makro: { kcal: 2090, bialko: 165, tluszcz: 63, weglowodany: 180 },
    posilki: [
      {
        id: "d6-m1",
        nazwa: "Posiłek I - Tosty z jajkiem i serem z airfryera",
        makro: { kcal: 500, bialko: 35, tluszcz: 20, weglowodany: 35 },
        etykietaPorcji: "1 porcja",
        skladniki: [
          { nazwa: "Jaja", ilosc: 2, jednostka: "szt." },
          { nazwa: "Ser mozzarella light", ilosc: 30, jednostka: "g" },
          { nazwa: "Chleb pełnoziarnisty", ilosc: 80, jednostka: "g" },
          { nazwa: "Pomidor", ilosc: 80, jednostka: "g" }
        ],
        przygotowanie: [
          "Zrób tosty z mozzarellą w airfryerze: 200°C / 5 min.",
          "Jajka możesz zrobić w airfryerze w foremce: 180°C / 8 min."
        ]
      },
      {
        id: "d6-m2",
        nazwa: "Posiłek II - Polędwiczki wieprzowe z kaszą i warzywami",
        makro: { kcal: 520, bialko: 45, tluszcz: 12.5, weglowodany: 45 },
        etykietaPorcji: "1 porcja (z 2 przygotowanych)",
        partia: { id: "d6-batch-main", liczbaPorcji: 2, indeksPorcji: 1, opis: "Posiłek II i III to to samo danie przygotowane od razu w 2 porcjach." },
        skladniki: [
          { nazwa: "Polędwiczka wieprzowa", ilosc: 150, jednostka: "g" },
          { nazwa: "Kasza pęczak", ilosc: 50, jednostka: "g" },
          { nazwa: "Warzywa (marchew, cebula, brokuł)", ilosc: 200, jednostka: "g" },
          { nazwa: "Oliwa", ilosc: 5, jednostka: "g" }
        ],
        przygotowanie: [
          "Polędwiczki pokrój i dopraw.",
          "Piecz razem z warzywami w airfryerze: 190°C / 18 min.",
          "Ugotuj kaszę i wszystko połącz."
        ]
      },
      {
        id: "d6-m3",
        nazwa: "Posiłek III - Polędwiczki wieprzowe z kaszą i warzywami",
        makro: { kcal: 520, bialko: 45, tluszcz: 12.5, weglowodany: 45 },
        etykietaPorcji: "2 porcja (z przygotowanych 2)",
        partia: { id: "d6-batch-main", liczbaPorcji: 2, indeksPorcji: 2, opis: "Posiłek II i III to to samo danie przygotowane od razu w 2 porcjach." },
        skladniki: [{ nazwa: "Porcja z wcześniej przygotowanego dania", ilosc: 1, jednostka: "porcja" }],
        przygotowanie: ["Odgrzej drugą porcję przygotowaną wcześniej."]
      },
      {
        id: "d6-m4",
        nazwa: "Posiłek IV - Skyr + granola + banan",
        makro: { kcal: 550, bialko: 40, tluszcz: 18, weglowodany: 55 },
        etykietaPorcji: "1 porcja",
        skladniki: [
          { nazwa: "Skyr", ilosc: 250, jednostka: "g" },
          { nazwa: "Granola", ilosc: 40, jednostka: "g" },
          { nazwa: "Banan", ilosc: 120, jednostka: "g" },
          { nazwa: "Orzechy laskowe", ilosc: 15, jednostka: "g" }
        ],
        przygotowanie: ["Wszystko wymieszaj w misce."]
      }
    ],
    listaZakupow: [
      { nazwa: "Polędwiczka wieprzowa", ilosc: 300, jednostka: "g" },
      { nazwa: "Kasza pęczak", ilosc: 100, jednostka: "g" },
      { nazwa: "Warzywa", ilosc: 400, jednostka: "g" },
      { nazwa: "Oliwa", ilosc: 10, jednostka: "g" },
      { nazwa: "Skyr", ilosc: 250, jednostka: "g" },
      { nazwa: "Granola", ilosc: 40, jednostka: "g" },
      { nazwa: "Banan", ilosc: 120, jednostka: "g" },
      { nazwa: "Orzechy laskowe", ilosc: 15, jednostka: "g" },
      { nazwa: "Jaja", ilosc: 2, jednostka: "szt." },
      { nazwa: "Ser mozzarella", ilosc: 30, jednostka: "g" },
      { nazwa: "Chleb pełnoziarnisty", ilosc: 80, jednostka: "g" },
      { nazwa: "Pomidor", ilosc: 80, jednostka: "g" }
    ]
  },
  {
    id: "d7",
    numerDnia: 7,
    nazwa: "Dzień 7",
    kalorie: 2100,
    makro: { kcal: 2040, bialko: 165, tluszcz: 54, weglowodany: 190 },
    posilki: [
      {
        id: "d7-m1",
        nazwa: "Posiłek I - Owsianka z jogurtem/skyr i owocami",
        makro: { kcal: 450, bialko: 35, tluszcz: 10, weglowodany: 50 },
        etykietaPorcji: "1 porcja",
        skladniki: [
          { nazwa: "Płatki owsiane", ilosc: 50, jednostka: "g" },
          { nazwa: "Skyr", ilosc: 250, jednostka: "g" },
          { nazwa: "Owoce (jabłko, borówki, truskawki)", ilosc: 150, jednostka: "g" },
          { nazwa: "Orzechy włoskie", ilosc: 10, jednostka: "g" }
        ],
        przygotowanie: [
          "Płatki zalej wrzątkiem.",
          "Po 5 min dodaj skyr i owoce."
        ]
      },
      {
        id: "d7-m2",
        nazwa: "Posiłek II - Kurczak BBQ + frytki z batatów",
        makro: { kcal: 520, bialko: 45, tluszcz: 13, weglowodany: 42.5 },
        etykietaPorcji: "1 porcja (z 2 przygotowanych)",
        partia: { id: "d7-batch-main", liczbaPorcji: 2, indeksPorcji: 1, opis: "Posiłek II i III to to samo danie przygotowane od razu w 2 porcjach." },
        skladniki: [
          { nazwa: "Pierś z kurczaka", ilosc: 150, jednostka: "g" },
          { nazwa: "Bataty", ilosc: 200, jednostka: "g" },
          { nazwa: "Oliwa", ilosc: 5, jednostka: "g" },
          { nazwa: "Przyprawa BBQ lub papryka, czosnek, sól", ilosc: 1, jednostka: "zestaw" },
          { nazwa: "Sałata + pomidor", ilosc: 100, jednostka: "g" }
        ],
        przygotowanie: [
          "Kurczaka dopraw przyprawą BBQ.",
          "Bataty pokrój w frytki i skrop oliwą.",
          "Włóż razem do airfryera i piecz 190°C przez 18 min."
        ]
      },
      {
        id: "d7-m3",
        nazwa: "Posiłek III - Kurczak BBQ + frytki z batatów",
        makro: { kcal: 520, bialko: 45, tluszcz: 13, weglowodany: 42.5 },
        etykietaPorcji: "2 porcja (z przygotowanych 2)",
        partia: { id: "d7-batch-main", liczbaPorcji: 2, indeksPorcji: 2, opis: "Posiłek II i III to to samo danie przygotowane od razu w 2 porcjach." },
        skladniki: [{ nazwa: "Porcja z wcześniej przygotowanego dania", ilosc: 1, jednostka: "porcja" }],
        przygotowanie: ["Odgrzej drugą porcję przygotowaną wcześniej."]
      },
      {
        id: "d7-m4",
        nazwa: "Posiłek IV - Shake skyr + masło orzechowe + kakao",
        makro: { kcal: 550, bialko: 40, tluszcz: 18, weglowodany: 55 },
        etykietaPorcji: "1 porcja",
        skladniki: [
          { nazwa: "Skyr", ilosc: 250, jednostka: "g" },
          { nazwa: "Masło orzechowe", ilosc: 20, jednostka: "g" },
          { nazwa: "Kakao 100%", ilosc: 5, jednostka: "g" },
          { nazwa: "Banan", ilosc: 100, jednostka: "g" },
          { nazwa: "Woda lub mleko", ilosc: 100, jednostka: "ml" }
        ],
        przygotowanie: ["Wszystko zblenduj na gęsty, kremowy shake."]
      }
    ],
    listaZakupow: [
      { nazwa: "Pierś z kurczaka", ilosc: 300, jednostka: "g" },
      { nazwa: "Bataty", ilosc: 400, jednostka: "g" },
      { nazwa: "Sałata + pomidor", ilosc: 100, jednostka: "g" },
      { nazwa: "Oliwa", ilosc: 10, jednostka: "g" },
      { nazwa: "Skyr", ilosc: 500, jednostka: "g" },
      { nazwa: "Płatki owsiane", ilosc: 50, jednostka: "g" },
      { nazwa: "Owoce (jabłko, borówki, truskawki)", ilosc: 150, jednostka: "g" },
      { nazwa: "Orzechy włoskie", ilosc: 10, jednostka: "g" },
      { nazwa: "Masło orzechowe", ilosc: 20, jednostka: "g" },
      { nazwa: "Kakao", ilosc: 5, jednostka: "g" },
      { nazwa: "Banan", ilosc: 100, jednostka: "g" }
    ]
  }
];
