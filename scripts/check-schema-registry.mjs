import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createSchemaValidator, readStrictJson, repositoryRoot } from "./schema-utils.mjs";

const expectedVersions = [
  "fenrua.entity-manifest.v1",
  "fenrua.authority-policy.v1",
  "fenrua.authority-policy.v2",
  "fenrua.tool-call-request.v1",
  "fenrua.approval.v1",
  "fenrua.revocation-set.v1",
  "fenrua.decision.v1",
  "fenrua.evidence-bundle.v1",
  "fenrua.evidence-bundle.v2",
  "fenrua.receipt.v1",
  "fenrua.verification-result.v1",
  "fenrua.key-metadata.v1",
  "fenrua.key-rotation.v1",
  "fenrua.audit-event.v1",
  "fenrua.compatibility-profile.v1",
  "fenrua.compatibility-profile.v2",
  "fenrua.verification-vector.v1",
  "fenrua.verification-vector.v2"
];

const context = createSchemaValidator();
const { registry, schemas, ajv } = context;
const frozenV1Registry = readStrictJson(resolve(repositoryRoot, "schemas", "v0.1", "registry.json"));

assert.equal(registry.$id, "urn:fenrua:schema-registry:v0-2");
assert.equal(registry.registryFormat, "fenrua.schema-registry.v1");
assert.equal(registry.maturity, "R1-specification");
assert.equal(registry.releaseState, "no-trust-gate-or-sdk-release");
assert.equal(registry.schemaDialect, "https://json-schema.org/draft/2020-12/schema");
assert.equal(registry.immutability.mutationAllowed, false);
assert.equal(registry.schemas.length, expectedVersions.length, "Registry must contain exactly 18 top-level entries");
assert.deepEqual([...schemas.keys()].sort(), [...expectedVersions].sort(), "Registry schema versions differ from the v0.2 set");
assert.equal(new Set(registry.schemas.map((entry) => entry.$id)).size, expectedVersions.length, "Schema $ids must be unique");
assert.equal(new Set(registry.schemas.map((entry) => entry.path)).size, expectedVersions.length, "Schema paths must be unique");
assert.deepEqual(
  registry.schemas.filter((entry) => entry.schemaVersion.endsWith(".v1")),
  frozenV1Registry.schemas,
  "The v0.2 registry must retain every v0.1 schema entry unchanged"
);
assert.deepEqual(registry.sharedDefinitions, frozenV1Registry.sharedDefinitions, "The v0.2 registry must retain the frozen shared vocabulary");

for (const entry of registry.schemas) {
  assert.match(entry.$id, /^urn:fenrua:schema:[a-z0-9-]+-v[1-9][0-9]{0,2}$/, `${entry.schemaVersion} has a noncanonical $id`);
  assert.ok(existsSync(resolve(repositoryRoot, entry.path)), `${entry.path} is missing`);
  const { schema } = schemas.get(entry.schemaVersion);
  assert.equal(schema.$schema, registry.schemaDialect, `${entry.schemaVersion} uses the wrong dialect`);
  assert.equal(schema.$id, entry.$id, `${entry.schemaVersion} does not match the registry $id`);
  assert.equal(schema.type, "object", `${entry.schemaVersion} must be an object schema`);
  assert.equal(schema.additionalProperties, false, `${entry.schemaVersion} must reject unknown top-level fields`);
  assert.equal(schema.properties.schemaVersion.const, entry.schemaVersion, `${entry.schemaVersion} must use its exact version marker`);
  assert.ok(ajv.getSchema(entry.$id), `${entry.$id} did not compile`);
}

const authorityPolicyV1 = schemas.get("fenrua.authority-policy.v1").schema;
const authorityPolicyV2 = schemas.get("fenrua.authority-policy.v2").schema;
const evidenceBundleV1 = schemas.get("fenrua.evidence-bundle.v1").schema;
const evidenceBundleV2 = schemas.get("fenrua.evidence-bundle.v2").schema;
const compatibilityProfileV1 = schemas.get("fenrua.compatibility-profile.v1").schema;
const compatibilityProfileV2 = schemas.get("fenrua.compatibility-profile.v2").schema;
const verificationVectorV1 = schemas.get("fenrua.verification-vector.v1").schema;
const verificationVectorV2 = schemas.get("fenrua.verification-vector.v2").schema;
const v1Rule = authorityPolicyV1.$defs.Rule;
const v2Rule = authorityPolicyV2.$defs.Rule;
assert.equal(Object.hasOwn(v1Rule.properties, "contextSelector"), false, "Authority Policy v1 must remain selector-free");
assert.equal(v1Rule.required.includes("contextSelector"), false, "Authority Policy v1 must not require contextSelector");
assert.equal(v2Rule.additionalProperties, false, "Authority Policy v2 rules must remain closed");
assert.equal(v2Rule.required.includes("contextSelector"), true, "Authority Policy v2 rules must require contextSelector");
assert.deepEqual(
  v2Rule.properties.contextSelector,
  { "$ref": "urn:fenrua:schema:shared-definitions-v1#/$defs/Context" },
  "Authority Policy v2 contextSelector must use the shared Context definition"
);
const sharedDefinitions = readStrictJson(resolve(repositoryRoot, registry.sharedDefinitions.path));
const sharedContext = sharedDefinitions.$defs.Context;
assert.equal(sharedContext.additionalProperties, false, "Shared Context must remain closed");
assert.deepEqual(sharedContext.required, ["contextId", "audience", "bindings"], "Shared Context must require its complete shape");
assert.equal(sharedContext.properties.bindings.minItems, 1, "Shared Context bindings must be non-empty");
assert.equal(sharedContext.properties.bindings.maxItems, 32, "Shared Context bindings must remain bounded");

const frozenSchemaIds = sharedDefinitions.$defs.SchemaId.enum;
assert.equal(
  frozenSchemaIds.includes("urn:fenrua:schema:authority-policy-v2"),
  false,
  "Frozen Evidence Bundle v1 document references must not learn Authority Policy v2"
);
assert.equal(
  evidenceBundleV1.properties.inputs.items.$ref,
  "urn:fenrua:schema:shared-definitions-v1#/$defs/DocumentRef",
  "Evidence Bundle v1 must retain frozen document references"
);
assert.equal(
  evidenceBundleV2.properties.inputs.items.$ref,
  "#/$defs/DocumentRef",
  "Evidence Bundle v2 must use its additive document-reference vocabulary"
);
assert.deepEqual(
  evidenceBundleV2.$defs.SchemaId.enum,
  [...frozenSchemaIds, "urn:fenrua:schema:authority-policy-v2", "urn:fenrua:schema:evidence-bundle-v2"],
  "Evidence Bundle v2 must permit only its bounded provenance schema set"
);

const v1ProfileBindingVersions = compatibilityProfileV1.$defs.SchemaBinding.oneOf.map(
  (binding) => binding.properties.schemaVersion.const
);
const v2ProfileBindingVersions = compatibilityProfileV2.$defs.SchemaBinding.oneOf.map(
  (binding) => binding.properties.schemaVersion.const
);
assert.equal(v1ProfileBindingVersions.includes("fenrua.authority-policy.v2"), false, "Compatibility Profile v1 must remain closed to Authority Policy v2");
assert.equal(v1ProfileBindingVersions.includes("fenrua.evidence-bundle.v2"), false, "Compatibility Profile v1 must remain closed to Evidence Bundle v2");
assert.equal(v1ProfileBindingVersions.includes("fenrua.compatibility-profile.v2"), false, "Compatibility Profile v1 must remain closed to Compatibility Profile v2");
assert.equal(compatibilityProfileV2.properties.schemaBindings.minItems, 16, "Compatibility Profile v2 must require its full local tuple");
assert.equal(compatibilityProfileV2.properties.schemaBindings.maxItems, 18, "Compatibility Profile v2 may bind only its two test-only vector identities in addition");
assert.equal(compatibilityProfileV2.properties.schemaBindings.uniqueItems, true, "Compatibility Profile v2 bindings must remain unique");
assert.deepEqual(
  [...v2ProfileBindingVersions].sort(),
  [
    "fenrua.entity-manifest.v1",
    "fenrua.authority-policy.v1",
    "fenrua.authority-policy.v2",
    "fenrua.tool-call-request.v1",
    "fenrua.approval.v1",
    "fenrua.revocation-set.v1",
    "fenrua.decision.v1",
    "fenrua.evidence-bundle.v1",
    "fenrua.evidence-bundle.v2",
    "fenrua.receipt.v1",
    "fenrua.verification-result.v1",
    "fenrua.key-metadata.v1",
    "fenrua.key-rotation.v1",
    "fenrua.audit-event.v1",
    "fenrua.compatibility-profile.v1",
    "fenrua.compatibility-profile.v2",
    "fenrua.verification-vector.v1",
    "fenrua.verification-vector.v2"
  ].sort(),
  "Compatibility Profile v2 must bind only exact registered identities"
);
assert.deepEqual(
  compatibilityProfileV2.allOf.slice(0, 16).map(
    (rule) => rule.properties.schemaBindings.contains.properties.schemaVersion.const
  ).sort(),
  [
    "fenrua.entity-manifest.v1",
    "fenrua.authority-policy.v1",
    "fenrua.authority-policy.v2",
    "fenrua.tool-call-request.v1",
    "fenrua.approval.v1",
    "fenrua.revocation-set.v1",
    "fenrua.decision.v1",
    "fenrua.evidence-bundle.v1",
    "fenrua.evidence-bundle.v2",
    "fenrua.receipt.v1",
    "fenrua.verification-result.v1",
    "fenrua.key-metadata.v1",
    "fenrua.key-rotation.v1",
    "fenrua.audit-event.v1",
    "fenrua.compatibility-profile.v1",
    "fenrua.compatibility-profile.v2"
  ].sort(),
  "Compatibility Profile v2 must require every non-vector protocol binding"
);
assert.equal(verificationVectorV1.$defs.VectorDocument.properties.schemaId.$ref, "urn:fenrua:schema:shared-definitions-v1#/$defs/SchemaId", "Verification Vector v1 must retain frozen schema IDs");
assert.equal(verificationVectorV2.$defs.VectorDocument.properties.schemaId.$ref, "#/$defs/SchemaId", "Verification Vector v2 must own its additive schema vocabulary");
assert.equal(verificationVectorV2.$defs.SchemaId.enum.includes("urn:fenrua:schema:authority-policy-v2"), true, "Verification Vector v2 must bind Authority Policy v2");
assert.equal(verificationVectorV2.$defs.SchemaId.enum.includes("urn:fenrua:schema:evidence-bundle-v2"), true, "Verification Vector v2 must bind Evidence Bundle v2");
assert.equal(verificationVectorV2.$defs.SchemaId.enum.includes("urn:fenrua:schema:compatibility-profile-v2"), true, "Verification Vector v2 must bind Compatibility Profile v2");
assert.equal(verificationVectorV2.$defs.SchemaId.enum.includes("urn:fenrua:schema:verification-vector-v2"), false, "Verification vectors must not refer to themselves as documents");

const vectorEntries = registry.schemas.filter((entry) => entry.role === "test-only-non-output");
assert.deepEqual(
  vectorEntries.map((entry) => entry.schemaVersion).sort(),
  ["fenrua.verification-vector.v1", "fenrua.verification-vector.v2"],
  "Only verification vectors may be test-only"
);

function hasForbiddenKey(value, forbidden) {
  if (Array.isArray(value)) {
    return value.some((item) => hasForbiddenKey(item, forbidden));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, nested]) => key === forbidden || hasForbiddenKey(nested, forbidden));
  }
  return false;
}

for (const schemaVersion of ["fenrua.decision.v1", "fenrua.verification-result.v1", "fenrua.verification-vector.v1", "fenrua.verification-vector.v2"]) {
  const { schema } = schemas.get(schemaVersion);
  assert.equal(hasForbiddenKey(schema, "continueExecution"), false, `${schemaVersion} must not carry execution instructions`);
}
assert.equal(Object.hasOwn(schemas.get("fenrua.verification-result.v1").schema.properties, "decision"), false, "Verification results cannot be decisions");
assert.equal(Object.hasOwn(schemas.get("fenrua.verification-vector.v1").schema.properties, "decision"), false, "Vectors cannot be decisions");

process.stdout.write(`${JSON.stringify({ status: "ok", registrySchemas: registry.schemas.length, compiledSchemas: schemas.size })}\n`);
