# Bowhuman Open Standards

Offene Datenformate für den 3D-Bogensport — entwickelt und gepflegt von [bowhuman](https://www.bowhuman.eu).

---

## Was ist das hier?

Dieses Repository enthält die Spezifikationen für die JSON-Formate, die bowhuman in seinen Apps verwendet. Sie sind **offen veröffentlicht**, damit Drittentwickler kompatible Apps und Tools bauen können, ohne proprietäre Formate zu erraten.

bowhuman bleibt Maintainer dieser Standards und Referenz-Implementierung. Die Spezifikationen beschreiben das, was tatsächlich in Produktion läuft — kein Papier-Standard, sondern gelebte Praxis.

---

## Standards

| Nummer | Titel | Status | Dokument |
|---|---|---|---|
| BHS-001 | Parcours Exchange Format | STABLE | [specs/BHS-001-parcours-format.md](specs/BHS-001-parcours-format.md) |
| BHS-002 | Session Export Format | DRAFT | [specs/BHS-002-session-format.md](specs/BHS-002-session-format.md) |
| BHS-003 | Venue & Club Metadata | DRAFT | [specs/BHS-003-venue-club-metadata.md](specs/BHS-003-venue-club-metadata.md) |

**BHS** = Bowhuman Standard

---

## Kurzübersicht

### BHS-001 — Parcours Exchange Format

Das kanonische Format zum Austausch von 3D-Parcours-Daten zwischen Apps. Eine Parcours-Datei enthält Ziele mit Tieren, Distanzen, Neigungswinkeln, GPS-Koordinaten und optionalen Pflock-Konfigurationen.

```json
{
  "__type":    "littlejohn-parcours",
  "__version": 1,
  "name":      "Schaumberg D.K.",
  "location":  "Tholey, Saarland",
  "targets": [
    {
      "number":     1,
      "animal":     "Wildschwein",
      "category":   "large",
      "distance_m": 22,
      "angle_deg":  -5
    }
  ]
}
```

→ [Vollständige Spec](specs/BHS-001-parcours-format.md) · [JSON Schema](schemas/parcours-v1.schema.json) · [Beispiele](examples/)

### BHS-002 — Session Export Format *(Draft)*

Das Format für exportierte Scoring-Sessions aus Robin. Enthält Schützendaten, Parcours-Snapshot, alle Schüsse mit Wertungszonen und Wetterdaten.

→ [Vollständige Spec](specs/BHS-002-session-format.md)

---

## Validierung

Parcours-Dateien können mit dem bereitgestellten JSON Schema validiert werden:

```bash
# ajv-cli (Node.js)
npm install -g ajv-cli
ajv validate -s schemas/parcours-v1.schema.json -d meine-parcours-datei.json
```

---

## Referenz-Implementierungen

| App | Rolle | Plattform |
|---|---|---|
| [LittleJohn](https://codeberg.org/bowhuman/littlejohn) | Erzeugt BHS-001 (Parcours-Mapping) | PWA + iOS/Android |
| [Robin](https://codeberg.org/bowhuman/robin) | Liest BHS-001, erzeugt BHS-002 (Scoring) | PWA + iOS/Android |
| [Marian](https://codeberg.org/bowhuman/marian) | Liest BHS-001 + BHS-002 (Analyse) | PWA + Desktop |

---

## Beitragen

Fehler gefunden? Feld das fehlt? Issue öffnen — wir freuen uns über Rückmeldungen aus der Praxis.

→ [CONTRIBUTING.md](CONTRIBUTING.md)

---

## Lizenz

Die Spezifikationen in diesem Repository stehen unter der [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/) Lizenz.

Du kannst sie frei verwenden, teilen und anpassen — auch kommerziell — solange du bowhuman als Quelle nennst.

---

## Kontext

bowhuman ist ein Ökosystem für den 3D-Bogensport: Mapping, Scoring, Parcours-Verwaltung und Analyse. Die Formate in diesem Repository wachsen aus dem täglichen Einsatz auf echten Parcours — angefangen auf dem Schaumberg im Saarland.

[www.bowhuman.eu](https://www.bowhuman.eu)
