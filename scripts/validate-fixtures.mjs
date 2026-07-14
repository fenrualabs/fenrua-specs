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

const compatibilityProfileV1 = readStrictJson(resolve(validRoot, "compatibility-profile.json"));
const compatibilityProfileV2 = readStrictJson(resolve(validRoot, "compatibility-profile-v2.json"));
const compatibilityProfileV1MissingBinding = structuredClone(compatibilityProfileV1);
compatibilityProfileV1MissingBinding.schemaBindings.pop();
assert.equal(
  validateByVersion(context, compatibilityProfileV1MissingBinding.schemaVersion, compatibilityProfileV1MissingBinding).valid,
  false,
  "Compatibility Profile v1 must bind every required protocol schema"
);
const compatibilityProfileV1MismatchedBinding = structuredClone(compatibilityProfileV1);
compatibilityProfileV1MismatchedBinding.schemaBindings[0].schemaId = "urn:fenrua:schema:decision-v1";
assert.equal(
  validateByVersion(context, compatibilityProfileV1MismatchedBinding.schemaVersion, compatibilityProfileV1MismatchedBinding).valid,
  false,
  "Compatibility Profile v1 must bind each version to its exact schema $id"
);
const compatibilityProfileV1MissingSurface = structuredClone(compatibilityProfileV1);
compatibilityProfileV1MissingSurface.implementationSurfaces[3] = { surface: "core", state: "not-released" };
assert.equal(
  validateByVersion(context, compatibilityProfileV1MissingSurface.schemaVersion, compatibilityProfileV1MissingSurface).valid,
  false,
  "Compatibility Profile v1 must declare every implementation surface state"
);
const compatibilityProfileV1WithV2Binding = structuredClone(compatibilityProfileV1);
compatibilityProfileV1WithV2Binding.schemaBindings.push({
  schemaVersion: "fenrua.authority-policy.v2",
  schemaId: "urn:fenrua:schema:authority-policy-v2"
});
assert.equal(
  validateByVersion(context, compatibilityProfileV1WithV2Binding.schemaVersion, compatibilityProfileV1WithV2Binding).valid,
  false,
  "Compatibility Profile v1 must reject a v2 policy binding"
);
assert.equal(
  compatibilityProfileV2.schemaBindings.length,
  16,
  "Compatibility Profile v2 fixture must bind its complete non-vector tuple"
);
assert.equal(
  compatibilityProfileV2.schemaBindings.some((binding) => binding.schemaVersion === "fenrua.authority-policy.v2"),
  true,
  "Compatibility Profile v2 must bind Authority Policy v2"
);
assert.equal(
  compatibilityProfileV2.schemaBindings.some((binding) => binding.schemaVersion === "fenrua.evidence-bundle.v2"),
  true,
  "Compatibility Profile v2 must bind Evidence Bundle v2"
);
assert.equal(
  compatibilityProfileV2.schemaBindings.some((binding) => binding.schemaVersion === "fenrua.compatibility-profile.v2"),
  true,
  "Compatibility Profile v2 must bind itself"
);
const compatibilityProfileV2MissingBinding = structuredClone(compatibilityProfileV2);
compatibilityProfileV2MissingBinding.schemaBindings = compatibilityProfileV2MissingBinding.schemaBindings.filter(
  (binding) => binding.schemaVersion !== "fenrua.evidence-bundle.v2"
);
assert.equal(
  validateByVersion(context, compatibilityProfileV2MissingBinding.schemaVersion, compatibilityProfileV2MissingBinding).valid,
  false,
  "Compatibility Profile v2 must reject a missing v2 evidence binding"
);
const compatibilityProfileV2MismatchedBinding = structuredClone(compatibilityProfileV2);
compatibilityProfileV2MismatchedBinding.schemaBindings[2].schemaId = "urn:fenrua:schema:evidence-bundle-v2";
assert.equal(
  validateByVersion(context, compatibilityProfileV2MismatchedBinding.schemaVersion, compatibilityProfileV2MismatchedBinding).valid,
  false,
  "Compatibility Profile v2 must bind each version to its exact schema $id"
);
const compatibilityProfileV2MissingSurface = structuredClone(compatibilityProfileV2);
compatibilityProfileV2MissingSurface.implementationSurfaces[3] = { surface: "core", state: "not-released" };
assert.equal(
  validateByVersion(context, compatibilityProfileV2MissingSurface.schemaVersion, compatibilityProfileV2MissingSurface).valid,
  false,
  "Compatibility Profile v2 must declare every implementation surface state"
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

const verificationVectorV1 = readStrictJson(resolve(validRoot, "verification-vector.json"));
const verificationVectorV2 = readStrictJson(resolve(validRoot, "verification-vector-v2.json"));
const verificationVectorV1WithV2Policy = structuredClone(verificationVectorV1);
verificationVectorV1WithV2Policy.documents[0].schemaId = "urn:fenrua:schema:authority-policy-v2";
assert.equal(
  validateByVersion(context, verificationVectorV1WithV2Policy.schemaVersion, verificationVectorV1WithV2Policy).valid,
  false,
  "Verification Vector v1 must reject a v2 policy document"
);
assert.equal(
  verificationVectorV2.documents.some((document) => document.schemaId === "urn:fenrua:schema:authority-policy-v2"),
  true,
  "Verification Vector v2 must cover Authority Policy v2"
);
assert.equal(
  verificationVectorV2.documents.some((document) => document.schemaId === "urn:fenrua:schema:evidence-bundle-v2"),
  true,
  "Verification Vector v2 must cover Evidence Bundle v2"
);
assert.equal(
  verificationVectorV2.documents.some((document) => document.schemaId === "urn:fenrua:schema:compatibility-profile-v2"),
  true,
  "Verification Vector v2 must cover Compatibility Profile v2"
);
for (const vector of [verificationVectorV1, verificationVectorV2]) {
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
}

assert.equal(Object.hasOwn(verificationVectorV1, "continueExecution"), false, "Verification Vector v1 cannot carry execution instructions");
assert.equal(Object.hasOwn(verificationVectorV2, "continueExecution"), false, "Verification Vector v2 cannot carry execution instructions");
process.stdout.write(`${JSON.stringify({ status: "ok", validFixtures: validFiles.length, negativeFixtures: negativeIndex.cases.length, crossRoleFailures })}\n`);
