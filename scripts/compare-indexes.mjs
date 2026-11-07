// scripts/compare-indexes.mjs — read-only comparison; never creates or deletes indexes.
// Firebase CLI export (read only):
//   npx firebase-tools firestore:indexes --project anaqa-chic-4e437 > /tmp/prod-indexes.json
// Compare from repository root:
//   node scripts/compare-indexes.mjs firestore.indexes.json /tmp/prod-indexes.json
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { compareIndexFiles } from './index-audit.mjs';

const [fileArg, productionArg] = process.argv.slice(2);
if (!fileArg || !productionArg) {
  console.error('Usage: node scripts/compare-indexes.mjs <configured-indexes.json> <read-only-production-export.json>');
  process.exit(2);
}
const root = process.cwd();
const filePath = path.resolve(root, fileArg);
const productionPath = path.resolve(root, productionArg);
let branch = '(unavailable)';
let commit = '(unavailable)';
try {
  branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
} catch {
  // Comparison remains useful outside a Git checkout; identity is explicit above.
}

const load = (file) => JSON.parse(readFileSync(file, 'utf8'));
const fileDefinition = load(filePath);
const productionDefinition = load(productionPath);
const result = compareIndexFiles(fileDefinition, productionDefinition);
const formatFields = (index) => index.fields.map((field) => `${field.fieldPath}:${field.order || field.arrayConfig || '?'}`).join(', ');
const formatIndex = (index) => `${index.collectionGroup} [${formatFields(index)}] (${index.queryScope}, apiScope=${index.apiScope ?? '-'}, density=${index.density ?? '-'}, multikey=${index.multikey})`;
const formatOverride = (override) => `${override.collectionGroup}.${override.fieldPath} ${JSON.stringify(override.indexes || [])}`;

console.log(`\nRepository root: ${root}`);
console.log(`Branch: ${branch}`);
console.log(`Commit: ${commit}`);
console.log(`File: ${filePath} (${(fileDefinition.indexes || []).length} indexes, ${(fileDefinition.fieldOverrides || []).length} fieldOverrides)`);
console.log(`Production export: ${productionPath} (${(productionDefinition.indexes || []).length} indexes, ${(productionDefinition.fieldOverrides || []).length} fieldOverrides)`);
console.log('Implicit __name__ is normalized only when trailing and direction matches the implied direction.');

console.log(`\nIndexes to add: ${result.addIndexes.length}`);
result.addIndexes.forEach((index) => console.log(`  + ${formatIndex(index)}`));
console.log(`\nProduction-only indexes (potential deletions): ${result.productionOnlyIndexes.length}`);
result.productionOnlyIndexes.forEach((index) => console.log(`  ! ${formatIndex(index)}`));
console.log(`\nShared indexes: ${result.sharedIndexes.length}`);
result.sharedIndexes.forEach((index) => console.log(`  = ${formatIndex(index)}`));
console.log(`\nFieldOverrides to add: ${result.addOverrides.length}`);
result.addOverrides.forEach((override) => console.log(`  + ${formatOverride(override)}`));
console.log(`Production-only/different fieldOverrides: ${result.productionOnlyOverrides.length}`);
result.productionOnlyOverrides.forEach((override) => console.log(`  ! ${formatOverride(override)}`));

if (result.unnecessaryInFile.length) {
  console.error(`\nInvalid single-explicit-field composites in file: ${result.unnecessaryInFile.length}`);
  result.unnecessaryInFile.forEach((index) => console.error(`  ✗ ${index.collectionGroup} [${formatFields(index)}]`));
}
if (result.unnecessaryInProduction.length) {
  console.warn(`\nSingle-explicit-field composites in production export: ${result.unnecessaryInProduction.length} (reported, never deleted)`);
  result.unnecessaryInProduction.forEach((index) => console.warn(`  ⚠ ${index.collectionGroup} [${formatFields(index)}]`));
}
if (result.anomalies.length) {
  console.error(`\n__name__ anomalies: ${result.anomalies.length}`);
  result.anomalies.forEach((index) => console.error(`  ✗ ${index.collectionGroup}: ${index.anomaly}`));
}
result.blockingReasons.forEach((reason) => console.error(`BLOCK: ${reason}`));
console.log(`\nResult: ${result.safeToProceed ? 'no unsafe deletion or invalid file index detected' : 'STOP — review differences; no deploy/delete was performed'}\n`);
process.exit(result.safeToProceed ? 0 : 1);
