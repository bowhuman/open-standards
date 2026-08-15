# BHS-008: Class System Metadata

| Feld | Wert |
|---|---|
| Nummer | BHS-008 |
| Titel | Class System Metadata |
| Status | **DRAFT** |
| Version | 0.9 |
| Datum | 2026-08-15 |
| Autor | bowhuman |
| Abhängig von | BHS-003 (Venue & Club Metadata — `Association` §3.10, `Discipline` §3.13, `EquipmentClass` §3.7) · BHS-006 (Tournament Metadata — `Eligibility`) · BHS-007 (Archer Metadata — `classes`) |
| Abgrenzung zu | BHS-004 (Punkteschema — *wie* aus einem Treffer Punkte werden) |

> **DRAFT**: Erstentwurf. Feldnamen und Struktur können sich vor STABLE noch ändern.

---

## Kurzfassung

Dieses Dokument definiert ein Metadatenformat für **Wertungssysteme**
(`bhs-class-system`): die Regeln, nach denen sich entscheidet, **wer mit wem
gewertet wird** und **von welchem Pflock** geschossen wird.

Ein Wertungssystem beantwortet die Frage, in welcher Klasse eine Person
startet — abgeleitet aus Bogenart, Jahrgang und Geschlecht. Es beantwortet
**nicht**, wie aus einer Trefferzone ein Punktwert wird; das regelt BHS-004.

### Warum die beiden auseinandergehalten werden müssen

Im deutschen Sprachgebrauch heißen beide „Wertung", und genau daraus entsteht
Verwirrung. Sie haben aber unterschiedliche Gegenstände, unterschiedliche
Herausgeber und unterschiedliche Lebensdauern:

| | BHS-004 · Punkteschema | BHS-008 · Wertungssystem |
|---|---|---|
| Beantwortet | Wie viele Punkte ist dieser Treffer wert? | Gegen wen trete ich an? |
| Beispiel | IFAA 3-Pfeil (20/16/10) | DSB 3D: Herren, Damen, Masters, Blankbogen Jugend |
| Bezeichner | `bhs-scoring-system` | `bhs-class-system` |
| Wechselt | selten, verbandsübergreifend | je Verband und Disziplin verschieden |

Ein Turnier kombiniert beide frei: dieselbe DFBV-Drei-Pfeil-Runde kann mit
DSB-Klassen oder mit den eigenen Klassen eines Dorfturniers gewertet werden.

---

## 1. Geltungsbereich

### 1.1 Aufnahmekriterium

Ein Feld gehört in diesen Standard, wenn es beim **Austausch zwischen Systemen**
gebraucht wird — bei der Anmeldung zu einem Turnier, beim Erzeugen einer
Startliste oder beim Zusammenführen von Ergebnissen. Interne Verwaltungsfelder
eines Anbieters gehören nicht hinein.

### 1.2 Ausdrücklich nicht Gegenstand

* **Punktevergabe** → BHS-004
* **Ausschreibungstexte** (Zeitplan, Startgebühr, Ablauf) → BHS-006
* **Personendaten** → BHS-007

### 1.3 Datensparsamkeit

Ein Wertungssystem beschreibt **Regeln**, keine Personen. Es enthält
insbesondere keine Geburtsdaten. Die Auflösung einer Person auf eine Klasse
findet in der anwendenden Software statt; ob deren Eingangsdaten gespeichert
werden, entscheidet die Anwendung — BHS-006 §2.7 empfiehlt, die aufgelöste
Klasse zu speichern und Geburtsdatum und Geschlecht zu verwerfen.

> **Folge, die eine Anwendung kennen muss:** Wer dieser Empfehlung folgt, kann
> eine bestehende Meldung später **nicht neu auflösen**. Das Wertungssystem
> eines laufenden Turniers ist damit faktisch eingefroren, sobald die erste
> Meldung vorliegt. Anwendungen sollten das erzwingen, statt es zu riskieren.

---

## 2. Kernmodell

### 2.1 Schichten

Ein Wertungssystem besteht aus **Schichten** (`schichten`). Jede Schicht
beantwortet dieselbe Frage — „zu welcher Gruppe gehört diese Person?" — für
einen anderen Zweck:

| Schicht | Zweck | Lückenlos |
|---|---|---|
| `wertungsklasse` | Wettkampf: Ranking, Urkunden, Startlisten | nein |
| `altersgruppe` | Verwaltung: Mitgliederlisten, Jugendarbeit | ja |
| `pflockgruppe` | Distanz am Parcours | ja |

Die Trennung ist nicht akademisch. Im DSB-3D gibt es **keine** ausgeschriebene
Schülerklasse — ein Verein braucht die Gruppe „Schüler" für seine
Jugendarbeit trotzdem. Eine einzige Klassenliste könnte nur eines von beidem
richtig abbilden.

Weitere Schichten sind zulässig. Eine Anwendung, die eine unbekannte Schicht
nicht kennt, ignoriert sie.

### 2.2 Regeln

Eine Schicht enthält geordnete `regeln`. Die **erste passende** Regel gewinnt —
deshalb stehen spezielle Regeln vor allgemeinen.

```json
{ "key": "masters-m", "label": "Masters",
  "bows": ["Compound", "Blankbogen", "Langbogen"],
  "gender": "m", "age_min": 50 }
```

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `key` | ja | stabiler Bezeichner, maschinenlesbar |
| `label` | ja | Bezeichnung in Startliste und Ergebnis |
| `bows` | ja | Bogenarten; `["*"]` = alle |
| `gender` | nein | `m`, `w`, `d`; fehlt = gilt für alle |
| `age_min` / `age_max` | nein | Altersgrenzen, einschließlich |
| `peg` | nein | Pflockfarbe, überschreibt die der Bogenart |

### 2.3 Alter

Das Alter ist das **Sportjahresalter**: Kalenderjahr minus Geburtsjahr, ohne
Rücksicht auf den Geburtstag. So halten es die Sportordnungen, und so bleibt
die Klasse über eine Saison stabil.

### 2.4 Bogenklassen

```json
{ "key": "Instinktiv", "label": "Traditioneller Bogen",
  "peg": "blau", "distanz": "5–30 m",
  "beschreibung": "Instinktiv- und Jagdrecurve, Holz." }
```

`beschreibung` ist bei eigenen Klassen faktisch verpflichtend: Bei einem
offenen Turnier ist sie das Einzige, woran ein Teilnehmer erkennt, ob sein
Bogen dazugehört.

### 2.5 Die Rolle der Bogenart — zwei getrennte Fragen

Hier liegt die Stelle, an der Umsetzungen erfahrungsgemäß danebengreifen. Es
sind **zwei** Fragen, nicht eine:

**Filtern die Regeln überhaupt nach Bogenart?** → `ignoriert_bogenklasse`
(Schicht-Ebene, Vorgabe `false` = ja, es wird gefiltert). Beim DBSV steht hier
`true`: Dort spielt die Bogenart für die Zuordnung keine Rolle, sie bestimmt
allein den Pflock.

**Gehört die Bogenart zur Bezeichnung der Klasse?** → `bogen_trennt_klassen`
(Vorgabe `true`). Beim DSB ist „Langbogen Herren" eine andere Wertung als
„Recurve Herren" — die Bogenart ist Teil der Klassenidentität. Steht hier
`false`, entsteht eine gemeinsame Wertung über alle Bogenarten.

Der Unterschied wird an eigenen Turnierklassen greifbar: Schreibt ein
Ausrichter „Offene Klasse" aus, ist das **eine** Wertung. Ohne
`bogen_trennt_klassen: false` bekäme sie je Bogenart eine eigene Rangliste und
erschiene als „Recurve Offene Klasse" — was niemand ausgeschrieben hat. Will
er nach Bogen trennen, schreibt er dafür eigene Regeln, dann steht die Bogenart
ohnehin im Namen.

### 2.5a Schichten, die sich eine Regelmenge teilen

`gleich_wie` verweist auf eine andere Schicht desselben Systems und übernimmt
deren Regeln. Beim DBSV sind Alters- und Wertungsklasse dieselbe Einteilung —
statt sie zu duplizieren, verweist die eine auf die andere. Eine Schicht muss
genau eines von `regeln`, `abgeleitet_aus` oder `gleich_wie` haben.

### 2.6 Wenn keine Regel passt

Kein Treffer heißt: **für diese Kombination ist keine Klasse ausgeschrieben.**
Das ist eine Aussage, kein Fehler — im DSB-3D etwa gilt sie für jeden unter
15 Jahren. `leer_label` und `leer_hinweis` der Schicht liefern den Text dafür.
Anwendungen sollen ihn zeigen, statt eine Klasse zu erfinden oder die
Anmeldung stillschweigend anzunehmen.

### 2.7 Abgeleitete Schichten

Eine Schicht mit `abgeleitet_aus` hat keine eigenen Regeln, sondern liest ein
Feld der Bogenklasse. `pflockgruppe` ist so definiert (`bogenklassen.peg`) —
der Pflock hängt an der Bogenart, nicht am Alter.

### 2.8 Herkunft

`quellen[]` belegt, worauf die Regeln beruhen: Titel, URL und was die Quelle
belegt. Was **nicht** belegt ist, wird mit `_annahme` markiert. Ein
Wertungssystem ohne Quellenangabe ist für einen Wettkampf nicht brauchbar —
im Streitfall muss nachvollziehbar sein, worauf eine Klasse beruht.

---

## 3. Beispiel

```json
{
  "__type": "bhs-class-system",
  "__version": 1,
  "id": "dsb-3d",
  "name": "DSB · 3D",
  "verband": "DSB",
  "disziplin": "3D",
  "bogen_trennt_klassen": true,

  "quellen": [
    { "titel": "TK-Mitteilung 3/2021, DSB Technische Kommission Bogen",
      "url": "https://www.dsb.de/fileadmin/DSB.DE/PDF/PDF_2021/tk_bogen_10.11.2021.pdf",
      "belegt": ["Klassenliste 3D", "Instinktivbogen ersetzt durch Traditionellen Bogen"] }
  ],

  "bogenklassen": [
    { "key": "Compound",   "label": "Compound",   "peg": "rot",  "distanz": "10–45 m" },
    { "key": "Langbogen",  "label": "Langbogen",  "peg": "blau", "distanz": "5–30 m" }
  ],

  "pflockfarben": {
    "blau": { "farbe": "#1565C0", "label": "Blauer Pflock", "reihenfolge": 4 },
    "rot":  { "farbe": "#D32F2F", "label": "Roter Pflock",  "reihenfolge": 5 }
  },

  "schichten": {
    "wertungsklasse": {
      "label": "Wertungsklasse",
      "vollstaendig": false,
      "leer_label": "im DSB-3D nicht zugelassen",
      "leer_hinweis": "Schüler sind im 3D nicht startberechtigt. Ab 15 Jahren ist die Teilnahme möglich.",
      "regeln": [
        { "key": "masters-m", "label": "Masters", "bows": ["Compound", "Langbogen"],
          "gender": "m", "age_min": 50,
          "_annahme": "Altersgrenze 50 aus der allgemeinen DSB-Tabelle — die TK-Mitteilung beziffert sie nicht" },
        { "key": "herren", "label": "Herren", "bows": ["*"], "gender": "m", "age_min": 15 },
        { "key": "damen",  "label": "Damen",  "bows": ["*"], "gender": "w", "age_min": 15 }
      ]
    },

    "pflockgruppe": {
      "label": "Pflock",
      "vollstaendig": true,
      "abgeleitet_aus": "bogenklassen.peg"
    }
  }
}
```

### 3.1 Pflockfarben

`reihenfolge` ordnet die Pflöcke nach **aufsteigender Distanz** — der nächste
zuerst. Oberflächen sollen sie in dieser Reihenfolge zeigen, damit Leserichtung
und Erwartung zusammenfallen.

Die Farbwerte sind Darstellungshinweise, kein Regelwerk: Welche Farbe ein
Veranstalter tatsächlich an den Pflock malt, steht in seiner Ausschreibung.

---

## 4. Turniereigene Wertungssysteme

Ein Turnier kann von einem Verbandssystem abweichen — das Dorfturnier mit
„Hobbyschützen offen" ist der Regelfall, nicht die Ausnahme.

```json
{ "__type": "bhs-class-system", "id": "dorfturnier-2026",
  "based_on": "dsb-3d", "name": "Dorfturnier Hettenhausen 2026", "…": "…" }
```

`based_on` verweist auf ein bestehendes System. Nicht gesetzte Felder werden
von dort übernommen; `schichten` wird schichtweise zusammengeführt. Eine eigene
`wertungsklasse` ersetzt also die des Basissystems vollständig, während eine
nicht überschriebene `altersgruppe` erhalten bleibt.

Ein eigenes System **ist kein Verbandssystem**. Anwendungen sollen es als
solches kennzeichnen und nicht in verbandsübergreifende Ranglisten mischen.

---

## 5. Prüfregeln

Eine Umsetzung sollte vor dem Einsatz prüfen:

| Prüfung | Schwere |
|---|---|
| Lückenlose Schicht hat keine Lücke und keine Überschneidung | Fehler |
| Zwei aktive Klassen tragen dieselbe Bezeichnung | Fehler |
| Eine Regel ist von einer früheren vollständig verdeckt | Fehler |
| `bows` verweist auf eine nicht definierte Bogenklasse | Fehler |
| Bogenklasse ohne `beschreibung` | Warnung |
| Klasse ohne Quellenbeleg | Warnung |

Doppelte Bezeichnungen sind ein Fehler und keine Warnung: In einer
Ergebnisliste sind zwei gleichnamige Klassen nicht auseinanderzuhalten.

---

## 6. Dateinamenskonvention

`{verband}-{disziplin}.json`, kleingeschrieben — `dsb-3d.json`,
`dfbv-ifaa.json`. Turniereigene Systeme: `{turnier-id}-klassen.json`.

---

## 7. JSON Schema

`schemas/class-system-v1.schema.json`

---

## 8. Referenz-Implementierung

`bowhuman/sherwood` enthält eine vollständige Umsetzung:

* `public/class-systems/*.json` — Quelldateien
* `public/classes-3d.js` — Resolver, regelfrei; `resolve(schicht, person)`,
  `buildEventSystem()`, `validateClassSystem()`
* `tools/build-class-sql.js` — erzeugt aus denselben Quellen
  PostgreSQL-Tabellen und -Funktionen

Der Aufbau ist Absicht: **Die Regeln stehen ausschließlich in den JSON-Dateien.**
Resolver und SQL sind abgeleitet. Vorher lagen dieselben Regeln in sieben
Fassungen im Code verstreut, von denen sich zwei widersprachen — ein Schütze
konnte im Profil eine andere Klasse sehen als im Turnier.

---

## 9. Offene Punkte für v1.0

1. **Doppelstart.** Wer freiwillig in der stärkeren Klasse antritt, ist bislang
   nicht abgebildet. Die Entscheidung fällt pro Turnier, gehört also in die
   Meldung (BHS-006), nicht ins Wertungssystem — zu bestätigen.
2. **Mannschaftswertung.** Ob Mannschaftsklassen hierher gehören oder ein
   eigenes Modell brauchen, ist offen.
3. **Gültigkeitszeitraum.** Sportordnungen gelten je Sportjahr. Ob ein
   `gueltig_ab`/`gueltig_bis` nötig ist oder Versionierung über `id` genügt,
   ist offen.
4. **`gender: "d"`.** Wie divers zu behandeln ist, regeln die Verbände
   uneinheitlich. Das Format lässt den Wert zu und schreibt nichts vor.
5. **`ignoriert_bogenklasse` und `bogen_trennt_klassen` überschneiden sich.**
   Beide beschreiben die Rolle der Bogenart und lassen sich verwechseln (§2.5).
   In der Praxis treten sie fast immer gemeinsam auf. Ob sie zu einem Feld mit
   drei Werten zusammengefasst werden sollten, ist vor v1.0 zu entscheiden.

---

## Changelog

| Version | Datum | Änderung |
|---|---|---|
| 0.9 | 2026-08-15 | Erstentwurf. Entstanden aus der Zusammenführung von sieben divergierenden Klassenimplementierungen in Sherwood/Nottingham. |
