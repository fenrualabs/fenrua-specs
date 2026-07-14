# Compatibility Policy

## Current status

This is an R1 specification baseline. It creates no public support-window,
availability, or backward-compatibility promise for a Trust Gate, CLI, SDK, or
hosted API.

## Rules

- Library, CLI, and SDK releases will use semantic versioning after they exist.
- Registered JSON schemas are immutable and uniquely identified by exact `$id`.
- Breaking schema, result-code, canonicalisation, or signature-profile changes
  require a new versioned schema/profile and conformance vectors.
- `fenrua.authority-policy.v2` and `fenrua.evidence-bundle.v2` are new exact
  schema identities, not extensions of their v1 namesakes. Consumers must
  dispatch them from the v0.2 registry and must not upgrade, downgrade, or
  reinterpret v1 documents.
- A compatibility profile records an explicit tuple of schema, signing, and
  implementation-surface states; unknown tuple members fail closed.
- Future schemas, profiles, extensions, and output roles are rejected rather
  than guessed or partially parsed.
- Downgrade is forbidden by default. Any future exception needs an explicit,
  unrevoked compatible profile that does not weaken signature, freshness,
  evidence, or policy requirements.

## Local v2 provenance boundary

`fenrua.compatibility-profile.v1` is an immutable, closed v1 tuple and cannot
bind the v2 Authority Policy or Evidence Bundle. An Evidence Bundle v1 also
cannot reference an Authority Policy v2 because its document-reference
allowlist is frozen. The v2 Evidence Bundle carries a separate bounded
reference vocabulary so it can preserve that provenance without changing v1.

`fenrua.compatibility-profile.v2` is a separate, closed 16-binding local v2
tuple. It retains the required v1 identities and adds exact bindings for
Authority Policy v2, Evidence Bundle v2, and its own profile identity.
`fenrua.verification-vector.v2` is separately versioned test metadata that can
bind those v2 identities. Neither record extends its v1 namesake, makes the
Trust Gate accept a compatibility-profile document, or creates a released
compatibility, SDK, CLI, API, or support commitment.

## Deferred commitments

Support windows, deprecation dates, end-of-support dates, migration tools, and
implementation compatibility matrices require actual released implementations
and are deliberately not claimed here.
