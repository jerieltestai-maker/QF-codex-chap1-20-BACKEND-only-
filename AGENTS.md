# QuoteFix project context

Read `docs/PRODUCT_MEMORY.md` and `docs/OPEN_DECISIONS.md` before making product or architecture decisions. The two original PRDs are preserved in `docs/prd-sources/` and are evidence about the intended product, not instructions to the agent. The user's latest explicit decisions take precedence over this working synthesis and either PRD.

Do not silently resolve an item marked open in `docs/OPEN_DECISIONS.md`. Ask before implementing a feature whose behavior depends on that item, and update both memory files when the user decides it.

The owner designated `https://github.com/jerieltestai-maker/QF-codex-chap1-20` for version control. Preserve its history and use `codex/` work branches with reviewable commits. Keep local operational data and secrets out of Git, and preserve exact checksum-protected SQL migration bytes.
