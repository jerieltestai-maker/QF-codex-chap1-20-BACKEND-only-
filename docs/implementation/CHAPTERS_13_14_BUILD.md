# Chapters 13–14 local build — 18 October 2026

Owner-authorised backend-first construction: private Contractor billing, cancellation, claims, Admin evidence/resolution/execution, controlled correction and simple web controls. G08/O37-C is explicitly resolved as independently rounded half-up cents. [ADR 007](../architecture/ADR_007_BILLING_AND_SUPPORT.md) records the implementation and authority.

## Delivered paths

- Exact invoice/settlement confirmations assess independent 4% platform/lead fees. Immutable differences preserve original liabilities/deadlines; credits offset unpaid amounts and paid excess requires actual refunds.
- Contractor statements/reports and Admin collection allocations/refunds remain separate from estate jobs. Overdue fees restrict new quoting/unselected offers while selected work, payment and support remain accessible. Admin verification findings remain private.
- Immediate CM/MCST cancellation works before approval and after authorisation. Confirmed debts and payment receipt clocks survive; ordinary commitments stop. Seven-day claim windows anchor to first successful notice; drafts/read markers/retries cannot reset or submit them.
- Role/context-specific support handles named evidence, restricted files, confidential subjects (including equal-role MCST users), authorised uninvolved MCST access, dated offline follow-up, final resolutions, nonblocking acknowledgment and verified actual execution.
- Organisation/estate account support works before any job exists, without fake job/financial records. Respondent pickers exclude rival companies from Contractor views and bind evidence requests to the actual case participant.
- Fresh physical remedies use the common completion/inspection history, including repeated failures. Settlement confirmations and explicit Admin financial overrides adjust the existing financial chain; zero settlements invent no positive fee or transfer. Estate overpayment refunds record actual execution.
- Admin correction requires an impact preview, reason, feasibility confirmation and unchanged dependencies. Existing financial/work history survives; replacement after authority remains a linked new ticket.
- Performed-work cancellation settlement anchors integrate with the concurrent Feedback build. Aftercare cases keep their own execution routes; generic support cannot bypass their matching inspection.

## Verification map

These are concrete assertions in `tests/billing-support.test.ts`, with form assertions in `tests/billing-support-forms.test.ts`. Existing completion/payment, quoting, access, calendar, worker and upload suites provide regression coverage; a combined test name is not proof of assertions absent from its body.

| Planned IDs | Executed assertion coverage |
| --- | --- |
| CH13-T01/T02 | 1,200 basis assesses 48 + 48 despite a 600 estate transfer; correct +3 BD cutoff; source/entry uniqueness and append-only history |
| CH13-T03 | Paid/unpaid 1,000 → 1,200 adds only 16; original deadlines retained; unchanged-total reconfirmation/retry creates no extra positive charge |
| CH13-T04 | 1,200 → 900 offsets remaining liabilities and exposes an 8 refund obligation; actual partial refund and duplicate/over-refund refusal |
| CH13-T05 | Overdue account blocks new opportunity access and selection of an existing unselected offer; held selection and selected payment/work access continue |
| CH13-T06/T07 | Ready proof/report is not verified collection; verified full allocation removes only fee holds and preserves another restriction cause |
| CH13-T08 | CM/MCST/other Contractor account denial; no fee detail in estate history/bells/tasks/completion; private bank findings withheld from own Contractor statement |
| CH13-T09 | Approved half-up rule at small-cent boundaries and maximum exact basis; each component calculated separately |
| CH13-T10 | Ordinary accepted/settled job closes while QuoteFix fees remain unpaid; settlement/Feedback source remains independent |
| CH14-T01/T02 | Required cancellation reason and estate authority; pending-approval and post-authority cancellation; exact Okay declaration and existing debts retained |
| CH14-T03 | Failed/delayed notice has no claim anchor; retry preserves first successful issue; unselected job has no Contractor response clock |
| CH14-T04/T05 | Timely claim accepts later evidence; draft-only cutoff expires without consent; Admin escalation at cutoff minus 24h when +5 BD is later |
| CH14-T06/T12 | Named evidence returns to review without a resolution; ready upload is not submitted evidence; offline contact remains unresolved with dated follow-up |
| CH14-T07/T11 | Final resolution executes without acknowledgment; exact zero/positive settlements preserve Cancelled; no phantom invoice/Start/transfer/fee cycle |
| CH14-T08 | Fresh repeated repair rounds; failed or old acceptance cannot fulfil execution; matching current accepted round verifies without duplicate inspection |
| CH14-T09 | Reported MCST excluded from detail, file, list, bell/task/history and explicit access grants; uninvolved authorised MCST access preserved |
| CH14-T10/T13 | Controlled restoration preserves paid history/deadlines and cancellation source; task dependency changes invalidate preview; same-ticket procurement replacement after authority refused |
| Additional | Competing collections; allocation/refund DB constraints; transaction rollback of verification/audit/tasks/command receipt; exact financial-obligation rebinding requires a superseding resolution |

## Execution evidence

The final complete regression passed **195 tests**, with zero failures/skips. The latest affected form/upload/uncertain-command run passed **16 tests**, also with zero failures/skips. Strict TypeScript/browser-script checks, compilation and planning/documentation validation passed (20 chapters, 206 planned verification IDs, 911 local links). The 206 figure is documentation coverage, not executed application tests. These runs overlap and are not added as distinct test totals. The earlier 193-test full run preceded final account-scope/privacy fixes.

The 195-test run includes 22 billing/support API/database scenarios and four billing/support form scenarios, plus existing and concurrently added Chapter 15–16 integration/provider-adapter regressions. Tests cover no-work versus performed cancellation anchors, exact financial corrections/refunds, role/subject/rival exclusion, source/collection races and rollback. Isolated fixtures use fictional records and local adapters; no automated regression performs a bank transfer or calls a paid AI provider. Full command output is retained locally under ignored `work/chapters1314-final-regression.log`.

A real in-app browser opened the isolated fictional preview on port 3307, signed into the fictional Admin, rendered the private 4 + 4 statement and exact due time, and opened the cancelled claim’s evidence/follow-up/settlement/resolution controls. After restart/reload of the final backend, direct Admin queue-to-case navigation worked and no browser errors were recorded. This is a focused browser smoke check, not a complete visual/device acceptance test. API/database and browser-form tests exercise consequential commands in depth.

## Running locally and limits

Restart the normal local API to apply migration `010_billing_and_support.sql` without resetting data. `pnpm exec tsx tools/chapter1314-preview.ts` starts an isolated fictional memory-database preview on port 3307; it does not collect money or contact external accounts. Use `pnpm typecheck`, `pnpm test` and `pnpm build` for checks.

Production PostgreSQL/release validation is outstanding; local tests use PGlite’s PostgreSQL engine unless `TEST_DATABASE_URL` is supplied. No bank execution, paid provider, public deployment, archival or retention policy is inferred. The concurrent Chapters 15–16 build owns its separate completion evidence and provider/specialist gates. Persistent sensitive-cache policy remains open; new private evidence queues are transient within the browser session.
