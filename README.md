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
| BHS-004 | Scoring System Metadata | DRAFT | [specs/BHS-004-scoring-system-metadata.md](specs/BHS-004-scoring-system-metadata.md) |
| BHS-005 | Equipment Metadata | DRAFT | [specs/BHS-005-equipment-metadata.md](specs/BHS-005-equipment-metadata.md) |

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

### BHS-004 — Scoring System Metadata *(Draft)*

Metadatenformat für Wertungssysteme im 3D- und Feldbogensport: Zonen, Pfeil-Matrix, Quellenangabe. Löst die in BHS-002 offene Frage nach einer vollständigen `systemId`-Liste. Enthält eine wachsende Registry recherchierter Systeme (DFBV, IFAA, ASA, IBO, WA) in [`examples/scoring-systems/`](examples/scoring-systems/).

```json
{
  "__type":  "bhs-scoring-system",
  "id":      "dfbv-3pfeil-2024",
  "zones":   [{ "key": "kill" }, { "key": "vital" }, { "key": "wound" }],
  "matrix":  { "1": { "kill": 20, "vital": 18, "wound": 16 } }
}
```

→ [Vollständige Spec](specs/BHS-004-scoring-system-metadata.md) · [JSON Schema](schemas/scoring-system-v1.schema.json) · [Beispiele](examples/scoring-systems/)

### BHS-005 — Equipment Metadata *(Draft)*

Metadatenformat für Bogen, Pfeil und Bogen+Pfeil-Sets: `bhs-bow`, `bhs-arrow`, `bhs-equipment-set`. Bildet 1:1 die aktiven Sherwood-Tabellen ab (`equipment_bows`, `equipment_arrows`, `equipment_sets`). Dokumentiert außerdem eine Diskrepanz zwischen drei unterschiedlichen Bogentyp-Vokabularen im Ökosystem (Equipment-Tabelle, Altersklassen-Logik, BHS-003 `EquipmentClass`).

```json
{
  "__type":   "bhs-bow",
  "id":       "3f9a1b3e-2b7a-4c9e-9b0e-7a6c9d4e2f10",
  "label":    "Hoyt Formula XI Turnier",
  "bow_type": "Recurve",
  "draw_weight_lbs": 38
}
```

→ [Vollständige Spec](specs/BHS-005-equipment-metadata.md) · [JSON Schemas](schemas/bow-v1.schema.json) · [Beispiele](examples/equipment/)

---

## Validierung

### Im Browser

[bowhuman.eu/standards/validator.html](https://www.bowhuman.eu/standards/validator.html) — JSON einfügen oder Datei hochladen, läuft vollständig clientseitig (nichts wird hochgeladen). Praktisch für einen schnellen Check ohne Node/npm. Für verbindliche Validierung (CI, PRs) gilt weiterhin `npm run validate` unten, da der Browser-Validator ein handgeschriebenes Draft-07-Subset nutzt statt ajv.

### Alle Beispiele auf einmal (empfohlen)

```bash
npm install
npm run validate
```

Prüft rekursiv alle Dateien unter `examples/` gegen das zu ihrem `__type` passende Schema (`tools/validate.js`). Dateien mit einem `__type`, für den es noch kein Schema gibt (aktuell: `hawkeye-session`, siehe BHS-002 §10), werden übersprungen statt als Fehler gezählt.

Einzelne Datei prüfen:

```bash
node tools/validate.js pfad/zu/meiner-datei.json
```

### Einzelne Datei mit ajv-cli

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
