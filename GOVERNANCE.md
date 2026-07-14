# Governance

## R1 decision boundary

The repository owns normative schema source, compatibility records, canonical
synthetic fixtures, signature-profile names, evidence-bundle structure, decision
model structure, and protocol test vectors. It does not own evaluator code,
CLI distribution, SDK distribution, hosted APIs, runtime operations, or private
evidence.

## Change rules

- A registered exact `$id` is immutable once published.
- A semantic, structural, canonicalisation, result-code, or signature-profile
  change requires a new versioned `$id`, fixture updates, compatibility review,
  and a documented decision record.
- Unknown fields, unknown versions, duplicate JSON keys, and parse ambiguity
  are rejected before evaluation by a conforming implementation.
- Test vectors may state `expectedDecision` only as harness metadata. They do
  not contain an execution instruction.
- A verification result is independent output. `PASS` never means `ALLOW`.
- No change may weaken public-boundary, secret, tenant, or fail-closed rules.

## Review and release controls

`.github/CODEOWNERS` designates the repository owner account. Protected branch
rules must require owner review and passing validation before a promotion. A
checked-in Codeowners file does not prove branch protection is configured.

The current status is R1 specification. Any later release or promotion needs
the corresponding source, build, provenance, signature, SBOM, review, and owner
evidence required by the programme gate. This repository must not self-certify
those external controls.

## Records

Templates for public-safe claim, exception, and finding records are under
`governance/templates/`. Filled records must not contain confidential evidence,
customer information, raw audit material, or secrets.
