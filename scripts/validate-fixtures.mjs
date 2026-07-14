import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createSchemaValidator, readStrictJson, repositoryRoot, validateByVersion } from "./schema-utils.mjs";

const validRoot = resolve(repositoryRoot, "fixtures", "valid");
const invalidRoot = resolve(repositoryRoot, "fixtures", "invalid");
const context = createSchemaValidator();
const validFiles = readdirSync(validRoot).filter((file) => file.endsWith(".json")).sort();
const registryVersions = new Set(context.registry.schemas.map((entry) => entry.schemaVersion));
const fixtureVersions = new Set();

assert.equal(validFiles.length, context.registry.schemas.length, "Each top-level schema needs one canonical valid fixture");

for (const file of validFiles) {
  const document = readStrictJson(resolve(validRoot, file));
  fixtureVersions.add(document.schemaVersion);
  const result = validateByVersion(context, document.schemaVersion, document);
  assert.equal(result.valid, true, `${file} should validate: ${JSON.stringify(result.errors)}`);

  const unknownFieldDocument = structuredClone(document);
  unknownFieldDocument.unexpectedTopLevelField = true;
  const unknownResult = validateByVersion(context, document.schemaVersion, unknownFieldDocument);
  assert.equal(unknownResult.valid, false, `${file} must reject an unknown top-level field`);
}

assert.deepEqual([...fixtureVersions].sort(), [...registryVersions].sort(), "Canonical fixtures must cover exactly the registry schemas");

const authorityPolicyV1 = readStrictJson(resolve(validRoot, "authority-policy.json"));
const authorityPolicyV2 = readStrictJson(resolve(validRoot, "authority-policy-v2.json"));
const evidenceBundleV1 = readStrictJson(resolve(validRoot, "evidence-bundle.json"));
const evidenceBundleV2 = readStrictJson(resolve(validRoot, "evidence-bundle-v2.json"));
const toolCallRequest = readStrictJson(resolve(validRoot, "tool-call-request.json"));
assert.equal(Object.hasOwn(authorityPolicyV1.rules[0], "contextSelector"), false, "Authority Policy v1 fixture must remain selector-free");
assert.deepEqual(
  authorityPolicyV2.rules[0].contextSelector,
  toolCallRequest.context,
  "Authority Policy v2 fixture must use an exact Context-shaped selector"
);
const authorityPolicyV2MissingContextSelector = structuredClone(authorityPolicyV2);
delete authorityPolicyV2MissingContextSelector.rules[0].contextSelector;
assert.equal(
  validateByVersion(context, authorityPolicyV2MissingContextSelector.schemaVersion, authorityPolicyV2MissingContextSelector).valid,
  false,
  "Authority Policy v2 must reject a rule without contextSelector"
);
const authorityPolicyV2UnknownContextField = structuredClone(authorityPolicyV2);
authorityPolicyV2UnknownContextField.rules[0].contextSelector.unexpectedContextField = true;
assert.equal(
  validateByVersion(context, authorityPolicyV2UnknownContextField.schemaVersion, authorityPolicyV2UnknownContextField).valid,
  false,
  "Authority Policy v2 contextSelector must reject unknown fields"
);
assert.equal(
  evidenceBundleV1.inputs.some((input) => input.schemaId === "urn:fenrua:schema:authority-policy-v2"),
  false,
  "Evidence Bundle v1 fixture must remain within its frozen provenance vocabulary"
);
assert.equal(
  evidenceBundleV2.inputs.some((input) => input.schemaId === "urn:fenrua:schema:authority-policy-v2"),
  true,
  "Evidence Bundle v2 must be able to prove Authority Policy v2 provenance"
);

const compatibilityProfile = readStrictJson(resolve(validRoot, "compatibility-profile.json"));
const compatibilityProfileMissingBinding = structuredClone(compatibilityProfile);
compatibilityProfileMissingBinding.schemaBindings.pop();
assert.equal(
  validateByVersion(context, compatibilityProfileMissingBinding.schemaVersion, compatibilityProfileMissingBinding).valid,
  false,
  "A compatibility profile must bind every required protocol schema"
);
const compatibilityProfileMismatchedBinding = structuredClone(compatibilityProfile);
compatibilityProfileMismatchedBinding.schemaBindings[0].schemaId = "urn:fenrua:schema:decision-v1";
assert.equal(
  validateByVersion(context, compatibilityProfileMismatchedBinding.schemaVersion, compatibilityProfileMismatchedBinding).valid,
  false,
  "A compatibility profile must bind each version to its exact schema $id"
);
const compatibilityProfileMissingSurface = structuredClone(compatibilityProfile);
compatibilityProfileMissingSurface.implementationSurfaces[3] = { surface: "core", state: "not-released" };
assert.equal(
  validateByVersion(context, compatibilityProfileMissingSurface.schemaVersion, compatibilityProfileMissingSurface).valid,
  false,
  "A compatibility profile must declare every implementation surface state"
);

const canonicalDocuments = validFiles.map((file) => ({
  file,
  document: readStrictJson(resolve(validRoot, file))
}));
let crossRoleFailures = 0;
for (const { file, document } of canonicalDocuments) {
  for (const schemaVersion of registryVersions) {
    if (schemaVersion === document.schemaVersion) {
      continue;
    }
    const result = validateByVersion(context, schemaVersion, document);
    assert.equal(result.valid, false, `${file} must not validate as ${schemaVersion}`);
    crossRoleFailures += 1;
  }
}

const negativeIndex = readStrictJson(resolve(invalidRoot, "index.json"));
assert.ok(Array.isArray(negativeIndex.cases) && negativeIndex.cases.length >= 5, "Negative fixture index is incomplete");
for (const testCase of negativeIndex.cases) {
  const path = resolve(invalidRoot, testCase.file);
  assert.ok(existsSync(path), `Negative fixture ${testCase.file} is missing`);
  if (testCase.kind === "strict-json-error") {
    assert.throws(() => readStrictJson(path), /StrictJsonError/, `${testCase.file} must fail strict JSON parsing`);
    continue;
  }

  const document = readStrictJson(path);
  const result = validateByVersion(context, testCase.schemaVersion ?? document.schemaVersion, document);
  assert.equal(result.valid, false, `${testCase.file} must fail ${testCase.schemaVersion ?? document.schemaVersion}`);
  if (testCase.expectedKeyword) {
    assert.equal(
      result.errors.some((error) => error.keyword === testCase.expectedKeyword),
      true,
      `${testCase.file} must fail for ${testCase.expectedKeyword}`
    );
  }
}

const nestedUnknown = readStrictJson(resolve(invalidRoot, "approval.scope-unknown-field.json"));
assert.equal(validateByVersion(context, nestedUnknown.schemaVersion, nestedUnknown).valid, false, "Nested unknown fields must fail");

const vector = readStrictJson(resolve(validRoot, "verification-vector.json"));
for (const document of vector.documents) {
  const fixturePath = resolve(repositoryRoot, document.fixture);
  assert.ok(existsSync(fixturePath), `Vector fixture path ${document.fixture} is missing`);
  const referenced = readStrictJson(fixturePath);
  const referencedEntry = context.schemas.get(referenced.schemaVersion)?.entry;
  assert.equal(referencedEntry?.$id, document.schemaId, `Vector document ${document.fixture} has an incorrect schema binding`);
  const actualDigest = createHash("sha256").update(readFileSync(fixturePath)).digest("hex");
  assert.equal(document.fixtureDigest.algorithm, "sha-256", `Vector document ${document.fixture} must name SHA-256`);
  assert.equal(document.fixtureDigest.value, actualDigest, `Vector document ${document.fixture} digest does not bind its exact fixture bytes`);
}

assert.equal(Object.hasOwn(vector, "continueExecution"), false, "Vectors cannot carry execution instructions");
process.stdout.write(`${JSON.stringify({ status: "ok", validFixtures: validFiles.length, negativeFixtures: negativeIndex.cases.length, crossRoleFailures })}\n`);
