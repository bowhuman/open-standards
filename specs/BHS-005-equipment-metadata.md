# BHS-005: Equipment Metadata

| Feld | Wert |
|---|---|
| Nummer | BHS-005 |
| Titel | Equipment Metadata |
| Status | **DRAFT** |
| Version | 0.9 |
| Datum | 2026-07-08 |
| Autor | bowhuman |
| Abhängig von | BHS-002 (Session Export Format, §3 `Archer.equipment`) · BHS-003 (§3.7 `EquipmentClass`, referenziert von §2.3) |

> **DRAFT**: Dieses Dokument beschreibt das implementierte Sherwood-Equipment-Modell (`equipment_bows`, `equipment_arrows`, `equipment_sets`). Der Status DRAFT bedeutet, dass die Spec noch nicht formell verabschiedet ist und Details sich noch ändern können. Das Modell selbst ist produktiv im Einsatz (Archers Nest → „Ausrüstung").

---

## Kurzfassung

Dieses Dokument definiert drei zusammenhängende JSON-Profile für Bogensport-Ausrüstung:

- **`bhs-bow`** — Ein einzelner Bogen (Typ, Marke, Zuggewicht, Maße).
- **`bhs-arrow`** — Ein Pfeilmodell (Material, Spine, Gewichte).
- **`bhs-equipment-set`** — Ein benanntes Bogen+Pfeil-Set, optional als aktives Set markiert.

Die Profile bilden 1:1 die drei aktiven Postgres-Tabellen in Sherwood ab (`equipment_bows`, `equipment_arrows`, `equipment_sets` — siehe `00_Kontext/postgres.md`). Wie bei den übrigen BHS-Dokumenten gilt: Diese Spec beschreibt gelebte Praxis, kein Papierformat — jedes Feld hat eine Entsprechung im UI (`equipment.html`, Archers Nest).

**Zentraler Befund dieser Spec (§5):** Es gibt im bowhuman-Ökosystem bereits **drei unterschiedliche Vokabulare** für denselben Sachverhalt „Bogentyp" — mit unterschiedlicher Sprache, unterschiedlicher Groß-/Kleinschreibung und teils unterschiedlicher Kategorisierung. BHS-005 löst das nicht auf, sondern macht es sichtbar (siehe §5, gleiches Vorgehen wie BHS-004 §8 bei der Robin-Scoring-Diskrepanz).

---

## 1. Geltungsbereich

BHS-005 beschreibt **ausschließlich** die Stammdaten von Bogen, Pfeil und Set, wie sie aktuell in Sherwood gespeichert werden:

- Bogentyp, Marke, Zuggewicht, Zug-/Bogenlänge, Standhöhe (Bogen)
- Material, Spine, Länge, Spitzen-/Gesamtgewicht (Pfeil)
- Verknüpfung Bogen+Pfeil zu einem benannten, optional aktiven Set

**Nicht** Teil von BHS-005 (mögliche Erweiterung für v2, siehe §8):

| Was | Stattdessen / Status |
|---|---|
| Zubehör (Visier, Stabilisator, Auflage, Release) | Kein Feld in `equipment_bows` — nicht im Scope |
| Mehrfach-Pfeilbestand / Stückzahl je Pfeilmodell | `equipment_arrows` bildet ein *Modell* ab, keine Stückzahl |
| Wertungsklassen-Zuordnung (Bogentyp → Altersklasse) | `get_age_class_label()` in Sherwood, referenziert `bow_type` — siehe §5 |
| Welches Set eine Session genutzt hat | BHS-002 (`Archer.equipment_set_snapshot`, beschlossen aber in Robin noch nicht implementiert — siehe §6) |
| Erlaubte Bogenklassen an einem Venue | BHS-003 §3.7 `EquipmentClass` — eigenes, drittes Vokabular, siehe §5 |

---

## 2. Bogen (`bhs-bow`)

### 2.1 Wurzelobjekt

```typescript
interface Bow {
  __type:    "bhs-bow";
  __version: 1;
  id:        string;    // UUID v4

  label:      string;         // Anzeigename, z.B. "Hoyt Formula XI Turnier"
  bow_type:   BowType;
  equipment_class: EquipmentClass;
  brand:      string | null;

  draw_weight_lbs:  number | null;  // Zuggewicht in lbs
  draw_length_in:   number | null;  // Zuglänge in Zoll
  bow_length_in:    number | null;  // Bogenlänge in Zoll
  brace_height_in:  number | null;  // Standhöhe in Zoll

  created_at: string;   // ISO-8601
}
```

### 2.2 BowType

```typescript
type BowType =
  | "Recurve"
  | "Compound"
  | "Blankbogen"     // Barebow
  | "Langbogen"       // Longbow
  | "Instinktiv"      // Instinctive
  | "Primitivbogen"   // Primitive / Selfbow
  | "Armbrust";       // Crossbow
```

Diese sieben Werte entsprechen exakt dem `CHECK`-Constraint von `equipment_bows.bow_type` in Sherwood (Stand 2026-07-08). Die Werte sind deutsch und großgeschrieben, weil das UI (`equipment.html`) sie so anzeigt — **produktspezifisch**, volle Fidelity (7 Werte), Pflichtfeld. Für den standardübergreifenden Abgleich siehe §2.3.

### 2.3 EquipmentClass (kanonisch, abgeleitet)

```typescript
type EquipmentClass =
  | "recurve"
  | "compound"
  | "barebow"
  | "longbow"
  | "traditional"  // fasst Instinktiv + Primitivbogen zusammen
  | "crossbow";
```

**Entscheidung 2026-07-08:** `equipment_class` ist ein **zusätzliches, abgeleitetes** Pflichtfeld — kein Ersatz für `bow_type` (§2.2). Es übernimmt 1:1 das `EquipmentClass`-Vokabular aus BHS-003 §3.7 (dort jetzt als kanonisches Cross-Standard-Vokabular für Bogentypen deklariert) und macht `bhs-bow` direkt mit `Venue.allowed_equipment` (BHS-003 §1.1) vergleichbar, ohne dass Konsumenten selbst mappen müssen.

Die Abbildung ist **verlustbehaftet**: `Instinktiv` und `Primitivbogen` fallen beide auf `traditional` (§5 dokumentiert das im Detail). Deshalb bleibt `bow_type` das primäre, volle Feld — `equipment_class` ist eine Convenience-Projektion für Filter-/Vergleichs-Use-Cases, keine Wahrheitsquelle.

| `bow_type` | `equipment_class` |
|---|---|
| `Recurve` | `recurve` |
| `Compound` | `compound` |
| `Blankbogen` | `barebow` |
| `Langbogen` | `longbow` |
| `Instinktiv` | `traditional` |
| `Primitivbogen` | `traditional` |
| `Armbrust` | `crossbow` |

**Implementierung:** Sherwood berechnet `equipment_class` beim API-Response aus `bow_type` (feste Lookup-Tabelle, s.o.) — **keine** DB-Migration von `equipment_bows` nötig, das Feld existiert nur auf Ebene dieses Austauschformats.

### 2.4 Vollständiges Beispiel

```json
{
  "__type":    "bhs-bow",
  "__version": 1,
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
}
```

---

## 3. Pfeil (`bhs-arrow`)

### 3.1 Wurzelobjekt

```typescript
interface Arrow {
  __type:    "bhs-arrow";
  __version: 1;
  id:        string;    // UUID v4

  label:    string;          // Anzeigename, z.B. "Easton X10 400"
  model:    string | null;   // Herstellermodell, z.B. "X10"
  material: ArrowMaterial | null;
  spine:    number | null;   // z.B. 400

  length_in:       number | null;   // Zoll
  point_weight_gr: number | null;   // Spitzengewicht in Grain
  total_weight_gr: number | null;   // Gesamtgewicht in Grain

  created_at: string;   // ISO-8601
}
```

### 3.2 ArrowMaterial

```typescript
type ArrowMaterial =
  | "Carbon"
  | "Aluminium"
  | "Carbon-Alu"
  | "Holz";     // Wood
```

Entspricht dem `CHECK`-Constraint von `equipment_arrows.material`. Anders als bei `BowType` (§2.2) gibt es hierfür aktuell kein zweites Vokabular im Ökosystem — kein bekannter Konflikt.

### 3.3 Vollständiges Beispiel

```json
{
  "__type":    "bhs-arrow",
  "__version": 1,
  "id":        "8b2c4e1a-6f3d-4a2b-9c1e-5d7f8a9b0c11",
  "label":     "Easton X10 400",
  "model":     "X10",
  "material":  "Carbon",
  "spine":     400,
  "length_in":       28.5,
  "point_weight_gr": 100,
  "total_weight_gr": 380,
  "created_at": "2026-06-10T09:05:00.000Z"
}
```

---

## 4. Set (`bhs-equipment-set`)

### 4.1 Wurzelobjekt

```typescript
interface EquipmentSet {
  __type:    "bhs-equipment-set";
  __version: 1;
  id:        string;    // UUID v4

  label:     string;           // Anzeigename des Sets, z.B. "Turnier-Setup 2026"
  bow:       BowSnapshot | null;
  arrow:     ArrowSnapshot | null;
  is_active: boolean;           // höchstens 1 aktives Set pro Schütze (unique index)

  created_at: string;   // ISO-8601
}
```

`BowSnapshot` / `ArrowSnapshot` entsprechen strukturell §2.1 / §3.1 (inkl. `equipment_class`, §2.3), jedoch **ohne** `__type`/`__version` — es handelt sich um eingebettete Kopien, kein eigenständiges Dokument. Das ist derselbe Ansatz wie beim Parcours-Snapshot in BHS-002 §4: ein Set ist zum Exportzeitpunkt in sich abgeschlossen und bleibt lesbar, auch wenn der referenzierte Bogen oder Pfeil später gelöscht wird (in der DB: `ON DELETE SET NULL` auf `bow_id`/`arrow_id` — das Set bleibt bestehen, verliert aber die Verknüpfung).

### 4.2 Vollständiges Beispiel

```json
{
  "__type":    "bhs-equipment-set",
  "__version": 1,
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

## 5. Diskrepanz-Analyse: Drei Vokabulare für „Bogentyp"

Beim Schreiben dieser Spec wurden alle Stellen im Ökosystem abgeglichen, an denen ein Bogentyp als kontrolliertes Vokabular auftaucht. Ergebnis: **drei unterschiedliche Enums** für denselben Sachverhalt, keine deckt sich exakt mit einer anderen.

| Bedeutung | `equipment_bows.bow_type` (diese Spec, §2.2) | `age_classes.bow_category` (Sherwood DB, `db_age_classes_3d.sql`) | BHS-003 §3.7 `EquipmentClass` |
|---|---|---|---|
| Recurve | `Recurve` | `recurve` | `recurve` |
| Compound | `Compound` | `compound` | `compound` |
| Barebow | `Blankbogen` | `barebow` | `barebow` |
| Longbow | `Langbogen` | `longbow` | `longbow` |
| Instinctive | `Instinktiv` | `instinctive` | `traditional` *(fasst Instinctive + Primitive zusammen)* |
| Primitive | `Primitivbogen` | `primitive` | `traditional` *(s.o.)* |
| Crossbow | `Armbrust` | *(kein eigener Wert — `get_age_class_label()` lässt Armbrust implizit in die Standard-Recurve-Klassen durchlaufen, siehe Kommentar dort)* | `crossbow` |

Drei Unterschiede im Detail:

1. **Sprache/Schreibweise:** `equipment_bows.bow_type` ist deutsch und großgeschrieben (UI-Anzeigetext direkt in die DB übernommen), die anderen beiden sind englisch/kleingeschrieben.
2. **Granularität:** BHS-003 fasst Instinctive und Primitive zu einem gemeinsamen `traditional` zusammen, `equipment_bows` und `age_classes` unterscheiden beide.
3. **Vollständigkeit:** `age_classes.bow_category` hat keinen expliziten Wert für Armbrust/Crossbow — die Wettkampfklassen-Funktion behandelt Armbrust-Schützen wie Recurve-Schützen (laut Code-Kommentar bewusst so vorgesehen, nicht verifiziert gegen ein offizielles DSB-Reglement für Armbrust-Wettkampfklassen).

**Entscheidung 2026-07-08:** Diese Spec löst die Diskrepanz nicht durch stillschweigende Vereinheitlichung auf (das würde sie nur verstecken, wie schon in BHS-004 §8 zur Robin-Scoring-Diskrepanz begründet), sondern durch ein **zweites, abgeleitetes Feld**: `equipment_class` (§2.3) übernimmt das BHS-003-Vokabular (jetzt kanonisch, s.o.) als Convenience-Projektion, `bow_type` (§2.2) bleibt das primäre, volle Feld. Keine Migration von `equipment_bows` nötig — Sherwood berechnet `equipment_class` beim Lesen.

Ausdrücklich **nicht** durch diese Entscheidung gelöst: `age_classes.bow_category` bleibt ein drittes, unabhängiges Vokabular ohne Crossbow-Wert (dritte Zeile der Tabelle oben) — das ist eine Frage an das DSB-Regelwerk für Wettkampfklassen, keine, die dieses Austauschformat beantworten kann (siehe §8).

---

## 6. Bezug zu BHS-002

`Archer.equipment` (BHS-002 §3) war bis 2026-07-08 ein stark reduzierter Snapshot:

```typescript
equipment: {
  bow_type:        string | null;
  draw_weight_lbs: number | null;
}
```

Das deckte weder Pfeil-Daten noch die Set-Zuordnung ab.

**Entscheidung 2026-07-08:** BHS-002 §3 bekommt ein neues Feld `equipment_set_snapshot: EquipmentSetSnapshot | null` — ein eingebettetes `bhs-equipment-set`-Snapshot (§4) ohne `__type`/`__version`, exakt nach dem Muster von `BowSnapshot`/`ArrowSnapshot` (§4.1). Das alte `equipment`-Feld bleibt **zusätzlich** als deprecated Fallback bestehen (nicht ersetzt) — dasselbe Prinzip wie der `aliases`-Mechanismus in BHS-004 §2.5: bestehende Robin-Exporte bleiben unverändert lesbar, neue Exporte liefern zusätzlich das vollständige Set. Details und das aktualisierte `Archer`-Interface: BHS-002 §3.

Damit ist gelöst, was BHS-004 als Vorbild für dieses Vorgehen diente (dort: die offene `systemId`-Frage aus BHS-002 §5.2). **Noch offen:** Robin (der einzige Exporteur von BHS-002-Sessions) erzeugt `equipment_set_snapshot` aktuell noch nicht — die Spec-Änderung ist beschlossen, die Implementierung in `robin/js/` steht aus (vgl. BHS-004 §8, wo dieselbe Lücke zwischen Spec-Entscheidung und Produktivcode für `IFAA_3` dokumentiert ist).

---

## 7. Dateinamenskonvention

```
bhs-bow-<id>.json
bhs-arrow-<id>.json
bhs-equipment-set-<id>.json
```

---

## 8. Offene Punkte für v1.0

- [x] Entscheidung zur Vokabular-Kollision aus §5 (2026-07-08): `equipment_class` (§2.3) als zusätzliches, abgeleitetes Feld eingeführt — BHS-003 `EquipmentClass` ist kanonisch für Cross-Standard-Vergleiche, `bow_type` (§2.2) bleibt das primäre, volle Feld. Keine Migration von `equipment_bows` nötig.
- [ ] Soll `age_classes.bow_category` einen expliziten Wert für Armbrust/Crossbow bekommen, oder ist "läuft implizit über Recurve-Klassen" ein bewusstes, verifiziertes DSB-Regelwerksverhalten? Braucht Rückfrage/Beleg, keine Spec-Frage — bewusst nicht durch die `equipment_class`-Entscheidung mitgelöst (§5).
- [ ] Zubehör (Visier, Stabilisator, Auflage, Release, Sehne) — eigenes `bhs-accessory`-Profil für v2, oder Freitext-Feld an `bhs-bow`?
- [ ] Komponentengewicht bei Pfeilen (Insert/Inlay, Befiederung/Nocke) — aktuell nur `point_weight_gr`/`total_weight_gr`. Für v2: optionales `components`-Objekt statt weiterer flacher Felder, falls Bedarf an detaillierterem Tuning-Tracking entsteht. Kein aktueller Produkt-Bedarf.
- [ ] Stückzahl/Bestand je Pfeilmodell (`equipment_arrows` bildet aktuell ein Modell ab, keine Menge) — relevant für Inventar-Use-Cases, aktuell kein Produkt-Bedarf.
- [x] `Archer.equipment` in BHS-002 erweitern (2026-07-08): neues Feld `equipment_set_snapshot`, altes `equipment` bleibt als deprecated Fallback (§6, BHS-002 §3). Implementierung in Robin steht noch aus.
- [ ] JSON Schema (§9) noch nicht extern reviewt.

---

## 9. JSON Schemas

- Bogen: [`../schemas/bow-v1.schema.json`](../schemas/bow-v1.schema.json)
- Pfeil: [`../schemas/arrow-v1.schema.json`](../schemas/arrow-v1.schema.json)
- Set: [`../schemas/equipment-set-v1.schema.json`](../schemas/equipment-set-v1.schema.json)

---

## 10. Referenz-Implementierungen

| App | Rolle | Status |
|---|---|---|
| Sherwood | Einzige produktive Quelle (`equipment_bows`, `equipment_arrows`, `equipment_sets`; UI unter `equipment.html`, Archers Nest) | Aktiv, 1:1 Basis dieser Spec |
| Robin | Nutzt aktuell nur den reduzierten `Archer.equipment`-Snapshot aus BHS-002 §3, keine eigene Set-Verwaltung | Kein Konsument von §2–4, siehe §6 |
| Marian | Liest `Archer.equipment` aus BHS-002-Sessions zur Analyse | Konsument des reduzierten Snapshots, nicht dieser vollen Spec |

---

## Changelog

| Version | Datum | Änderungen |
|---|---|---|
| 0.9 | 2026-07-08 | Initialer DRAFT — Kernmodell aus `equipment_bows`/`equipment_arrows`/`equipment_sets` abgeleitet, Diskrepanz-Analyse zu drei Bogentyp-Vokabularen (§5) |
| 0.9 | 2026-07-08 | `Bow.equipment_class` (§2.3) als abgeleitetes, kanonisches Feld eingeführt (BHS-003 `EquipmentClass`), Mapping-Tabelle ergänzt. BHS-002 `Archer.equipment_set_snapshot` beschlossen (§6), altes `equipment`-Feld bleibt als deprecated Fallback. Schemas und Beispiele entsprechend aktualisiert. |
