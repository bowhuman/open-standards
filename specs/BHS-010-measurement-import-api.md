# BHS-010: Measurement Import API

| Feld | Wert |
|---|---|
| Nummer | BHS-010 |
| Titel | Measurement Import API (Import von Messwerten) |
| Status | **DRAFT** |
| Version | 0.9 |
| Datum | 2026-10-21 |
| Autor | bowhuman (Tuck-Team) |
| Abhängig von | — (eigenständig; referenziert keinen anderen BHS-Typ) |
| Verwandt | BHS-002 (Session Export — Schießdaten einer Runde; BHS-010 beschreibt Körper- und Belastungsmesswerte, nicht Schüsse) |

> **DRAFT**: Erstvorschlag zur Diskussion, entstanden aus der Import-Schnittstelle der BOWHUMAN-Trainings-App (Tuck, Oktober 2026). Der Dienst ist produktiv, **eine externe Quelle hat bisher noch niemand angebunden**. Der Standard wird erst dann als STABLE verabschiedet, wenn mindestens eine echte Quelle (Uhr, Ring, App oder Export-Werkzeug) über diese Schnittstelle schreibt und die in §8 genannten offenen Punkte entschieden sind. Feldnamen, Grenzwerte und Fehlercodes können sich bis dahin ändern.

---

## Kurzfassung

Dieses Dokument beschreibt eine **HTTP-Schnittstelle**, über die eine Quelle (Sportuhr, Ring, Gesundheits-App, Tabellen-Export) Messwerte eines Schützen an einen Trainingsdienst sendet: Ruhepuls, Herzfrequenzvariabilität, Schlafdauer, Schritte, Belastungswerte des Anbieters. Es legt fest, wie sich eine Quelle ausweist (Token), wie der Anfragekörper aussieht, welche Regeln für die Felder gelten, wie Wiederholungen behandelt werden (Upsert über `external_id`) und was der Dienst antwortet.

Anders als BHS-001 bis BHS-009 ist BHS-010 **kein Dateiformat**, sondern ein Vertrag zwischen Maschine und Dienst. Es gibt deshalb keinen `__type`-Marker im Körper und (noch) kein JSON Schema (§8).

## 1. Geltungsbereich

### 1.1 Warum ein eigenes Dokument

BHS-002 beschreibt, was auf dem Parcours passiert — Schüsse, Zonen, Wetter. Messwerte vom Körper des Schützen kommen aus einer anderen Welt: Sie entstehen fortlaufend, stammen von Geräten, die BOWHUMAN nicht kennt, und werden von den Herstellern in jeweils eigenen Formaten ausgeliefert. Ein Trainingsdienst, der sie aufnehmen will, braucht eine **gemeinsame Eingangstür**, an die ein Hersteller oder ein Brücken-Werkzeug andocken kann, ohne das interne Datenmodell des Dienstes zu kennen. Diese Tür beschreibt BHS-010.

Die Felder sind so gewählt, dass eine verlustfreie Abbildung auf **Open mHealth** (header-1.2, time-frame-1.0, unit-value-1.0) möglich ist (§6), ohne dessen Schemata zu übernehmen. Einheiten werden als **UCUM-Codes** geführt (§7).

### 1.2 Was BHS-010 beschreibt

- Das Token-Modell: Form, Bindung an eine Quelle, Lebenslauf (§3)
- Den Endpunkt `POST /import`: Anfrage, Feldregeln, Alles-oder-nichts, Upsert, Antwort (§4)
- Die Fehlerantworten 400, 401, 413, 429 und ihre Reihenfolge (§5)
- Die Feldkonvention zu Open mHealth (§6)
- Ein empfohlenes Metrik-Vokabular mit UCUM-Einheiten (§7)

### 1.3 Was BHS-010 nicht beschreibt

| Was | Stattdessen |
|---|---|
| Wie der Schütze einen Token anlegt, auflistet oder widerruft | implementierungsspezifisch — der Dienst bietet dafür eine eigene, mit dem Konto des Schützen angemeldete Oberfläche oder API; BHS-010 legt nur fest, was ein Token **ist** (§3) |
| Wie der Schütze oder andere Personen die importierten Werte lesen | implementierungsspezifisch; der Trainer-Lesepfad ist zudem noch nicht entschieden (§8) |
| Ob und wie Messwerte in Belastungsrechnung, Regeln oder Punkte eingehen | Sache des Dienstes, nicht Teil des Austauschvertrags |
| Anbindung an einen bestimmten Anbieter (Garmin, Polar, Apple Health, Oura …) | Aufgabe eines Brücken-Werkzeugs, das BHS-010 **konsumiert** |
| Datenbankschema, Hash-Verfahren, Drossel-Technik | implementierungsspezifisch (analog BHS-006 §2.10, BHS-009 §1.3) |

---

## 2. Rollen und Begriffe

| Begriff | Bedeutung |
|---|---|
| **Schütze** | Die Person, deren Messwerte übertragen werden. Sie besitzt ein Konto beim Dienst und entscheidet, welche Quellen schreiben dürfen. |
| **Quelle** (`source`) | Ein Gerät oder eine App, die Messwerte liefert — bezeichnet durch einen kurzen Schlüssel wie `garmin`, `polar`, `apple_health`, `oura`, `csv`. Form: `^[a-z][a-z0-9_-]{1,39}$`. |
| **Token** | Ein Geheimnis, das genau **eine Quelle eines Schützen** ausweist (§3). |
| **Dienst** | Der Server, der `POST /import` anbietet und die Werte dem Schützen zuordnet. |
| **Eintrag** (`item`) | Ein einzelner Messwert: Metrik, Zahl, Einheit, Zeitpunkt oder Zeitraum, optional Kennung und Rohdaten der Quelle. |

Die Pfade in diesem Dokument sind **relativ zur Basis-URL des Dienstes**. Die BOWHUMAN-Implementierung liegt unter `https://sherwood.bowhuman.eu/api/tuck/`; `POST /import` heißt dort also `POST https://sherwood.bowhuman.eu/api/tuck/import`.

---

## 3. Token-Modell

### 3.1 Form

```
ti_<64 Zeichen aus [0-9a-f]>
```

Präfix `ti_` („training import"), danach 64 Hexadezimalzeichen — das sind 32 Zufallsbytes. Das Präfix macht einen Token in Logs, Skripten und Fehlermeldungen als Import-Token erkennbar und von anderen Schlüsseln des Dienstes unterscheidbar. Ein Token, der nicht auf `^ti_[0-9a-f]{64}$` passt, ist unförmig und wird wie ein unbekannter Token behandelt (§5.2).

### 3.2 Ein Token = eine Quelle = ein Gerät

Die Quelle (`source`) **steht im Token**, nicht im Anfragekörper. Der Schütze legt den Token beim Dienst für genau eine Quelle an („Garmin-Uhr") und hinterlegt ihn in dieser Quelle beziehungsweise im Brücken-Werkzeug. Der Dienst weiß dadurch bei jedem Aufruf, von wem die Werte stammen, ohne der Quelle zu vertrauen. Ein optionales `source`-Feld im Körper darf nur **bestätigen**, was der Token sagt (§4.2, `source_mismatch`).

Daraus folgt: Wer zwei Uhren hat, legt zwei Token an. Wer ein Export-Werkzeug zusätzlich betreibt, legt einen dritten an. Der Dienst darf die Zahl aktiver Token je Schütze begrenzen; die BOWHUMAN-Implementierung erlaubt **höchstens 5**.

### 3.3 Lebenslauf

| Schritt | Wer | Festlegung |
|---|---|---|
| Anlegen | Schütze, angemeldet beim Dienst | Der Klartext wird **genau einmal** ausgeliefert, in der Antwort auf das Anlegen. Der Dienst speichert nur einen Hash. Ging der Token verloren, gibt es keine Wiederherstellung: widerrufen und neu verbinden. |
| Benutzen | Quelle, `POST /import` | Der Dienst sucht den Hash, prüft, dass der Token nicht widerrufen ist und dass das Konto noch als Schütze berechtigt ist. Ein Zeitstempel „zuletzt benutzt" wird **nur nach erfolgreichem Schreiben** gesetzt — eine abgelehnte oder gescheiterte Anfrage zählt nicht als Benutzung. |
| Widerrufen | Schütze | Setzt einen Widerrufszeitpunkt; danach antwortet `POST /import` mit 401. Der Widerruf ist endgültig und idempotent. |
| Berechtigung erlischt | Dienst | Verliert der Schütze seine Rolle beim Dienst (etwa durch Entfernen aus allen Trainingsgruppen), gelten seine Token als widerrufen. |

### 3.4 Umgang mit dem Token

Der Token ist ein Geheimnis vom Rang eines Passworts. Er gehört in den Schlüsselbund der Quelle oder in eine Umgebungsvariable, **nie** in ein Skript, eine Konfigurationsdatei oder ein Repository, das weitergegeben wird. Der Dienst gibt in keiner Antwort und in keiner Liste den Klartext oder den Hash zurück.

---

## 4. Endpunkt `POST /import`

### 4.1 Anfrage

```
POST /import
Authorization: Bearer ti_<64 Hex>
Content-Type: application/json
```

```json
{
  "items": [
    {
      "external_id": "garmin-daily-2026-10-21",
      "measured_at": "2026-10-21T00:00:00+02:00",
      "period_end":  "2026-10-21T23:59:59+02:00",
      "metric":      "resting_hr",
      "value":       48,
      "unit":        "/min",
      "payload":     { "summaryId": "x1" }
    }
  ]
}
```

Ein Aufruf trägt **einen Schützen** (über den Token) und **eine Quelle** (über den Token) und beliebig viele Einträge innerhalb der Grenzen aus §4.2.

### 4.2 Felder

Wurzel:

| Feld | Typ | Pflicht | Regel | Fehlercode |
|---|---|---|---|---|
| `items` | `Item[]` | ✅ | 1 bis **200** Einträge | `empty_entry`, `too_many_items` |
| `source` | `string` | — | wenn angegeben, muss es der Quelle des Tokens gleichen | `source_mismatch` |

`Item`:

| Feld | Typ | Pflicht | Regel | Fehlercode |
|---|---|---|---|---|
| `measured_at` | ISO-8601 | ✅ | **mit Zeitzonenangabe**; höchstens 1 Tag in der Zukunft | `invalid_time`, `future` |
| `period_end` | ISO-8601 | — | wie `measured_at`; nicht vor `measured_at`. Gesetzt für Zeitraum-Werte (Tagessumme, Schlafnacht), weggelassen für Zeitpunkt-Werte | `invalid_time`, `future`, `invalid_range` |
| `metric` | `string` | ✅ | `^[a-z][a-z0-9_]{1,39}$`; nicht auf der Negativliste (§4.6) | `invalid_metric`, `metric_excluded` |
| `value` | `number` | ✅ | endliche Zahl; wird auf 3 Nachkommastellen gerundet; Betrag < 1 000 000 000 | `invalid_value` |
| `unit` | `string` | — | ≤ 20 Zeichen, als UCUM-Code (§7); leer = keine Einheit | `invalid_unit` |
| `external_id` | `string` | — | 1–120 Zeichen; **je Aufruf eindeutig**; Schlüssel für den Upsert (§4.4) | `invalid_external_id` |
| `source` | `string` | — | wie an der Wurzel: darf nur die Quelle des Tokens bestätigen | `source_mismatch` |
| `payload` | `object` | — | Rohdaten der Quelle als Beleg; als JSON ≤ 2048 Bytes; wird nicht ausgewertet und nicht wieder ausgeliefert | `invalid_payload` |

Zeitangaben **ohne** Zeitzone (`2026-10-21T06:30:00`) werden abgelehnt, weil eine Uhr, ein Server und ein Schütze in drei verschiedenen Zonen stehen können und der Dienst nicht raten soll.

### 4.3 Alles oder nichts

Ein Aufruf wird **als Ganzes** angenommen oder **als Ganzes** abgelehnt. Ein einziger fehlerhafter Eintrag führt zu 400 für den gesamten Aufruf; es wird dann nichts geschrieben. Die Fehlermeldung nennt die Position des ersten fehlerhaften Eintrags („Eintrag N: …", 1-basiert). Der Dienst schreibt in einer Transaktion.

Für die Quelle heißt das: Ein Aufruf darf nicht halb erfolgreich sein, also kann sie nach einem 400 den ganzen Block korrigieren und erneut senden, ohne Dubletten zu erzeugen (§4.4).

### 4.4 Upsert über `external_id`

Ein Eintrag mit `external_id` wird über das Paar **(Quelle des Tokens, `external_id`)** identifiziert. Trifft ein Eintrag mit bekanntem Paar ein, **überschreibt** er den gespeicherten Wert (Zeit, Metrik, Zahl, Einheit, Rohdaten). Das ist der vorgesehene Weg für Tageswerte, die ein Anbieter im Lauf des Tages nachreicht, und für Wiederholungen nach einem Übertragungsfehler.

Ein Eintrag **ohne** `external_id` wird **immer neu eingefügt**. Wer denselben Wert zweimal ohne Kennung sendet, hat ihn zweimal. Quellen, die wiederholt senden, sollen deshalb eine stabile `external_id` vergeben — die Kennung des Anbieters oder eine Kombination aus Metrik und Tag (`2026-10-21-rhr`).

Dieselbe `external_id` darf innerhalb **eines** Aufrufs nur einmal vorkommen (`invalid_external_id`).

### 4.5 Antwort bei Erfolg

```
200 OK
{ "data": { "received": 1, "inserted": 1, "updated": 0 } }
```

| Feld | Bedeutung |
|---|---|
| `received` | Zahl der Einträge im Aufruf |
| `inserted` | davon neu angelegt |
| `updated` | davon über `external_id` überschrieben |

`received = inserted + updated` gilt immer. Ein zweiter Aufruf mit denselben `external_id`-Werten liefert `inserted: 0, updated: N`.

### 4.6 Negativliste

Der Dienst nimmt bestimmte Metriken grundsätzlich **nicht** an und antwortet mit 400 `metric_excluded`. Hintergrund ist eine inhaltliche Entscheidung des Trainingsdienstes: selbst gemeldete Energie**aufnahme** und Körpergewicht sollen in einer Trainings-App nicht landen, weil sie dort mehr schaden als nützen.

Derzeitige Negativliste (wörtlich, wird am Dienst geprüft):

```
body_weight, weight, kcal, calories, energy_kcal, body_fat
```

**Vorgesehen, noch nicht umgesetzt:** Vom Gerät **gemessener Energieverbrauch** (`active_energy`, §7) soll angenommen werden — er ist eine Belastungsgröße, keine Selbstauskunft. Selbst gemeldete Aufnahme (gegessene Kalorien) und Gewicht bleiben ausgeschlossen. Dafür wird die Negativliste überarbeitet und die bisher fehlende Prüfung der **Einheit** nachgezogen (`kcal` als `unit` einer anderen Metrik wird heute nicht abgewiesen). Bis diese Änderung veröffentlicht ist, sollen Quellen **keine Energiewerte senden** (§8).

---

## 5. Fehlerantworten

### 5.1 Form

Alle Fehlerantworten tragen einen JSON-Körper mit einer menschenlesbaren Meldung in `error`. Antworten auf Feldfehler (400 aus §4.2) tragen zusätzlich einen maschinenlesbaren `code`:

```json
{ "error": "Eintrag 3: Die Zeit braucht eine Zeitzone.", "code": "invalid_time" }
```

Für 401, 413, 429 und das 400 bei ungültigem JSON ist nur `error` festgelegt; ein `code` ist für sie **nicht** definiert. Quellen werten für diese Fälle den HTTP-Status aus.

### 5.2 Statuscodes

| Status | Wann | Körper | Verhalten der Quelle |
|---|---|---|---|
| **400** | Körper ist kein gültiges JSON | `{ "error": "Ungültiges JSON." }` | Fehler im Werkzeug, nicht wiederholen |
| **400** | Feldfehler (§4.2), Negativliste, `source_mismatch` | `{ "error", "code" }`, Meldung mit „Eintrag N: …" | Block korrigieren, ganz erneut senden |
| **401** | Token fehlt, ist unförmig, unbekannt, widerrufen, oder das Konto ist kein Schütze mehr | `{ "error": "Import-Token ungültig." }` | Nicht wiederholen; der Schütze muss die Quelle neu verbinden. Die Meldung ist für **alle** Ursachen gleich, damit ein Angreifer nicht erfährt, ob ein Token existiert |
| **413** | Anfragekörper zu groß | `{ "error": "Anfrage zu groß." }` | In kleinere Blöcke teilen (§5.4) |
| **429** | Drossel (§5.3) | `{ "error": "Zu viele Importe. Bitte kurz warten." }` | Warten, dann wiederholen; `RateLimit-Reset` beachten |
| **500** | Dienstfehler | `{ "error": … }` | Später wiederholen; der Token gilt nicht als benutzt |

### 5.3 Drossel (429)

Der Dienst begrenzt Aufrufe **je Token**: in der BOWHUMAN-Implementierung **60 Aufrufe je 15 Minuten**. Bei unförmigem oder fehlendem Token zählt die Drossel je IP-Adresse. Abgelehnte Anmeldungen (401) und abgelehnte Blöcke (400 Feldfehler) zählen mit; 413 und 400 „Ungültiges JSON" liegen vor der Drossel und zählen nicht.

Der Dienst weist die Drossel in den Kopfzeilen `RateLimit-Policy`, `RateLimit-Limit`, `RateLimit-Remaining` und `RateLimit-Reset` aus (IETF-Entwurf *RateLimit header fields for HTTP*). Beispiel aus der BOWHUMAN-Implementierung: `RateLimit-Policy: 60;w=900`.

Eine Quelle, die ihre Tageswerte einmal täglich in einem Block sendet, berührt die Drossel nie. Wer je Metrik einen eigenen Aufruf macht, erreicht sie schnell — Einträge bündeln ist der vorgesehene Weg.

### 5.4 Körpergröße (413)

Der Dienst darf die Größe des Anfragekörpers begrenzen. Die BOWHUMAN-Implementierung begrenzt auf **100 kB**. Damit gilt:

- **Knappe Einträge** (ohne `payload`, kurze `external_id`) passen zu 200 bequem in einen Aufruf (≈ 25 kB).
- **Voll ausgereizte Einträge** (120 Zeichen `external_id`, 2 kB `payload`) passen nur **etwa 40** je Aufruf.

Wer Rohdaten mitschickt, teilt deshalb in Blöcke zu **höchstens 40 Einträgen**. Die Grenze von 200 Einträgen (§4.2) ist die obere Schranke, nicht die Zusage, dass 200 beliebige Einträge passen.

### 5.5 Reihenfolge der Prüfungen

Der Dienst prüft in dieser Reihenfolge; die erste zutreffende Antwort gewinnt:

1. **413** Körpergröße — vor allem anderen; auch ein Aufruf ohne Token bekommt bei zu großem Körper 413 statt 401
2. **400** „Ungültiges JSON."
3. **429** Drossel
4. **401** Token
5. **400** Feldfehler, Negativliste, `source_mismatch`
6. **200** Schreiben in einer Transaktion

Diese Reihenfolge ist Teil des Vertrags, weil eine Quelle sonst aus einem 413 nicht schließen kann, ob ihr Token überhaupt geprüft wurde.

---

## 6. Feldkonvention: Entsprechung zu Open mHealth

BHS-010 übernimmt kein Open-mHealth-Schema, hält die Felder aber so, dass eine Abbildung auf header-1.2, time-frame-1.0 und unit-value-1.0 **ohne Verlust** möglich ist. Ein Brücken-Werkzeug, das Open-mHealth-Datenpunkte vorliegen hat, bildet so ab:

| BHS-010 | Open mHealth |
|---|---|
| `measured_at` + `period_end` | `effective_time_frame.time_interval` (`start_date_time` / `end_date_time`) |
| `measured_at` ohne `period_end` | `effective_time_frame.date_time` (Zeitpunkt) |
| `external_id` | `header.source_data_point_id` |
| `source` (aus dem Token) | `header.acquisition_provenance.source_name` |
| `value` + `unit` | `unit-value` (`value`, `unit`) |
| `metric` | Schema-Name des Datenpunkts (z. B. `heart-rate`, `step-count`), über die Tabelle in §7 |
| `payload` | der vollständige Datenpunkt der Quelle als Beleg — nicht ausgewertet |

Umgekehrt kann aus einem gespeicherten BHS-010-Eintrag ein Open-mHealth-Datenpunkt erzeugt werden, ohne dass Information fehlt. Das ist der Zweck der Konvention: BHS-010 soll **keine Insel** sein.

---

## 7. Empfohlenes Metrik-Vokabular

Der Dienst **prüft das Vokabular nicht** — jede Metrik, die der Form aus §4.2 genügt und nicht auf der Negativliste steht, wird angenommen. Die Tabelle ist eine Empfehlung, damit Quellen und Auswertungen dieselben Namen verwenden. Einheiten sind **UCUM-Codes** (Unified Code for Units of Measure, Version 2.2).

| `metric` | Bedeutung | `unit` (UCUM) | Zeitform | Open mHealth |
|---|---|---|---|---|
| `resting_hr` | Ruhepuls | `/min` | Zeitpunkt oder Tag | `heart-rate` |
| `heart_rate_avg` | mittlere Herzfrequenz einer Einheit | `/min` | Zeitraum | `heart-rate` |
| `hrv_rmssd` | Herzfrequenzvariabilität (RMSSD) | `ms` | Zeitpunkt oder Nacht | — |
| `sleep_minutes` | Schlafdauer | `min` | Zeitraum (Nacht) | `sleep-duration` |
| `steps` | Schritte | `1` | Zeitraum (Tag) | `step-count` |
| `training_load_external` | Belastungswert des Anbieters, ohne Umrechnung | `1` | Zeitraum | — |

Vorgesehen, **noch nicht umgesetzt** (§4.6, §8):

| `metric` | Bedeutung | `unit` (UCUM) | Zeitform | Open mHealth |
|---|---|---|---|---|
| `active_energy` | vom Gerät gemessener Energieverbrauch durch Aktivität | `kcal` | Zeitraum | `calories-burned` |

Hinweise zu den UCUM-Codes: `/min` ist „pro Minute" (Schläge sind dimensionslos), `1` ist die Einheit für reine Zählwerte und dimensionslose Indizes, `ms` und `min` sind Millisekunde und Minute, `kcal` die Kilokalorie. UCUM unterscheidet Groß- und Kleinschreibung.

Was **nicht** gesendet werden soll: Werte, die der Schütze selbst eintippt (Befinden, Schmerz, Ernährung) — dafür hat ein Trainingsdienst eigene Eingaben mit eigenen Regeln. BHS-010 ist für **gemessene** Werte gedacht.

---

## 8. Offene Punkte

Diese Punkte sind der Grund, warum BHS-010 DRAFT ist. Sie werden vor STABLE entschieden und im Changelog nachgetragen.

| Punkt | Stand |
|---|---|
| **Energieverbrauch** | Entschieden, nicht umgesetzt: `active_energy` soll angenommen werden, Aufnahme und Gewicht bleiben draußen (§4.6). Braucht eine Überarbeitung der Negativliste und eine Einheitenprüfung. Bis dahin: keine Energiewerte senden. |
| **Trainer-Lesepfad** | Entschieden, nicht umgesetzt: Trainer einer Gruppe sollen Importwerte ihrer Schützen als Rohdaten lesen dürfen (Begründung: sportmedizinische Auswertung in einer Anfangsphase, schriftliche Einwilligung der Gruppe). Der Lesepfad ist nicht Teil dieses Vertrags (§1.3), aber eine Quelle und ein Schütze sollen wissen, wer die Werte sieht. Für `active_energy` ist zusätzlich eine Freigabe durch den Schützen vorgesehen. |
| **Erste echte Quelle** | Noch keine. STABLE erst, wenn eine Uhr, ein Ring, eine App oder ein Export-Werkzeug produktiv über BHS-010 schreibt und die Erfahrung daraus eingearbeitet ist. |
| **Einheiten-Negativliste** | `kcal` als `unit` wird heute nicht geprüft, nur als `metric`. Wird mit dem Energie-Punkt zusammen gelöst. |
| **JSON Schema** | Es gibt noch keines. Das Validierungs-Werkzeug dieses Repositorys ordnet Beispiele über `__type` zu; ein Anfragekörper hat keinen `__type`. Ob der Körper einen Marker bekommt oder das Schema eigenständig geführt wird, ist offen. |
| **Verdichtung und Einfluss** | Ob Ruhepuls oder HRV in Belastungsampel oder Regeln eingehen, ist Sache des Dienstes — derzeit bewusst nicht, weil die Daten noch nicht verlässlich genug sind. Berührt den Vertrag nicht, wohl aber die Erwartung der Quelle, was aus ihren Werten wird. |

---

## 9. Datenschutz und Sicherheit

- Der Anfragekörper enthält **keine** Angaben zur Person. Die Zuordnung zum Schützen geschieht ausschließlich über den Token; Name, E-Mail oder Geburtsdatum kommen in BHS-010 nicht vor (Datensparsamkeit wie in BHS-007 und BHS-009).
- Der Dienst speichert vom Token nur einen Hash. Klartext gibt es einmal, beim Anlegen.
- `payload` wird gespeichert, aber **nicht ausgewertet** und **nicht wieder ausgeliefert**. Es ist ein Beleg für Rückfragen, kein Datenkanal.
- Die 401-Meldung ist für alle Ursachen gleich (§5.2).
- Ein Token schreibt nur Werte **eines** Schützen aus **einer** Quelle. Ein kompromittierter Token kann falsche Werte für diese eine Person einschleusen, aber nichts lesen und niemanden sonst betreffen. Der Schütze beendet das durch Widerruf.

---

## 10. Beispiel

Täglicher Ruhepuls aus einem Export-Skript, Token in der Umgebungsvariablen `IMPORT_TOKEN`:

```bash
curl -s -X POST https://sherwood.bowhuman.eu/api/tuck/import \
  -H "Authorization: Bearer $IMPORT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"external_id":"2026-10-21-rhr","measured_at":"2026-10-21T06:30:00+02:00","metric":"resting_hr","value":48,"unit":"/min"}]}'
```

Erster Aufruf: `{"data":{"received":1,"inserted":1,"updated":0}}`
Zweiter Aufruf mit derselben `external_id`: `{"data":{"received":1,"inserted":0,"updated":1}}`

Tageszusammenfassung mit Zeitraum und Rohdaten:

```json
{
  "items": [
    { "external_id": "garmin-sleep-2026-10-20", "measured_at": "2026-10-20T22:40:00+02:00", "period_end": "2026-10-21T06:10:00+02:00", "metric": "sleep_minutes", "value": 450, "unit": "min", "payload": { "sleepScore": 81 } },
    { "external_id": "garmin-steps-2026-10-20", "measured_at": "2026-10-20T00:00:00+02:00", "period_end": "2026-10-20T23:59:59+02:00", "metric": "steps", "value": 8412, "unit": "1" },
    { "external_id": "garmin-hrv-2026-10-20",   "measured_at": "2026-10-20T22:40:00+02:00", "period_end": "2026-10-21T06:10:00+02:00", "metric": "hrv_rmssd", "value": 62.5, "unit": "ms" }
  ]
}
```

---

## 11. Rückwärtskompatibilität

Neues Dokument, keine Vorgängerversion. Da der Anfragekörper keinen `__type`/`__version`-Marker trägt, ist die Version dieses Dokuments die Version des Vertrags. Breaking Changes (neue Pflichtfelder, geänderte Fehlercodes, geänderte Prüfreihenfolge) werden nach dem Verfahren in `CONTRIBUTING.md` angekündigt. Das **Hinzufügen** von Metriken zum Vokabular (§7) und das **Verkürzen** der Negativliste (§4.6) sind keine Breaking Changes.

## 12. Referenz-Implementierungen

| System | Rolle | Stand |
|---|---|---|
| Tuck (BOWHUMAN-Trainings-App, Backend Sherwood) | Dienst — bietet `POST /import`, Token-Verwaltung und Lesepfad für den Schützen | produktiv seit 2026-10-21 |
| — | Quelle | **keine** — der erste Implementierer einer Quelle ist Voraussetzung für STABLE (§8) |

---

## Changelog

| Version | Datum | Änderungen |
|---|---|---|
| 0.9 | 2026-10-21 | Erster Entwurf aus der Import-Schnittstelle der BOWHUMAN-Trainings-App. Offen: Energieverbrauch, Trainer-Lesepfad, Einheiten-Negativliste, JSON Schema, erste echte Quelle. |
