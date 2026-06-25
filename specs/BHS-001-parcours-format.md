# BHS-001: Parcours Exchange Format

| Feld | Wert |
|---|---|
| Nummer | BHS-001 |
| Titel | Parcours Exchange Format |
| Status | **STABLE** |
| Version | 1.0 |
| Datum | 2026-06-25 |
| Autor | bowhuman (LittleJohn-Team) |
| Ersetzt | — |

---

## Kurzfassung

Dieses Dokument beschreibt das kanonische JSON-Austauschformat für 3D-Bogensport-Parcours. Es definiert, wie Parcours-Daten (Ziele, GPS-Positionen, Pflöcke, Szenen) zwischen Apps und Diensten ausgetauscht werden.

Das Format wird von **LittleJohn** erzeugt und von **Robin** und **Marian** konsumiert. Der Dateimarker `__type: "littlejohn-parcours"` kennzeichnet alle Dateien dieses Formats.

---

## 1. Übersicht

### 1.1 Dateitypen

Drei Dateitypen teilen sich dasselbe Wurzelformat:

| Typ | Auslöser | Inhalt |
|---|---|---|
| **Parcours-Share** | Parcours teilen / exportieren | Kerndaten (dieses Dokument) |
| **Session-Share** | Erkundungs-Session teilen | Kerndaten + Session-Rahmen → BHS-002 |
| **Backup** | Vollständige App-Sicherung | Alle Parcours + Betreiberprofil, kein `__type` |

Dieses Dokument (BHS-001) definiert das **Parcours-Share-Format** und das interne **vollständige Zielobjekt**.

### 1.2 Dateinamenskonvention

```
littlejohn-parcours-<name>-<YYYY-MM-DD>.json
```

Beispiel: `littlejohn-parcours-schaumberg-dk-2026-06-25.json`

---

## 2. Parcours-Share-Format

Das Share-Format ist das **kanonisch-minimale** Übertragungsformat. Es enthält keine Fotos, keine Pflock-Details und keine Rohdaten aus der Einmess-Session.

### 2.1 Wurzelobjekt

```json
{
  "__type":    "littlejohn-parcours",
  "__version": 1,
  "name":      "Schaumberg D.K.",
  "location":  "Tholey, Saarland",
  "created_at": "2026-05-24T08:28:34.970Z",
  "gps":       { "lat": 49.491, "lon": 7.034 },
  "targets":   [ ... ]
}
```

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `__type` | `"littlejohn-parcours"` | ✅ | Format-Marker, konstant |
| `__version` | `1` | ✅ | Schema-Version, konstant `1` |
| `name` | `string` | ✅ | Name des Parcours |
| `location` | `string \| null` | — | Ortsangabe (Freitext) |
| `created_at` | ISO-8601-String | — | Erstellungszeitpunkt |
| `gps` | `GpsPoint \| null` | — | Treffpunkt / Startpunkt |
| `targets` | `Target[]` | ✅ | Ziele, min. 1 Element |

`__type` und `__version` sind Dateimarker und werden beim Import in Datenbanken gestripped.

### 2.2 Pflichtfelder pro Ziel (Share-Profil)

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `number` | ✅ | Ziel-Nummer (1-basiert) |
| `animal` | ✅ | Tierbezeichnung (Freitext) |
| `category` | ✅ | Zielgröße — ohne diese ist IFAA-Scoring nicht möglich |
| `distance_m` | ✅ | Schussdistanz in Metern (Blau-Pflock / Standardpflock) |
| `angle_deg` | ✅ | Neigungswinkel in Grad (negativ = bergab, positiv = bergauf) |
| `gps` | — | GPS-Position des Ziels / der Scheibe |

Minimales Beispiel:

```json
{
  "number":     1,
  "animal":     "Wildschwein",
  "category":   "large",
  "distance_m": 22,
  "angle_deg":  -5,
  "gps":        { "lat": 49.491, "lon": 7.034 }
}
```

---

## 3. Vollständiges Zielobjekt

Das vollständige `Target`-Objekt enthält alle Felder, die LittleJohn intern speichert. Beim Share-Export werden `photo`, `photoSource`, `heading_deg`, `photo_captured_at` und `photo_gps` weggelassen.

```typescript
interface Target {
  // --- Kern (Pflicht im Share-Profil) ---
  number:         number;        // 1-basiert, eindeutig im Parcours
  animal:         string;        // Primärtier, z.B. "Wildschwein"
  category:       "xl" | "large" | "medium" | "small";
  distance_m:     number | null; // Blau-Pflock-Distanz (Standarddistanz)
  angle_deg:      number | null; // Neigungswinkel in Grad

  // --- GPS ---
  gps:            GpsPoint | null;  // GPS des Ziels (Tier / Scheibe)

  // --- Pflöcke ---
  flocks:         Flock[];       // Leer-Array wenn kein Mehrpflock-Setup

  // --- Szene ---
  scene:          SceneAnimal[]; // Weitere Tiere an dieser Station

  // --- Einmess-Foto (nur intern, nicht im Share) ---
  photo:              string | null;   // data:image/jpeg;base64,… (JPEG)
  photoSource:        "camera" | "gallery" | null;
  heading_deg:        number | null;   // Kompassrichtung beim Foto (0–359, Nord=0)
  photo_captured_at:  string | null;   // ISO-8601
  photo_gps:          GpsPoint | null; // GPS-Snapshot beim Auslösen
}
```

### 3.1 GpsPoint

```typescript
interface GpsPoint {
  lat:       number;              // Dezimalgrad, WGS-84
  lon:       number;              // Dezimalgrad, WGS-84
  accuracy:  number | null;       // Genauigkeitsradius in Metern
  alt:       number | null;       // Höhe über NN in Metern
  source:    "gps" | "exif" | "walk" | "manual" | "merged";
  timestamp?: string | null;      // ISO-8601 (optional, bei älteren Einträgen fehlend)
}
```

**`source`-Werte:**

| Wert | Bedeutung |
|---|---|
| `"gps"` | Direkt vom Gerät-GPS |
| `"exif"` | Aus EXIF-Daten eines Galerie-Fotos |
| `"walk"` | Beim Laufen zum nächsten Ziel nachgeholt (Fallback) |
| `"manual"` | Vom Nutzer manuell gesetzt |
| `"merged"` | Aus mehreren Quellen zusammengeführt |

Alle Koordinaten sind **WGS-84** (EPSG:4326). Dezimalgrad, nicht DMS.

### 3.2 Flock (Schützenpflock)

```typescript
interface Flock {
  color:      "red" | "blue" | "white";
  distance_m: number;   // Distanz in Metern
}
```

Das Drei-Farben-System:

| Farbe | Bedeutung | Distanz (typisch) |
|---|---|---|
| `"red"` | Weit | IFAA-Weit-Pflock |
| `"blue"` | Mittel (Standard) | IFAA-Blau-Pflock |
| `"white"` | Nah | IFAA-Nah-Pflock |

**IFAA-Vorschlagswerte** (überschreibbar):

| Kategorie | Rot (weit) | Blau (mittel) | Weiß (nah) |
|---|---|---|---|
| `xl` | 55 m | 41 m | 27 m |
| `large` | 41 m | 32 m | 23 m |
| `medium` | 32 m | 23 m | 14 m |
| `small` | 18 m | 14 m | 9 m |

### 3.3 SceneAnimal (Weitere Tiere an der Station)

```typescript
interface SceneAnimal {
  animal:   string;   // Tierbezeichnung (Freitext)
  category: "xl" | "large" | "medium" | "small";
}
```

Das Primärtier steht immer in `animal`/`category` des Target-Objekts. `scene[]` enthält nur die _weiteren_ Tiere, zwischen denen der Schütze vor Ort wählt.

---

## 4. Vollständiges Beispiel

```json
{
  "__type":    "littlejohn-parcours",
  "__version": 1,
  "name":      "Schaumberg D.K.",
  "location":  "Tholey, Saarland",
  "created_at": "2026-05-24T08:28:34.970Z",
  "gps": {
    "lat": 49.4912,
    "lon": 7.0348,
    "accuracy": null,
    "alt": 380,
    "source": "manual"
  },
  "targets": [
    {
      "number":     1,
      "animal":     "Wildschwein",
      "category":   "large",
      "distance_m": 22,
      "angle_deg":  -5,
      "gps": {
        "lat":      49.4911639,
        "lon":      7.0348083,
        "accuracy": 5,
        "alt":      371,
        "source":   "gps",
        "timestamp": "2026-05-24T09:42:00.000Z"
      },
      "flocks": [
        { "color": "red",   "distance_m": 41 },
        { "color": "blue",  "distance_m": 32 },
        { "color": "white", "distance_m": 23 }
      ],
      "scene": []
    },
    {
      "number":     15,
      "animal":     "Flamingo",
      "category":   "medium",
      "distance_m": 23,
      "angle_deg":  -3,
      "gps": {
        "lat": 49.4918417,
        "lon": 7.0319500,
        "accuracy": 4,
        "alt": 372,
        "source": "gps"
      },
      "flocks": [
        { "color": "red",   "distance_m": 32 },
        { "color": "blue",  "distance_m": 23 },
        { "color": "white", "distance_m": 14 }
      ],
      "scene": [
        { "animal": "Pelikan", "category": "large" }
      ]
    }
  ]
}
```

---

## 5. Rückwärtskompatibilität und Upgrade-Heuristik

### 5.1 Bekannte `__type`-Werte

| `__type` | Format | Status |
|---|---|---|
| `"littlejohn-parcours"` | BHS-001 v1 (dieses Dokument) | Aktuell |
| `"hawkeye-parcours"` | Legacy Robin/Marian v1/v2 | Deprecated |
| `"hawkeye-session"` | Legacy Session-Format | Deprecated → BHS-002 |

### 5.2 Empfohlene Import-Reihenfolge

Implementierungen sollten in dieser Reihenfolge vorgehen:

1. `__type === "littlejohn-parcours"` → BHS-001 Import
2. `__type === "hawkeye-parcours"` → Legacy-Pfad
3. Kein `__type`, aber `targets[]` vorhanden → BHS-001-kompatibler Parcours (Heuristik)

### 5.3 Defaults für fehlende Felder (Tolerantes Einlesen)

Implementierungen sollten fehlende optionale Felder auf folgende Defaults setzen:

```javascript
target.flocks     ??= [];
target.scene      ??= [];
target.photo      ??= null;
target.photoSource??= null;
target.heading_deg??= null;
```

---

## 6. Geplante Erweiterungen (v2)

Die folgenden Features sind für eine zukünftige Version geplant und **nicht** Teil von BHS-001 v1:

| Feature | Feld | Beschreibung |
|---|---|---|
| Freie Pflock-Labels | `pegs[].label` | Ersetzt das Drei-Farben-System durch frei wählbare Labels |
| GPS-Merge-History | `gps_candidates[]` | Nachvollziehbarkeit bei gemergten GPS-Punkten |
| Parcours-Theme | `theme` | CSS-Token-Override für Darstellung in Scoring-Apps |
| Metadaten-Felder | `updated_at`, `mapped_at`, `mapped_by` | Versionierung und Attribution |
| Parcours-ID | `id` | Standardisierte UUID für Community-Server-Lookups |

Bis zur Verabschiedung von v2 bleiben diese Felder undefiniert — Implementierungen sollten sie ignorieren wenn vorhanden.

---

## 7. JSON Schema

Zur Validierung: [`../schemas/parcours-v1.schema.json`](../schemas/parcours-v1.schema.json)

---

## 8. Referenz-Implementierungen

| App | Rolle | Link |
|---|---|---|
| LittleJohn | Kanonischer Erzeuger | [codeberg.org/bowhuman/littlejohn](https://codeberg.org/bowhuman/littlejohn) |
| Robin | Scoring-App, primärer Konsument | [codeberg.org/bowhuman/robin](https://codeberg.org/bowhuman/robin) |
| Marian | Desktop-Analyse, Konsument | [codeberg.org/bowhuman/marian](https://codeberg.org/bowhuman/marian) |

---

## Changelog

| Version | Datum | Änderungen |
|---|---|---|
| 1.0 | 2026-06-25 | Erste öffentliche Veröffentlichung |
