# Dependency Policy

The R1 validator has two direct runtime dependencies. Both are exact-pinned in
`package.json` and `package-lock.json`; npm lifecycle scripts are disabled by
`.npmrc`.

| Dependency | Exact version | Licence | Source | Purpose | Security state | Update policy | Removal plan |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ajv` | `8.20.0` | MIT | `github.com/ajv-validator/ajv` | JSON Schema 2020-12 compilation and validation | Local validation only; no network use by this repository's scripts | Review release notes, licence, and advisories before an exact-version change | Replace only with an independently reviewed strict JSON Schema implementation |
| `ajv-formats` | `3.0.1` | MIT | `github.com/ajv-validator/ajv-formats` | Explicit `date-time` format validation | Local validation only; no network use by this repository's scripts | Review with the matching AJV update | Remove if equivalent audited format validation is retained without it |

The validator must reject or avoid unpinned Git dependencies, unchecked binary
downloads, install scripts without review, default telemetry, dynamically loaded
schemas, HTTP clients, URL resolvers, database clients, scripting engines, and
random identifier generation in the decision-path foundation.
