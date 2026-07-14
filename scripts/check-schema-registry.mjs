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
  "fenrua.receipt.v1",
  "fenrua.verification-result.v1",
  "fenrua.key-metadata.v1",
  "fenrua.key-rotation.v1",
  "fenrua.audit-event.v1",
  "fenrua.compatibility-profile.v1",
  "fenrua.verification-vector.v1"
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
assert.equal(registry.schemas.length, expectedVersions.length, "Registry must contain exactly 15 top-level entries");
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

const vectorEntry = registry.schemas.find((entry) => entry.schemaVersion === "fenrua.verification-vector.v1");
assert.equal(vectorEntry.role, "test-only-non-output", "Verification vectors must remain test-only");
assert.equal(registry.schemas.filter((entry) => entry.role === "test-only-non-output").length, 1, "Only verification vectors may be test-only");

function hasForbiddenKey(value, forbidden) {
  if (Array.isArray(value)) {
    return value.some((item) => hasForbiddenKey(item, forbidden));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, nested]) => key === forbidden || hasForbiddenKey(nested, forbidden));
  }
  return false;
}

for (const schemaVersion of ["fenrua.decision.v1", "fenrua.verification-result.v1", "fenrua.verification-vector.v1"]) {
  const { schema } = schemas.get(schemaVersion);
  assert.equal(hasForbiddenKey(schema, "continueExecution"), false, `${schemaVersion} must not carry execution instructions`);
}
assert.equal(Object.hasOwn(schemas.get("fenrua.verification-result.v1").schema.properties, "decision"), false, "Verification results cannot be decisions");
assert.equal(Object.hasOwn(schemas.get("fenrua.verification-vector.v1").schema.properties, "decision"), false, "Vectors cannot be decisions");

process.stdout.write(`${JSON.stringify({ status: "ok", registrySchemas: registry.schemas.length, compiledSchemas: schemas.size })}\n`);
