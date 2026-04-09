#!/usr/bin/env node
/**
 * migrate-v1-to-v2.js
 *
 * Schema migration script: v1 -> v2
 * Adds schemaVersion field to all data files and applies candidate field additions.
 *
 * This script is a TEMPLATE. Do not run until schema v2 changes are confirmed.
 *
 * Usage: node scripts/migrate-v1-to-v2.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const DATA_DIRS = {
  nodes: path.resolve(__dirname, '../data/nodes'),
  edges: path.resolve(__dirname, '../data/edges'),
  maps: path.resolve(__dirname, '../data/maps'),
  tours: path.resolve(__dirname, '../data/tours')
};

const ARCHIVE_DIR = path.resolve(__dirname, '../data/_archive/v1');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => ({
      path: path.join(dir, f),
      name: f,
      data: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))
    }));
}

function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== MIGRATING v1 -> v2 ===');

  const log = [];

  for (const [type, dir] of Object.entries(DATA_DIRS)) {
    const files = loadJsonFiles(dir);
    console.log(`Processing ${type}: ${files.length} file(s)`);

    for (const file of files) {
      // Archive original
      if (!DRY_RUN) {
        const archiveSubDir = path.join(ARCHIVE_DIR, type);
        ensureDir(archiveSubDir);
        fs.copyFileSync(file.path, path.join(archiveSubDir, file.name));
      }

      // Apply v2 migrations
      const migrated = { ...file.data, schemaVersion: 'v2' };

      // Node-specific: add frequency and firstEncounterRef if missing
      if (type === 'nodes') {
        if (!migrated.frequency) migrated.frequency = (migrated.encounterRefs || []).length;
        if (!migrated.firstEncounterRef && (migrated.encounterRefs || []).length > 0) {
          migrated.firstEncounterRef = migrated.encounterRefs[0];
        }
      }

      // Edge-specific: add trajectory if missing
      if (type === 'edges') {
        if (!migrated.trajectory) migrated.trajectory = 'stable';
      }

      log.push({ type, file: file.name, changes: ['schemaVersion: v2'] });

      if (!DRY_RUN) {
        fs.writeFileSync(file.path, JSON.stringify(migrated, null, 2) + '\n');
      }
    }
  }

  // Write migration log
  const logPath = path.resolve(__dirname, '../data/_archive/migration-v1-to-v2.log.json');
  if (!DRY_RUN) {
    ensureDir(path.dirname(logPath));
    fs.writeFileSync(logPath, JSON.stringify({
      migratedAt: new Date().toISOString(),
      entries: log
    }, null, 2) + '\n');
  }

  console.log(`\nMigration ${DRY_RUN ? 'preview' : 'complete'}: ${log.length} file(s) processed.`);
  if (!DRY_RUN) {
    console.log(`Archive: ${ARCHIVE_DIR}`);
    console.log(`Log: ${logPath}`);
  }
}

main();
