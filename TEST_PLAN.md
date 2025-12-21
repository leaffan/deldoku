# Test-Plan für DEL-Doku

## Übersicht

Dieses Dokument beschreibt die Teststrategie für das DEL-Doku Projekt mit automatisierten Tests und GitHub Actions Integration.

## 1. Test-Framework Setup

### Empfohlener Stack
- **Vitest** - Unit & Integration Tests (schneller als Jest, native ESM-Unterstützung, Vite-Integration)
- **@testing-library/svelte** - Svelte Component Testing
- **Playwright** - E2E Tests (optional, für umfassende Browser-Tests)

### Installation
```bash
pnpm add -D vitest @vitest/ui @testing-library/svelte @testing-library/jest-dom jsdom
```

## 2. Test-Kategorien

### A. Unit Tests (Vitest)

#### 2.1 Data Logic (`src/lib/data.ts`)
- ✅ `generateDailyChallenge()` - Generiert gültige Herausforderungen
- ✅ `validatePlayerMatch()` - Prüft Spieler-Kategorien korrekt
- ✅ `loadPlayers()` - Lädt und cached Spielerdaten
- ✅ Kategorien-Matching für verschiedene Spieler-Attribute

#### 2.2 Stores (`src/lib/stores.ts`)
- ✅ `playersStore` - Initialisierung und Daten-Loading
- ✅ `statsStore` - Spiel-Historie, Punkteberechnung
- ✅ `languageStore` - Sprachwechsel
- ✅ LocalStorage Persistierung

#### 2.3 Utilities
- ✅ `i18n` - Übersetzungen und Sprachzuordnung
- ✅ Punkteberechnung (100 Punkte pro Zelle, Bonus-System)

### B. Component Tests (@testing-library/svelte)

#### 2.4 GameCell.svelte
- ✅ Rendering von leer/gefüllt Zuständen
- ✅ Click-Handler für Zellauswahl
- ✅ Korrekt/Inkorrekt Styling
- ✅ Tooltip mit Kategorien

#### 2.5 PlayerSearch.svelte
- ✅ Spieler-Suche und Filterung
- ✅ Autocomplete-Funktionalität
- ✅ Spielerauswahl-Event
- ✅ "Bereits verwendet" Markierung

#### 2.6 GameBoard.svelte
- ✅ Grid-Rendering mit Kategorien
- ✅ Spielerauswahl und Validierung
- ✅ Punkteberechnung
- ✅ Spiel-Beendigungs-Logik
- ✅ Stats-Synchronisierung

#### 2.7 Stats.svelte
- ✅ Statistik-Anzeige
- ✅ Spiel-Historie
- ✅ Tortendiagramm (Tag/Nacht)

### C. Integration Tests

#### 2.8 Full Game Flow
- ✅ Spiel starten → Spieler auswählen → Validierung → Punktevergabe → Spiel beenden
- ✅ Stats werden korrekt aktualisiert
- ✅ LocalStorage-Persistierung funktioniert
- ✅ Challenge-Wechsel bei neuem Tag

### D. E2E Tests (Optional - Playwright)

#### 2.9 Browser Tests
- ✅ Vollständiger Spieldurchlauf im Browser
- ✅ Multi-Browser Testing (Chrome, Firefox, Safari)
- ✅ Mobile Viewport Testing
- ✅ API-Integration mit stats.php/stats.py

## 3. Test-Konfiguration

### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**'
      ]
    }
  }
});
```

### package.json Scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## 4. Beispiel Test-Struktur

```
src/
  lib/
    data.ts
    data.test.ts           # Unit tests für data.ts
    stores.ts
    stores.test.ts         # Unit tests für stores.ts
    components/
      GameBoard.svelte
      GameBoard.test.ts    # Component tests
      GameCell.svelte
      GameCell.test.ts
  routes/
    +page.test.ts          # Integration tests
  tests/
    setup.ts               # Test setup (mocks, etc.)
    integration/
      game-flow.test.ts    # Full game flow tests
```

## 5. GitHub Actions Workflow

### .github/workflows/test.yml
```yaml
name: Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run tests
        run: pnpm test:run
      
      - name: Generate coverage
        run: pnpm test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
          name: codecov-umbrella
```

## 6. Prioritäten für Implementation

### Phase 1: Grundlagen (1-2h)
1. Vitest + Testing Library installieren
2. Test-Setup Datei erstellen
3. Erste Unit Tests für `data.ts` schreiben (validatePlayerMatch, generateDailyChallenge)

### Phase 2: Core Logic (2-3h)
4. Store Tests (playersStore, statsStore)
5. Component Tests (GameCell, PlayerSearch)
6. Punkteberechnung Tests

### Phase 3: Integration (2-3h)
7. GameBoard Component Tests
8. Full Game Flow Integration Tests
9. GitHub Actions Workflow einrichten

### Phase 4: Optional (2-4h)
10. Playwright E2E Tests
11. Visual Regression Tests
12. Performance Tests

## 7. Besondere Test-Szenarien

### Mock Data
- Spieler-Daten mocken (nicht echte API aufrufen)
- Challenge-Daten für deterministische Tests
- LocalStorage Mocks

### Edge Cases
- Leere Spieler-Liste
- Ungültige Kategorien-Kombinationen
- Network Errors bei Stats-API
- Zeitzone-Probleme bei Daily Challenge

### Accessibility
- Keyboard Navigation
- Screen Reader Support
- Focus Management

## 8. Code Coverage Ziele

- **Gesamt**: >80%
- **Business Logic** (data.ts, stores.ts): >90%
- **Components**: >75%
- **Routes**: >70%

## 9. Nächste Schritte

1. ✅ Test-Plan Review
2. ⏳ Dependencies installieren
3. ⏳ Setup Files erstellen
4. ⏳ Erste Tests implementieren
5. ⏳ GitHub Workflow aktivieren
6. ⏳ Coverage Badge im README hinzufügen
