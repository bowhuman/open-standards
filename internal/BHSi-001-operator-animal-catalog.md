# BHSi-001: Operator Animal Catalog & Station Extension

| Feld | Wert |
|---|---|
| Nummer | BHSi-001 |
| Titel | Operator Animal Catalog & Station Extension |
| Status | **DRAFT** |
| Version | 0.1 |
| Datum | 2026-09-08 |
| Autor | bowhuman (Sherwood/Betreiber-Team) |
| Erweitert | BHS-001 (Parcours Exchange Format, §3 `Target`), `station_animals` (Postgres) |
| Reihe | **BHSi — interne Erweiterung**, siehe §0 |

---

## 0. Was ist eine BHSi-Erweiterung?

Die `BHS-*`-Nummernreihe (`specs/`) ist der öffentliche, versionierte Kern-Standard von bowhuman — offen veröffentlicht, damit Drittentwickler kompatible Apps bauen können. `BHSi-*`-Dokumente (`internal/`) sind **keine** öffentlichen Standards. Sie beschreiben Betreiber-spezifische Datenfelder, die nur in Sherwoods Betreiber-Backend existieren und für die es keinen Kompatibilitätsanspruch gegenüber Drittanbietern gibt.

**Regel:** Ein `BHSi`-Dokument darf ein `BHS`-Kernformat nur *additiv* erweitern (neue optionale Felder, neue Tabellen mit Fremdschlüssel auf den Kern). Es darf nie ein Pflichtfeld eines `BHS`-Dokuments verändern oder ersetzen. Apps, die nur den öffentlichen Kern kennen (Robin, Marian, Drittanbieter), müssen `BHSi`-Felder gefahrlos ignorieren können.

---

## Kurzfassung

BHS-001 definiert pro Ziel (`Target`) nur `animal` (Freitext) und `category` (Zielgröße). Für die Betreiber-WebApp reicht das nicht: ein Betreiber kauft konkrete, physische 3D-Tiere von Herstellern (Leitold, Bieri, SRT, Delta McKenzie, …), hat dafür einen Kaufpreis, ein Kaufdatum, Wartungsaufwand und muss jedes gekaufte Exemplar eindeutig einer Station zuordnen können.

BHSi-001 führt dafür zwei Ebenen ein:

1. **Katalog-Ebene** (`animal_catalog_products`) — ein Herstellerprodukt, unabhängig davon, ob und wo es verbaut ist. Wird durch einen Scraper gegen den Katalog von bogensport-beier.de befüllt.
2. **Instanz-Ebene** (Erweiterung von `station_animals`) — ein konkretes, gekauftes und an einer Station stehendes Exemplar, mit Verweis auf den Katalog-Eintrag.

Die Trennung löst insbesondere das Problem: *mehrere identische Katalog-Tiere können an verschiedenen Stationen stehen, jedes mit eigenem Kaufpreis/-datum.*

---

## 1. Geltungsbereich

BHSi-001 beschreibt:

- Stammdaten von 3D-Tier-Katalogprodukten (Herkunft: Herstellerkatalog/Scraper)
- Betreiber-spezifische Zusatzfelder pro physischem Tier-Exemplar an einer Station
- Die Zuordnung eines Katalogprodukts zur bestehenden Design-Bild-Registry (`Zoo/animal-lore.json`)
- Den Umgang mit Katalogeinträgen, die sich nicht auf ein bestehendes Zoo-Tier mappen lassen

**Nicht** Teil von BHSi-001:

| Was | Stattdessen / Status |
|---|---|
| Das Schützen-Design-Bild selbst | Bleibt vollständig in `Zoo/animal-lore.json` verwaltet, unverändert. BHSi-001 verweist nur darauf (`animal_species_de`), fügt aber kein neues Bild-Feld ein. |
| Öffentliches Austauschformat für Ziele | Bleibt BHS-001 (`Target.animal`/`category`) — BHSi-001 ändert dessen Pflichtfelder nicht. |
| Wertungsklassen für Schützen (Bogentyp etc.) | BHS-008 — anderer Gegenstand (Schütze, nicht Tier). |
| Automatisches Anlegen neuer Zoo-Design-Assets | Ausdrücklich nicht automatisiert, siehe §4. |

---

## 2. Katalog-Ebene: `animal_catalog_products`

### 2.1 Zweck

Ein Eintrag pro Herstellerprodukt, wie vom Scraper aus einem Online-Katalog (z.B. bogensport-beier.de) übernommen. Mehrere Betreiber und mehrere physische Exemplare können auf denselben Katalog-Eintrag verweisen.

### 2.2 Objekt

```typescript
interface AnimalCatalogProduct {
  __type:    "bhsi-animal-catalog-product";
  __version: 1;
  id:        string;   // UUID v4

  // --- Herstellerangaben ---
  manufacturer:  string;         // z.B. "Leitold"
  product_name:  string;         // z.B. "Leitold 3D Tier Timberwolf laufend"

  // --- Zuordnung zur bestehenden Design-Registry ---
  animal_species_de: string | null;  // muss einem `animal_de`-Wert aus Zoo/animal-lore.json entsprechen, oder null bei Nicht-Match
  match_status:       "matched" | "needs_review";  // siehe §4

  // --- Scoring-relevante Klassifizierung ---
  category:            "xl" | "large" | "medium" | "small";  // BHS-001-kompatible Kernklasse
  ifaa_group:           string | null;   // offizielle IFAA-Gruppe lt. Hersteller, z.B. "Gruppe 2"
  wa_group:             string | null;   // offizielle WA-Gruppe lt. Hersteller, z.B. "Gruppe 2"
  scoring_zones_count:  number | null;   // Anzahl Wertungszonen, z.B. 2
  outer_kill_cm:        number | null;   // Außenkill-Durchmesser in cm

  // --- physische Maße ---
  dimensions_cm: { length: number; width: number; height: number } | null;
  weight_kg:     number | null;

  // --- Preis & Bild ---
  reference_price_eur: number | null;  // Katalog-Richtpreis zum Scrape-Zeitpunkt
  product_image_url:   string | null;  // echtes Produktfoto (NICHT das Zoo-Design-Bild)

  // --- Herkunftsnachweis ---
  source_url:  string;          // Produktseite, von der gescraped wurde
  scraped_at:  string;          // ISO-8601
}
```

### 2.3 `category`-Mapping

`category` bleibt exakt die BHS-001-Kernklasse (`xl`/`large`/`medium`/`small`), damit bestehende IFAA-Scoring-Logik unverändert funktioniert. Herstellerangaben (`ifaa_group`, `wa_group`) werden **zusätzlich** gespeichert, ersetzen `category` aber nicht — beide Klassifizierungen sind offizielle, aber unterschiedliche Vokabulare (IFAA-Gruppe klassifiziert die Zielgröße für IFAA-Turniere, `category` ist die interne BHS-Kernklasse). Weicht eine Herstellerangabe von der `typical_category` des zugeordneten Zoo-Eintrags ab, ist das ein Kandidat für den Review-Report (§4).

---

## 3. Instanz-Ebene: Erweiterung von `station_animals`

Bestehende Spalten (`id`, `station_id`, `name`, `category`, `is_primary`) bleiben unverändert. Neu:

```typescript
interface StationAnimalExtension {
  catalog_product_id:  string | null;  // FK → animal_catalog_products.id
  purchase_price_eur:  number | null;  // Kaufpreis DIESES Exemplars (kann vom Katalog-Richtpreis abweichen)
  purchase_date:       string | null;  // ISO-8601 Datum
  maintenance_installation_eur: number | null;
  maintenance_time_h:           number | null;
  operator_reference_photo_url: string | null;  // echtes Foto (Katalog oder eigener Upload) NUR zur Wiedererkennung durch den Betreiber, nicht Schützen-sichtbar
}
```

`name` wird bei erfolgreichem Katalog-Match (`match_status: "matched"`) auf den normalisierten `animal_species_de`-Wert des zugeordneten Katalogprodukts **normalisiert** (ersetzt bestehenden Freitext). Bei `needs_review`-Einträgen bleibt `name` unverändert Freitext, bis eine manuelle Entscheidung vorliegt.

Das bestehende Schützen-Design-Bild ergibt sich weiterhin ausschließlich aus `name` → `Zoo/animal-lore.json` (`animal_de` → `asset`) und wird durch BHSi-001 nicht verändert.

---

## 4. Umgang mit Nicht-Matches (Scraper-Workflow)

Nicht jedes gescrapte Herstellerprodukt lässt sich einem der bestehenden `animal_de`-Werte in `Zoo/animal-lore.json` zuordnen (neue Tierart, uneindeutiger Name, abweichende Kategorisierung). Verfahren:

1. Der Katalog-Eintrag wird **trotzdem angelegt** (`match_status: "needs_review"`, `animal_species_de: null`).
2. Betroffene `station_animals`-Einträge behalten ihren bisherigen Freitext-Namen, bis eine Zuordnung erfolgt.
3. Nach jedem Scraper-Lauf wird ein Report aller `needs_review`-Fälle erzeugt, u.a. für:
   - Kein Zoo-Asset für die erkannte Tierart vorhanden
   - Kategorie-Konflikt (Herstellerangabe weicht von `typical_category` des ähnlichsten Zoo-Eintrags ab)
   - Möglicher Duplikat-Match (mehrdeutig, z.B. Schreibvarianten)
4. Es werden **keine** neuen Zoo-Design-Assets automatisiert angelegt. Neue Tierarten erfordern eine manuelle Freigabe (Design-Asset + `animal-lore.json`-Eintrag), bevor ein Katalogprodukt auf `matched` gesetzt werden kann — analog zur Standing Rule "keine neuen UI-Elemente/Komponenten ohne Freigabe".

---

## 5. JSON Schema

Zur Validierung: [`../schemas/bhsi-animal-catalog-v1.schema.json`](../schemas/bhsi-animal-catalog-v1.schema.json)

---

## 6. Referenz-Implementierung

| Komponente | Rolle |
|---|---|
| Scraper (bogensport-beier.de) | Erzeuger von `animal_catalog_products` |
| Sherwood Betreiber-Backend (Postgres) | Konsument, Erweiterung von `station_animals` |
| `Zoo/animal-lore.json` | Bestehende Design-Registry, referenziert über `animal_species_de` |

---

## Changelog

| Version | Datum | Änderungen |
|---|---|---|
| 0.1 | 2026-09-08 | Erster Entwurf |
