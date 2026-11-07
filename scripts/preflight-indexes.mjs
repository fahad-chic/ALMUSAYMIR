// scripts/preflight-indexes.mjs — offline, read-only guard for Firestore indexes.
// Run from the repository root on the intended branch. No Firebase calls/writes.
//
//   node scripts/preflight-indexes.mjs --expect-branch fix/firestore-index-preflight
//   node scripts/preflight-indexes.mjs --config firebase.barrier.json
//   node scripts/preflight-indexes.mjs --prod /tmp/prod-indexes.json
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { findUnnecessarySingleFieldIndexes, validateRequiredPrivacyIndexes } from './index-audit.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index !== -1 && args[index + 1] ? args[index + 1] : fallback;
};
const root = path.resolve(arg('--root', process.cwd()));
const configPath = path.resolve(root, arg('--config', 'firebase.json'));
const explicitFile = arg('--file');
const prodPath = arg('--prod') ? path.resolve(root, arg('--prod')) : null;
const expectedBranch = arg('--expect-branch');
let failed = false;
const fail = (message) => { failed = true; console.error(`✗ ${message}`); };
const ok = (message) => console.log(`✓ ${message}`);

console.log('\n[1] Repository identity');
console.log(`  working directory: ${root}`);
try {
  const git = (command) => execFileSync('git', command, { cwd: root, encoding: 'utf8' }).trim();
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const sha = git(['rev-parse', 'HEAD']);
  console.log(`  branch: ${branch}`);
  console.log(`  commit: ${sha}`);
  console.log(`  worktree: ${git(['status', '--porcelain']) ? 'dirty' : 'clean'}`);
  if (expectedBranch && expectedBranch !== branch) fail(`expected branch ${expectedBranch}, found ${branch}`);
} catch (error) {
  fail(`cannot identify Git checkout at ${root}: ${error.message}`);
}

console.log('\n[2] Firebase CLI configuration');
console.log(`  config: ${configPath}`);
let definitionPath = null;
if (!existsSync(configPath)) fail(`Firebase config not found: ${configPath}`);
else {
  try {
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    if (typeof config.firestore?.indexes !== 'string') fail('firebase config has no firestore.indexes path');
    else {
      definitionPath = path.resolve(root, config.firestore.indexes);
      console.log(`  configured indexes: ${definitionPath}`);
      if (explicitFile && path.resolve(root, explicitFile) !== definitionPath) {
        fail(`--file resolves to ${path.resolve(root, explicitFile)}, but this Firebase config deploys ${definitionPath}`);
      } else ok('the checked file is exactly the index file selected by this Firebase config');
    }
  } catch (error) {
    fail(`cannot parse Firebase config: ${error.message}`);
  }
}
if (explicitFile) definitionPath = path.resolve(root, explicitFile);

let definition = null;
if (!definitionPath || !existsSync(definitionPath)) fail(`index definition not found: ${definitionPath || '(unresolved)'}`);
else {
  console.log('\n[3] Static index validation');
  console.log(`  file: ${definitionPath}`);
  try {
    definition = JSON.parse(readFileSync(definitionPath, 'utf8'));
    const indexes = definition.indexes || [];
    const unnecessary = findUnnecessarySingleFieldIndexes(definition);
    console.log(`  indexes: ${indexes.length}; fieldOverrides: ${(definition.fieldOverrides || []).length}`);
    if (unnecessary.length) {
      fail(`${unnecessary.length} composite index(es) has only one explicit field`);
      unnecessary.forEach((index) => console.error(`  - ${index.collectionGroup}: ${index.fields.map((field) => field.fieldPath).join(', ')}`));
    } else ok('no one-explicit-field composite index');
    const missingPrivacyIndexes = validateRequiredPrivacyIndexes(definition);
    if (missingPrivacyIndexes.length) {
      fail(`missing privacy-query composite index(es): ${missingPrivacyIndexes.map((index) => index.collectionGroup).join(', ')}`);
    } else ok('reviews/comments publicSafe query indexes are present');
  } catch (error) {
    fail(`cannot parse index definition: ${error.message}`);
  }
}

if (prodPath) {
  console.log('\n[4] Production comparison input (read-only export supplied by operator)');
  console.log(`  file: ${prodPath}`);
  if (!existsSync(prodPath)) fail(`production export not found: ${prodPath}`);
  else if (!definition) fail('cannot compare because the configured index file is invalid');
  else {
    // Delegate comparison to the read-only CLI with an explicit project-root config path.
    try {
      execFileSync(process.execPath, [path.join(root, 'scripts/compare-indexes.mjs'), definitionPath, prodPath], {
        cwd: root,
        stdio: 'inherit',
      });
    } catch (error) {
      fail(`production comparison found a blocking difference (exit ${error.status ?? 'unknown'})`);
    }
  }
}

console.log(`\nResult: ${failed ? 'STOP — do not deploy' : 'preflight passed; this did not contact or change Firebase'}\n`);
process.exit(failed ? 1 : 0);
