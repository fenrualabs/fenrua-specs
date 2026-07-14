import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { createSchemaValidator, normalizeErrors, repositoryRoot } from "./schema-utils.mjs";
import { parseStrictJson } from "./strict-json.mjs";

function usage() {
  process.stderr.write("Usage: npm run validate -- [--schema <schemaVersion>] <document.json>\n");
}

const args = process.argv.slice(2);
let expectedSchemaVersion;
let file;

if (args[0] === "--schema") {
  expectedSchemaVersion = args[1];
  file = args[2];
  if (args.length !== 3) {
    usage();
    process.exitCode = 64;
  }
} else {
  file = args[0];
  if (args.length !== 1) {
    usage();
    process.exitCode = 64;
  }
}

if (!file || process.exitCode) {
  process.exit();
}

try {
  const path = resolve(repositoryRoot, file);
  const relativePath = relative(repositoryRoot, path);
  if (isAbsolute(relativePath) || relativePath === ".." || relativePath.startsWith("..")) {
    throw new Error("Document path must remain inside this repository");
  }
  const document = parseStrictJson(readFileSync(path, "utf8"));
  const actualSchemaVersion = document?.schemaVersion;
  if (expectedSchemaVersion && actualSchemaVersion !== expectedSchemaVersion) {
    throw new Error(`Declared schemaVersion ${String(actualSchemaVersion)} does not match requested ${expectedSchemaVersion}`);
  }

  const context = createSchemaValidator();
  const result = context.schemas.has(actualSchemaVersion)
    ? (() => {
        const validate = context.ajv.getSchema(context.schemas.get(actualSchemaVersion).entry.$id);
        const valid = validate(document);
        return { valid, errors: valid ? [] : normalizeErrors(validate.errors ?? []) };
      })()
    : {
        valid: false,
        errors: [{ instancePath: "/schemaVersion", keyword: "unsupported", message: `Unsupported schema version ${String(actualSchemaVersion)}` }]
      };

  process.stdout.write(`${JSON.stringify({ file, schemaVersion: actualSchemaVersion, valid: result.valid, errors: result.errors })}\n`);
  process.exitCode = result.valid ? 0 : 1;
} catch (error) {
  process.stdout.write(`${JSON.stringify({ file, valid: false, errors: [{ keyword: "strict-json", message: error.message }] })}\n`);
  process.exitCode = 1;
}
