import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { repositoryRoot } from "./schema-utils.mjs";

const requiredPaths = [
  "README.md",
  "PUBLIC_BOUNDARY.md",
  "SECURITY.md",
  "GOVERNANCE.md",
  "DEPENDENCY_POLICY.md",
  ".github/CODEOWNERS",
  ".github/workflows/validate.yml",
  "governance/templates/claim-record.md",
  "governance/templates/public-evidence-exception.md",
  "governance/templates/finding-record.md"
];

for (const path of requiredPaths) {
  assert.ok(statSync(resolve(repositoryRoot, path)).isFile(), `Required governance artifact is missing: ${path}`);
}

const ignoredDirectories = new Set([".git", "node_modules"]);
const prohibitedPathPatterns = [
  /(^|\/)(?:artifacts|audit-reports|scan-dumps|screenshots|private)(?:\/|$)/i,
  /(?:^|\/).*(?:audit-report|scan-dump|penetration-test|pentest|working-review|review-notes).*$/i,
  /\.(?:sarif|har|pcap|key|pem)$/i
];
const credentialPatterns = [
  /-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----/,
  /(?:ghp|gho|github_pat)_[A-Za-z0-9_]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  new RegExp(["-----BEGIN", " OPENSSH PRIVATE KEY-----"].join(""))
];

function walk(directory) {
  const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...walk(join(directory, entry.name)));
      }
    } else if (entry.isFile()) {
      files.push(join(directory, entry.name));
    }
  }
  return files;
}

const files = walk(repositoryRoot);
for (const absolutePath of files) {
  const path = relative(repositoryRoot, absolutePath).replaceAll("\\", "/");
  assert.equal(prohibitedPathPatterns.some((pattern) => pattern.test(path)), false, `Prohibited public artifact path: ${path}`);
  const content = readFileSync(absolutePath, "utf8");
  assert.equal(credentialPatterns.some((pattern) => pattern.test(content)), false, `Credential marker detected in ${path}`);
}

const workflow = readFileSync(resolve(repositoryRoot, ".github/workflows/validate.yml"), "utf8");
for (const match of workflow.matchAll(/^\s*- uses:\s+[^@\s]+@([^\s]+)\s*$/gm)) {
  assert.match(match[1], /^[a-f0-9]{40}$/, `Workflow action is not full-SHA pinned: ${match[0].trim()}`);
}

const packageJson = JSON.parse(readFileSync(resolve(repositoryRoot, "package.json"), "utf8"));
for (const [name, version] of Object.entries(packageJson.dependencies ?? {})) {
  assert.match(version, /^\d+\.\d+\.\d+$/, `${name} must be exact pinned`);
}
const lockfile = JSON.parse(readFileSync(resolve(repositoryRoot, "package-lock.json"), "utf8"));
assert.equal(lockfile.lockfileVersion, 3, "npm lockfile must use version 3");
for (const [name, version] of Object.entries(packageJson.dependencies ?? {})) {
  assert.equal(lockfile.packages[`node_modules/${name}`]?.version, version, `${name} lockfile version differs from package.json`);
}

const readme = readFileSync(resolve(repositoryRoot, "README.md"), "utf8");
assert.match(readme, /does \*\*not\*\* release a Trust Gate/i);
process.stdout.write(`${JSON.stringify({ status: "ok", checkedFiles: files.length, directDependencies: Object.keys(packageJson.dependencies ?? {}).length })}\n`);
