# BHS-006: Tournament Metadata

| Feld | Wert |
|---|---|
| Nummer | BHS-006 |
| Titel | Tournament Metadata |
| Status | **DRAFT** |
| Version | 0.9 |
| Datum | 2026-07-14 |
| Autor | bowhuman |
| Abhängig von | BHS-003 (Venue & Club Metadata — Address, GpsPoint, Pricing, PaymentMethod, EquipmentClass, Association, LocalizedString) · BHS-004 (Scoring System Metadata — `scoring_system_id`-Referenz) |
| Löst | BHS-004 §2.8/§9 (offener Punkt zu einem künftigen Tournament-Format-Dokument) |

> **DRAFT**: Dieses Dokument ist ein Erstvorschlag zur Diskussion. Feldnamen und Struktur können sich vor dem STABLE-Release noch ändern.

---

## Kurzfassung

Dieses Dokument definiert ein Metadatenformat für **Bogenturniere** (`bhs-tournament`): Name, Termin, Ort, Anfahrt, Zulassung, Preise, Registrierung (inkl. statischem Platzhöchstwert) und Zeitplan. Bewusst **kein** Live-Kapazitäts-/Belegungsfeld — das ist implementierungsspezifisch und liegt außerhalb des Standards (§2.10).

BHS-006 beschreibt **Turnier-Event-Metadaten** (wann/wo/für wen/was kostet es) — nicht Wettkampfregeln. Für Wertungsfragen (Zonen, Punktematrix, Stechen-Verfahren) verweist dieses Dokument auf BHS-004 und dupliziert dessen Inhalte nicht.

**Woher die Felder kommen:** Diese Spec orientiert sich an der produktiven Postgres-Tabelle `external_tournaments` (`CRM/scrapers/migrations/003_external_tournaments_table.sql`) und den vier laufenden Turnier-Scrapern (`CRM/scrapers/turniere/*.py`), ist aber **keine** 1:1-Abbildung davon — `external_tournaments` ist eine Scraper-Zwischentabelle mit Feldern, die für einen öffentlichen Austauschstandard irrelevant sind (`source`, `club_match_status`, `club_match_score` etc.). BHS-006 entnimmt dieser Tabelle nur, welche Felder sich in der Praxis als nötig erwiesen haben, und modelliert sie sauberer.

---

## 1. Geltungsbereich

### 1.1 Abgrenzung zu BHS-004

BHS-004 §2.8 und §9 verweisen vorausschauend auf "ein künftiges Tournament-Format-Dokument (BHS-006)" im Kontext der `tie_break`-Regel (Stechen-Verfahren bei Punktgleichstand). Diese Anfrage zielt jedoch klar auf **Turnier-Event-Metadaten** ab (Name, Termin, Ort, Preis, Kapazität) — inhaltlich näher an BHS-003 (Venue/Club) als an BHS-004 (Wertungsregeln).

**Entscheidung:** BHS-006 deckt primär **Event-Metadaten** ab (dieses Dokument). Die Wettkampf-/Wertungsregeln eines Turniers — inklusive `tie_break` — bleiben fachlich vollständig in BHS-004 (`ScoringSystem.tie_break`, §2.8 dort). BHS-006 referenziert ein Wertungssystem nur über `scoring_system_id` (§2.1) und dupliziert weder Punktetabelle noch Stechen-Regeln.

Begründung: Ein Turnier kann dasselbe Wertungssystem wie hunderte andere Turniere verwenden (z.B. `dfbv-3pfeil-2024`) — die Regeln gehören in die Wertungssystem-Registry (BHS-004 §5), nicht in jeden einzelnen Turnier-Datensatz. Das entspricht dem bereits etablierten Muster `Venue.parcours_ids` (BHS-003) bzw. `Bow.equipment_class` (BHS-005): Referenz statt Duplikat.

Sollte künftig ein eigenständiges Bedürfnis nach **turnierspezifischen** Wertungsabweichungen entstehen (z.B. ein Vereinsturnier, das ein anderes Stechen-Verfahren als der Verbandsstandard nutzt — der genaue Fall, den BHS-004 §2.8 als "nicht bindend für andere Turniere" beschreibt), ist das ein Erweiterungspunkt für eine spätere Version dieses Dokuments (§9), keine Aufgabe des jetzigen Entwurfs.

### 1.2 Was BHS-006 beschreibt

- Identität und Termin eines Turniers (Pflicht-Minimum, §2.1)
- Ort, Anfahrt, Veranstalter, Kontakt
- Zulassung: erlaubte Bogenklassen, Altersklassen, Verbandsanforderungen
- Preise/Startgeld, Zahlungsmethoden
- Zeitplan, Camping, Ausschreibungs-Link
- Verknüpfung zu Venue/Club (BHS-003), Wertungssystem (BHS-004) und einem später daraus entstandenen echten Sherwood/Nottingham-Event

### 1.3 Was BHS-006 nicht beschreibt

| Was | Stattdessen |
|---|---|
| Zonen, Punktematrix, Pfeilregeln | BHS-004 (`ScoringSystem`) |
| Verbands-Standard-Stechen-Verfahren | BHS-004 §2.8 (`ScoringSystem.tie_break`) |
| Parcours-Ziele, GPS der Scheiben | BHS-001 (`littlejohn-parcours`) |
| Venue-Öffnungszeiten, Dauerbetrieb-Preise | BHS-003 (`bhs-venue`) — ein Turnier ist ein einmaliges Event, kein Dauerzustand |
| Vollständiges Bogen-/Pfeil-Stammdatenmodell | BHS-005 (`bhs-bow`/`bhs-arrow`) |
| Live-Zählung freier Plätze | Bewusst kein BHS-Feld (§2.10) — implementierungstechnische Erweiterung einzelner Systeme (z.B. Sherwood), kein Bestandteil des offenen Standards |

---

## 2. Kernmodell

### 2.1 Wurzelobjekt

```typescript
interface Tournament {
  __type:    "bhs-tournament";
  __version: 1;

  // --- Minimum, damit ein Datensatz sinnvoll ist ---
  id:   string;          // stabiler Slug oder UUID
  name: string;
  date: string;          // ISO-8601 Datum (YYYY-MM-DD), erster/einziger Wettkampftag

  // --- Empfohlen, aber nicht Pflicht ---
  date_end: string | null;   // ISO-8601 Datum, letzter Tag bei Mehrtagesturnieren
  status:   TournamentStatus;

  discipline:        Discipline[];       // BHS-003 §3.13 — leer/unbekannt zulässig
  scoring_system_id: string | null;      // -> BHS-004 ScoringSystem.id

  location:  Location | null;
  organizer: Organizer | null;
  contact:   Contact | null;

  eligibility:  Eligibility | null;
  registration: Registration | null;
  pricing:      TournamentPricing | null;

  schedule:          ScheduleItem[];
  camping:           boolean | null;
  announcement_url:  string | null;      // Ausschreibung als PDF oder Webseite

  external_ref: ExternalRef | null;

  created_at: string;   // ISO-8601
  updated_at: string;   // ISO-8601
}
```

### 2.2 Warum genau `id`/`name`/`date` das Minimum sind

Die einzigen `NOT NULL`-Spalten in `external_tournaments` sind `name` und `date` — das ist ein Signal aus der Praxis, aber `external_tournaments` ist eine Scraper-Zwischentabelle mit Auto-Dedup über `source`+`external_id`, kein öffentlicher Austauschstandard. Für BHS-006 gilt dasselbe Muster wie in BHS-001 (`__type`/`__version`/`id`/`name` als Marker+Minimum, §2.1 dort):

- **`id`** ist Pflicht, weil jeder andere BHS-Standard (BHS-001 `Venue.parcours_ids`, BHS-004 `Session.systemId` künftig, ein potenzielles `Session.tournament_id`) auf ein Turnier verweisen muss. Ohne stabile ID ist Referenzierung nicht möglich.
- **`name`** ist Pflicht, weil ein Turnier ohne Namen für Menschen nicht identifizierbar ist (deckt sich mit `external_tournaments.name NOT NULL`).
- **`date`** ist Pflicht, weil ein Turnier-Datensatz ohne Termin praktisch wertlos ist — er beantwortet keine der Fragen, für die das Format gebaut wurde ("wann findet was statt").

Bewusst **nicht** Pflicht: `location`. Ein Scraper-Rohdatensatz kann Name+Termin haben, bevor der Ort geklärt ist (z.B. direkt nach Ausschreibungs-Ankündigung, Ort "wird noch bekanntgegeben"). Ein Zwang zur Adresse hätte in der Praxis dazu geführt, dass unvollständige, aber bereits nützliche Datensätze (z.B. für einen "Turnier angekündigt"-Reminder) nicht valide gewesen wären. Dasselbe Argument gilt für `discipline`, `organizer`, `pricing`: alles Informationen, die typischerweise *nach* der Ersterfassung ergänzt werden — analog zur zweistufigen Erfassung, die `external_tournaments` mit seiner "Phase 2"-Unterscheidung (Kalender-Kernfelder vs. `--fetch-details`-Zusatzfelder) bereits produktiv abbildet (siehe `CRM/scrapers/README.md`).

### 2.3 TournamentStatus

```typescript
type TournamentStatus = "announced" | "open" | "closed" | "cancelled";
```

Identisch zu den Statuswerten in `events`/`external_tournaments` (Konvertierungskompatibilität, §6).

### 2.4 Location

```typescript
interface Location {
  venue_id:    string | null;   // -> BHS-003 Venue.id, falls der Austragungsort als Venue erfasst ist
  name:        string | null;   // Freitext-Ortsname, falls kein Venue-Eintrag existiert (z.B. "Sportplatz TSV Musterstadt")
  address:     Address | null;  // BHS-003 §3.1 — Adresse, falls bekannt
  gps:         GpsPoint | null; // BHS-001 §3.1 / BHS-003 §3.2 — Treffpunkt/Parkplatz
  directions:  string | null;   // Anfahrtsbeschreibung als Freitext, ergänzend zu address/gps
}
```

**`directions` bewusst getrennt von `address`:** Eine Postanschrift beantwortet nicht "wie finde ich den Parkplatz im Wald". Dieselbe Trennung von strukturierten Daten und ergänzendem Freitext existiert bereits bei `Venue.opening_hours` vs. `Venue.opening_hours_note` (BHS-003 §1.1) — `directions` ist das Analogon für die Anfahrt.

**Empfehlung zu `gps`:** Bei 3D-Turnieren im Wald führt eine reine Vereins-/Postadresse oft in die Irre. `gps` sollte deshalb bevorzugt auf den tatsächlichen Turnier-Parkplatz oder Einschießplatz zeigen, nicht auf die Adresse des Vereinsheims, falls beide auseinanderfallen — analog zur bestehenden Konvention bei `Venue.gps` (BHS-003 §1.1: "Treffpunkt/Parkplatz").

### 2.5 Organizer

```typescript
interface Organizer {
  club_id: string | null;  // -> BHS-003 Club.id, falls der Ausrichter ein erfasster Verein ist
  name:    string | null;  // Freitext-Veranstaltername, falls kein Club-Eintrag existiert
}
```

Getrennt von `Location.venue_id`, weil Ausrichter und Austragungsort nicht identisch sein müssen (ein Verein kann ein Turnier auf einem fremden Parcours ausrichten).

### 2.6 Contact

```typescript
interface Contact {
  name:  string | null;
  email: string | null;
  phone: string | null;
}
```

### 2.7 Eligibility ("Für wen")

```typescript
interface Eligibility {
  equipment_classes: EquipmentClass[];  // BHS-003 §3.7 — leer = alle Klassen erlaubt
  classes:           string[];          // Schützenklassen nach Regelwerk, z.B. ["Herren Recurve", "Damen Compound", "Schülerklasse A"]
  associations:      Association[];     // BHS-003 §3.10 — erforderliche Verbandsmitgliedschaft/Lizenz
  note:              string | null;
}
```

**`classes` (vormals `age_classes`) ist bewusst Freitext und enthält ausdrücklich kein Geburtsdatum und kein Geschlecht — Datensparsamkeits-Entscheidung (2026-07-14):** Für den Zweck dieses Feldes — welche Wettkampfklassen bei diesem Turnier zugelassen sind — reicht die **Schützenklasse nach Regelwerk** (DSB-/DFBV-Sportordnung, z.B. "Herren Recurve", "Schülerklasse A weiblich") vollständig aus. Geburtsdatum und Geschlecht sind besonders schützenswerte personenbezogene Daten und werden von BHS-006 an keiner Stelle verlangt oder vorgesehen. Falls ein anderes System (z.B. eine Anmeldeplattform) eine Schützenklasse intern automatisch aus Geburtsdatum und Geschlecht ableiten muss, ist das eine **Fallback-Berechnung dieses Systems** — BHS-006 tauscht ausschließlich das Ergebnis (die Klassenbezeichnung selbst) aus, nie die Rohdaten, aus denen sie abgeleitet wurde.

Der Feldname wurde von `age_classes` zu `classes` geändert, weil eine Schützenklasse nach deutschem Sportordnungs-Verständnis meist mehr als nur das Alter kodiert (häufig Alter **und** Geschlecht **und** teils Bogenklasse in einer Bezeichnung, z.B. "Schülerklasse A weiblich"). `classes` bleibt bewusst Freitext statt kontrolliertem Enum — die in BHS-005 §8 dokumentierte, ungelöste Frage zur Kategorisierung (`age_classes.bow_category` in Sherwood ohne Crossbow-Wert) macht ein standardübergreifendes Vokabular weiterhin verfrüht (vgl. die bereits dokumentierte Drei-Vokabular-Kollision in BHS-005 §5). `equipment_classes` bleibt daneben als strukturiertes, grobes Bogentyp-Filterfeld bestehen (BHS-003 §3.7) — `classes` ist die autoritative, feingranulare Freitext-Liste der tatsächlich zugelassenen Wettkampfklassen, wie sie das jeweils anwendbare Regelwerk definiert.

**Klarstellung zu `equipment_classes: "crossbow"`:** Dieser Wert ist Teil des bereits etablierten, kanonischen `EquipmentClass`-Vokabulars (BHS-003 §3.7) und dort wie in BHS-005 (`Bow.equipment_class`) vollständig unterstützt — kein neues oder unklares Feld. Die in BHS-005 §8 offene Frage betrifft ausschließlich eine **andere**, engere Baustelle: die interne Sherwood-Tabelle `age_classes.bow_category` (Zuordnung Bogentyp → Altersklasse), die aktuell keinen expliziten Crossbow-Wert hat. Das berührt `equipment_classes` in BHS-006 nicht — nachgelagerte Systeme müssen `"crossbow"` hier bereits verarbeiten können, das ist keine offene Baustelle.

### 2.8 Registration

```typescript
interface Registration {
  required:         boolean | null;
  opens_at:         string | null;  // ISO-8601 Zeitstempel — Anmeldestart
  deadline:         string | null;  // ISO-8601 Datum — Meldeschluss
  url:              string | null;
  max_participants: number | null;  // fixer Platzhöchstwert laut Ausschreibung
}
```

**`opens_at` (ergänzt 2026-07-14, externes Review):** Bei Turnieren, die erfahrungsgemäß innerhalb von Minuten ausgebucht sind, ist der Anmeldestart-Zeitpunkt geschäftskritisch — bewusst als Zeitstempel (`date-time`), nicht nur als Datum, da hier auch die Uhrzeit zählt (anders als bei `deadline`, wo ein Datum reicht).

**`max_participants` (ergänzt 2026-07-14, externes Review) — bewusst kein Widerspruch zu §2.10:** Dieses Feld ist ein **statischer** Wert aus der Ausschreibung (z.B. "maximal 120 Starter") — er ändert sich nicht laufend und ist damit fundamental anders als das in §2.10 bewusst entfernte Live-Kapazitätsfeld (`spots_available`). Ein fixes Limit ist eine Eigenschaft des Turniers selbst, keine Momentaufnahme einer sich ständig ändernden Zahl — genau die Unterscheidung, die §2.10 als Kriterium für "gehört in den Standard" vs. "implementierungsspezifisch" nennt.

### 2.9 TournamentPricing

```typescript
interface TournamentPricing {
  entry_fee_eur:       number | null;                  // Standard-Startgeld
  entry_fee_by_class:  Record<string, number> | null;  // z.B. { "Erwachsene": 15, "Jugend": 8 }
  early_bird_fee_eur:  number | null;
  early_bird_deadline: string | null;                  // ISO-8601 Datum
  payment_methods:     PaymentMethod[];                // BHS-003 §3.6
  note:                string | null;
}
```

Baut auf `BHS-003 Pricing` (§3.5 dort) auf, ist aber ein **eigener** Typ statt einer Wiederverwendung: `Venue.pricing` beschreibt einen Dauerzustand (Tages-/Saisonkarte für laufenden Parcours-Betrieb), `TournamentPricing` beschreibt ein einmaliges Startgeld mit turniertypischen Sondermodellen (Frühbucherrabatt, Preis pro Bogenklasse — letzteres direkt aus `external_tournaments.fees`/den Scraper-Ausschreibungsextraktionen entnommen, siehe `lib/detail_extract.py`). `payment_methods` referenziert dagegen unverändert `BHS-003 PaymentMethod` (§3.6) — hier gibt es keinen inhaltlichen Unterschied zwischen Venue- und Turnierkontext, eine Duplikation des Enums wäre nur Redundanz.

### 2.10 Kapazität / Live-Tracking — bewusst nicht Teil des Standards

Eine frühere Fassung dieses Dokuments (v0.9, erste Entwurfsphase) enthielt einen `Capacity`-Block (`spots_total`, `spots_available`, `waitlist`, `last_updated`, `source`) für die Anzahl freier Plätze bei einem Turnier.

**Entscheidung (2026-07-14, Peter):** Live-Zählung freier Plätze ist eine **implementierungstechnische Erweiterung für bowhuman-eigene Systeme**, kein Bestandteil eines offenen Standards. Der `Capacity`-Typ wurde ersatzlos aus BHS-006 entfernt.

Begründung: Ein offener, versionierter Austauschstandard tauscht Datenstrukturen aus, die alle Implementierungen gleich interpretieren können — er ist kein guter Ort für ein von Natur aus volatiles, schnell veraltendes Feld wie "freie Plätze gerade jetzt". Wie genau bowhuman intern freie Plätze zählt und aktuell hält (Snapshot mit Zeitstempel, Nachlade-Endpoint, Push-Benachrichtigung o.ä.) ist eine Produkt-/Architekturfrage der jeweiligen Systeme (Sherwood, eine künftige Anmeldeplattform) und wird dort gelöst, nicht in BHS-006. Sollte sich später ein Bedarf zeigen, Kapazitätsdaten trotzdem *zwischen* Systemen auszutauschen (nicht nur intern zu berechnen), kann dafür ein eigenes, klar als "Momentaufnahme" gekennzeichnetes Dokument oder Feld entstehen — das ist dann aber eine bewusste Neuentscheidung, kein automatisches Wiederaufleben dieses Abschnitts.

### 2.11 ScheduleItem

```typescript
interface ScheduleItem {
  time:  string | null;  // "HH:MM"
  label: string;         // z.B. "Registrierung", "Start Parcours", "Siegerehrung"
}
```

### 2.12 ExternalRef

```typescript
interface ExternalRef {
  source:              string | null;  // z.B. "dsb.de", "mein-bogenturnier.de", "manual"
  external_id:         string | null;
  source_url:          string | null;
  nottingham_event_id: string | null;  // gesetzt, sobald das Turnier als echtes Sherwood/Nottingham-Event existiert
}
```

Bildet das `converted_to_event_id`-Konzept aus `external_tournaments` ab (§7): Ein extern gefundenes/gescraptes Turnier kann zu einem echten, live über Nottingham verwalteten Sherwood-Event werden, sobald ein Veranstalter zusagt. `nottingham_event_id` ist die BHS-006-Entsprechung dieser Brücke — analog zur bereits etablierten Trennung "externe Rohdaten" vs. "echtes, live verwaltetes Event", die die Scraper bewusst vorgenommen haben (`CRM/scrapers/README.md`, Abschnitt "Zieltabelle").

### 2.13 Defaults für fehlende Felder (Tolerantes Einlesen)

Analog zu BHS-001 §5.3: Einige Felder sind in den TypeScript-Interfaces oben ohne `| null` und ohne optionalen Marker notiert (`discipline`, `schedule`, `status`), stehen aber im JSON Schema (§6) bewusst **nicht** im `required`-Array — das einzige Pflicht-Minimum bleibt `__type`/`__version`/`id`/`name`/`date` (§2.2). Das ist kein Widerspruch, sondern derselbe tolerante Einlese-Ansatz wie in BHS-001: Implementierungen sollten beim Lesen eines Dokuments ohne diese Felder folgende Defaults annehmen:

```javascript
tournament.discipline ??= [];
tournament.schedule   ??= [];
tournament.status     ??= "announced";
```

Für alle als `X | null` deklarierten Felder (`location`, `organizer`, `eligibility` usw.) gilt ohnehin: Fehlen und `null` sind gleichbedeutend — beides heißt "keine Angabe".

---

## 3. Vollständiges Beispiel

```json
{
  "__type":    "bhs-tournament",
  "__version": 1,
  "id":        "schaumberg-bogen-open-2026",
  "name":      "Schaumberg Bogen-Open 2026",
  "date":      "2026-09-12",
  "date_end":  "2026-09-13",
  "status":    "open",
  "discipline": ["3d"],
  "scoring_system_id": "dfbv-3pfeil-2024",
  "location": {
    "venue_id": "schaumberg-dk-2026",
    "name":     null,
    "address":  {
      "street":  "Auf der Hell 14",
      "zip":     "66606",
      "city":    "St. Wendel – Remmesweiler",
      "region":  "Saarland",
      "country": "DE"
    },
    "gps": {
      "lat": 49.4912,
      "lon": 7.0348,
      "accuracy": null,
      "alt": null,
      "source": "manual"
    },
    "directions": "Von der B41 Ausfahrt Tholey Richtung Remmesweiler, dem Schild „DK Bowfactory" ca. 2 km folgen. Parkplatz am Vereinsheim ist ausgeschildert."
  },
  "organizer": {
    "club_id": null,
    "name":    "DK Bowfactory — Schaumberg"
  },
  "contact": {
    "name":  "Peter Klein",
    "email": "info@dk-bowfactory.de",
    "phone": null
  },
  "eligibility": {
    "equipment_classes": ["recurve", "compound", "barebow", "longbow", "traditional"],
    "classes":           ["Herren", "Damen", "Jugend U18"],
    "associations":      ["DFBV"],
    "note": null
  },
  "registration": {
    "required": true,
    "opens_at": "2026-07-01T18:00:00.000Z",
    "deadline": "2026-09-05",
    "url":      "https://www.dk-bowfactory.de/turnier-anmeldung",
    "max_participants": 120
  },
  "pricing": {
    "entry_fee_eur": 15.00,
    "entry_fee_by_class": { "Erwachsene": 15.00, "Jugend": 8.00 },
    "early_bird_fee_eur": 12.00,
    "early_bird_deadline": "2026-08-15",
    "payment_methods": ["cash", "paypal"],
    "note": "Frühbucherrabatt gilt bei Anmeldung bis 15.08.2026."
  },
  "schedule": [
    { "time": "08:00", "label": "Registrierung" },
    { "time": "09:00", "label": "Start Parcours" },
    { "time": "16:00", "label": "Siegerehrung" }
  ],
  "camping": true,
  "announcement_url": "https://www.dk-bowfactory.de/ausschreibung-2026.pdf",
  "external_ref": {
    "source":              "manual",
    "external_id":         null,
    "source_url":          null,
    "nottingham_event_id": null
  },
  "created_at": "2026-07-14T08:00:00.000Z",
  "updated_at": "2026-07-14T08:00:00.000Z"
}
```

Minimalbeispiel (nur das Pflicht-Minimum, §2.2):

```json
{
  "__type":    "bhs-tournament",
  "__version": 1,
  "id":        "turnier-ohne-ort-2026",
  "name":      "3D-Turnier TSV Musterstadt",
  "date":      "2026-10-04"
}
```

---

## 4. Bezug zu anderen BHS-Standards

| Feld in BHS-006 | Verweist auf |
|---|---|
| `location.venue_id` | BHS-003 `Venue.id` |
| `location.address` | BHS-003 §3.1 `Address` (Typ übernommen, nicht dupliziert) |
| `location.gps` | BHS-001 §3.1 / BHS-003 §3.2 `GpsPoint` |
| `organizer.club_id` | BHS-003 `Club.id` |
| `eligibility.equipment_classes` | BHS-003 §3.7 `EquipmentClass` |
| `eligibility.associations` | BHS-003 §3.10 `Association` |
| `pricing.payment_methods` | BHS-003 §3.6 `PaymentMethod` |
| `scoring_system_id` | BHS-004 `ScoringSystem.id` (Registry, §5 dort) |
| `external_ref.nottingham_event_id` | zukünftiges echtes Sherwood/Nottingham-Event (kein BHS-Standard, internes Konzept) |

Kein Feld aus BHS-006 dupliziert eine Punktetabelle, ein Zonen-Schema oder ein Stechen-Verfahren — diese bleiben ausschließlich in BHS-004 (§1.1).

---

## 5. Dateinamenskonvention

```
bhs-tournament-<id>.json
```

Beispiel: `bhs-tournament-schaumberg-bogen-open-2026.json`

---

## 6. JSON Schema

Zur Validierung: [`../schemas/tournament-v1.schema.json`](../schemas/tournament-v1.schema.json)

---

## 7. Verhältnis zu `external_tournaments` und dem Nottingham-Onboarding

`external_tournaments` (`CRM/scrapers/migrations/003_external_tournaments_table.sql`) ist die produktive Scraper-Zwischentabelle, in die die vier Turnier-Scraper (`CRM/scrapers/turniere/*.py`) schreiben. Sie war die wichtigste Realitäts-Referenz für dieses Dokument, ist aber bewusst kein Vorbild 1:1 — sie enthält Scraper-spezifische Felder (`source`, `external_id`, `club_match_status`, `club_match_score`, `verified`, `imported_at`), die für einen öffentlichen Austauschstandard irrelevant sind, und modelliert einige Felder als loses JSONB (`fees`, `bow_classes`, `schedule`) ohne festes Schema.

**Architektur-Entscheidung (2026-07-14, Peter):** `external_tournaments` bleibt unverändert die Quelle für den öffentlichen bowhuman-Turnierkalender — alle bekannten Turniere, unabhängig davon, ob sie je über Nottingham abgewickelt werden. Für die reine Kalenderanzeige (z.B. bowhuman.eu) ist **keine** BHS-006-Konformität nötig: Die Darstellung darf frei wählen, welche Feld-Untermenge sie zeigt (meist reichen Name/Termin/Ort/Link), unabhängig von der BHS-006-Struktur.

BHS-006 wird stattdessen genau **an der Konvertierungsgrenze** verbindlich, nicht in der Scraper-Zwischentabelle: Sobald ein Veranstalter zusagt, sein Turnier über Nottingham abzuwickeln (`external_tournaments.converted_to_event_id` wird gesetzt), ist ein valides `bhs-tournament`-Objekt die standardisierte Eingabe für diesen Schritt — Name/Termin/Ort/Zulassung/Preise werden als BHS-006-Dokument übergeben, und Sherwood reichert es anschließend um seine proprietären, Nottingham-spezifischen Felder an (`nottingham_organizer_id`, `custom_classes`, `group_scoring`, `scoring_live` etc. — bewusst außerhalb des BHS-006-Scopes, §1.3).

Damit: `external_tournaments` muss **nicht** migriert werden (`bow_classes`/`fees` bleiben lose JSONB, wie sie sind) — das war die ursprünglich erwogene, jetzt verworfene Idee. BHS-006-Konformität ist nur an der einen Stelle Pflicht, die tatsächlich Standardisierung braucht: dem Übergang von einem rohen/externen Turnierkandidaten zu einem echten, live über Nottingham verwalteten Event.

---

## 8. Referenz-Implementierungen

| App/System | Rolle | Status |
|---|---|---|
| CRM/scrapers | Erzeugt `external_tournaments`-Rohdaten aus vier externen Quellen (DSB, DBSV1959, mein-bogenturnier.de, 3dturnier.com) | Produktiv, bewusst kein BHS-006-Konsument (§7) — bleibt reine Zwischentabelle |
| Sherwood (`events`, Nottingham-Onboarding) | Nimmt BHS-006-Dokumente an der Konvertierungsgrenze entgegen und reichert sie um proprietäre Felder an | Noch nicht implementiert — Architektur in §7 festgelegt |
| bowhuman.eu / Community Server | Potenzieller Konsument für eine öffentliche Turnierübersicht (freie Feld-Untermenge, keine BHS-006-Pflicht) | Noch nicht gebaut |

---

## 9. Offene Punkte für v1.0

- [x] **Live-Kapazität vs. statischer Austauschstandard** (§2.10): **Entscheidung 2026-07-14 (Peter):** Live-Zählung freier Plätze ist eine implementierungstechnische Erweiterung für bowhuman-eigene Systeme, kein Bestandteil eines offenen Standards. `Capacity`-Typ ersatzlos aus BHS-006 entfernt.
- [x] **`classes` (vormals `age_classes`) als Freitext** (§2.7): **Entscheidung 2026-07-14 (Peter):** Geburtsdatum und Geschlecht sind bewusst kein Bestandteil dieses Standards — Datensparsamkeit hat Priorität, die Schützenklasse nach Regelwerk selbst reicht als Datum völlig aus. Geburtsdatum/Geschlecht dürfen anderswo höchstens als interne Fallback-Berechnung dienen, nie als Feld dieses Austauschstandards. Feld umbenannt von `age_classes` zu `classes` (Schützenklassen kodieren oft mehr als nur Alter). Bleibt Freitext — kontrolliertes Enum weiterhin verfrüht wegen der offenen Frage aus BHS-005 §8.
- [x] **Turnierspezifische Wertungsabweichungen** (§1.1): **Entscheidung 2026-07-14 (Peter):** Offen lassen, nicht vorbauen. Kein bekannter Produkt-Bedarf für ein `tie_break_override`-Feld — falls sich später ein konkreter Fall zeigt, wird dann entschieden, nicht spekulativ heute.
- [x] **`external_tournaments`-Annäherung** (§7): **Entscheidung 2026-07-14 (Peter):** Keine Migration. `external_tournaments` bleibt reine Scraper-Zwischentabelle für den Turnierkalender; BHS-006-Konformität ist nur an der Konvertierungsgrenze zu einem echten Nottingham-Event verbindlich, nicht in der Rohdaten-Tabelle.
- [x] JSON Schema (§6) extern reviewt. **Stufe 1 (technischer Self-Check, 2026-07-14):** ajv-`strict: true`-Kompilierung sauber; `id`-Pattern ergänzt; `classes`/`associations`-Items mit `minLength: 1` gehärtet. **Stufe 2 (externes Review durch QS-Person, 2026-07-14):** Ergebnisse eingearbeitet — `id`-Pattern erweitert, um auch großgeschriebene UUIDs zuzulassen (blockierte vorher gültige UUIDs, echter Bug); Klarstellung zu `equipment_classes: "crossbow"` ergänzt (§2.7 — kein offenes Problem, war mit BHS-005 §8 verwechselt); neue §2.13 "Defaults für fehlende Felder" ergänzt, die den TS-Interfaces (`discipline`/`schedule`/`status` ohne `?`) vs. dem nicht-`required`-JSON-Schema erklärt; `gps`-Empfehlung (Parkplatz/Einschießplatz statt Postadresse) in §2.4 ergänzt. Nicht übernommen: Wechsel von lokal kopierten Typdefinitionen (`Address`, `GpsPoint` etc.) zu echten externen `$ref`-URIs — das ist eine bewusste, seit BHS-003 durchgehend genutzte Repo-Konvention (siehe z.B. `scoring-system-v1.schema.json`), keine BHS-006-spezifische Lücke; eine Änderung würde alle fünf bestehenden Schemas betreffen und ist eine eigene, größere Entscheidung außerhalb dieser Session. Format-Validierung (`ajv-formats`) wurde geprüft und ist bereits korrekt aktiv (`tools/validate.js` registriert es), keine Änderung nötig.
- [x] **Neue Feldvorschläge aus dem externen Review** (§2.8): **Entscheidung 2026-07-14 (Peter):** Beide umgesetzt. `Registration.opens_at` (Anmeldestart als Zeitstempel) und `Registration.max_participants` (statischer Platzhöchstwert laut Ausschreibung, ausdrücklich kein Widerspruch zur in §2.10 verworfenen Live-Kapazität) ergänzt. Schema und Beispiel aktualisiert.
- [x] **Mehrsprachigkeit** (`LocalizedString`, BHS-003 §3.14) wird an keiner Stelle in BHS-006 verwendet — `name`, `location.directions`, `schedule[].label` etc. sind einsprachig angenommen. **Entscheidung 2026-07-14 (Peter):** So belassen, analog zur Begründung bei `Venue.name`/`Club.name` (BHS-003 §3.14) — aktuell kein internationaler Bedarf. Bleibt als dokumentierter Hinweis stehen, kein Feld geändert; bei künftigem Bedarf (z.B. mehrsprachige Ausschreibungen) `directions`/`schedule[].label` als erste Kandidaten für `LocalizedString` prüfen.

---

## Changelog

| Version | Datum | Änderungen |
|---|---|---|
| 0.9 | 2026-07-14 | Initialer DRAFT — Kernmodell aus `external_tournaments` und den vier Turnier-Scrapern abgeleitet, Geltungsbereich gegenüber BHS-004 (`tie_break`) geklärt, Kapazitäts-Snapshot-Frage als offener Punkt dokumentiert |
| 0.9 | 2026-07-14 | `Eligibility.age_classes` → `classes` umbenannt (§2.7): Datensparsamkeits-Entscheidung — Schützenklasse nach Regelwerk ist alleiniges Feld, Geburtsdatum/Geschlecht bewusst kein Bestandteil des Standards. Schema und Beispiel aktualisiert. |
| 0.9 | 2026-07-14 | `Capacity`-Typ ersatzlos entfernt (§2.10): Live-Zählung freier Plätze ist implementierungstechnische Erweiterung einzelner Systeme, kein BHS-Standard-Feld. Root-Interface, Beispiel und §1.3 aktualisiert. |
| 0.9 | 2026-07-14 | §1.1/§9: Entscheidung, kein `tie_break_override`-Feld vorzubauen — offen lassen, kein bekannter Bedarf. |
| 0.9 | 2026-07-14 | Externes Schema-Review eingearbeitet: `id`-Pattern lässt jetzt auch großgeschriebene UUIDs zu (Bugfix), §2.7 Klarstellung zu `equipment_classes: "crossbow"`, neue §2.13 "Defaults für fehlende Felder", `gps`-Empfehlung in §2.4 ergänzt. `package.json`-Beschreibung korrigiert (nannte noch "BHS-001 bis BHS-004"). |
| 0.9 | 2026-07-14 | `Registration` um `opens_at` (Anmeldestart) und `max_participants` (statischer Platzhöchstwert, kein Live-Feld) erweitert — beide Feldvorschläge aus dem externen Review, von Peter bestätigt (§2.8/§9). |
| 0.9 | 2026-07-14 | §7 neu gefasst: `external_tournaments` bleibt unmigriert, BHS-006-Konformität ist nur an der Konvertierungsgrenze zu einem echten Nottingham-Event verbindlich, nicht in der Scraper-Zwischentabelle. §8 entsprechend aktualisiert. |
| 0.9 | 2026-07-14 | §9: Alle offenen Punkte durchgesprochen — Mehrsprachigkeit bleibt bewusst einsprachig (analog BHS-003 §3.14), externes Schema-Review bleibt offen (kein interner Check in dieser Session). Damit sind für v0.9 keine unbeantworteten Design-Fragen mehr offen, nur noch der externe Review-Schritt. |
| 0.9 | 2026-07-14 | Schema-Self-Check (Stufe 1, §9): `id`-Pattern ergänzt (analog BHS-004), `classes`/`associations`-Items mit `minLength: 1` gehärtet, veraltete Kapazitäts-Erwähnung in der Schema-Beschreibung entfernt. ajv `strict: true` läuft sauber durch. |
