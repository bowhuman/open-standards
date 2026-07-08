# BHS-003: Venue & Club Metadata

| Feld | Wert |
|---|---|
| Nummer | BHS-003 |
| Titel | Venue & Club Metadata |
| Status | **DRAFT** |
| Version | 0.9 |
| Datum | 2026-06-25 |
| Autor | bowhuman |
| Abhängig von | BHS-001 (Parcours Format) |

> **DRAFT**: Dieses Dokument ist in Abstimmung. Feldnamen und Struktur können sich vor dem STABLE-Release noch ändern.

---

## Kurzfassung

Dieses Dokument definiert zwei JSON-Profile für Metadaten im 3D-Bogensport:

- **`bhs-venue`** — Ein Parcours-Standort mit Betreiberprofil: Kontakt, Öffnungszeiten, Preise, Zahlungsmethoden, erlaubte Ausrüstung, Einrichtungen.
- **`bhs-club`** — Ein Bogensportverein: Kontakt, Trainingszeiten, Mitgliedschaft, Verbandszugehörigkeit.

Beide Profile sind eigenständige Dokumente und können miteinander verknüpft werden (`venue.club_id` / `club.venue_ids`).

**Primäre Use Cases:**
- Community Server / bowhuman.eu Map: Standorte durchsuchen, filtern, Öffnungszeiten abrufen
- App-zu-App: Betreiberprofil im Parcours-Export mitliefern

---

## 1. Venue-Profil (`bhs-venue`)

### 1.1 Wurzelobjekt

```typescript
interface Venue {
  __type:    "bhs-venue";
  __version: 1;
  id:        string;          // UUID v4 oder sprechender Slug
  name:      string;
  short_name: string | null;  // Kürzel, z.B. "DK"

  // Kontakt
  website:   string | null;   // https://…
  email:     string | null;
  phone:     string | null;
  social:    Social | null;

  // Adresse & GPS
  address:   Address;
  gps:       GpsPoint | null; // Treffpunkt / Parkplatz

  // Öffnungszeiten
  opening_hours:      OpeningHours | null;
  opening_hours_note: LocalizedString | null;   // z.B. { "de": "Nur mit Voranmeldung", "en": "By appointment only" }

  // Preise
  pricing: Pricing | null;

  // Zahlungsmethoden
  payment_methods: PaymentMethod[];

  // Ausrüstung & Regeln
  allowed_equipment: EquipmentClass[];  // Leer = alle erlaubt
  equipment_note:    string | null;     // Freitext für Sonderregeln

  // Parcours-Infos
  target_count:  number | null;
  terrain:       TerrainType[];
  difficulty:    "beginner" | "intermediate" | "advanced" | null;

  // Einrichtungen
  facilities: Facility[];

  // Zugang
  registration_required: boolean | null;
  registration_url:      string | null;
  membership_required:   boolean | null;  // Vereinsmitgliedschaft nötig?
  club_id:               string | null;   // Referenz auf bhs-club.id

  // Verknüpfte Parcours (Community Server)
  parcours_ids: string[];   // BHS-001 Parcours-IDs

  // Metadaten
  created_at: string;       // ISO-8601
  updated_at: string;       // ISO-8601
  language:   string[];     // ISO 639-1, z.B. ["de"]
}
```

### 1.2 Vollständiges Beispiel

```json
{
  "__type":    "bhs-venue",
  "__version": 1,
  "id":        "schaumberg-dk-2026",
  "name":      "DK Bowfactory — Schaumberg",
  "short_name": "DK",
  "website":   "https://www.dk-bowfactory.de",
  "email":     "info@dk-bowfactory.de",
  "phone":     "0177 1652485",
  "social": {
    "instagram": "dk.bowfactory",
    "facebook":  "DKBowfactory"
  },
  "address": {
    "street":  "Auf der Hell 14",
    "zip":     "66606",
    "city":    "St. Wendel – Remmesweiler",
    "region":  "Saarland",
    "country": "DE"
  },
  "gps": {
    "lat": 49.4912,
    "lon": 7.0348,
    "source": "manual"
  },
  "opening_hours": {
    "monday":    "closed",
    "tuesday":   "closed",
    "wednesday": { "open": "10:00", "close": "17:00" },
    "thursday":  { "open": "10:00", "close": "17:00" },
    "friday":    { "open": "10:00", "close": "17:00" },
    "saturday":  { "open": "09:00", "close": "18:00" },
    "sunday":    { "open": "09:00", "close": "18:00" },
    "seasons": [
      {
        "name": "Winter",
        "from": "11-01",
        "to":   "02-28",
        "hours": {
          "saturday":  { "open": "10:00", "close": "16:00" },
          "sunday":    { "open": "10:00", "close": "16:00" },
          "wednesday": "closed",
          "thursday":  "closed",
          "friday":    "closed"
        }
      }
    ]
  },
  "opening_hours_note": { "de": "Feiertage: geschlossen. Änderungen auf der Website.", "en": "Closed on public holidays. Changes announced on the website." },
  "pricing": {
    "day_ticket_eur":    12.00,
    "season_ticket_eur": 80.00,
    "youth_discount":    true,
    "note":              "Kinder unter 12 Jahren frei mit Erwachsenen"
  },
  "payment_methods": ["cash", "card", "paypal"],
  "allowed_equipment": [],
  "equipment_note": null,
  "target_count":  34,
  "terrain":       ["forest"],
  "difficulty":    "intermediate",
  "facilities":    ["parking", "toilets", "shelter"],
  "registration_required": false,
  "registration_url":      null,
  "membership_required":   false,
  "club_id":               null,
  "parcours_ids":          ["schaumberg-dk-2026"],
  "created_at": "2026-06-25T00:00:00.000Z",
  "updated_at": "2026-06-25T00:00:00.000Z",
  "language":   ["de"]
}
```

---

## 2. Club-Profil (`bhs-club`)

### 2.1 Wurzelobjekt

```typescript
interface Club {
  __type:    "bhs-club";
  __version: 1;
  id:        string;
  name:      string;
  short_name: string | null;

  // Kontakt
  website:   string | null;
  email:     string | null;
  phone:     string | null;
  social:    Social | null;

  // Adresse & GPS (Vereinsheim / Trainingsgelände)
  address:   Address;
  gps:       GpsPoint | null;

  // Verbandszugehörigkeit
  associations: Association[];

  // Trainingszeiten
  training_times: TrainingTime[];

  // Mitgliedschaft
  membership: Membership | null;

  // Angebote
  disciplines: Discipline[];
  youth_section: boolean | null;

  // Verknüpfte Standorte (betriebene Parcours)
  venue_ids: string[];   // Referenzen auf bhs-venue.id

  // Metadaten
  created_at: string;
  updated_at: string;
}
```

### 2.2 Vollständiges Beispiel

```json
{
  "__type":    "bhs-club",
  "__version": 1,
  "id":        "bsc-musterstadt-2026",
  "name":      "Bogensportclub Musterstadt e.V.",
  "short_name": "BSC Musterstadt",
  "website":   "https://www.bsc-musterstadt.de",
  "email":     "info@bsc-musterstadt.de",
  "phone":     null,
  "social":    null,
  "address": {
    "street":  "Waldweg 1",
    "zip":     "12345",
    "city":    "Musterstadt",
    "region":  "Bayern",
    "country": "DE"
  },
  "gps": {
    "lat": 48.137,
    "lon": 11.576,
    "source": "manual"
  },
  "associations": ["DSB", "DFBV"],
  "training_times": [
    {
      "day":   "wednesday",
      "start": "18:00",
      "end":   "21:00",
      "note":  "Indoor-Training, Halle Waldweg"
    },
    {
      "day":   "sunday",
      "start": "09:00",
      "end":   "13:00",
      "note":  "3D-Training auf dem Vereinsparcours"
    }
  ],
  "membership": {
    "fee_eur":       120.00,
    "fee_youth_eur": 40.00,
    "fee_note":      "Jahresbeitrag, fällig im Januar",
    "join_url":      "https://www.bsc-musterstadt.de/mitglied-werden"
  },
  "disciplines":    ["3d", "indoor", "field"],
  "youth_section":  true,
  "venue_ids":      ["musterstadt-vereinsparcours"],
  "created_at": "2026-06-25T00:00:00.000Z",
  "updated_at": "2026-06-25T00:00:00.000Z"
}
```

---

## 3. Gemeinsame Typen

### 3.1 Address

```typescript
interface Address {
  street:  string | null;
  zip:     string | null;
  city:    string;
  region:  string | null;   // Bundesland / Kanton / County
  country: string;          // ISO 3166-1 alpha-2, z.B. "DE", "AT", "CH"
}
```

### 3.2 GpsPoint

Identisch mit BHS-001 §3.1. `source` typischerweise `"manual"` für Venue-Einträge.

### 3.3 Social

```typescript
interface Social {
  instagram?:  string;  // Handle ohne @
  facebook?:   string;  // Seitenname oder URL
  youtube?:    string;  // Kanalname oder URL
  tiktok?:     string;
}
```

### 3.4 OpeningHours

```typescript
type DayValue = DayHours | "closed" | null;
// DayHours  = an diesem Tag geöffnet, mit Zeiten
// "closed"  = an diesem Tag bewusst geschlossen (bekannter Fakt)
// null      = keine Angabe / unbekannt — NICHT mit "closed" verwechseln

interface OpeningHours {
  monday:    DayValue;
  tuesday:   DayValue;
  wednesday: DayValue;
  thursday:  DayValue;
  friday:    DayValue;
  saturday:  DayValue;
  sunday:    DayValue;
  seasons?:  SeasonalHours[];
}

interface DayHours {
  open:   string;   // "HH:MM" (24h)
  close:  string;   // "HH:MM" (24h)
  slots?: Array<{ open: string; close: string }>;
  // slots[] für Mittagspausen oder Zwei-Schicht-Betrieb
}

interface SeasonalHours {
  name:  string;   // z.B. "Winter", "Sommersaison"
  from:  string;   // "MM-DD", z.B. "11-01"
  to:    string;   // "MM-DD", z.B. "02-28"
  hours: Partial<Record<keyof Omit<OpeningHours, "seasons">, DayValue>>;
  // Überschreibt nur die angegebenen Tage; nicht genannte Tage gelten wie Basisplan
}
```

**Warum die Unterscheidung nötig ist:** `null` wurde in v0.9 ursprünglich als "geschlossen" gelesen. Das kollidiert mit der üblichen Konvention in verwandten Formaten (z.B. schema.org, OpenStreetMap), wo ein fehlender/`null`-Wert eher "keine Angabe" bedeutet. Ab sofort gilt: `"closed"` ist die explizite Aussage "an diesem Tag ist bewusst geschlossen" (z.B. Ruhetag), `null` bedeutet "dazu liegt keine Information vor". Diese Trennung ist für Community-Server-Konsumenten wichtig, die z.B. "Montag: Ruhetag" von "Montag: unbekannt, bitte Betreiber fragen" unterscheiden müssen.

### 3.5 Pricing

```typescript
interface Pricing {
  day_ticket_eur:    number | null;
  season_ticket_eur: number | null;
  youth_discount:    boolean | null;
  note:              string | null;
}
```

### 3.6 PaymentMethod

```typescript
type PaymentMethod =
  | "cash"          // Bargeld
  | "card"          // EC-/Kreditkarte
  | "paypal"
  | "wero"          // Wero (European Pay)
  | "bank_transfer" // Überweisung (z.B. Saisonkarte)
  | "other";
```

### 3.7 EquipmentClass

```typescript
type EquipmentClass =
  | "recurve"
  | "compound"
  | "barebow"
  | "longbow"
  | "traditional"  // Instinktiv / Primitive
  | "crossbow";
```

Leeres `allowed_equipment: []` bedeutet: **alle Klassen erlaubt**.

### 3.8 TerrainType

```typescript
type TerrainType = "forest" | "field" | "mixed" | "indoor";
```

### 3.9 Facility

```typescript
type Facility =
  | "parking"         // Parkplatz vorhanden
  | "toilets"
  | "shelter"         // Unterstand / Schutzhütte
  | "restaurant"      // Gastronomie vor Ort
  | "camping"
  | "changing_room"   // Umkleidekabinen
  | "equipment_rental"; // Ausrüstungsverleih
```

### 3.10 Association

```typescript
type Association =
  | "DSB"    // Deutscher Schützenbund
  | "DFBV"   // Deutscher Feldbogen-Verband
  | "EFAA"   // European Field Archery Association
  | "IFAA"   // International Field Archery Association
  | "WA"     // World Archery
  | string;  // Weitere Verbände als Freitext
```

### 3.11 TrainingTime

```typescript
interface TrainingTime {
  day:   "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  start: string;        // "HH:MM"
  end:   string;        // "HH:MM"
  note:  string | null; // z.B. "Nur für Mitglieder", "Indoor-Halle"
}
```

### 3.12 Membership

```typescript
interface Membership {
  fee_eur:       number | null;
  fee_youth_eur: number | null;
  fee_note:      string | null;
  join_url:      string | null;
}
```

### 3.13 Discipline

```typescript
type Discipline = "3d" | "field" | "indoor" | "outdoor" | "flight";
```

### 3.14 LocalizedString

```typescript
type LocalizedString = {
  [languageCode: string]: string;  // ISO 639-1, z.B. "de", "en", "fr" — mindestens ein Eintrag erforderlich
};
```

Ersetzt ab sofort feste `label_de`/`label_en`-Feldpaare (Entscheidung 2026-07-08, siehe §7 und BHS-004 §2.2). Konsumenten wählen die bevorzugte Sprache und fallen bei fehlendem Key auf einen beliebigen vorhandenen Key zurück (z.B. den ersten). Beispiel:

```json
{ "de": "Nur mit Voranmeldung", "en": "By appointment only" }
```

**Wo `LocalizedString` verwendet wird:** `Venue.opening_hours_note` (§1.1) und `BHS-004 Zone.label` (§2.2 dort). **Wo bewusst nicht:** `Venue.name` / `Club.name` bleiben einfache Strings — Vereins- und Betreibernamen sind Eigennamen und werden in aller Regel nicht übersetzt (z.B. bleibt "DK Bowfactory — Schaumberg" auch in einer französischsprachigen Ansicht unverändert). Sollte sich das als falsch herausstellen (z.B. amtliche zweisprachige Vereinsnamen in Grenzregionen), kann `name` in einer späteren Version zusätzlich auf `LocalizedString` umgestellt werden, ohne Bestandsdaten zu brechen (einfacher String ist kompatibel zu einem einzelnen `LocalizedString`-Eintrag).

---

## 4. Verknüpfungen zwischen den Profilen

```
bhs-venue ←──────── club_id ────────→ bhs-club
bhs-club  ←──────── venue_ids ───────→ bhs-venue[]
bhs-venue ←──────── parcours_ids ────→ BHS-001 (littlejohn-parcours)
```

Ein Venue kann ohne Club existieren (privater Betreiber). Ein Club kann ohne eigenen Venue existieren (trainiert auf Fremdgelände). Die Verknüpfung ist optional in beide Richtungen.

---

## 5. Dateinamenskonvention

```
bhs-venue-<id>.json
bhs-club-<id>.json
```

Beispiele:
- `bhs-venue-schaumberg-dk-2026.json`
- `bhs-club-bsc-musterstadt-2026.json`

---

## 6. JSON Schemas

- Venue: [`../schemas/venue-v1.schema.json`](../schemas/venue-v1.schema.json)
- Club: [`../schemas/club-v1.schema.json`](../schemas/club-v1.schema.json)

---

## 7. Offene Punkte für v1.0

- [x] Mehrsprachige Felder — **Entscheidung 2026-07-08:** generisches `LocalizedString`-Objekt eingeführt (§3.14), angewendet auf `opening_hours_note`. `name` bleibt bewusst einfacher String (Eigenname, siehe Begründung in §3.14).
- [ ] Feiertags-Handling in `OpeningHours` (Feiertage nach Land/Region)
- [ ] Bewertungen / Reviews — in BHS-003 oder eigenes Dokument?
- [ ] Barrierefreiheit als eigenes Feld (`accessibility: ["wheelchair", "accessible_toilet"]`)
- [ ] `price_per_arrow_eur` als alternatives Preismodell

---

## Changelog

| Version | Datum | Änderungen |
|---|---|---|
| 0.9 | 2026-06-25 | Initialer DRAFT |
| 0.9 | 2026-07-08 | `OpeningHours`/`SeasonalHours`: `"closed"`-Sentinel eingeführt, `null` bedeutet jetzt "keine Angabe" statt "geschlossen" (§3.4) |
| 0.9 | 2026-07-08 | `LocalizedString`-Typ eingeführt (§3.14), `opening_hours_note` darauf umgestellt. `name` bleibt String (Begründung in §3.14) |
