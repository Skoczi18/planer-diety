# Planer Diety PWA (mobile-first)

Prywatna aplikacja webowa/PWA do diety i zakupów, działająca lokalnie na IndexedDB (bez backendu), dopracowana pod iPhone.

## Etap 5 - finalny polishing

### UX mobilny
- Duże, wygodne elementy klikalne.
- Dopracowana dolna nawigacja i sekcje sticky.
- Lepsza hierarchia informacji na ekranach: `Dzisiaj`, `Zakupy`, `Kalendarz`, `Szczegóły dnia`.
- Lepsze stany puste i stany sukcesu.
- Delikatne mikrointerakcje (tap, progres, aktywne elementy).

### Ekran "Dzisiaj"
- Główna karta dnia z podsumowaniem: status, postęp, braki, waga.
- Szybkie akcje: dodaj/zmień wagę, notatka, odstępstwo.
- Szybkie oznaczanie posiłków (przygotowany / zjedzony).
- Sekcja brakujących zakupów i szybkie przejście do zakupów na dziś.
- Czytelny stan pozytywny po pełnej realizacji dnia.

### Zakupy
- Podsumowanie u góry: liczba pozycji, liczba braków, załatwione, postęp %.
- Filtry mobilne i grupowanie produktów.
- Szybkie odhaczanie, edycja, ręczne dodawanie i usuwanie pozycji z listy.
- Dopracowane stany puste i stan "wszystko gotowe".
- Spiżarnia jako produkty bazowe.

### Kalendarz i historia
- Widok miesiąca + lista historii.
- Czytelne statusy kolorami:
  - zielony: zrealizowany
  - żółty: w trakcie
  - czerwony: odstępstwo
  - szary: brak danych
- Znaczniki dnia: notatka, odstępstwo, waga.
- Kliknięcie dnia prowadzi do szczegółów zapisu.
- Podsumowanie tygodnia i statystyki realizacji.

## PWA i iPhone
- `manifest.webmanifest` dopracowany (`id`, `scope`, `display`, `display_override`, `orientation`, kolory).
- Meta tagi iOS (`viewport-fit=cover`, `apple-mobile-web-app-*`, `format-detection`).
- Obsługa safe-area (`env(safe-area-inset-*)`) dla top/bottom.

## Offline i cache
- Service worker z cache app shell.
- Nawigacja działa offline po wcześniejszym załadowaniu.
- Strategia `network-first` dla nawigacji i `cache-first` dla zasobów statycznych.
- Dane użytkownika pozostają lokalnie w IndexedDB.

## Bezpieczeństwo danych lokalnych
- Import JSON z walidacją minimalnej struktury.
- Potwierdzenie przed nadpisaniem danych przy imporcie.
- Czytelne komunikaty: import udany / nieudany.
- Eksport obejmuje historię realizacji, notatki, wagę, odstępstwa, zakupy.

## Najważniejsze pliki
- `index.html`
- `public/manifest.webmanifest`
- `public/sw.js`
- `src/lib/pwa.ts`
- `src/styles/global.css`
- `src/pages/TodayPage.tsx`
- `src/pages/ShoppingPage.tsx`
- `src/pages/CalendarPage.tsx`
- `src/pages/SettingsPage.tsx`

## Uruchomienie lokalne
1. `npm install`
2. `npm run dev`
3. Otwórz adres z Vite (zwykle `http://localhost:5173`)

## Build
- `npm run build`
- `npm run preview`

## Dodanie do ekranu głównego na iPhonie
1. Otwórz aplikację w Safari.
2. Użyj `Udostępnij` -> `Do ekranu początkowego`.
3. Uruchom z ikony na ekranie głównym (tryb standalone).

## Test offline
1. Otwórz aplikację online i przejdź przez główne widoki.
2. Wyłącz internet (tryb samolotowy / brak Wi-Fi).
3. Zamknij i ponownie otwórz aplikację z ikony lub Safari.
4. Sprawdź, czy widoki się otwierają i czy dane lokalne są dostępne.
