# BHS-004: Scoring System Metadata

| Feld | Wert |
|---|---|
| Nummer | BHS-004 |
| Titel | Scoring System Metadata |
| Status | **DRAFT** |
| Version | 0.9 |
| Datum | 2026-07-08 |
| Autor | bowhuman (Robin-Team) |
| Abhängig von | BHS-002 (Session Export Format) |
| Löst | BHS-002 §5.2 (offene `systemId`-Frage) |

> **DRAFT**: Dieses Dokument ist ein Erstvorschlag zur Diskussion. Es entstand aus einer Recherche existierender Wertungssysteme im 3D-Bogensport (siehe §7) und dem Abgleich mit der tatsächlich in Robin implementierten Scoring-Engine (`robin/js/scoring.js`). Es ist **noch nicht** implementiert.

---

## Kurzfassung

Dieses Dokument definiert ein Metadatenformat für **Wertungssysteme** (`bhs-scoring-system`) im 3D- und Feldbogensport. Ein Wertungssystem beschreibt, wie aus einem Treffer (Zone) und einer Pfeilnummer ein Punktwert wird — unabhängig von der App, die diese Regel anwendet.

BHS-002 (Session Export Format) verweist bereits auf ein `systemId`-Feld (z.B. `"IFAA_3"`), hat aber nie definiert, was die vollständige Liste gültiger IDs ist und wo ihre Punktetabellen herkommen (§5.2, offener Punkt). BHS-004 schließt diese Lücke: Es macht Wertungssysteme zu eigenständigen, zitierfähigen, versionierten Datenobjekten statt zu hartcodierten Konstanten in einer App.

**Warum das nötig ist — der zentrale Befund der Recherche:**

Es gibt **keinen** existierenden offenen Metadatenstandard für Bogensport-Wertungssysteme (weder als JSON Schema noch sonst). Jeder Verband (IFAA, DFBV, ASA, IBO, World Archery) veröffentlicht seine Punktetabellen nur als Fließtext in PDF-Reglements. Digitale Scoring-Apps (3D Score Buddy, 3D Skill Board, Schiesszettel) bilden diese Systeme intern nach, aber jede mit eigenem, undokumentiertem internen Format.

Das führt in der Praxis zu **Namenskollisionen**: Gleiche Bezeichnung, unterschiedliche Zahlen — oder umgekehrt. Konkreter Beleg aus dieser Recherche: Robins aktuelle `IFAA_3`-Konstante (`kill: 20/14/8`, `wound: 16/10/4`) entspricht **nicht** der IFAA/DFBV-Standardwertung (`vital: 20/16/12`, `wound: 18/14/10`, zzgl. eigener Kill-Zone), sondern der sogenannten **Skandinavischen Wertung** — einem anderen, eigenständigen System (siehe §6.1 und §8). Das ist keine böswillige Verwechslung, sondern genau das Symptom, das ein offener Metadatenstandard mit Pflicht-Quellenangabe verhindern soll.

---

## 1. Geltungsbereich

BHS-004 beschreibt **ausschließlich**, wie ein Treffer in einen Punktwert übersetzt wird:

- Zonen eines Ziels (z.B. Kill / Vital / Wound, oder 11/10/8/5)
- Anzahl Pfeile pro Ziel und ob/wie sich der Punktwert mit der Pfeilnummer ändert
- Ob alle Pfeile gewertet werden oder das Schießen nach einem Treffer endet
- Rundensummen und Sonderregeln (Doppelwertung, Fehlschuss-Regeln)

**Nicht** Teil von BHS-004:

| Was | Stattdessen |
|---|---|
| Zielgröße, Distanz, Neigungswinkel | BHS-001 (`Target.category`, `distance_m`, `angle_deg`) |
| Pflock-Farben / Mehrfachauspflockung | BHS-001 (`Target.flocks[]`) |
| Physische Ringgeometrie auf der Scheibe (cm-Maße) | Außerhalb des Scopes — eigenes zukünftiges Dokument möglich |
| Welches System eine Session nutzt | BHS-002 (`Session.systemId`, referenziert BHS-004) |

---

## 2. Kernmodell

Die zentrale Erkenntnis aus dem Vergleich aller recherchierten Systeme (§7): Jedes Wertungssystem lässt sich auf eine **Matrix aus Zone × Pfeilposition → Punktwert** reduzieren — unabhängig davon, ob die Pfeilposition einen physischen Pflockwechsel bedeutet (Walk-up-Hunter-Runde) oder einen wiederholten Schuss vom selben Pflock (IFAA-Runde). Aus Wertungssicht ist das identisch.

### 2.1 Wurzelobjekt

```typescript
interface ScoringSystem {
  __type:    "bhs-scoring-system";
  __version: 1;

  id:           string;     // stabiler Slug, z.B. "dfbv-3pfeil-2024"
  name:         string;     // Anzeigename, z.B. "DFBV Drei-Pfeil-Runde"
  short_name:   string | null;

  organization: Organization;
  region:       string[];    // ISO 3166-1 alpha-2 oder "INT"
  aliases:      Alias[];     // bekannte Namenskollisionen / Fremdbezeichnungen

  discipline:   "3d" | "field" | "hunter" | "indoor";
  distance_mode: "known" | "unknown" | "both";  // bekannte vs. unbekannte Distanzen

  zones:            Zone[];             // von höchstwertig zu niedrigstwertig
  arrows_per_target: number;            // max. Pfeile pro Ziel
  arrow_rule:       ArrowRule;
  matrix:           ScoreMatrix;        // Pfeilposition × Zone → Punkte
  miss_score:       number;             // i.d.R. 0

  max_score_per_target: number;         // abgeleitet, zur Validierung
  tie_break:            TieBreakRule[] | null;

  status:  "official" | "regional-variant" | "club-variant" | "legacy" | "proposed";
  source:  Source;
  notes:   string | null;               // Freitext, z.B. Abgrenzung zu ähnlichen Systemen

  effective_from: string | null;        // ISO-8601 Datum, Regelwerksstand
  superseded_by:  string | null;        // id eines Nachfolgesystems

  created_at: string;
  updated_at: string;
}
```

### 2.2 Zone

```typescript
interface Zone {
  key:   string;                // stabiler Bezeichner, z.B. "kill", "vital", "wound", "k11"
  label: LocalizedString;       // z.B. { "de": "Kill", "en": "Kill" } — siehe BHS-003 §3.14
  color: string | null;         // Freitext/Hex, falls die Zone farblich markiert ist
}
```

`zones[]` ist absichtlich **nicht** auf `kill`/`wound`/`miss` fixiert (das war die BHS-002-v0.9-Annahme). Systeme mit zwei Zonen (Skandinavisch), drei Zonen (DFBV Drei-Pfeil-Runde: Kill/Vital/Wound) und vier Zonen (WA-3D/IBO-Stil: 11/10/8/5) werden gleich behandelt.

**i18n-Entscheidung (2026-07-08):** `label_de`/`label_en` wurden durch das generische `LocalizedString`-Objekt aus BHS-003 §3.14 ersetzt (dort auch die Begründung). Bestehende Registry-Beispiele wurden entsprechend migriert.

### 2.3 ArrowRule

```typescript
type ArrowRule =
  | "first_hit_stops"        // Schießen endet beim ersten Treffer (klassische Hunter-Runde)
  | "fixed_count_all_scored" // alle Pfeile werden geschossen und summiert (Doppelhunter)
  | "best_of";                // alle Pfeile werden geschossen, nur bester zählt
```

### 2.4 ScoreMatrix

```typescript
// Äußerer Index: Pfeilposition (1-basiert). Innerer Index: Zone.key.
type ScoreMatrix = Record<number, Record<string, number>>;
```

Beispiel für eine 3-Pfeil-Runde mit drei Zonen (siehe §6.2 für das vollständige Objekt):

```json
{
  "1": { "kill": 20, "vital": 18, "wound": 16 },
  "2": { "kill": 14, "vital": 12, "wound": 10 },
  "3": { "kill": 8,  "vital": 6,  "wound": 4  }
}
```

Für `arrow_rule: "fixed_count_all_scored"` (Doppelhunter) ist die Matrix pro Pfeilposition identisch, da kein Punktabfall zwischen den Pfeilen stattfindet — trotzdem wird sie explizit für beide Positionen angegeben, damit Konsumenten nicht raten müssen.

### 2.5 Alias

```typescript
interface Alias {
  name:   string;         // z.B. "IFAA_3" (Robins interne Legacy-ID)
  source: string | null;  // wo dieser Alias herkommt, z.B. "robin@<2026-07-08"
  note:   string | null;  // z.B. Warnhinweis bei Fehlbenennung
}
```

Aliase sind der Mechanismus, um die in §8 dokumentierte Verwechslung nachvollziehbar zu machen: Statt eine falsche Bezeichnung stillschweigend zu korrigieren, wird sie als Alias mit Warnhinweis erfasst.

### 2.6 Organization

```typescript
type Organization =
  | "IFAA"    // International Field Archery Association
  | "DFBV"    // Deutscher Feldbogen Sportverband
  | "ASA"     // Archery Shooters Association (US)
  | "IBO"     // International Bowhunting Organization (US)
  | "WA"      // World Archery
  | "regional"
  | "club"
  | "bowhuman" // von bowhuman definiert, kein externer Verband
  | string;
```

### 2.7 Source

```typescript
interface Source {
  document: string;        // Titel des Regelwerks
  url:      string | null;
  version:  string | null; // z.B. "Januar 2024"
  retrieved_at: string;    // ISO-8601, wann die Zahlen recherchiert wurden
  confidence: "verified" | "secondary" | "unverified";
  // "verified"   = aus offiziellem Regelwerk/PDF direkt entnommen
  // "secondary"  = aus Fachartikel/App-Doku ohne Primärquelle
  // "unverified" = aus Community-Wiki / Forum, nicht querverifiziert
}
```

Die `confidence`-Einstufung ist bewusst Teil des Schemas: Diese Recherche selbst zeigt, dass Sekundärquellen sich widersprechen (siehe §8). Konsumenten sollen sehen können, wie belastbar eine Punktetabelle ist, statt sie blind zu übernehmen.

### 2.8 TieBreakRule

```typescript
interface TieBreakRule {
  criterion: "most_kills" | "most_vitals" | "closest_arrow" | "shoot_off" | string;
  order:     number;  // 1 = zuerst angewendet
  note:      string | null;
}
```

**Scoping-Klarstellung (2026-07-08):** `ScoringSystem.tie_break` bildet ausschließlich das **Standardverfahren des jeweiligen Verbands für seine eigenen offiziellen Wettkämpfe** ab (z.B. World Archerys Stechen-Regeln aus Book 4, Art. 22.3.2.1, oder DFBVs "meiste Kills"). Es ist **nicht bindend** für andere Turniere, die dasselbe Wertungssystem verwenden — ein Vereinsturnier mit der DFBV-Drei-Pfeil-Runde kann ein eigenes, abweichendes Stechen-Verfahren festlegen, ohne dass das ein Verstoß gegen dieses System wäre. Konzeptionell gehört Tie-Break eigentlich zur Turnierebene (mehrere Athleten, ein Wettkampfformat), nicht zur Zone×Pfeilposition-Übersetzung, die den Kern von BHS-004 ausmacht (§1). Das Feld bleibt hier aus pragmatischen Gründen erhalten, weil es bereits mit echten, quellenbelegten Daten befüllt ist (siehe `dfbv-3pfeil-2024.json`, `wa-3d.json`) — bei einem künftigen Tournament-Format-Dokument (Arbeitstitel BHS-006) sollte es fachlich dorthin wandern, mit Verweis von hier aus (analog zum `GpsPoint`-Muster zwischen BHS-001 und BHS-003).

---

## 3. Vollständiges Beispiel: DFBV Drei-Pfeil-Runde (2024)

```json
{
  "__type":    "bhs-scoring-system",
  "__version": 1,
  "id":         "dfbv-3pfeil-2024",
  "name":       "Drei-Pfeil-Runde, unbekannte Entfernungen",
  "short_name": "DFBV 3-Pfeil",
  "organization": "DFBV",
  "region":       ["DE"],
  "aliases": [
    { "name": "IFAA_3", "source": "robin@2026-07-07 (js/scoring.js)", "note": "Robin-interne ID nutzt aktuell abweichende Zahlen — siehe §8 dieses Standards." }
  ],
  "discipline":     "3d",
  "distance_mode":  "unknown",
  "zones": [
    { "key": "kill",  "label": { "de": "Kill",  "en": "Kill"  }, "color": null },
    { "key": "vital", "label": { "de": "Vital", "en": "Vital" }, "color": null },
    { "key": "wound", "label": { "de": "Wund",  "en": "Wound" }, "color": null }
  ],
  "arrows_per_target": 3,
  "arrow_rule": "first_hit_stops",
  "matrix": {
    "1": { "kill": 20, "vital": 18, "wound": 16 },
    "2": { "kill": 14, "vital": 12, "wound": 10 },
    "3": { "kill": 8,  "vital": 6,  "wound": 4  }
  },
  "miss_score": 0,
  "max_score_per_target": 20,
  "tie_break": [
    { "criterion": "most_kills", "order": 1, "note": null }
  ],
  "status": "official",
  "source": {
    "document":     "Sportordnung (SpO) DFBV, Fassung Januar 2024, Art. 6.7.8.3",
    "url":          "https://www.dfbv.de/wp-content/uploads/2024/01/DFBV_SpO_2024.pdf",
    "version":      "Januar 2024",
    "retrieved_at": "2026-07-08T00:00:00.000Z",
    "confidence":   "verified"
  },
  "notes": "Direkt aus dem PDF-Regelwerk entnommene Tabelle (Art. 6.7.8.3). Drei Zonen, nicht zwei — Unterschied zur oft zitierten vereinfachten 'IFAA-Tabelle' mit nur Vital/Wound.",
  "effective_from": "2024-01-01",
  "superseded_by": null,
  "created_at": "2026-07-08T00:00:00.000Z",
  "updated_at": "2026-07-08T00:00:00.000Z"
}
```

---

## 4. Weiteres Beispiel: DFBV Doppelhunter-Runde (2024)

Zeigt `arrow_rule: "fixed_count_all_scored"` — beide Pfeile zählen, keine Abwertung nach Pfeilnummer.

```json
{
  "__type":    "bhs-scoring-system",
  "__version": 1,
  "id":         "dfbv-doppelhunter-2024",
  "name":       "Doppelhunter-Runde, unbekannte Entfernungen",
  "short_name": "DFBV Doppelhunter",
  "organization": "DFBV",
  "region":       ["DE"],
  "aliases": [],
  "discipline":     "3d",
  "distance_mode":  "unknown",
  "zones": [
    { "key": "kill",  "label": { "de": "Kill",  "en": "Kill"  }, "color": null },
    { "key": "vital", "label": { "de": "Vital", "en": "Vital" }, "color": null },
    { "key": "wound", "label": { "de": "Wund",  "en": "Wound" }, "color": null }
  ],
  "arrows_per_target": 2,
  "arrow_rule": "fixed_count_all_scored",
  "matrix": {
    "1": { "kill": 10, "vital": 8, "wound": 5 },
    "2": { "kill": 10, "vital": 8, "wound": 5 }
  },
  "miss_score": 0,
  "max_score_per_target": 20,
  "tie_break": null,
  "status": "official",
  "source": {
    "document":     "Sportordnung (SpO) DFBV, Fassung Januar 2024, Art. 6.7.10.5",
    "url":          "https://www.dfbv.de/wp-content/uploads/2024/01/DFBV_SpO_2024.pdf",
    "version":      "Januar 2024",
    "retrieved_at": "2026-07-08T00:00:00.000Z",
    "confidence":   "verified"
  },
  "notes": "Zwei Abschusspflöcke pro Ziel, beide Pfeile werden geschossen und addiert (Art. 6.7.10.3). Pflock-Zuordnung ist Sache von BHS-001 (Target.flocks), nicht dieses Dokuments.",
  "effective_from": "2024-01-01",
  "superseded_by": null,
  "created_at": "2026-07-08T00:00:00.000Z",
  "updated_at": "2026-07-08T00:00:00.000Z"
}
```

---

## 5. Registry-Konzept

Statt Wertungssysteme in jeder App hart zu kodieren, schlägt BHS-004 eine **offene Registry** vor: eine Sammlung von `bhs-scoring-system`-Dateien in [`examples/scoring-systems/`](../examples/scoring-systems/) dieses Repositories, jede validierbar gegen [`schemas/scoring-system-v1.schema.json`](../schemas/scoring-system-v1.schema.json).

Apps können:

1. Die Registry zur Build-Zeit einbinden (wie Robin es heute mit `SYSTEMS` in `scoring.js` tut, nur datengetrieben statt hartkodiert).
2. Zur Laufzeit von einem Community-Server nachladen (analog zu BHS-003 Venue/Club-Daten).
3. Eigene Vereins-/Regionalvarianten als `status: "club-variant"` beisteuern, ohne die offiziellen Einträge zu verändern.

### 5.1 Dateinamenskonvention

```
bhs-scoring-system-<id>.json
```

Beispiel: `bhs-scoring-system-dfbv-3pfeil-2024.json`

---

## 6. Bezug zu BHS-002

### 6.1 Migration von `Session.systemId`

BHS-002 §5.2 listet `systemId`-Werte (`"IFAA_1"`, `"IFAA_3"`, `"ASA"`) ohne Herkunftsnachweis. Ab BHS-004 gilt:

- `Session.systemId` referenziert `ScoringSystem.id` aus der Registry (§5).
- Legacy-Werte aus produktiven Robin-Exports (`"IFAA_3"`, `"IFAA_1"`, `"WA_3D"`) bleiben als **Aliase** (§2.5) auf den jeweils passenden `bhs-scoring-system`-Eintrag erhalten — Bestandsdaten müssen nicht migriert werden, nur die Interpretation beim Lesen wird eindeutig.
- `Shot.zone` (BHS-002 §5.1) wird von einem festen Enum (`"kill" | "wound" | "miss" | ...`) auf `Zone.key` des referenzierten Systems umgestellt. Für Rückwärtskompatibilität bleibt die bisherige Enum-Liste ein Spezialfall mit genau den Zonen `kill`/`wound`/`miss`.

### 6.2 Offene Frage aus BHS-002 §5.2 — Status

| BHS-002 offene Frage | Antwort durch BHS-004 |
|---|---|
| Vollständige `systemId`-Liste | §5 Registry-Konzept, wächst über PRs |
| Exakte Punktetabellen | §2.4 Matrix je System, mit Quellenachweis (§2.7) |
| Herkunft der Zahlen | Pflichtfeld `source` — keine Zahl ohne Referenz |

---

## 7. Recherche: Existierende Wertungssysteme (Überblick)

Diese Tabelle fasst die während der Recherche gefundenen Systeme zusammen. Sie ist **kein** Ersatz für die maschinenlesbaren Einträge in §5, sondern die menschenlesbare Zusammenfassung, aus der die ersten Registry-Einträge abgeleitet wurden.

| System | Verband | Zonen | Pfeile/Ziel | Punkte (Pfeil 1 / 2 / 3) | Quelle | Konfidenz |
|---|---|---|---|---|---|---|
| Drei-Pfeil-Runde | DFBV | Kill/Vital/Wound | 3 | 20/18/16 · 14/12/10 · 8/6/4 | [DFBV SpO 2024, Art. 6.7.8](https://www.dfbv.de/wp-content/uploads/2024/01/DFBV_SpO_2024.pdf) | verified |
| Doppelhunter-Runde | DFBV | Kill/Vital/Wound | 2 (beide gewertet) | 10/8/5 · 10/8/5 | [DFBV SpO 2024, Art. 6.7.10](https://www.dfbv.de/wp-content/uploads/2024/01/DFBV_SpO_2024.pdf) | verified |
| Hunter-/Ein-Pfeil-Runde | DFBV | Kill/Wund/Körper | 1 | 20/16/10 | Grafik-Tabelle im PDF von Peter Klein übermittelt: [DFBV SpO 2022, Art. 6.7.9.4](https://www.dfbv.de/wp-content/uploads/2022/07/DFBV-Sportordnung-2022-01.pdf) | secondary — deckt sich mit Community-Katalog (Variante J) |
| Hunter-Runde (Community, nicht-DFBV-spezifisch) | — | Kill/Körper | 1 | 20/10 | [BEARS-Club — Turnierformen](https://bears-club.de/turnierformen/) | unverified — abweichende Zonenzahl, nicht übernommen |
| Hunterwertung, diverse Varianten (Katalog, keinem Verband zugeordnet) | — | Spot/Kill/Körper | 1–3 | u.a. "20/16" (2 Zonen) oder "20/16/10" (3 Zonen, "Variante J" — deckt sich mit der DFBV-Zahl oben), siehe Quelle für vollständige Variantenliste A–K | [BogensportBlog — Wertungs-Varianten](https://bogensportblog.de/wertungs-varianten-beim-3d-bogenschiessen/) | unverified — Katalog ohne Verbandszuordnung, aber Corroboration |
| IFAA Animal Round | IFAA | Vital/Non-Vital | 3 | 20/16/12 · 18/14/10 | [Northern Virginia Archers – Animal Round](https://norva.club/home/field-hunter-and-animal-rounds-abbreviated/) | secondary |
| Skandinavische Wertung | — (Community-Konvention) | Kill/Körper | 3 | 20/16 · 14/10 · 8/4 | [bogensportwiki.info](http://www.bogensportwiki.info/index.php?title=Skandinavische_Wertung) | secondary |
| ASA Pro/Am | ASA (US) | 12(×2)/10/8/5 | 1 (+ Shoot-off-Sonderfall) | 12 · 10 · 8 · 5 · 0 | [Elevation Equipped – ASA Scoring](https://elevationequipped.com/how-asa-3d-archery-scoring-works/) | secondary |
| IBO | IBO (US) | 11/10/8/5 | 1 | 11 · 10 · 8 · 5 · 0 | [IBO 3-D Shoot Rules (abbreviated) — NORVA](https://norva.club/home/ibo-3-d-shoot-rules-abbreviated/) | secondary |
| WA 3D | World Archery | 11/10/8/5 | 2 (beide gewertet, gleiche Wertigkeit unabhängig der Reihenfolge) | 11 · 10 · 8 · 5 | [World Archery Rulebook, Book 2 – Events, Version 2026-01-27, Art. 8.2.2.1](https://extranet.worldarchery.sport/documents/index.php/Rules/Rule_Book_versions/2026-01-27/EN-Book_2_-_2026-01-27_Version.pdf) | verified |

**Wichtiger Befund:** Die IFAA-Animal-Round-Tabelle (20/16/12 Vital, 18/14/10 Non-Vital, **zwei** Zonen) und die DFBV-Drei-Pfeil-Runde (20/18/16, 14/12/10, 8/6/4, **drei** Zonen) werden umgangssprachlich oft synonym als "IFAA-Wertung" bezeichnet, sind aber unterschiedliche Systeme mit unterschiedlicher Zonenzahl. Das bestätigt den in §8 beschriebenen Bedarf an expliziten `aliases` und `source`-Angaben statt impliziter Namenskonventionen.

---

## 8. Diskrepanz-Analyse: Robin `js/scoring.js` vs. recherchierte Standards

Beim Schreiben dieses Standards wurde die aktuell produktive Scoring-Engine in `robin/js/scoring.js` mit den recherchierten Originalquellen abgeglichen. Ergebnis:

| Robin-`systemId` | Robin-Werte (Kill / Wound, Pfeil 1-3) | Entspricht welchem recherchierten System | Abweichung |
|---|---|---|---|
| `IFAA_3` | 20/16 · 14/10 · 8/4 | **Skandinavische Wertung** (bogensportwiki.info) — nicht DFBV/IFAA | Robin nennt es "IFAA Hunter · 3 Pfeil", tatsächlich fehlt die dritte Zone (Vital) der echten DFBV-Drei-Pfeil-Runde (20/18/16 · 14/12/10 · 8/6/4) |
| `IFAA_1` | 20/16 (1 Pfeil) | Ähnlich IFAA Animal Round (Pfeil 1: 20/16), aber Rundenkontext unklar | Keine Quellenangabe im Code |
| `WA_3D` | 10/8 · 8/5 (2 Pfeile) | Entspricht **keinem** der recherchierten Systeme direkt (WA 3D nutzt vier Zonen: 11/10/8/5) | Zonenanzahl weicht ab; Bezeichnung "WA 3D" ist irreführend |

Dies ist **keine Aufforderung**, den produktiven Code sofort zu ändern — Bestandsdaten in bereits exportierten BHS-002-Sessions bleiben mit den bisherigen Werten gültig. Es ist der konkrete Beleg, warum BHS-004 jedes System mit Pflichtfeld `source` und `aliases` ausstattet: So wird eine Diskrepanz wie diese zukünftig **sichtbar im Datenmodell** statt stillschweigend im Code zu leben.

**Produktentscheidung (2026-07-08):** `IFAA_3` bleibt als Alias auf `bowhuman-scandinavian-3arrow` erhalten (siehe `examples/scoring-systems/bowhuman-scandinavian-3arrow.json`, bereits so hinterlegt) — keine Umbenennung des Robin-`systemId`-Werts. Bestandsdaten in exportierten BHS-002-Sessions bleiben damit unverändert lesbar; die Registry stellt über den Alias-Mechanismus klar, welches System tatsächlich gemeint ist. Die Frage, ob `robin/js/scoring.js` perspektivisch datengetrieben aus der BHS-004-Registry generiert wird (statt der hartkodierten `SYSTEMS`-Konstante), ist eine separate Engineering-Frage außerhalb dieses Standards und bleibt offen.

---

## 9. Offene Punkte für v1.0

- [x] DFBV Hunter-/Ein-Pfeil-Runde: Punktetabelle ist im Original-PDF nur als Grafik hinterlegt (Art. 6.7.9.4). **Recherche 2026-07-08:** Textextraktion beider verfügbaren Fassungen (Januar 2022 und Januar 2024) bestätigt identisch die Lücke — Abschnitt endet nach der Überschrift "6.7.9.4. Wertung" ohne Tabellentext, in beiden Jahrgängen. **Update:** Peter Klein hat die Werte aus der Grafik übermittelt — Kill/Innenkreis 20, Wund/Außenkreis 16, Körper außerhalb der Wertungszone 10 (drei Zonen). Deckt sich unabhängig mit "Variante J" (20/16/10) aus einem allgemeinen Community-Katalog (siehe §7). Registry-Eintrag `examples/scoring-systems/dfbv-hunter-runde.json` ergänzt, Konfidenz `secondary` (nicht `verified`, da textlich übermittelt statt selbst aus der Grafik gelesen).
- [x] WA-3D-Zahlen verifizieren. **Recherche 2026-07-08:** Direkter PDF-Download (nicht die JS-Rulebook-Seite) liefert den Volltext. Fund: Die Zonenwerte stehen nicht in Book 4 Kapitel 9 (falsche Vermutung im ursprünglichen Draft), sondern in **Book 2 – Events, Art. 8.2.2.1 "Scoring zones"** (Version 2026-01-27): *"The target is divided into four scoring zones (11, 10, 8 and 5). […] 11 points for the small circle in the centre of the 10-ring. 10 points for the larger circle within the vital area. Eight points for the vital area outside the 10-point circle. Five points for the remaining body colour zone."* Dieselbe Quelle (Book 2, Art. 4.5.2.1) bestätigt auch `arrows_per_target: 2` für WA 3D — der ursprüngliche Draft-Wert "1–2 (klassenabhängig)" war falsch. Registry-Eintrag `examples/scoring-systems/wa-3d.json` ergänzt, Konfidenz `verified`.
- [x] ASA aufnehmen (Produktentscheidung 2026-07-08). Registry-Eintrag `examples/scoring-systems/asa-pro-am.json` ergänzt, Konfidenz `secondary`. Bekannte Modellierungslücke dokumentiert: ASAs "Shooter's Choice"-Regel (zwei 12-Ringe, bedingte Wahl) passt nicht sauber in die flache Zone×Pfeilposition-Matrix, vereinfacht abgebildet.
- [x] IBO aufnehmen (Produktentscheidung 2026-07-08, analog zu ASA). Registry-Eintrag `examples/scoring-systems/ibo-rules.json` ergänzt, Konfidenz `secondary`.
- [x] Entscheidung `IFAA_3`-Benennung (Alias vs. Umbenennung, siehe §8): **Alias behalten**, keine Umbenennung (Produktentscheidung 2026-07-08). Ob `robin/js/scoring.js` datengetrieben aus der Registry generiert wird, bleibt eine offene, separate Engineering-Frage.
- [x] JSON Schema für `bhs-scoring-system` (§5) — validiert gegen alle 4 Registry-Beispiele (`npm run validate`, 2026-07-08)
- [x] Mehrsprachigkeit von `zones[].label_*` — **Entscheidung 2026-07-08:** generisches `LocalizedString`-Objekt (BHS-003 §3.14) übernommen, `Zone.label_de`/`label_en` → `Zone.label` (§2.2). Alle Registry-Beispiele migriert, Schema aktualisiert.
- [x] Verhältnis zu `tie_break` bei Mehrschützen-Turnieren — **Entscheidung 2026-07-08:** Feld bleibt vorerst in BHS-004 (§2.8 enthält jetzt die Scoping-Klarstellung: bildet nur das Verbands-Standardverfahren ab, nicht bindend für andere Turniere). Fachlich gehört es zu einem künftigen Tournament-Format-Dokument (BHS-006), wohin es bei dessen Entstehung wandern sollte.

---

## 10. JSON Schema

Zur Validierung (Entwurf, noch nicht final): [`../schemas/scoring-system-v1.schema.json`](../schemas/scoring-system-v1.schema.json)

---

## 11. Referenz-Implementierungen

| App | Rolle | Status |
|---|---|---|
| Robin | Enthält die einzige produktive Scoring-Engine im Ökosystem (`js/scoring.js`) | Noch nicht auf BHS-004 umgestellt (siehe §8) |
| Marian | Liest `systemId` aus BHS-002-Sessions zur Analyse | Konsument, keine eigene Registry-Logik nötig |

---

## Changelog

| Version | Datum | Änderungen |
|---|---|---|
| 0.9 | 2026-07-08 | Initialer DRAFT — Recherche existierender Systeme, Kernmodell, Diskrepanz-Analyse zu Robin |
| 0.9 | 2026-07-08 | §9: JSON-Schema-Validierung abgehakt (alle 4 Beispiele grün). §7/§9: DFBV-Hunter-Runde-Recherche vertieft — Lücke in 2022 **und** 2024 bestätigt, zwei widersprüchliche Community-Kandidatenwerte dokumentiert, nicht übernommen |
| 0.9 | 2026-07-08 | §7/§9: WA-3D verifiziert (Book 2 Events Art. 8.2.2.1, statt der falsch vermuteten Book-4-Stelle), `arrows_per_target` von "1–2" auf bestätigt `2` korrigiert, Registry-Eintrag `wa-3d.json` ergänzt |
| 0.9 | 2026-07-08 | Produktentscheidungen umgesetzt: `IFAA_3` bleibt Alias (§8/§9), ASA in Registry aufgenommen (`asa-pro-am.json`, secondary), DFBV-Hunter-Runde-Werte von Peter übermittelt und als `dfbv-hunter-runde.json` ergänzt (secondary). IBO-Frage bleibt offen. |
| 0.9 | 2026-07-08 | `Zone.label_de`/`label_en` → `Zone.label: LocalizedString` (§2.2), konsistent mit BHS-003 §3.14. Alle Registry-Beispiele und das Schema migriert. |
| 0.9 | 2026-07-08 | IBO aufgenommen (`ibo-rules.json`, secondary). `tie_break`-Scoping in §2.8 klargestellt: bildet nur das Verbands-Standardverfahren ab, nicht bindend für andere Turniere; künftige fachliche Heimat wäre ein Tournament-Format-Dokument (BHS-006). |
