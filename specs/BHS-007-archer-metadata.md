# BHS-007: Archer Metadata

| Feld | Wert |
|---|---|
| Nummer | BHS-007 |
| Titel | Archer Metadata |
| Status | **DRAFT** |
| Version | 0.9 |
| Datum | 2026-07-16 |
| Autor | bowhuman |
| Abhängig von | BHS-002 (Session Export Format, §3 `Archer`) · BHS-003 (Venue & Club Metadata — `Association` §3.10, `Discipline` §3.13, `EquipmentClass` §3.7) |

> **DRAFT**: Dieses Dokument ist ein Erstentwurf. Feldnamen und Struktur können sich vor dem STABLE-Release noch ändern.

---

## Kurzfassung

Dieses Dokument definiert ein Metadatenformat für **Schützen** (`bhs-archer`): Identität (Vor-/Nachname), Eligibility-relevante Klassifikation (Bogenklassen, Wettkampfklassen je Disziplin und Verband, Verbandszugehörigkeit) sowie ein optionales, portables Sozialprofil (Spitzname, Claim, Über-mich-Text, Avatar).

BHS-007 beschreibt **ausschließlich Informationen, die beim Austausch zwischen Systemen einen echten Mehrwert bringen** — z.B. bei der Anmeldung zu einem Turnier (Gegenstück zu BHS-006 `Eligibility`) oder der Darstellung auf einer Startliste/einem Leaderboard. Alles, was ein Betreiber nur für seine eigene interne Verwaltung braucht (Rollen, Rechte, Vereinsmitgliedschaft mit Funktion, Zugangsdaten), bleibt bewusst außerhalb des Standards — jeder Anbieter ergänzt das selbst, genau wie bowhuman das mit Sherwood tut (§1).

---

## 1. Geltungsbereich

### 1.1 Aufnahmekriterium

Ein Feld gehört in diesen Standard, wenn es beim **Austausch von Informationen zwischen Systemen** einen echten Mehrwert bringt — allen voran bei der Anmeldung zu einem Turnier oder der Organisation einer Veranstaltung. Nicht ausreichend ist, dass BOWHUMAN/Sherwood das Feld intern speichert. Alles, was ausschließlich der eigenen Verwaltung eines Anbieters dient (Rollen, Berechtigungen, Vereinsfunktionen), gehört nicht in einen offenen Standard — das bleibt bei jedem Anbieter selbst, so wie es auch bei bowhuman der Fall ist (Entscheidung 2026-07-16).

Daraus ergeben sich zwei zulässige Kategorien von Feldern:

1. **Eligibility-Matching** — das Gegenstück zu BHS-006 `Eligibility` (§2.7 dort): Ein Turnier erklärt, welche Bogenklassen/Schützenklassen/Verbände es zulässt; ein Archer erklärt, was er ist. Anmeldung ist im Kern der Abgleich beider Seiten.
2. **Portables Sozialprofil** — Spitzname, Claim, Kurzbiografie, Avatar. Auch das ist Informationsaustausch, nur mit anderem Zweck: Wiedererkennung auf Startlisten, Leaderboards, Community-Plattformen statt Zulassungsprüfung.

### 1.2 Was BHS-007 beschreibt

- Identität: Vor-/Nachname (§2.1, §2.2)
- Zulässige Bogenklassen (§2.1, `equipment_classes`)
- Wettkampfklasse je Disziplin, Verband und Bogenklasse (§2.3, `ArcherClass`)
- Verbandsmitgliedschaft/Lizenz, sofern eligibility-relevant (§2.1, `associations`)
- Optionales Sozialprofil: Spitzname, Claim, Bio, Avatar (§2.4)

### 1.3 Was BHS-007 nicht beschreibt

| Was | Warum nicht | Bleibt stattdessen |
|---|---|---|
| Vereinsmitgliedschaft (mit oder ohne Funktion) | Rein BOWHUMAN-/Sherwood-interne Verwaltung, kein Anmelde-/Eligibility-Nutzen | `club_members` (Sherwood-intern) |
| Betreiber-/Kassenwart-/Adminrollen, Berechtigungen | Dito — Verwaltungsrollen, kein Austauschwert | `global_users`, `operator_profiles` (Sherwood-intern) |
| Zugangsdaten (E-Mail, Passwort) | Nie Teil eines offenen Standards | `global_users` (Sherwood-intern) |
| Geburtsdatum, Geschlecht | Datensparsamkeit — dieselbe Entscheidung wie BHS-006 §2.7. Sherwood berechnet daraus intern die Wettkampfklasse (`get_age_class_label()`), ausgetauscht wird nur das Ergebnis (§2.3, §8) | `user_profiles` (Sherwood-intern) |
| Eigenes Equipment (Liste besessener Bögen/Pfeile) | Architektonisch an `global_users` gebunden (`equipment_bows.user_id` ist `NOT NULL` FK auf `global_users`, verifiziert 2026-07-16) — ein Account-loser Archer kann aktuell kein Equipment besitzen. Eine Referenzliste im Archer-Profil würde eine Beziehung vortäuschen, die es in der Praxis so nicht gibt | Equipment-Kontext läuft über einen Snapshot zum Zeitpunkt einer Session/Anmeldung (BHS-002 `equipment_set_snapshot`, BHS-005) |

---

## 2. Kernmodell

### 2.1 Wurzelobjekt

```typescript
interface Archer {
  __type:    "bhs-archer";
  __version: 1;

  id:         string;   // UUID v4
  first_name: string;
  last_name:  string;

  equipment_classes: EquipmentClass[];  // BHS-003 §3.7 — welche Bogenklassen geschossen werden (grobe Angabe)
  classes:           ArcherClass[];     // Wettkampfklasse je Disziplin/Verband/Bogenklasse (§2.3, präzise Angabe)
  associations:      Association[];     // BHS-003 §3.10 — Verbandsmitgliedschaft/Lizenz

  nickname: string | null;  // Spitzname
  claim:    string | null;  // persönlicher Slogan/Motto
  bio:      string | null;  // "Über mich", Freitext
  avatar:   string | null;  // Data-URL oder https-URL, siehe §2.4

  created_at: string;   // ISO-8601
  updated_at: string;   // ISO-8601
}
```

### 2.2 Warum genau `id`/`first_name`/`last_name` das Minimum sind

Nur diese drei Felder sind Pflicht — alles andere ist optional und wird typischerweise erst nach der Ersterfassung ergänzt (Klassifikation, Sozialprofil).

- **`id`**: Referenzierbarkeit — andere Standards (ein künftiges `Session.archer_id`, `Registration`-Kontexte) müssen auf einen Archer verweisen können.
- **`first_name`/`last_name`**: **Entscheidung 2026-07-16 (Peter):** Getrennte, strukturierte Namensfelder statt eines einzelnen `name`-Strings (wie noch in BHS-002 §3), damit Urkunden und Startlisten einheitlich und automatisiert generiert werden können (Sortierung nach Nachname, korrekte Anrede) — ein einzelnes Freitextfeld ist dafür fehleranfällig (uneinheitliche Reihenfolge, Titel/Spitznamen im selben Feld). Siehe §5 zum Verhältnis zu BHS-002.

Bewusst **nicht** Pflicht: `equipment_classes`/`classes`/`associations` — ein neu angelegter Archer hat ggf. noch keine Klassifikation; und das komplette Sozialprofil (§2.4), das rein optional bleibt.

### 2.3 ArcherClass — Wettkampfklasse je Disziplin, Verband und Bogenklasse

```typescript
interface ArcherClass {
  discipline:      Discipline;       // BHS-003 §3.13 ("3d" | "field" | "indoor" | "outdoor" | "flight")
  association:     Association;      // BHS-003 §3.10 — welcher Verband definiert diese Klasse
  equipment_class: EquipmentClass;    // BHS-003 §3.7 — welche Bogenklasse diese Zeile betrifft
  class:           string;           // die Klassenbezeichnung selbst, z.B. "Herren (10)", "U18 w"
}
```

**Warum drei Schlüssel statt nur `discipline`:** Ein Realitätscheck gegen die produktive Sherwood-Funktion `get_age_class_label(uid, assoc)` (`Websites/sherwood.bowhuman.eu/db_age_classes_3d.sql`) zeigt, dass eine Wettkampfklasse in der Praxis **nicht** allein von Disziplin und Verband abhängt:

- **DSB** vergibt pro Bogenklasse eigene Klassennummern-Bereiche (Recurve/Langbogen/Instinktiv/Primitiv: 10–41, Compound: 110–140, Blankbogen: 210–241) — derselbe Schütze hat je nach Bogenklasse unterschiedliche DSB-Klassen.
- **DBSV** dagegen vergibt dieselbe Altersklasse unabhängig von der Bogenklasse (U18/Herren/Ü50 etc.) — die Bogenklasse beeinflusst dort nur die Pflockfarbe (`association_peg_rules`), nicht die Wettkampfklasse.

Ohne `equipment_class` als dritten Schlüssel wäre eine DSB-Klasse nicht eindeutig (§2 des Aufnahmekriteriums: "genau arbeiten" statt zu vereinfachen). Bei DBSV führt das dazu, dass mehrere `ArcherClass`-Einträge mit unterschiedlicher `equipment_class`, aber identischem `class`-Wert nebeneinanderstehen können — das ist redundant, aber korrekt, und einfacher als ein verbandsabhängiges optionales Feld.

**Was hier bewusst nicht ausgetauscht wird:** Wie die Klasse zustande kam (automatisch aus Geburtsdatum+Geschlecht berechnet via `get_age_class_label()`, oder manuell übersteuert via `user_profiles.age_class_override`) ist Sherwood-intern und für den Standard irrelevant — ausgetauscht wird nur das Ergebnis, die Klassenbezeichnung selbst. Das ist dieselbe Datensparsamkeits-Logik wie bei BHS-006 `Eligibility.classes` (§2.7 dort), nur von der anderen Seite betrachtet: dort die zugelassenen Klassen eines Turniers, hier die tatsächliche(n) Klasse(n) eines Schützen.

### 2.4 Community-Profil

```typescript
nickname: string | null;
claim:    string | null;
bio:      string | null;
avatar:   string | null;
```

Diese vier Felder sind vollständig optional und dienen nicht der Eligibility-Prüfung, sondern der Darstellung: Startlisten, Leaderboards, Community-Plattformen. `nickname` ist ein eigenständiges Feld — keine 1:1-Übernahme von `user_profiles.display_name` (Sherwood-intern), auch wenn beide denselben Zweck erfüllen können.

**`avatar`:** Data-URL (`data:image/jpeg;base64,…`) oder https-URL. Beide Formen existieren bereits im Ökosystem — BHS-001 `Target.photo` und BHS-002 `Archer.photo` nutzen Data-URLs (Datei bleibt in sich abgeschlossen, kein externer Abruf nötig), Sherwoods `user_profiles.avatar_url` nutzt eine URL-Referenz. BHS-007 erlaubt bewusst beides, statt sich für eine Form zu entscheiden: Eine Data-URL ist portabler (funktioniert offline, keine tote Verknüpfung), eine URL ist kompakter und aktualisiert sich automatisch, wenn das Bild ausgetauscht wird. Konsumenten sollten anhand des `data:`-Präfixes unterscheiden.

---

## 3. Vollständiges Beispiel

```json
{
  "__type":    "bhs-archer",
  "__version": 1,
  "id":        "9f1c2b3a-4d5e-4f60-8a7b-1c2d3e4f5a6b",
  "first_name": "Erika",
  "last_name":  "Musterfrau",
  "equipment_classes": ["recurve"],
  "classes": [
    {
      "discipline":      "3d",
      "association":     "DSB",
      "equipment_class": "recurve",
      "class":           "Damen (10)"
    },
    {
      "discipline":      "field",
      "association":     "DFBV",
      "equipment_class": "recurve",
      "class":           "Damen"
    }
  ],
  "associations": ["DSB", "DFBV"],
  "nickname": "Wallace",
  "claim":    "Nicht jeder Pfeil muss treffen — Hauptsache er fliegt schön.",
  "bio":      "Seit 2019 dabei, am liebsten auf Waldparcours mit viel Gefälle.",
  "avatar":   null,
  "created_at": "2026-07-16T08:00:00.000Z",
  "updated_at": "2026-07-16T08:00:00.000Z"
}
```

Minimalbeispiel (nur das Pflicht-Minimum, §2.2):

```json
{
  "__type":    "bhs-archer",
  "__version": 1,
  "id":        "3b6f7e2a-9c1d-4a8b-b2e5-6f7a8b9c0d1e",
  "first_name": "Max",
  "last_name":  "Mustermann"
}
```

---

## 4. Bezug zu anderen BHS-Standards

| Feld in BHS-007 | Verweist auf |
|---|---|
| `equipment_classes` | BHS-003 §3.7 `EquipmentClass` |
| `classes[].discipline` | BHS-003 §3.13 `Discipline` |
| `classes[].association` / `associations` | BHS-003 §3.10 `Association` |
| `classes[].equipment_class` | BHS-003 §3.7 `EquipmentClass` |

Analog zu BHS-006 (§4 dort) dupliziert kein Feld aus BHS-007 die Wertungsregeln aus BHS-004 oder die Turnier-Zulassungsfelder aus BHS-006 §2.7 — Eligibility-Abgleich ist der Vergleich zweier Dokumente, nicht die Duplikation eines Feldes in beide.

---

## 5. Verhältnis zu BHS-002 (`Archer`)

BHS-002 §3 definiert bereits ein eingebettetes `Archer`-Objekt in Session-Exports, mit einem einzelnen `name`-Feld (statt `first_name`/`last_name`), `photo` (Data-URL), `equipment`/`equipment_set_snapshot` und session-spezifischen Feldern (`isOwner`, `custom_fields`), die keine Archer-Identität, sondern Session-Kontext sind.

**Vorgeschlagene Beziehung (noch nicht umgesetzt, §10):** BHS-002s `Archer.name` bleibt unverändert als deprecated Fallback bestehen — exakt das bereits etablierte Muster aus BHS-002 §3 selbst (`equipment` bleibt neben `equipment_set_snapshot` bestehen) und BHS-004 §2.5 (Alias-Prinzip): bestehende Robin-Exporte bleiben unverändert lesbar. Ergänzend könnte BHS-002 ein neues Feld `archer_profile_snapshot: ArcherSnapshot | null` bekommen — ein eingebetteter Schnappschuss dieses BHS-007-Dokuments zum Exportzeitpunkt (ohne `__type`/`__version`, analog zu `EquipmentSetSnapshot`, BHS-005 §4.1). Das ist eine Änderung an einem bereits veröffentlichten Standard und wird hier nur vorgeschlagen, nicht in dieser Session umgesetzt.

---

## 6. Dateinamenskonvention

```
bhs-archer-<id>.json
```

Beispiel: `bhs-archer-9f1c2b3a-4d5e-4f60-8a7b-1c2d3e4f5a6b.json`

---

## 7. JSON Schema

Zur Validierung: [`../schemas/archer-v1.schema.json`](../schemas/archer-v1.schema.json)

---

## 8. Realitätscheck gegen Sherwood

Diese Spec wurde gegen die produktive Sherwood-Datenbank abgeglichen (`00_Kontext/postgres.md`, `Websites/sherwood.bowhuman.eu/db_age_classes_3d.sql`):

- **`archers`** ("Offline-Schützen-Identitäten", `local_id`, optionaler `account_id → global_users`) ist die architektonische Entsprechung des BHS-007-Kerns: Eine Schützen-Identität kann in Sherwood bereits unabhängig von einem vollen Nutzerkonto existieren — genau die Trennung, die BHS-007 als offenen Kern von den BOWHUMAN-Rollen abgrenzt (§1).
- **`user_profiles`** speichert `birthdate`/`gender` intern für die Klassenberechnung und zusätzlich `display_name`/`avatar_url` — Letztere haben denselben Zweck wie `nickname`/`avatar` in diesem Standard, sind aber keine 1:1-Übernahme (§2.4).
- **`get_age_class_label(uid, assoc)`** bestätigt die Drei-Schlüssel-Notwendigkeit von `ArcherClass` (§2.3) und dass Sherwood selbst mit Sportjahr-Alter (nicht exaktem Geburtstag) und einem Fallback auf `'m'`/`'Recurve'` bei fehlenden Daten rechnet — Details, die der Standard bewusst nicht mit exportiert (§1.3).
- **`user_profiles.age_class_override`** bestätigt, dass "die Klasse" schon heute ein reines Ergebnisfeld ist (automatisch berechnet oder manuell übersteuert) — dieselbe Sichtweise, die `ArcherClass.class` in BHS-007 einnimmt.
- **`equipment_bows.user_id`** ist `NOT NULL` FK auf `global_users` (verifiziert per `\d equipment_bows`) — bestätigt die Entscheidung in §1.3, Equipment-Besitz nicht in den Archer-Kern aufzunehmen.

---

## 9. Referenz-Implementierungen

| App/System | Rolle | Status |
|---|---|---|
| Sherwood (`archers`, `user_profiles`) | Produktive Quelle, teilweise überlappend (§8) | Aktiv, kein direkter BHS-007-Exporteur |
| Robin | Erzeugt BHS-002-Sessions mit eingebettetem `Archer` | Kein Konsument von BHS-007 direkt, siehe §5 |
| Marian | Liest BHS-002-Sessions zur Analyse | Kein Konsument von BHS-007 direkt |

---

## 10. Offene Punkte für v1.0

- [ ] `archer_profile_snapshot` in BHS-002 ergänzen (§5) — vorgeschlagen, nicht umgesetzt. Eigene Session/Entscheidung nötig, da BHS-002 bereits veröffentlicht ist.
- [ ] Verhältnis `nickname` zu `user_profiles.display_name` — bewusst zwei getrennte Felder (§2.4), aber ungeklärt, ob Sherwood sie beim Export synchron halten sollte oder unabhängig voneinander bleiben.
- [ ] JSON Schema (§7) noch nicht extern reviewt.
- [ ] Mehrsprachigkeit (`LocalizedString`, BHS-003 §3.14) nicht verwendet — `bio`/`claim` sind einsprachig angenommen, analog zur Begründung in BHS-003 §3.14 und BHS-006 §9.
- [ ] Kein Feld für Lizenznummer (Verbands-ID) — aktuell nur `associations: Association[]` als Mitgliedschafts-Liste ohne Nummer. Falls Turnier-Anmeldungen künftig eine Lizenznummer brauchen, wäre das ein Kandidat für eine spätere Version — aktuell kein bekannter Bedarf.

---

## Changelog

| Version | Datum | Änderungen |
|---|---|---|
| 0.9 | 2026-07-16 | Initialer DRAFT — Kern aus dem Aufnahmekriterium "Mehrwert beim Informationsaustausch" abgeleitet, Vereinsmitgliedschaft/Rollen bewusst ausgeschlossen (§1), `ArcherClass` mit drei Schlüsseln nach Realitätscheck gegen `get_age_class_label()` (§2.3, §8), Community-Profil ergänzt (§2.4) |
