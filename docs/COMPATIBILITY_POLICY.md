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
- A compatibility profile records an explicit tuple of schema, signing, and
  implementation-surface states; unknown tuple members fail closed.
- Future schemas, profiles, extensions, and output roles are rejected rather
  than guessed or partially parsed.
- Downgrade is forbidden by default. Any future exception needs an explicit,
  unrevoked compatible profile that does not weaken signature, freshness,
  evidence, or policy requirements.

## Deferred commitments

Support windows, deprecation dates, end-of-support dates, migration tools, and
implementation compatibility matrices require actual released implementations
and are deliberately not claimed here.
