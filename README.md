# Sudoku

Sudoku utan reklam, som webbapp (PWA) för mobilen.

Spela: https://jo-han-c.github.io/Sudoku/

## Installera på mobilen

- **Android (Chrome):** öppna adressen, tryck på menyn ⋮ och välj **Installera app** (eller **Lägg till på startskärmen**).
- **iPhone (Safari):** öppna adressen, tryck på dela-knappen och välj **Lägg till på hemskärmen**.

Efter första besöket fungerar appen helt utan internet. När en ny version finns visas en ruta med **Uppdatera**; spelet sparas innan appen laddas om.

## Utveckling

```sh
npm install
npm run dev        # utvecklingsserver
npm test           # enhetstester
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run build      # produktionsbygge till dist/
npm run e2e        # webbläsartester mot bygget (kräver npm run build först)
npm run generate-bank  # bygg om pusselbanken i src/data/
```

Planen finns i [docs/PLAN.md](docs/PLAN.md).
