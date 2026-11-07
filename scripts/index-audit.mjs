// Shared, side-effect-free Firestore index validation and comparison helpers.
// This module never contacts Firebase and never writes or deploys anything.

export const lastExplicitOrder = (fields = []) => {
  let order = 'ASCENDING';
  for (const field of fields) {
    if (field.order) order = field.order;
  }
  return order;
};

export function canonicalIndex(index) {
  const fields = (index.fields || []).map((field) => ({
    fieldPath: field.fieldPath,
    order: field.order || null,
    arrayConfig: field.arrayConfig || null,
  }));
  let anomaly = null;
  const last = fields.at(-1);

  // Firebase's index API may include the implicit document-name tie-breaker.
  // Ignore it only at the end and only when its direction is the implied one.
  if (last?.fieldPath === '__name__') {
    const implicitOrder = lastExplicitOrder(fields.slice(0, -1));
    if (last.order === implicitOrder) fields.pop();
    else anomaly = `trailing __name__ order ${last.order} differs from implied ${implicitOrder}`;
  }

  const nameIndexes = fields
    .map((field, index) => (field.fieldPath === '__name__' ? index : -1))
    .filter((index) => index !== -1);
  if (nameIndexes.some((index) => index !== fields.length - 1)) {
    anomaly ||= '__name__ appears before the final field';
  }

  const hasNameAnomaly = Boolean(anomaly);
  const canonicalFields = hasNameAnomaly
    ? fields
    : [...fields, {
        fieldPath: '__name__',
        order: lastExplicitOrder(fields),
        arrayConfig: null,
      }];

  // A composite index with exactly one user-declared field is unnecessary.
  // Ignore the implicit __name__ field, including when Firebase returns it.
  const explicitFields = fields.filter((field) => field.fieldPath !== '__name__');
  return {
    collectionGroup: index.collectionGroup,
    queryScope: index.queryScope || 'COLLECTION',
    apiScope: index.apiScope || null,
    density: index.density || null,
    multikey: index.multikey === true,
    fields: canonicalFields,
    anomaly,
    unnecessarySingleField: explicitFields.length === 1,
  };
}

export const indexKey = (index) => JSON.stringify({
  collectionGroup: index.collectionGroup,
  queryScope: index.queryScope,
  apiScope: index.apiScope,
  density: index.density,
  multikey: index.multikey,
  fields: index.fields,
});

export function canonicalFieldOverride(override) {
  const indexes = (override.indexes || []).map((index) => ({
    queryScope: index.queryScope || null,
    apiScope: index.apiScope || null,
    density: index.density || null,
    order: index.order || null,
    arrayConfig: index.arrayConfig || null,
  }));
  // Override index ordering is not meaningful; compare the set deterministically.
  indexes.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return {
    collectionGroup: override.collectionGroup,
    fieldPath: override.fieldPath,
    indexes,
  };
}

export const fieldOverrideKey = (override) => JSON.stringify(canonicalFieldOverride(override));

export function compareIndexFiles(fileDefinition, productionDefinition) {
  const fileIndexes = (fileDefinition.indexes || []).map(canonicalIndex);
  const productionIndexes = (productionDefinition.indexes || []).map(canonicalIndex);
  const fileIndexKeys = new Set(fileIndexes.map(indexKey));
  const productionIndexKeys = new Set(productionIndexes.map(indexKey));
  const fileOverrides = fileDefinition.fieldOverrides || [];
  const productionOverrides = productionDefinition.fieldOverrides || [];
  const fileOverrideKeys = new Set(fileOverrides.map(fieldOverrideKey));
  const productionOverrideKeys = new Set(productionOverrides.map(fieldOverrideKey));

  const addIndexes = fileIndexes.filter((index) => !productionIndexKeys.has(indexKey(index)));
  const productionOnlyIndexes = productionIndexes.filter((index) => !fileIndexKeys.has(indexKey(index)));
  const sharedIndexes = fileIndexes.filter((index) => productionIndexKeys.has(indexKey(index)));
  const addOverrides = fileOverrides.filter((override) => !productionOverrideKeys.has(fieldOverrideKey(override)));
  const productionOnlyOverrides = productionOverrides.filter((override) => !fileOverrideKeys.has(fieldOverrideKey(override)));
  const anomalies = [...fileIndexes, ...productionIndexes].filter((index) => index.anomaly);
  const unnecessaryInFile = fileIndexes.filter((index) => index.unnecessarySingleField);
  const unnecessaryInProduction = productionIndexes.filter((index) => index.unnecessarySingleField);

  const blockingReasons = [];
  if (unnecessaryInFile.length) blockingReasons.push('file contains unnecessary single-field composite indexes');
  if (productionOnlyIndexes.length) blockingReasons.push('production contains indexes absent from the file (potential deletions)');
  if (productionOnlyOverrides.length) blockingReasons.push('production contains field overrides absent from the file (potential deletions)');
  if (anomalies.length) blockingReasons.push('malformed or genuinely different __name__ field');

  return {
    addIndexes,
    productionOnlyIndexes,
    sharedIndexes,
    addOverrides,
    productionOnlyOverrides,
    anomalies,
    unnecessaryInFile,
    unnecessaryInProduction,
    blockingReasons,
    safeToProceed: blockingReasons.length === 0,
  };
}

export function findUnnecessarySingleFieldIndexes(definition) {
  return (definition.indexes || [])
    .map(canonicalIndex)
    .filter((index) => index.unnecessarySingleField);
}

export function validateRequiredPrivacyIndexes(definition) {
  const keys = new Set((definition.indexes || []).map((index) => indexKey(canonicalIndex(index))));
  const required = [
    { collectionGroup: 'reviews', fields: [['productId', 'ASCENDING'], ['publicSafe', 'ASCENDING'], ['createdAt', 'DESCENDING']] },
    { collectionGroup: 'comments', fields: [['status', 'ASCENDING'], ['publicSafe', 'ASCENDING'], ['createdAt', 'DESCENDING']] },
  ];
  return required.filter(({ collectionGroup, fields }) => !keys.has(indexKey(canonicalIndex({
    collectionGroup,
    queryScope: 'COLLECTION',
    fields: fields.map(([fieldPath, order]) => ({ fieldPath, order })),
  }))));
}
