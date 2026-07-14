# fenrua-specs

R1 normative schema and protocol-vector foundation for the proposed Fenrua
Trust Gate boundary.

This repository currently defines strict JSON Schema 2020-12 artifacts,
synthetic conformance fixtures, compatibility records, and public repository
governance. It does **not** release a Trust Gate, CLI, SDK, hosted service, or
production cryptographic profile.

## Contents

- `schemas/v0.1/registry.json` records the immutable exact `$id` for the 13
  protocol schemas and the test-only `fenrua.verification-vector.v1` schema.
- `schemas/v0.1/shared-definitions.json` holds bounded shared vocabulary.
- `fixtures/` contains synthetic positive and negative conformance material.
- `scripts/` provides deterministic local strict-JSON and schema validation.

## Local validation

```sh
npm ci --ignore-scripts
npm test
npm run validate -- fixtures/valid/decision.json
```

`npm test` rejects duplicate JSON keys before schema validation, compiles every
registered schema, validates canonical fixtures, validates negative fixtures,
rejects injected unknown fields, and verifies that documents cannot be used in
another role's schema.

## Boundary

A `verification-vector` is test metadata, not an evaluator input or output.
A verification `PASS` is not an `ALLOW` decision, and no schema authorises or
instructs execution. See [PUBLIC_BOUNDARY.md](PUBLIC_BOUNDARY.md),
[docs/SCHEMA_CONVENTIONS.md](docs/SCHEMA_CONVENTIONS.md), and
[docs/VECTOR_CONVENTIONS.md](docs/VECTOR_CONVENTIONS.md).

Security reports belong in the confidential process described in
[SECURITY.md](SECURITY.md). Raw reports, scan dumps, credentials, customer
material, screenshots, and working review artifacts are prohibited here.
