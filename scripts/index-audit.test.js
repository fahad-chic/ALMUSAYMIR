import { describe, expect, it } from 'vitest';
import {
  canonicalIndex,
  compareIndexFiles,
  findUnnecessarySingleFieldIndexes,
  validateRequiredPrivacyIndexes,
} from './index-audit.mjs';

const composite = (collectionGroup, fields, extra = {}) => ({
  collectionGroup,
  queryScope: 'COLLECTION',
  fields: fields.map(([fieldPath, order = 'ASCENDING']) => ({ fieldPath, order })),
  ...extra,
});
const emptyDefinition = { indexes: [], fieldOverrides: [] };

describe('Firestore index preflight and comparison', () => {
  it.each(['broadcasts', 'visitors', 'complaints'])(
    'rejects a one-explicit-field composite for %s',
    (collectionGroup) => {
      const definition = { indexes: [composite(collectionGroup, [['createdAt', 'DESCENDING']])], fieldOverrides: [] };
      expect(findUnnecessarySingleFieldIndexes(definition).map((index) => index.collectionGroup)).toEqual([collectionGroup]);
    },
  );

  it('does not count the API implicit __name__ as an explicit composite field', () => {
    const bad = composite('broadcasts', [['createdAt', 'DESCENDING']]);
    bad.fields.push({ fieldPath: '__name__', order: 'DESCENDING' });
    expect(findUnnecessarySingleFieldIndexes({ indexes: [bad] })).toHaveLength(1);
  });

  it('requires the public-read composites for reviews and comments', () => {
    const definition = {
      indexes: [
        composite('reviews', [['hidden'], ['productId'], ['createdAt', 'DESCENDING']]),
        composite('comments', [['status'], ['createdAt', 'DESCENDING']]),
      ],
    };
    expect(validateRequiredPrivacyIndexes(definition)).toEqual([]);
    expect(validateRequiredPrivacyIndexes({ indexes: [definition.indexes[0]] })).toEqual([
      expect.objectContaining({ collectionGroup: 'comments' }),
    ]);
  });

  it('normalizes only a matching trailing implicit __name__', () => {
    const explicit = composite('messages', [['receiverId'], ['createdAt', 'DESCENDING']]);
    const api = structuredClone(explicit);
    api.fields.push({ fieldPath: '__name__', order: 'DESCENDING' });
    const normalized = canonicalIndex(api);
    expect(normalized.anomaly).toBeNull();
    expect(normalized.fields).toEqual(canonicalIndex(explicit).fields);
  });

  it('does not hide a different implicit name direction or misplaced __name__', () => {
    const wrongDirection = composite('messages', [['createdAt', 'DESCENDING']]);
    wrongDirection.fields.push({ fieldPath: '__name__', order: 'ASCENDING' });
    expect(canonicalIndex(wrongDirection).anomaly).toMatch(/differs from implied/);
    const misplaced = composite('messages', [['__name__'], ['createdAt', 'DESCENDING']]);
    expect(canonicalIndex(misplaced).anomaly).toMatch(/before the final field/);
  });

  it.each([
    ['field path', { fields: [{ fieldPath: 'other', order: 'ASCENDING' }, { fieldPath: 'createdAt', order: 'DESCENDING' }] }],
    ['field order', { fields: [{ fieldPath: 'receiverId', order: 'DESCENDING' }, { fieldPath: 'createdAt', order: 'DESCENDING' }] }],
    ['query scope', { queryScope: 'COLLECTION_GROUP' }],
    ['density', { density: 'SPARSE_ALL' }],
    ['api scope', { apiScope: 'MONGODB_COMPATIBLE_API' }],
    ['multikey', { multikey: true }],
  ])('detects a genuine %s difference', (_name, change) => {
    const base = composite('messages', [['receiverId'], ['createdAt', 'DESCENDING']]);
    const changed = { ...base, ...change };
    const result = compareIndexFiles({ indexes: [base] }, { indexes: [changed] });
    expect(result.sharedIndexes).toHaveLength(0);
    expect(result.addIndexes).toHaveLength(1);
    expect(result.productionOnlyIndexes).toHaveLength(1);
    expect(result.safeToProceed).toBe(false);
  });

  it('detects added and production-only fieldOverrides and fails closed on production-only entries', () => {
    const wanted = { collectionGroup: 'reviews', fieldPath: 'rating', indexes: [{ queryScope: 'COLLECTION', order: 'DESCENDING' }] };
    const productionOnly = { collectionGroup: 'comments', fieldPath: 'status', indexes: [{ queryScope: 'COLLECTION', order: 'ASCENDING' }] };
    const result = compareIndexFiles(
      { indexes: [], fieldOverrides: [wanted] },
      { indexes: [], fieldOverrides: [productionOnly] },
    );
    expect(result.addOverrides).toEqual([wanted]);
    expect(result.productionOnlyOverrides).toEqual([productionOnly]);
    expect(result.safeToProceed).toBe(false);
  });

  it('fails closed when production has an index absent from the file', () => {
    const productionIndex = composite('orders', [['userId'], ['createdAt', 'DESCENDING']]);
    const result = compareIndexFiles(emptyDefinition, { indexes: [productionIndex], fieldOverrides: [] });
    expect(result.productionOnlyIndexes).toHaveLength(1);
    expect(result.safeToProceed).toBe(false);
  });

  it('treats a shared index and a file-only addition as safe when no deletions are implied', () => {
    const shared = composite('messages', [['senderId'], ['createdAt', 'DESCENDING']]);
    const addition = composite('orders', [['userId'], ['createdAt', 'DESCENDING']]);
    const result = compareIndexFiles(
      { indexes: [shared, addition], fieldOverrides: [] },
      { indexes: [shared], fieldOverrides: [] },
    );
    expect(result.sharedIndexes).toHaveLength(1);
    expect(result.addIndexes).toHaveLength(1);
    expect(result.productionOnlyIndexes).toHaveLength(0);
    expect(result.safeToProceed).toBe(true);
  });
});
