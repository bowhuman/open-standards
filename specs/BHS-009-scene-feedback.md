# BHS-009: Scene Feedback

| Feld | Wert |
|---|---|
| Nummer | BHS-009 |
| Titel | Scene Feedback |
| Status | **DRAFT** |
| Version | 0.9 |
| Datum | 2026-09-24 |
| Autor | bowhuman |
| Abhängig von | BHS-001 (Parcours Exchange Format — referenziert `Target.number`/`Target.animal`, verändert das Format aber nicht) · BHS-002 §7 (`SessionWeather` — wird 1:1 übernommen) |

> **DRAFT**: Erstvorschlag zur Diskussion, entstanden aus der Robin-V1.1-Session „Feedback zur Szene" (2026-09-24). Feldnamen und Struktur können sich vor STABLE noch ändern. Backend-Implementierung ist Gegenstand einer Folgesession.

---

## Kurzfassung

Dieses Dokument definiert ein Format für **Rückmeldungen von Schützen zu einer einzelnen Station (Szene) eines Parcours** (`bhs-scene-feedback`): Bewertung (gut/schlecht), optional Foto/Text/Sprachmemo-Transkript, Kontext (Parcours, Ziel, Zeitpunkt, Wetter) und Zustellstatus an den Betreiber.

BHS-009 beschreibt **eine Rückmeldung zu einem Zeitpunkt** — keine Parcours-Eigenschaft und keine Wertung. Es ändert nichts an BHS-001; ein Ziel referenziert sich selbst nicht (der Parcours kennt sein Feedback nicht), sondern das Feedback referenziert das Ziel per `target_number`/`target_animal`.

## 1. Geltungsbereich

### 1.1 Warum nicht Teil von BHS-001

BHS-001 beschreibt den **austauschbaren, statischen** Zustand eines Parcours. Feedback ist **laufzeit-/sessionbezogen** — ein Schütze meldet zu einem Zeitpunkt etwas über eine Station, das den Parcours selbst nicht verändert. Das entspricht der bereits etablierten Abgrenzung zwischen BHS-004 (Wertungsregeln, dauerhaft) und BHS-006 (Turnier-Event-Metadaten, laufzeitbezogen): unterschiedliche Lebensdauer der Daten begründet unterschiedliche Dokumente.

### 1.2 Was BHS-009 beschreibt

- Eine einzelne Feedback-Meldung: Bewertung, optionaler Text, optionales Foto, optionales Sprachmemo (+ serverseitiges Transkript)
- Kontext zum Zeitpunkt der Meldung: Parcours-Referenz, Ziel-Referenz, Zeitstempel, Wetter (`SessionWeather`, BHS-002 §7)
- Anonymitäts-Flag und optionale Kontaktreferenz
- Zustellstatus an den Betreiber (Kanban-artig: neu/in Arbeit/erledigt)

### 1.3 Was BHS-009 nicht beschreibt

| Was | Stattdessen |
|---|---|
| Parcours-/Zielstruktur | BHS-001 |
| Wetter-Feldformat | BHS-002 §7 (`SessionWeather`, unverändert übernommen) |
| Stationszustand/Verschleiß-Inspektion (LittleJohn) | eigenes, noch nicht spezifiziertes Dokument — inhaltlich verwandt (Foto + Ziel-Referenz), aber ein anderer Zweck (Wartung statt Schützen-Meinung) und ein anderer Absender (Betreiber-Personal statt Schütze) |
| Transkriptions-Anbieter, Mail-Versand, DB-Schema | implementierungsspezifisch, nicht Teil des offenen Standards (analog zur Live-Kapazität in BHS-006 §2.10) |

---

## 2. Wurzelobjekt

```json
{
  "__type":    "bhs-scene-feedback",
  "__version": 1,
  "id":        "b6e1a1a0-...-uuid",
  "created_at": "2026-09-24T14:32:00.000Z",
  "rating":    "schlecht",
  "parcours":  { "name": "Schaumberg D.K.", "gps": { "lat": 49.491, "lon": 7.034 } },
  "target":    { "number": 7, "animal": "Wildschwein" },
  "text":      "Der Ständer wackelt stark.",
  "photo_url": null,
  "audio_url": "https://.../feedback/b6e1.../memo.webm",
  "transcript": null,
  "transcript_status": "pending",
  "anonymous": true,
  "weather":   { "source": "open-meteo", "fetched_at": "2026-09-24T14:32:01.000Z", "temperature_c": 14.2, "wind_speed_kmh": 8, "wind_dir_deg": 210, "wind_dir_label": "SW", "weather_code": 3, "condition": "Overcast", "precipitation_mm": 0, "visibility_m": null },
  "status":    "neu"
}
```

### Felder

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `__type` | `"bhs-scene-feedback"` | ✅ | Format-Marker |
| `__version` | `1` | ✅ | Schema-Version |
| `id` | UUID | ✅ | Eindeutige Meldungs-ID |
| `created_at` | ISO-8601 | ✅ | Zeitpunkt der Meldung (Client-Uhrzeit) |
| `rating` | `"gut" \| "schlecht"` | ✅ | Kernbewertung |
| `parcours` | `ParcoursRef` | ✅ | s. 2.1 |
| `target` | `TargetRef` | ✅ | s. 2.2 |
| `text` | `string \| null` | — | Freitext-Kommentar |
| `photo_url` | `string \| null` | — | hochgeladenes Foto |
| `audio_url` | `string \| null` | — | hochgeladenes Sprachmemo (Rohaudio) |
| `transcript` | `string \| null` | — | serverseitig erzeugtes Transkript von `audio_url` |
| `transcript_status` | `"pending" \| "done" \| "failed" \| null` | — | nur gesetzt wenn `audio_url` vorhanden |
| `anonymous` | `boolean` | ✅ | Default `true`. Bei `false` ist der Schütze für Rückfragen erreichbar — **nur wirksam, wenn ein Konto existiert**, s. §5 |
| `weather` | `SessionWeather \| null` | — | exakt BHS-002 §7, `null` wenn `parcours.gps` fehlt |
| `status` | `"neu" \| "in_arbeit" \| "erledigt"` | ✅ | Bearbeitungsstatus beim Betreiber, Default `"neu"` |

### 2.1 ParcoursRef

```typescript
interface ParcoursRef {
  name: string;                 // Freitext, wie in BHS-001 Wurzelobjekt
  gps:  GpsPoint | null;        // BHS-001 §3.1 — Basis für die Wetterabfrage
}
```

Keine Parcours-ID: BHS-001 v1 hat keine stabile ID (s. BHS-001 §6, v2-Feature). Server-seitiges Matching auf eine interne Parcours-ID ist Implementierungssache, nicht Teil dieses Standards.

### 2.2 TargetRef

```typescript
interface TargetRef {
  number: number;   // BHS-001 Target.number
  animal: string;   // BHS-001 Target.animal
}
```

---

## 3. Anonymität und Kontakt

BHS-009 speichert **keine** Kontaktdaten des Schützen im Feedback-Objekt selbst. Ist `anonymous: false` und existiert eine Konto-Beziehung (z.B. Sherwood), wird diese **getrennt** referenziert (implementierungsspezifisch, z.B. `contact_archer_id`) — nicht Teil dieses Dokuments, analog zum Datensparsamkeits-Prinzip aus BHS-006 §2.7/BHS-007 (Klasse statt Geburtsdatum): das offene Format bleibt frei von direkt identifizierenden Feldern.

## 4. Wetter

Siehe BHS-002 §7. Wird **beim Absenden** der Meldung anhand von `parcours.gps` abgerufen (nicht anhand der Schützen-Position) — bewusster Unterschied zu `SessionWeather` in BHS-002, wo die Schützen-GPS die Quelle ist. Fehlt `parcours.gps`, bleibt `weather: null`.

## 5. Rückwärtskompatibilität

Neues Dokument, keine Vorgängerversion. `__type`/`__version` folgen der in BHS-001/BHS-002 etablierten Konvention.

## 6. Geplante Erweiterungen

| Feature | Beschreibung |
|---|---|
| `parcours.id` | Sobald BHS-001 v2 eine stabile Parcours-ID hat, hier referenzieren statt `name`/`gps` |
| Verknüpfung zum Inspektionstool | Falls das geplante LittleJohn-Inspektionstool (s. Betreiber-Architektur-Dokument) ein verwandtes Format bekommt, gemeinsame `TargetRef`-Definition prüfen |

## 7. JSON Schema

[`../schemas/scene-feedback-v1.schema.json`](../schemas/scene-feedback-v1.schema.json)

## 8. Referenz-Implementierungen

| App | Rolle |
|---|---|
| Robin | Erzeuger (Schütze sendet Feedback) |
| Sherwood | Konsument (Betreiber-Dashboard, Kanban) — **noch nicht implementiert**, Folgesession |

---

## Changelog

| Version | Datum | Änderungen |
|---|---|---|
| 0.9 | 2026-09-24 | Erster Entwurf |
