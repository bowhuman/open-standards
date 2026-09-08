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
| BHS-006 | Tournament Metadata | DRAFT | [specs/BHS-006-tournament-metadata.md](specs/BHS-006-tournament-metadata.md) |
| BHS-007 | Archer Metadata | DRAFT | [specs/BHS-007-archer-metadata.md](specs/BHS-007-archer-metadata.md) |
| BHS-008 | Class System Metadata | DRAFT | [specs/BHS-008-class-system-metadata.md](specs/BHS-008-class-system-metadata.md) |

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

### BHS-003 — Venue & Club Metadata *(Draft)*

Zwei Profile: `bhs-venue` (Parcours-Standort mit Betreiberprofil — Kontakt, Öffnungszeiten, Preise, erlaubte Ausrüstung, Einrichtungen) und `bhs-club` (Bogensportverein — Trainingszeiten, Mitgliedschaft, Verbandszugehörigkeit). Beide eigenständig, optional miteinander verknüpft. Enthält außerdem mehrere wiederverwendbare Typen, auf die spätere Standards aufbauen (`Address`, `GpsPoint`, `EquipmentClass`, `Association`, `LocalizedString` u.a.).

```json
{
  "__type": "bhs-venue",
  "id":     "schaumberg-dk-2026",
  "name":   "DK Bowfactory — Schaumberg",
  "address": { "city": "St. Wendel – Remmesweiler", "country": "DE" },
  "opening_hours": { "saturday": { "open": "09:00", "close": "18:00" } }
}
```

→ [Vollständige Spec](specs/BHS-003-venue-club-metadata.md) · [JSON Schema Venue](schemas/venue-v1.schema.json) · [JSON Schema Club](schemas/club-v1.schema.json)

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

### BHS-006 — Tournament Metadata *(Draft)*

Metadatenformat für Bogenturniere: Name, Termin, Ort/Anfahrt, Zulassung (Bogenklassen, Schützenklassen, Verbandslizenz), Preise, Registrierung und Zeitplan. Referenziert BHS-003 (Venue/Club) und BHS-004 (`scoring_system_id`) statt deren Inhalte zu duplizieren — Wertungsregeln bleiben vollständig in BHS-004. Bewusst kein Live-Kapazitätsfeld (implementierungsspezifisch), stattdessen ein statisches `max_participants`.

```json
{
  "__type": "bhs-tournament",
  "id":     "schaumberg-bogen-open-2026",
  "name":   "Schaumberg Bogen-Open 2026",
  "date":   "2026-09-12"
}
```

→ [Vollständige Spec](specs/BHS-006-tournament-metadata.md) · [JSON Schema](schemas/tournament-v1.schema.json) · [Beispiele](examples/tournaments/)

### BHS-007 — Archer Metadata *(Draft)*

Metadatenformat für Schützen: Identität (Vor-/Nachname), Eligibility-Klassifikation (Bogenklassen, Wettkampfklasse je Disziplin/Verband/Bogenklasse) und ein optionales, portables Sozialprofil (Spitzname, Claim, Bio, Avatar). Bewusst **kein** Vereinsmitgliedschafts-/Rollenmodell — das bleibt BOWHUMAN-intern. Gegenstück zu BHS-006 `Eligibility`: ein Turnier erklärt, was es zulässt, ein Archer erklärt, was er ist.

```json
{
  "__type": "bhs-archer",
  "id":     "9f1c2b3a-4d5e-4f60-8a7b-1c2d3e4f5a6b",
  "first_name": "Erika",
  "last_name":  "Musterfrau",
  "classes": [{ "discipline": "3d", "association": "DSB", "equipment_class": "recurve", "class": "Damen (10)" }]
}
```

→ [Vollständige Spec](specs/BHS-007-archer-metadata.md) · [JSON Schema](schemas/archer-v1.schema.json) · [Beispiele](examples/archers/)

### BHS-008 — Class System Metadata *(Draft)*

Metadatenformat für **Wertungssysteme**: wer wird mit wem gewertet und von welchem Pflock. Nicht zu verwechseln mit BHS-004, das die Punktevergabe regelt — im Deutschen heißen beide „Wertung", sie haben aber verschiedene Gegenstände. Ein Wertungssystem besteht aus Schichten (Wettkampfklasse, Altersgruppe, Pflockgruppe), weil eine einzige Klassenliste Wettkampf und Vereinsverwaltung nicht gleichzeitig richtig abbilden kann: Im DSB-3D gibt es keine Schülerklasse, ein Verein braucht die Gruppe für seine Jugendarbeit trotzdem.

```json
{
  "__type": "bhs-class-system",
  "id": "dsb-3d",
  "name": "DSB · 3D",
  "bogenklassen": [{ "key": "Langbogen", "label": "Langbogen", "peg": "blau" }],
  "schichten": {
    "wertungsklasse": {
      "label": "Wertungsklasse",
      "regeln": [{ "key": "herren", "label": "Herren", "bows": ["*"], "gender": "m", "age_min": 15 }]
    }
  }
}
```

→ [Vollständige Spec](specs/BHS-008-class-system-metadata.md) · [JSON Schema](schemas/class-system-v1.schema.json) · [Beispiele](examples/class-systems/)

---

## Interne Erweiterungen (BHSi)

Neben den öffentlichen `BHS-*`-Standards (oben) gibt es `BHSi-*`-Dokumente in [`internal/`](internal/) — **keine öffentlichen Standards**, sondern additive, Betreiber-spezifische Erweiterungen einzelner BHS-Kernformate, ohne Kompatibilitätsanspruch gegenüber Drittanbietern. Sie dürfen ein BHS-Pflichtfeld nie verändern oder ersetzen; Apps, die nur den öffentlichen Kern kennen, ignorieren BHSi-Felder gefahrlos.

| Nummer | Titel | Status | Erweitert | Dokument |
|---|---|---|---|---|
| BHSi-001 | Operator Animal Catalog & Station Extension | DRAFT | BHS-001 (`Target`) | [internal/BHSi-001-operator-animal-catalog.md](internal/BHSi-001-operator-animal-catalog.md) |

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
