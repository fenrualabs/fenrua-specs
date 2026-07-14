# Public Repository Boundary

## Status

This is an R1 specification repository. It is public source, not a service,
control plane, evidence vault, customer-data store, or release channel for a
Trust Gate, CLI, SDK, or hosted platform.

## Allowed

- normative schema source and immutable registry records;
- synthetic, minimised conformance fixtures and deterministic test tooling;
- public-safe compatibility, signature-profile, and governance documents;
- public record templates without live findings or customer information; and
- approved release references only after an independently governed release
  process has created them.

## Prohibited

- plaintext secrets, private keys, access tokens, provider credentials, or
  local credential files;
- customer, tenant, production, or personal data;
- raw audit reports, penetration-test reports, scan exports, private logs,
  screenshots, browser captures, HAR files, packet captures, or working review
  notes;
- private topology, incident evidence, or internal operational exports; and
- claims that a Trust Gate, CLI, SDK, hosted service, signed release, or
  production profile is available when its promotion evidence does not exist.

## Admission rule

The repository-local `npm run check:public-boundary` guard rejects common
prohibited paths, credential markers, unpinned workflow actions, and missing
governance controls. It is a prevention layer, not a substitute for review.

A proposed public exception requires a completed public-evidence exception
record, owner approval, an explicit classification decision, sanitisation, and
an immutable public reference. The raw source evidence remains outside this
repository.

## External controls

Branch protection, required reviews, CODEOWNERS enforcement, secret scanning,
push protection, protected environments, and release approval are GitHub or
organisation controls. Their configuration must be independently recorded
before an R2-or-later promotion; a checked-in document cannot prove that they
are enabled.
