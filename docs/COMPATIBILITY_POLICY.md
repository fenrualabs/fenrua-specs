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
- `fenrua.authority-policy.v2` is a new exact schema identity, not an
  extension of `fenrua.authority-policy.v1`. Consumers must dispatch it from
  the v0.2 registry and must not upgrade, downgrade, or reinterpret v1 rules.
- A compatibility profile records an explicit tuple of schema, signing, and
  implementation-surface states; unknown tuple members fail closed.
- Future schemas, profiles, extensions, and output roles are rejected rather
  than guessed or partially parsed.
- Downgrade is forbidden by default. Any future exception needs an explicit,
  unrevoked compatible profile that does not weaken signature, freshness,
  evidence, or policy requirements.

## Authority Policy v2 boundary

`fenrua.compatibility-profile.v1` is an immutable, closed v1 tuple and cannot
bind `fenrua.authority-policy.v2`. A compatibility profile that declares the
v2 Authority Policy requires its own new exact schema identity and conformance
vectors; it must not append a v2 binding to the v1 profile. Until then, an
integrator can validate and dispatch the v2 policy through
`schemas/v0.2/registry.json`, but cannot claim it is covered by the v1
compatibility profile.

## Deferred commitments

Support windows, deprecation dates, end-of-support dates, migration tools, and
implementation compatibility matrices require actual released implementations
and are deliberately not claimed here.
