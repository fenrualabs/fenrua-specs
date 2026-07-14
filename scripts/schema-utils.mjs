import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parseStrictJson } from "./strict-json.mjs";

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const schemaRegistryPath = resolve(repositoryRoot, "schemas", "v0.2", "registry.json");

export function readStrictJson(path) {
  return parseStrictJson(readFileSync(path, "utf8"));
}

export function loadRegistry() {
  return readStrictJson(schemaRegistryPath);
}

export function createSchemaValidator() {
  const registry = loadRegistry();
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    validateFormats: true,
    allowUnionTypes: false
  });
  addFormats(ajv);

  const sharedPath = resolve(repositoryRoot, registry.sharedDefinitions.path);
  const shared = readStrictJson(sharedPath);
  ajv.addSchema(shared);

  const schemas = new Map();
  for (const entry of registry.schemas) {
    const schema = readStrictJson(resolve(repositoryRoot, entry.path));
    ajv.addSchema(schema);
    schemas.set(entry.schemaVersion, { entry, schema });
  }

  return { ajv, registry, schemas };
}

export function validateByVersion(context, schemaVersion, document) {
  const item = context.schemas.get(schemaVersion);
  if (!item) {
    return {
      valid: false,
      errors: [{ instancePath: "/schemaVersion", keyword: "unsupported", message: `Unsupported schema version ${String(schemaVersion)}` }]
    };
  }

  const validate = context.ajv.getSchema(item.entry.$id);
  if (!validate) {
    throw new Error(`Missing compiled validator for ${item.entry.$id}`);
  }
  const valid = validate(document);
  return { valid, errors: valid ? [] : normalizeErrors(validate.errors ?? []) };
}

export function normalizeErrors(errors) {
  return errors
    .map((error) => ({
      instancePath: error.instancePath,
      keyword: error.keyword,
      message: error.message ?? "validation error"
    }))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}
