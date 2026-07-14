# Security Policy

## Scope

This repository currently contains R1 schemas, fixtures, and local validation
tooling. It does not operate a hosted service, distribute a Trust Gate binary,
or hold production key material. Reports about schema ambiguity, parser
confusion, supply-chain integrity, fixture contamination, or repository-boundary
failures are in scope.

## Reporting

Do not open a public issue for a suspected vulnerability and do not attach
credentials, customer data, private logs, scan dumps, or exploit payloads to
this repository. Use GitHub private vulnerability reporting for
`fenrualabs/fenrua-specs` when that feature is enabled. If it is unavailable,
use the existing confidential Fenrua owner contact channel.

Include a minimal reproduction, affected exact schema `$id` or file path,
impact, and any safe mitigation suggestion. Send only synthetic or sanitised
material unless a repository owner directs an approved private channel.

## Triage and disclosure

Repository maintainers triage reports as critical, high, medium, low, or
informational. No response or remediation time commitment is published yet.
Material fixes require a bounded finding record, tests where practical, a
release/change decision, and a public advisory only when disclosure is safe and
approved. Exceptions must state impact, compensating control, owner, and expiry.

Private keys, secrets, customer data, and raw confidential evidence are never
valid public disclosure material.
