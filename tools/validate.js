#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════
   Bowhuman Open Standards — Validator
   Prüft alle Beispieldateien unter examples/ (rekursiv) gegen die
   passenden JSON Schemas unter schemas/, gruppiert nach __type.

   Nutzung:
     npm install
     npm run validate                 # alle Beispieldateien unter examples/
     node tools/validate.js <datei>    # nur eine einzelne Datei prüfen

   Exit-Code 0 = alles gültig (oder nur Skips ohne Schema).
   Exit-Code 1 = mindestens eine Datei ist ungültig.
════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ROOT = path.resolve(__dirname, '..');
const SCHEMAS_DIR = path.join(ROOT, 'schemas');
const EXAMPLES_DIR = path.join(ROOT, 'examples');

// __type -> Schema-Dateiname. Nicht gelistete __type-Werte werden als
// "kein Schema vorhanden" markiert statt als Fehler behandelt — z.B.
// "hawkeye-session" (BHS-002 hat laut eigenem §10 noch kein JSON Schema).
const TYPE_TO_SCHEMA = {
  'littlejohn-parcours': 'parcours-v1.schema.json',
  'bhs-venue':           'venue-v1.schema.json',
  'bhs-club':            'club-v1.schema.json',
  'bhs-scoring-system':  'scoring-system-v1.schema.json',
};

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.json')) out.push(full);
  }
  return out;
}

function loadSchema(ajv, schemaFile) {
  const cacheKey = schemaFile;
  if (ajv.__cache && ajv.__cache[cacheKey]) return ajv.__cache[cacheKey];
  const schemaPath = path.join(SCHEMAS_DIR, schemaFile);
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const validateFn = ajv.compile(schema);
  ajv.__cache = ajv.__cache || {};
  ajv.__cache[cacheKey] = validateFn;
  return validateFn;
}

function main() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const explicitFile = process.argv[2];
  const files = explicitFile
    ? [path.resolve(process.cwd(), explicitFile)]
    : walk(EXAMPLES_DIR);

  let failures = 0;
  let skipped = 0;
  let passed = 0;

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      console.error(`✗ ${rel}\n  Kein gültiges JSON: ${err.message}`);
      failures++;
      continue;
    }

    const type = data.__type;
    const schemaFile = TYPE_TO_SCHEMA[type];

    if (!schemaFile) {
      console.log(`… ${rel} — __type "${type ?? '(fehlt)'}" hat noch kein Schema, übersprungen`);
      skipped++;
      continue;
    }

    const validateFn = loadSchema(ajv, schemaFile);
    const valid = validateFn(data);

    if (valid) {
      console.log(`✓ ${rel} (${schemaFile})`);
      passed++;
    } else {
      console.error(`✗ ${rel} (${schemaFile})`);
      for (const err of validateFn.errors) {
        console.error(`  ${err.instancePath || '/'} ${err.message}`);
      }
      failures++;
    }
  }

  console.log('');
  console.log(`${passed} gültig · ${failures} ungültig · ${skipped} ohne Schema übersprungen`);

  process.exit(failures > 0 ? 1 : 0);
}

main();
