# Verification Vector Conventions

`fenrua.verification-vector.v1` records test metadata for a conformance
harness. Its `expectedDecision` is an expected harness value, not an evaluator
output or execution command. The schema intentionally rejects
`continueExecution` and any undeclared field.

Each vector binds a role, exact schema `$id`, fixture path, and `fixtureDigest`:
the SHA-256 of the fixture's exact UTF-8 bytes. The R1 validator recomputes those
source-vector digests and proves path/schema-role bindings. A `fixtureDigest` is
test-source integrity metadata, not a future evaluator's canonical payload
digest. A future evaluator and independent verifier must additionally validate
the declared canonicalisation profile, signatures, scope, audience, context,
freshness, revocation, replay, policy semantics, and evidence. Those behaviours
are not claimed as available here.

Fixtures are synthetic and deterministic. They contain no production decisions,
customer inputs, credentials, secret material, or live-service observations.

## Version boundary

`fenrua.verification-vector.v1` is immutable and only binds the v1 schema IDs
enumerated by its closed contract. It does not bind
`fenrua.authority-policy.v2`; a vector that covers the v2 Authority Policy
requires a new exact vector schema/profile rather than injecting a v2 document
into a v1 vector.
