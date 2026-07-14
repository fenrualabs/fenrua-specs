# Schema Conventions

## Dialect and identity

All registered top-level schemas use JSON Schema 2020-12 and an exact immutable
URN `$id` of the form `urn:fenrua:schema:<name>-v1`. The registry is the
authoritative mapping from instance `schemaVersion` to `$id`; no remote schema
fetch is permitted.

Every registered object is closed with `additionalProperties: false`. Shared
objects are also closed. Strings, arrays, revisions, timestamps, digests, and
signature representations are bounded.

## Parse and validation order

A conforming implementation first applies a bounded strict JSON parser. It
rejects duplicate keys, malformed input, excessive depth, and excessive bytes.
It then dispatches only by an exact supported `schemaVersion` and validates the
selected local `$id`. It must not coerce types, infer a future version, or
partially interpret unknown fields.

The local test utility enforces a 1 MiB document limit and depth 64. Product
implementations may set lower limits but may not accept more permissive syntax.

## Time, identifiers, hashes, and signatures

Timestamps are UTC RFC 3339 values with exactly milliseconds and a trailing
`Z`. Domain identifiers are lowercase canonical Fenrua URNs. Hash records name
their algorithm and currently allow only lowercase SHA-256 hex. Signature
records name one approved profile and bind a payload digest.

JSON Schema can establish structural presence but cannot prove equality between
two independently nested digests, scope references, timestamps, or signatures.
The evaluator/verifier must enforce those cross-document bindings before any
decision. Failure is fail-closed.

## Canonicalisation boundary

`fenrua-c14n-v1` is an exact compatibility-profile label reserved by this R1
foundation. Its byte-level canonicalisation algorithm, domain separation, and
cryptographic binding require the separate contract decision shared with the
Trust Gate implementation. This repository does not imply that an evaluator,
signature verifier, or cryptographic profile has been released. Vector
`fixtureDigest` values bind raw fixture source bytes only.

## Roles

`fenrua.tool-call-request.v1` is an input. `fenrua.decision.v1` and
`fenrua.evidence-bundle.v1` are evaluator outputs. A
`fenrua.verification-result.v1` is independently generated verifier output.
`fenrua.verification-vector.v1` is test-only metadata. These roles are not
interchangeable even when individual fields look similar.
