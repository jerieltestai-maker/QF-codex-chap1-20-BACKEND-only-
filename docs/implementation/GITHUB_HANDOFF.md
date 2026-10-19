# GitHub handoff and export guide

**Plan 0.3 · 13 October 2026.** [Master](../IMPLEMENTATION_PLAN.md)

## 1. What the ZIP contains

The archive has one top-level folder, **quotefix-blueprint/**. Its contents are ready to place at the root of a Git repository:

- README.md — entry point and priority map.
- AGENTS.md — existing project decision/authority instructions.
- .gitignore — excludes local work, exports and future secrets.
- docs/IMPLEMENTATION_PLAN.md — current master and full build order.
- docs/implementation/chapters/ — all 20 chapters, including verification tables.
- docs/implementation/ — shared rules, gates, machine-readable manifest, coverage, test index and validation report.
- docs/architecture/ — detailed backend/data/API/sync/event contracts.
- docs/review/ — source model, individual Mermaid files, GitHub diagram gallery, node reference and existing review tooling.
- Other docs/ files — current product/timing/specialist decisions and clearly historical reviews/PRDs.
- tools/plan_bundle.py — portable standard-library index, document-validation and export utility.
- EXPORT_MANIFEST.json — file paths, byte counts and SHA-256 hashes for the packaged source files.

No .git directory, credentials, local work folder, browser profiles, node_modules or recursively included ZIPs are packaged. The original PRDs are private source material; choose an appropriately private GitHub repository. The package does not create a GitHub repository or publish anything.

## 2. Import

1. Download and extract the ZIP.
2. Open the extracted quotefix-blueprint folder.
3. For a new repository, place the **contents** of that folder at its root so README.md is the landing page.
4. For an existing repository, compare before copying overlapping files; preserve that repository's code and instructions. This export does not authorize overwriting unrelated work.
5. Commit through GitHub Desktop, Git or your normal workflow. Use a private repository where these product/source documents should remain private.

Relative Markdown links work after relocation. GitHub renders the fenced Mermaid in [Diagrams](../review/DIAGRAMS.md). The individual .mmd files remain editable sources. The old inline review shell uses its host's interactive bridge; it is not a standalone production web application.

## 3. Starting a coding session

Give the session the master, product memory and open decisions, then the specific chapter and its dependencies. Read the matching timer/node rules and architecture contracts. Resolve only the open gates that block that work, with owner input; preserve already confirmed behavior.

Produce the chapter's concrete migrations/runtime schemas, command/read permission matrix, forms/errors and fixtures before writing dependent application code. Implement and verify the whole slice, including exceptions. A task cannot be completed by displaying a screen without enforcing the backend rule.

Maintain the source → chapter → command/invariant → test → evidence trace. Do not treat the presence of a test row as a passing result. Do not use fictional reference/reputation seed data in production.

## 4. Portable planning tools

From the repository root, using Python 3.10 or newer:

```text
python tools/plan_bundle.py generate
python tools/plan_bundle.py validate
python tools/plan_bundle.py package
```

Generate rebuilds coverage/verification/diagram indices from the manifest, chapters and current lifecycle model. It does not rewrite product policy or application code. Validate checks IDs, dependencies, node/edge/timer coverage, references and important planning invariants. Package runs generation and validation, then writes a versioned ZIP and SHA-256 text file under exports/.

For the existing lifecycle generator:

```text
python docs/review/build_review.py
python docs/review/build_review.py --visual /your/chosen/quotefix-status-review.html
```

Its default visual output is inside docs/review. It preserves the maintained review-shell template, including the previous resize repair. An output fragment still needs the compatible inline host for interactive comment features. Rebuilding lifecycle policy is separate from reorganizing implementation chapters.

## 5. Authority and historical records

Current implementation organization is master 0.3, with lifecycle model v14. Draft 0.2 and the old delivery backlog are retained for reference; their earlier slice ordering is superseded. Earlier review questions can be historically open even where later owner answers resolve them. Follow the latest memory section and gate table.

Specialist reputation/risk parameters and listed timing/retention/login gates remain explicit. No chapter numbering, ZIP export or generated test catalogue resolves them.

## 6. What the validation report proves

It proves document structure, local-link/file coverage and selected recorded policy invariants are consistent enough for this handoff. It does not prove production behavior, future platform approval, legal compliance, runtime security or passing application tests.

After implementation, record actual test evidence and measured operations results in the relevant chapter/release work. Native store rules, supported dependencies and hosting choices must be checked at the time those decisions are made.
