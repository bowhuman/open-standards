# BHS-002: Session Export Format

| Feld | Wert |
|---|---|
| Nummer | BHS-002 |
| Titel | Session Export Format |
| Status | **DRAFT** |
| Version | 0.9 |
| Datum | 2026-06-25 |
| Autor | bowhuman (Robin-Team) |
| Abhängig von | BHS-001 (Parcours Format) · BHS-005 (Equipment Metadata, §3 `equipment_set_snapshot`) |

> **DRAFT**: Dieses Dokument beschreibt das implementierte Robin-Session-Format v1. Der Status DRAFT bedeutet, dass die Spec noch nicht formell verabschiedet ist und Details sich noch ändern können. Das Format selbst ist produktiv im Einsatz — Breaking Changes werden separat angekündigt.

---

## Kurzfassung

Dieses Dokument beschreibt das JSON-Exportformat für Bogensport-Scoring-Sessions. Es legt fest, wie eine abgeschlossene Schieß-Session — mit Schützen, Ergebnissen und Wetterdaten — in einer Datei gespeichert und ausgetauscht wird.

Das Format wird von **Robin** erzeugt und von **Marian** (Desktop-Analyse) nativ gelesen.

---

## 1. Übersicht

### 1.1 Dateimarker

```json
{
  "__type":    "hawkeye-session",
  "__version": 1
}
```

Der Typname `hawkeye-session` ist historisch (Robin hieß intern „Hawkeye"). Er bleibt für Rückwärtskompatibilität erhalten.

### 1.2 Dateinamenskonvention

```
<YYYY-MM-DD>_<parcours-slug>_<archer-slug>.json
```

Beispiel: `2026-06-25_schaumberg-dk_felix-sauer.json`

---

## 2. Wurzelobjekt

```typescript
interface Session {
  __type:      "hawkeye-session";
  __version:   1;
  id:          string;          // UUID v4, eindeutige Session-ID
  started_at:  string;          // ISO-8601
  ended_at:    string;          // ISO-8601
  systemId:    string;          // Wertungs-System, z.B. "IFAA_3"
  archers:     Archer[];        // Teilnehmende Schützen
  parcours:    Parcours;        // Parcours-Snapshot (BHS-001-kompatibel)
  shots:       Shot[];          // Alle Schüsse
  totals:      Total[];         // Endergebnis je Schütze
  total_score: number | null;   // Gesamtpunktzahl (bei Einzelschütze)
  weather:     SessionWeather | null;
  edits:       Edit[];          // Änderungsprotokoll
}
```

### 2.1 Vollständiges Beispiel (Struktur)

```json
{
  "__type":    "hawkeye-session",
  "__version": 1,
  "id":        "3e34170d-0292-4b37-ac83-ff61f6008081",
  "started_at": "2026-06-25T08:15:00.000Z",
  "ended_at":  "2026-06-25T12:33:10.000Z",
  "systemId":  "IFAA_3",
  "archers": [ ... ],
  "parcours":  { ... },
  "shots":     [ ... ],
  "totals":    [ ... ],
  "total_score": 394,
  "weather":   { ... },
  "edits":     []
}
```

---

## 3. Schützen-Objekt (Archer)

```typescript
interface Archer {
  id:           string;         // UUID v4
  name:         string;
  photo:        string | null;  // Data-URL, Avatar-Bild

  /** @deprecated Reduzierter Legacy-Snapshot. Bleibt aus Kompatibilitätsgründen
   *  erhalten (bestehende Robin-Exporte bleiben lesbar), wird aber durch
   *  equipment_set_snapshot ersetzt, sobald verfügbar. Siehe equipment_set_snapshot. */
  equipment: {
    bow_type:         string | null;  // z.B. "Recurve", "Compound", "Barebow"
    draw_weight_lbs:  number | null;
  };

  // Vollständiger Ausrüstungs-Snapshot, BHS-005-kompatibel (Entscheidung 2026-07-08).
  // null, solange kein equipment_set beim Schützen konfiguriert war, oder in
  // Exporten, die vor dieser Erweiterung erzeugt wurden (siehe equipment oben).
  equipment_set_snapshot: EquipmentSetSnapshot | null;

  custom_fields: CustomField[];
  isOwner:      boolean;        // true = Session-Ersteller / Geräteinhaber
  created_at:   string;         // ISO-8601
  updated_at:   string;         // ISO-8601
}

interface CustomField {
  key:   string;
  value: string;
}
```

`EquipmentSetSnapshot` entspricht strukturell BHS-005 §4.1 (`bhs-equipment-set`, ohne `__type`/`__version`) — mit eingebetteten `BowSnapshot`/`ArrowSnapshot` (BHS-005 §4.1/§2.3), inklusive `equipment_class`. Der Schütze weiß damit auch Jahre später noch, mit welchem konkreten Bogen und welchen Pfeilen er bei einer bestimmten Session geschossen hat — nicht nur den reduzierten `bow_type`/`draw_weight_lbs` aus dem Legacy-Feld.

**Status:** Spec-Entscheidung getroffen (2026-07-08), **noch nicht implementiert** — Robin erzeugt `equipment_set_snapshot` aktuell noch nicht beim Session-Export (vgl. BHS-004 §8, dieselbe Lücke zwischen Spec und Produktivcode bei `IFAA_3`). Bis zur Umsetzung ist das Feld in echten Exporten `null`.

---

## 4. Parcours-Snapshot

Das `parcours`-Feld enthält einen BHS-001-kompatiblen Parcours-Snapshot zum Zeitpunkt der Session. Die Felder entsprechen BHS-001 §2 (Share-Format), ergänzt um:

| Feld | Typ | Beschreibung |
|---|---|---|
| `id` | `string \| null` | Parcours-ID (UUID oder Slug) |
| `name` | `string` | Parcours-Name |
| `location` | `string \| null` | Ortsangabe |
| `gps` | `GpsPoint \| null` | Treffpunkt |
| `targets` | `Target[]` | Ziele (BHS-001-kompatibel, Share-Profil) |

Die vollständigen Zielfelder (Fotos, Pflock-Details) sind im Session-Export **nicht** enthalten — es gilt das Share-Profil aus BHS-001 §2.2.

---

## 5. Schuss-Objekt (Shot)

```typescript
interface Shot {
  id:            string;        // UUID v4
  archer_id:     string;        // Referenz auf Archer.id
  target_number: number;        // Referenz auf Target.number
  arrow:         number;        // Pfeilnummer (1-basiert, je Ziel)
  zone:          ScoringZone;   // Trefferzone
  score:         number;        // Punktzahl
  timestamp:     string;        // ISO-8601
  angle_deg:     number | null; // Neigungswinkel (von Parcours geerbt)
}
```

### 5.1 Scoring-Zonen

```typescript
type ScoringZone =
  | "kill"       // Treffsicher-Zone (höchste Wertung)
  | "wound"      // Verwundungszone
  | "miss"       // Verfehlt
  | "kill2"      // Zweiter Schuss, Kill-Zone
  | "wound2"     // Zweiter Schuss, Wundzone
  | "kill3"      // Dritter Schuss, Kill-Zone
  | "wound3";    // Dritter Schuss, Wundzone
```

### 5.2 Scoring-Systeme (systemId)

| `systemId` | Beschreibung | Schüsse/Ziel | kill | wound | miss |
|---|---|---|---|---|---|
| `"IFAA_1"` | IFAA 1 Pfeil | 1 | 20 | 16 | 0 |
| `"IFAA_3"` | IFAA 3 Pfeile | 3 | 20/16/12 | 18/14/10 | 0 |
| `"ASA"` | ASA-Wertung | 1–2 | 12/10 | — | 0 |

> **Update 2026-07-08:** Diese offene Frage wird durch [BHS-004 (Scoring System Metadata)](BHS-004-scoring-system-metadata.md) beantwortet. `systemId` referenziert ab sofort `ScoringSystem.id` aus der dortigen Registry; bestehende Legacy-Werte (`IFAA_3`, `IFAA_1`, `WA_3D`) bleiben als Aliase gültig (BHS-004 §6.1). BHS-004 dokumentiert außerdem eine konkrete Diskrepanz: Robins produktive `IFAA_3`-Konstante entspricht nicht der DFBV/IFAA-Standardwertung, sondern der Skandinavischen Wertung (BHS-004 §8) — noch ungeklärt, siehe BHS-004 §9.

---

## 6. Ergebnis-Objekt (Total)

```typescript
interface Total {
  archer_id: string;   // Referenz auf Archer.id
  total:     number;   // Gesamtpunktzahl
  breakdown: {
    kills:   number;   // Anzahl Kill-Treffer
    wounds:  number;   // Anzahl Wund-Treffer
    misses:  number;   // Anzahl Fehlschüsse
  };
}
```

---

## 7. Wetter-Objekt (SessionWeather)

Das Wetter-Objekt wird beim Session-Start einmalig von **open-meteo.com** abgerufen. Es ist `null` wenn kein GPS verfügbar war oder der Abruf fehlschlug.

```typescript
interface SessionWeather {
  source:           "open-meteo";  // API-Quelle
  fetched_at:       string;        // ISO-8601
  temperature_c:    number;        // °C, 2 m über Grund
  wind_speed_kmh:   number;        // km/h, 10 m über Grund
  wind_dir_deg:     number;        // 0–359°, meteorologisch
  wind_dir_label:   string;        // "N" | "NO" | "O" | "SO" | "S" | "SW" | "W" | "NW"
  weather_code:     number;        // WMO-Code
  condition:        string;        // Klartext auf Englisch, z.B. "Mainly clear"
  precipitation_mm: number;        // Niederschlag letzte Stunde in mm
  visibility_m:     number | null; // Sichtweite in Metern (null wenn nicht verfügbar)
}
```

**WMO-Codes (Auszug):**

| Code | Zustand |
|---|---|
| 0 | Klar |
| 1–3 | Teilweise bis bedeckt |
| 45, 48 | Nebel |
| 51–57 | Nieselregen |
| 61–67 | Regen |
| 71–77 | Schneefall |
| 80–82 | Schauer |
| 95–99 | Gewitter |

Vollständige WMO-Code-Tabelle: [open-meteo.com/en/docs](https://open-meteo.com/en/docs)

---

## 8. Änderungsprotokoll (Edit)

```typescript
interface Edit {
  timestamp:   string;   // ISO-8601, Zeitpunkt der Änderung
  shot_id:     string;   // Referenz auf Shot.id
  field:       string;   // Geändertes Feld, z.B. "zone", "score"
  old_value:   unknown;
  new_value:   unknown;
  reason:      string | null;
}
```

`edits[]` ist in der Praxis meist leer. Einträge entstehen wenn ein Schuss nachträglich korrigiert wird.

---

## 9. Vollständiges Beispiel

```json
{
  "__type":    "hawkeye-session",
  "__version": 1,
  "id":        "3e34170d-0292-4b37-ac83-ff61f6008081",
  "started_at": "2026-06-25T08:15:00.000Z",
  "ended_at":  "2026-06-25T12:33:10.000Z",
  "systemId":  "IFAA_3",
  "archers": [
    {
      "id":    "00000000-0000-0000-431d-19da10da18d4",
      "name":  "Felix Sauer",
      "photo": null,
      "equipment": {
        "bow_type":        "Recurve",
        "draw_weight_lbs": null
      },
      "equipment_set_snapshot": null,
      "custom_fields": [],
      "isOwner":    true,
      "created_at": "2026-06-25T08:15:00.000Z",
      "updated_at": "2026-06-25T08:15:00.000Z"
    }
  ],
  "parcours": {
    "id":       "schaumberg-dk-2026",
    "name":     "Schaumberg D.K.",
    "location": "Tholey, Saarland",
    "gps": { "lat": 49.4912, "lon": 7.0348 },
    "targets": [
      {
        "number":     1,
        "animal":     "Wildschwein",
        "category":   "large",
        "distance_m": 22,
        "angle_deg":  -5,
        "gps": { "lat": 49.4911639, "lon": 7.0348083, "accuracy": 5, "alt": 371, "source": "gps" }
      }
    ]
  },
  "shots": [
    {
      "id":            "bfaa80af-2eab-4a91-8fdd-8e73a57dbdd5",
      "archer_id":     "00000000-0000-0000-431d-19da10da18d4",
      "target_number": 1,
      "arrow":         1,
      "zone":          "kill",
      "score":         20,
      "timestamp":     "2026-06-25T08:21:19.000Z",
      "angle_deg":     -5
    }
  ],
  "totals": [
    {
      "archer_id": "00000000-0000-0000-431d-19da10da18d4",
      "total":     394,
      "breakdown": { "kills": 15, "wounds": 14, "misses": 5 }
    }
  ],
  "total_score": 394,
  "weather": {
    "source":           "open-meteo",
    "fetched_at":       "2026-06-25T08:15:00.000Z",
    "temperature_c":    18,
    "wind_speed_kmh":   12,
    "wind_dir_deg":     225,
    "wind_dir_label":   "SW",
    "weather_code":     1,
    "condition":        "Mainly clear",
    "precipitation_mm": 0,
    "visibility_m":     24000
  },
  "edits": []
}
```

---

## 9.1 `equipment_set_snapshot` (Beispiel, geplant)

Sobald Robin diesen Wert füllt (siehe §3), sieht ein Eintrag so aus — identisch zum `bhs-equipment-set`-Beispiel in BHS-005 §4.2, nur ohne `__type`/`__version`:

```json
"equipment_set_snapshot": {
  "id":        "c4d5e6f7-1a2b-4c3d-8e9f-0a1b2c3d4e5f",
  "label":     "Turnier-Setup 2026",
  "bow": {
    "id":        "3f9a1b3e-2b7a-4c9e-9b0e-7a6c9d4e2f10",
    "label":     "Hoyt Formula XI Turnier",
    "bow_type":  "Recurve",
    "equipment_class": "recurve",
    "brand":     "Hoyt",
    "draw_weight_lbs": 38,
    "draw_length_in":  27.5,
    "bow_length_in":   68,
    "brace_height_in": 7.5,
    "created_at": "2026-06-10T09:00:00.000Z"
  },
  "arrow": {
    "id":        "8b2c4e1a-6f3d-4a2b-9c1e-5d7f8a9b0c11",
    "label":     "Easton X10 400",
    "model":     "X10",
    "material":  "Carbon",
    "spine":     400,
    "length_in":       28.5,
    "point_weight_gr": 100,
    "total_weight_gr": 380,
    "created_at": "2026-06-10T09:05:00.000Z"
  },
  "is_active": true,
  "created_at": "2026-06-10T09:10:00.000Z"
}
```

---

## 10. Offene Punkte für v1.0

Diese Punkte müssen vor dem Status STABLE geklärt werden:

- [ ] Vollständige `systemId`-Liste mit Punktetabellen aller Systeme (§5.2)
- [ ] JSON Schema für Validierung
- [ ] Verhalten bei Mehrschützen-Sessions (`total_score` vs. `totals[]`)
- [ ] Geplante Erweiterungen: `shot_gps`, `peg_chosen`, `animal_chosen` (für v2)
- [ ] Abgrenzung zum LittleJohn Session-Share (BHS-001 §4) — gleicher Dateimarker, andere Struktur
- [ ] `equipment_set_snapshot` (§3, beschlossen 2026-07-08) in Robin implementieren — Spec ist fertig, Exporteur liefert das Feld noch nicht
- [ ] Migrationspfad: Wann wird das deprecated `equipment`-Feld tatsächlich entfernt, falls überhaupt? Aktuell kein Zieldatum

---

## Changelog

| Version | Datum | Änderungen |
|---|---|---|
| 0.9 | 2026-06-25 | Initialer DRAFT |
| 0.9 | 2026-07-08 | §5.2 verweist auf BHS-004 (Scoring System Metadata) als Antwort auf die offene `systemId`-Frage |
| 0.9 | 2026-07-08 | §3: `Archer.equipment_set_snapshot` ergänzt (BHS-005-kompatibel), altes `equipment` als deprecated Fallback markiert, nicht entfernt. Noch nicht in Robin implementiert (§10). |
