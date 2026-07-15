# Beitragen zu den Bowhuman Open Standards

Danke für dein Interesse an den Bowhuman Open Standards! Dieses Dokument erklärt, wie Drittentwickler, Parcours-Betreiber und Bogensportverbände Verbesserungsvorschläge einreichen können.

---

## Grundprinzip

Die Bowhuman Open Standards entstehen durch den praktischen Einsatz in produktiven Apps. **bowhuman** bleibt Maintainer und hat das letzte Wort über alle Änderungen. Das ist kein Komitee-Prozess, sondern ein offener, pragmatischer Ansatz: gute Argumente zählen mehr als Stimmenmehrheiten.

---

## Was du einreichen kannst

- **Bug-Reports**: Ein Feld ist falsch beschrieben, ein Beispiel stimmt nicht, ein Type ist falsch.
- **Klarstellungen**: Verhalten in Edge Cases ist unklar oder widersprüchlich.
- **Erweiterungsvorschläge**: Du baust eine App und brauchst ein Feld, das noch nicht existiert.
- **Neue Scoring-Systeme**: Dein Verband nutzt ein anderes Wertungssystem — es soll in BHS-002 aufgenommen werden.
- **Implementierungs-Berichte**: Du hast BHS-001 in deiner App implementiert und möchtest Erfahrungen teilen.

---

## Prozess

### 1. Erst suchen

Bevor du ein Issue öffnest: Durchsuche die offenen und geschlossenen Issues. Dein Punkt ist vielleicht schon diskutiert.

### 2. Issue öffnen

Öffne ein Issue auf Codeberg mit dem passenden Label:

| Label | Verwendung |
|---|---|
| `bug` | Fehler in der Spec (falsches Feld, falsches Beispiel) |
| `clarification` | Unklare Formulierung, Edge Case |
| `bhs-001` | Betrifft Parcours-Format |
| `bhs-002` | Betrifft Session-Format |
| `bhs-003` | Betrifft Venue & Club Metadata |
| `bhs-004` | Betrifft Scoring System Metadata |
| `bhs-005` | Betrifft Equipment Metadata |
| `bhs-006` | Betrifft Tournament Metadata |
| `new-feature` | Vorschlag für neues Feld / neues Dokument |
| `question` | Frage ohne Änderungswunsch |

Ein gutes Issue enthält:
- **Was** du erwartest
- **Was** tatsächlich passiert (oder unklar ist)
- **Kontext**: Welche App, welchen Use Case du hast
- Bei Erweiterungen: Ein konkretes JSON-Beispiel wie das neue Feld aussehen soll

### 3. Für kleine Korrekturen: Pull Request

Tippfehler, kaputte Links, offensichtlich falsche Werte: Du kannst direkt einen PR öffnen, ohne vorher ein Issue zu erstellen.

### 4. Für Spec-Änderungen: Issue zuerst

Für alles was das Schema oder den Standardtext ändert, gilt: **Issue zuerst, PR danach.** So vermeiden wir Arbeit die am Ende nicht gemergt wird.

Ein PR für eine Spec-Änderung sollte immer enthalten:
- Die geänderte `.md`-Datei
- Falls relevant: das aktualisierte JSON Schema in `schemas/`
- Falls relevant: aktualisierte Beispiele in `examples/`
- Changelog-Eintrag am Ende des Dokuments

---

## Versionierung und Breaking Changes

Die Specs folgen [Semantic Versioning](https://semver.org/lang/de/):

- **PATCH** (1.0 → 1.0.1): Klarstellungen, Typo-Fixes, keine Schema-Änderungen
- **MINOR** (1.0 → 1.1): Neue optionale Felder, rückwärtskompatibel
- **MAJOR** (1.0 → 2.0): Breaking Changes — bestehende Dateien werden ungültig

Breaking Changes werden mindestens **3 Monate vorher** angekündigt und in einem separaten BHS-Dokument beschrieben.

---

## Sprache

Issues und PRs können auf **Deutsch oder Englisch** verfasst werden — beides ist willkommen. Die Spec-Texte selbst sind auf Deutsch.

---

## Code of Conduct

Respektvoller Umgang ist Voraussetzung. Konstruktive Kritik ja, persönliche Angriffe nein. Bei Verstößen können Issues geschlossen und Accounts gesperrt werden.

---

## Referenz-Implementierungen testen

Wenn du eine Implementierung gebaut hast und sie gegen die Specs testen möchtest:

```bash
# Alle Beispiele im Repo auf einmal
npm install && npm run validate

# Einzelne eigene Datei
node tools/validate.js deine-datei.json

# Alternativ: ajv-cli direkt
npm install -g ajv-cli
ajv validate -s schemas/parcours-v1.schema.json -d deine-datei.json
```

Ein PR, der ein neues Beispiel unter `examples/` hinzufügt, sollte `npm run validate` fehlerfrei durchlaufen.

---

## Fragen?

Öffne ein Issue mit dem Label `question`. Wir antworten so schnell wir können.
