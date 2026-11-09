# Implementationsplan: reklamfri Sudoku-PWA

**Beslut hittills**

- Plattform: webbapp (PWA) som installeras på hemskärmen och fungerar offline.
- Layout: som i förlagan, men utan favorit, dela, tema, poäng, snabbpenna och ledtråd.
- Avbryta spel: **pausa och återuppta**, samt **ge upp** (räknas som förlust).
- Nytt spel med val av svårighetsgrad (fem nivåer: Lätt, Medel, Svår, Expert, Mästare), och statistik per svårighetsgrad.
- "Vinstrad N" i titeln gäller den svårighetsgrad som spelas.
- Nytt spel mitt i ett pågående räknas som uppgivet om minst ett drag gjorts.
- Blixtknappen är en switch för autokomplettering när pusslet nästan är klart (se avsnitt 5).
- Repot byter namn från "Soduko" till "Sudoku" före första driftsättningen.

---

## 1. Teknikval

| Del         | Val                                                    | Varför                                                                                                         |
| ----------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Byggverktyg | **Vite + TypeScript (strict)**                         | Snabb dev-server och liten build. Har bra stöd för PWA och Vitest.                                             |
| UI          | **Preact + @preact/signals**                           | Cirka 5 kB. Komponenter för bräde, sifferfält och skärmar. Signals gör att bara de celler som ändras ritas om. |
| PWA         | **vite-plugin-pwa** (Workbox)                          | Ger manifest, precache och uppdateringsflöde.                                                                  |
| Routing     | En `screen`-signal plus `history.pushState`            | Androids bakåtgest fungerar.                                                                                   |
| Lagring     | **localStorage** med versionerade nycklar              | Liten datamängd. `navigator.storage.persist()` minskar risken att datan rensas.                                |
| Test        | **Vitest** (enhet), **Playwright** (smoke och offline) |                                                                                                                |
| Kvalitet    | ESLint + Prettier + `tsc --noEmit` i CI                |                                                                                                                |

Inga beroenden för analys, reklam eller inloggning, och inga externa nätverksanrop.

---

## 2. Projektstruktur

```
index.html
vite.config.ts            // base: '/Sudoku/', PWA-konfig
public/                   // ikoner (192, 512, maskable), favicon
scripts/
  generate-bank.ts        // genererar och graderar pussel, skriver src/data/*.txt
src/
  main.tsx, app.tsx       // skärmväxling, bakåthantering
  styles/                 // theme.css (färgvariabler), global.css
  engine/                 // ren TS utan DOM
    board.ts              // index, rad/kolumn/box, peers
    rng.ts                // seedad slumpgenerator
    solver.ts             // backtracking, countSolutions(max=2)
    generator.ts          // full lösning -> ta bort ledtrådar med unikhetskontroll
    grader.ts             // logisk lösare med mänskliga tekniker
    transform.ts          // permutationer som bevarar svårigheten
  puzzles/bank.ts         // laddar bank per nivå, slumpar och transformerar
  data/easy.txt … master.txt
  game/                   // types, reducer, selectors, timer
  stats/stats.ts
  storage/storage.ts      // nycklar, schemaversion, migreringar
  state/store.ts          // signals: game, settings, stats, screen
  screens/                // Home, Game, Stats, Settings
  components/             // TopBar, InfoRow, Board, Cell, ActionBar, NumberPad,
                          // DifficultySheet, Dialog, PauseOverlay, UpdateToast
tests/unit/…  tests/e2e/…
.github/workflows/ci.yml, deploy.yml
```

---

## 3. Pusselgenerering

**Förgenererad, graderad pusselbank som följer med appen, plus slumpade transformationer när ett spel startas.**

- **Varför:** att generera svåra pussel med rätt svårighetsgrad kan ta sekunder på en mobil. Med en bank startar ett nytt spel direkt och allt fungerar offline.
- **Bygga banken** (körs lokalt, resultatet checkas in):
  1. Skapa en slumpad, komplett lösning.
  2. Ta bort ledtrådar, gärna symmetriskt. Efter varje borttagning kontrolleras att pusslet fortfarande har exakt en lösning.
  3. Gradera pusslet med en lösare som bara använder mänskliga tekniker. Nivån bestäms av den svåraste teknik som behövs.

| Nivå    | Tekniker som krävs                                                               | Ledtrådar (ungefär) |
| ------- | -------------------------------------------------------------------------------- | ------------------- |
| Lätt    | Naked och hidden singles                                                         | 36–45               |
| Medel   | + pairs, pointing pairs, box/line                                                | 30–35               |
| Svår    | + triples                                                                        | 26–31               |
| Expert  | + X-wing, Swordfish, XY-wing                                                     | 22–27               |
| Mästare | + kedjor/coloring, eller kräver mer än teknikerna ovan men har ändå unik lösning | ≤ 26                |

4. Spara cirka 300 pussel per nivå (ungefär 10 kB gzip per nivå).

- **När ett spel startas:** välj ett pussel som inte spelats nyligen och transformera det (byt siffror, rader inom band, kolumner inom stackar, band, stackar, transponera). Det ger miljarder varianter med samma svårighet.

---

## 4. Datamodell

```ts
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'master';

interface Move {
  // en åtgärd som ångras som en helhet
  cell: number;
  prev: { value: number; notes: number }; // notes = 9-bitars mask
  next: { value: number; notes: number };
  peerNotesCleared?: { cell: number; notes: number }[];
}

interface GameState {
  v: 1;
  id: string;
  difficulty: Difficulty;
  puzzleId: string;
  givens: string;
  solution: string; // 81 tecken
  values: number[];
  notes: number[];
  mistakes: number;
  elapsedMs: number;
  status: 'playing' | 'paused' | 'won' | 'lost';
  history: Move[];
  countedAsStarted: boolean; // sätts vid första draget
  selected: number | null;
  pencil: boolean;
  createdAt: number;
  endedAt?: number;
}

interface DifficultyStats {
  started: number;
  won: number;
  lost: number;
  givenUp: number;
  wonNoMistakes: number;
  bestTimeMs: number | null;
  totalWonTimeMs: number;
  currentStreak: number;
  bestStreak: number;
}

interface Settings {
  v: 1;
  mistakeLimit: boolean; // 3 misstag = förlust (standard: på)
  highlightPeers: boolean;
  highlightSameDigit: boolean;
  highlightConflicts: boolean;
  autoRemoveNotes: boolean;
  hideCompletedDigits: boolean;
  showTimer: boolean;
  haptics: boolean;
  keepScreenOn: boolean;
  autoComplete: boolean; // blixtknappen (standard: på)
  lastDifficulty: Difficulty;
}
```

- Sparas i localStorage under `sudoku:v1:game`, `sudoku:v1:stats`, `sudoku:v1:settings` och `sudoku:v1:recent`.
- Sparas efter varje åtgärd och när appen göms eller stängs.
- Korrupt data ger standardvärden i stället för krasch.
- Progress (`39/59`) = korrekt ifyllda celler / tomma celler från start.

---

## 5. Spelregler

- **Inmatning:** tryck på en cell och sedan en siffra. Givna siffror går inte att ändra. Korrekt ifyllda siffror låses och kan bara ångras.
- **Misstag:** fel siffra ger `mistakes++`, röd siffra och vibration (om påslaget). Vid 3 misstag är spelet förlorat, med dialogen "Nytt spel" eller "Försök igen". Med gränsen avstängd räknas misstagen ändå.
- **Penna PÅ/AV:** en siffra slår av eller på en anteckning i en tom cell. Anteckningar visas som små siffror i cellen.
- **Automatisk borttagning av anteckningar:** när en korrekt siffra placeras tas samma anteckning bort i rad, kolumn och box. Ångra återställer dem.
- **Ångra:** backar hela den senaste åtgärden. Misstag och tid backas inte. Historiken sparas, så ångra fungerar även efter omstart.
- **Radera:** tar bort en felaktig siffra, annars cellens anteckningar.
- **Vinst:** alla celler stämmer. En dialog visar tid, eventuellt nytt rekord och vinstrad.
- **Paus:** pausknappen, eller att appen göms, stoppar timern och döljer brädet ("Pausad" med Fortsätt och Ge upp). Bakåtpilen sparar och pausar. Spelet öppnas pausat nästa gång.
- **Timer:** räknar bara aktiv speltid. Tid när appen är stängd räknas aldrig.
- **Ge upp** (från pausläget, efter bekräftelse): räknas som förlust och nollställer vinstraden. Lösningen visas.
- **Autokomplettering (blixtknappen):** en switch ovanför åtgärdsraden, och samma val i Inställningar. När den är på och alla kvarvarande tomma celler går att fylla i med enkla "singles" (en cell med bara en möjlig siffra), fyller appen i resten automatiskt med en kort animation. Timern stannar i det ögonblicket och spelet räknas som vunnet som vanligt. Autokompletteringen kan aldrig ge misstag.
- **Nytt spel när ett pågår:** bekräftelsedialog. Har minst ett drag gjorts räknas det pågående spelet som uppgivet, annars påverkas inte statistiken.

---

## 6. Skärmar och layout (mörkt tema, porträtt)

**Start**

- "Fortsätt" om ett sparat spel finns (nivå, tid, progress).
- "Nytt spel" öppnar ett val av Lätt, Medel, Svår, Expert och Mästare. Senast vald nivå är förvald.
- Länkar till Statistik och Inställningar.

**Spel**, uppifrån och ned:

1. **Toppfält:** bakåtpil och "Vinstrad N" till vänster, kugghjul till höger.
2. **Inforad:** `39/59` · `Misstag: 1/3` · `Expert` · `23:35` med pausknapp.
3. **Bräde 9×9:**
   - Tjockare linjer mellan 3×3-boxarna.
   - Givna siffror ljusgrå, egna blå, fel röda.
   - Vald cell starkt markerad, dess rad, kolumn och box svagt markerade.
   - Celler med samma siffra fylls i blått.
4. **Blixtswitch** (autokomplettering) till höger ovanför åtgärdsraden.
5. **Åtgärdsrad:** Ångra · Radera · Penna (PÅ/AV).
6. **Sifferfält 1–9:** antal kvar under varje siffra. Färdiga siffror gråas ut eller döljs.

På desktop fungerar tangentbordet: 1–9, piltangenter, Backspace, N för penna och Ctrl+Z.

**Statistik:** flikar per nivå plus "Totalt". Varje flik visar:

- Startade och vunna spel, vinstprocent
- Bästa tid och snittid
- Nuvarande och bästa vinstrad
- Vinster utan misstag

**Inställningar:** växlar för alla fält i `Settings`, "Nollställ statistik" (med bekräftelse) och versionsnummer.

**Färger (ungefärliga):**

| Användning     | Färg      |
| -------------- | --------- |
| Bakgrund       | `#17181c` |
| Cell           | `#1f2127` |
| Peer-markering | `#2a2e38` |
| Samma siffra   | `#2c4a80` |
| Vald cell      | `#3b5a99` |
| Given siffra   | `#d6d6d6` |
| Egen siffra    | `#6ea0ff` |
| Fel            | `#ff5c5c` |

---

## 7. PWA

- **Manifest:** `display: standalone`, porträtt, mörk tema- och bakgrundsfärg, ikoner i 192, 512 och maskable 512.
- **Service worker:** precachar all kod, alla ikoner och all pusseldata. Appen fungerar helt offline efter första besöket.
- **Uppdateringar:** en toast visar "Ny version finns – Uppdatera". Spelet sparas först, och appen laddar aldrig om tyst mitt i ett spel.

---

## 8. Test

**Enhetstester (Vitest)**

- Lösare: löser kända pussel och räknar antal lösningar rätt.
- Generator: unik lösning.
- Gradering: kända referenspussel klassas rätt.
- Transformationer: bevarar giltighet och svårighet.
- Bankintegritet: alla pussel i banken är unika, har unik lösning och ligger på rätt nivå.
- Spellogik: misstag och förlust, låsning, ångra, radera, penna och vinst.
- Autokomplettering: startar bara när resten går att lösa med singles, fyller i rätt och räknas som vinst.
- Statistik: vinst, förlust och ge upp; vinstrad; bästa tid och snitt.
- Timer, samt lagring (migrering och korrupt data).

**E2E (Playwright)**

- Smoke: spela klart ett nästan löst testpussel och kontrollera statistiken.
- Paus och omladdning: spelet återupptas med samma tid och bräde.
- Offline: appen laddas och ett nytt spel kan startas utan nätverk.

---

## 9. CI och driftsättning

- `ci.yml` (push och PR): lint → typecheck → vitest → build → Playwright.
- `deploy.yml` (push till `main`): build och publicering till GitHub Pages.
  - Pages-källan måste sättas till "GitHub Actions" i repo-inställningarna.
  - Adress: `https://jo-han-c.github.io/Sudoku/`.

---

## 10. Milstolpar

**Fas 0: Grund**

- Bygg: projektskelett, lint, test, CI och deploy.
- Klart när: en tom sida öppnas på mobilen via Pages-adressen.

**Fas 1: Motor**

- Bygg: lösare, generator, gradering, transformationer och pusselbank för alla fem nivåer.
- Klart när: alla motortester passerar och ett nytt pussel väljs på under 50 ms.

**Fas 2: Spelbar MVP**

- Bygg: spelskärm med hela layouten, inmatning, penna, ångra, radera, misstag, vinst, timer, paus och sparning, samt startskärm med Fortsätt och Nytt spel.
- Klart när:
  - Ett pussel kan spelas klart på Android.
  - Spelet kan stängas och återupptas oförändrat.
  - 3 misstag ger förlust.

**Fas 3: Statistik, Ge upp, Inställningar och autokomplettering**

- Bygg: statistikskärm per nivå och totalt, Ge upp, "Vinstrad N", inställningsskärm och blixtswitchen för autokomplettering.
- Klart när: statistiken stämmer i alla scenarier och inställningarna sparas.

**Fas 4: PWA och offline**

- Bygg: manifest, ikoner, service worker och uppdaterings-toast.
- Klart när:
  - Appen kan installeras på hemskärmen.
  - Den fungerar i flygplansläge.
  - Uppdateringar tappar inte spelet.

**Fas 5: Extra (valfritt)**

- Bygg: vibration, skärmen-på-läge, animationer och kortkommandon.

---

## 11. Förberedelse

- Byt namn på repot till **Sudoku** i GitHub (Settings → General → Repository name). GitHub omdirigerar den gamla adressen, så befintliga kloner fortsätter fungera.
