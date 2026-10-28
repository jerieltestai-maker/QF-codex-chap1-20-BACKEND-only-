# Project design skills

Installed for QuoteFix on 28 October 2026. Skills live in `.agents/skills/` and apply to this repository. The UI/UX Pro Max installer CLI is installed globally; its generated skills are project-local.

## Exact invocation names

| Package | Codex prompt invocation |
| --- | --- |
| Taste Skill | `$design-taste-frontend` |
| Impeccable | `$impeccable` |
| UI/UX Pro Max | `$ui-ux-pro-max` |

UI/UX Pro Max 2.15.0 also generated `$banner-design`, `$brand`, `$design`, `$design-system`, `$slides`, and `$ui-styling`. These names were read from their installed `SKILL.md` manifests and confirmed by `skills list --agent codex --json`.

For example: `$ui-ux-pro-max Review the QuoteFix dashboard for accessibility.`

Use the skills on the next turn; restart Codex if its skill selector has not refreshed. Impeccable's automatic hooks are installed in `.codex/hooks.json`; open `/hooks` and approve the project hook to enable them, as required by the [upstream installation instructions](https://github.com/pbakaus/impeccable#installation). Hook approval and a visual redesign were not performed during setup.

## Prerequisites and verification

Already present; no runtime or browser installation was necessary:

- Node.js 24.22.1 and npm 11.19.1, satisfying Taste's Node.js 22+ requirement.
- Python 3.13.15, satisfying UI/UX Pro Max's Python 3 requirement.
- Chrome 156.0.8078.48 and Edge 156.0.4314.42.

Taste's bundled browser client detected and successfully launched headless Chrome. UI/UX Pro Max's Python search returned an accessibility result from its local dataset. Impeccable's Windows launcher returned version 4.8.0. All nine installed skills were detected for Codex by the skills CLI. These checks verify installation and basic execution, not a full design workflow or companion-skill integrations.

The setup-owned files pass `git diff --check`. The full imported diff reports upstream whitespace findings in vendored assets, which were preserved instead of reformatted. Executable binaries, Python caches, secrets, operational files, and SQL migrations are excluded from this setup commit.

## Installation provenance

Commands used (PowerShell uses `.cmd` to select the Windows launchers):

```powershell
npx.cmd --yes skills@1.7.4 add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend --agent codex --copy --yes
npx.cmd --yes impeccable@4.8.0 install --providers=codex --scope=project --yes
npm.cmd install -g ui-ux-pro-max-cli@2.15.0
uipro.cmd init --ai codex
```

Taste's source and content hash are recorded in `skills-lock.json`.

Impeccable's remote bundle download stalled. Its installer was stopped, then rerun with its supported `IMPECCABLE_BUNDLE_PATH` local-bundle option, using the committed Codex skill and hook files from [pbakaus/impeccable](https://github.com/pbakaus/impeccable) at commit `3e3a9179e01a60265000ce239c0a99803ec1e60d` (skill 4.8.0, engine 0.1.18). The installer rewrote hook paths for `.agents/skills`. Temporary checkout/bundle files remain under ignored `work/design-skills/`; the override applied only to that installer process.

The Windows engine came from the matching npm platform dependency. Its SHA-256 matched the upstream skill's checksum manifest before installation: `8f61e96b0c97001546a824d79b44f46b423b560f3eb1a0cc44a8695a1b395d9f`. The local engine binary is ignored by Git; the shipped launcher can obtain and verify it on another machine.

UI/UX Pro Max's source project is [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill); the generated assets came from the globally installed `ui-ux-pro-max-cli` 2.15.0 package.

Installing these tools does not decide QuoteFix's visual direction or change its product policies. Repository instructions and the owner's explicit decisions continue to govern future design work.
