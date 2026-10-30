# Fictional desktop demo data

This record covers additive fictional scenarios for the existing local QuoteFix desktop prototype at `http://127.0.0.1:3000`. Job titles, descriptions, evidence and financial narratives identify themselves as `[Demo]`. They represent simulated events, not actual repairs, inspections, transfers or bank receipts.

The authorized target is the existing development database on `qfwebapp-postgres-1`, port **5432**. Other projects on ports 5433/5434 are outside scope. Existing accounts, credentials, operational records, helper keys, configuration secrets and checksum-protected migrations must be preserved. The execution record below must identify the verified target and backup before any durable run.

## Workflow invariants

All durable business changes use normal domain services/API commands, with real actors, version checks, explicit confirmations, operation receipts, audit events and domain-generated tasks. The seeder must not install test fixtures, write fabricated job stages, reset a database, change passwords, bypass eligibility or substitute a mock clean scanner.

Contractor eligibility requires an approved organisation/profile and approved trade categories, configured trade prerequisites, current required credentials and no applicable restriction. Existing configured prerequisites remain authoritative. Any necessary initial local trade/procurement setup must use an explicit Admin command and a fictional setup reason; existing settings are not overwritten by a rerun.

Additional demo Contractor accounts follow registration, local email verification, application and Admin approval. Security verification uses the existing local mailbox; it sends no external message. Raw passwords and session cookies remain in memory. The normal development helper persists only encrypted password copies; mailbox tokens and resumable operation payloads stay under ignored `work/`, never in this document or Git.

Invoice and payment-proof objects pass the real upload/chunk/finalize flow and the configured scanner/sanitizer. The existing worker processes them. Completion follows recorded Start; its time cannot precede Start or be in the future. A CM inspects the exact physical completion round; MCST confirms the exact accepted invoice before a fictional completed transfer is recorded, and the Contractor confirms its exact receipt. Invoice confirmation creates ordinary platform fee liabilities, which are distinct from estate-to-Contractor payment settlement.

Payment settlement does not establish archive/retention policy or erase a repair. No automated warranty, extra reminder cadence, specialist scoring, fault/callback policy or production/native release gate is resolved by this demonstration. Existing open decisions remain open.

## Walkthrough

Use the existing local account buttons to sign in. Choose the Alpha estate for CM/MCST and the approved fictional Contractor context for Contractor. Search for `[Demo]` repairs. The Admin can inspect verification, support, attention and audit records through the normal interface.

| Scenario | Inspect as | Meaningful next action |
| --- | --- | --- |
| Draft | CM | Review private observations, complete the public RFQ intake, then explicitly publish. |
| RFQ / quotes | CM or MCST; Contractor | Compare current quotations and their terms; Contractor may review the published opportunity and its own offer. |
| Pending approval | MCST | Review the nominated exact quotation, threshold and cautions before authorizing or rejecting it. |
| Authorized / scheduled | Contractor; CM or MCST | Review work authority and any agreed schedule; explicitly record actual Start when appropriate. |
| Work in progress | Contractor | Record a factual progress update or complete authorized work with a scanned invoice. |
| Inspection | CM | Review scope, evidence, invoice and exact round, then accept or record findings. |
| Payment | MCST; Contractor | MCST reviews the accepted invoice/transfer task; Contractor records exact actual receipt when demonstrated. |
| Settled payment | CM, MCST or Contractor | Inspect acceptance, confirmed invoice, transfer and receipt history; this is not an archival claim. |
| Support, if included | Admin and the permitted reporting role | Review the fictional concern and retain a dated next action through the existing support flow. |

The nine scenario titles are `[Demo] Lobby washroom tap` (draft), `[Demo] Car park drain` (three offers), `[Demo] Pump-room valve` (MCST approval), `[Demo] Service-room tap` (agreed future Start), `[Demo] Corridor pipe leak` (in progress, with ordinary support), `[Demo] Bin centre pipe` (inspection), `[Demo] Pool shower valve` (confirmed invoice awaiting transfer), `[Demo] Clubhouse tap` (transfer awaiting receipt), and `[Demo] Completed garden tap repair` (actual receipt recorded).

The comparison scenario uses three separately approved organisations: the existing fictional Contractor and newly registered `[Demo] Cedar Plumbing` / `[Demo] Harbour Plumbing`. Generated passwords are cached only by the normal encrypted local development helper; the sign-in buttons can autofill them. Reruns recover them through that helper and never reset a password. The three comparison offers are SGD 900 / 950 / 1,020. The pending-approval offer is SGD 4,800; other selected offers and their invoices are SGD 900.

## Reusable invocation

From the repository root, with the normal API/supervisor and its configured worker running:

```powershell
node --import tsx tools/demo-seed.ts --check
node --import tsx tools/demo-seed.ts --apply
```

`--check` verifies the exact loopback PostgreSQL development target, marker and expected accounts without seeding. It does not prove that the scanner/worker or every later command is ready. `--apply` adds the scenarios through an in-process API client connected to that same database; the running application's real worker processes uploaded objects. No separate mock scanner, clock advance, migration or fixture installation is used. The local advice provider is selected so the seed makes no paid AI request.

The owner authorized absent-only initial Alpha procurement settings: SGD 3,000 threshold, explicit plumbing prerequisites with no required credential types for this fictional demonstration, and settled integrity settings 20% revision / 30% selected gap / 20% variation growth / three quotes. These changes use real Admin commands with `[Demo]` reasons and leave existing configured settings intact. Ordinary single-offer selections explicitly acknowledge limited comparison and obtain MCST warning clearance. The SGD 4,800 CM nomination remains pending MCST approval.

Keep ignored `work/demo-seed/manifest-v1.json`. Each command saves its body, version and stable operation identity before submission and saves the result afterward. An interrupted run reuses its original payload, version and identity; the server receipt resolves an uncertain result. Completed scenarios are skipped, preserving subsequent manual walkthrough actions. If demo jobs exist without their manifest, the tool refuses to recreate them. Do not delete the manifest as a way to refresh the demo. A rejected upload or unavailable scanner stops the run; restore processing and rerun the same command. Bounded rate-limit retries preserve the submitted input.

## Execution evidence

Executed on **30 October 2026**, against the inspected prototype database on `qfwebapp-postgres-1:5432`, using the normal app at `http://127.0.0.1:3000`. A pre-seed backup and full-row restore verification passed; its local manifest is `work/postgres-backups/de754f1d0f604cff9de8fd2d77207ed2/manifest.json`. Other Docker projects were untouched.

The completed dataset contains **nine repairs, ten quotations, seven selections, six work states, four completion rounds, two transfers and one ordinary support case**. Eight accounts are available, including the original six and the two new demo bidders. All six generated evidence uploads reached ready through the real configured Defender scanner and processing pipeline.

The initial command run stopped at the contractor application access-version precondition. The seeder incorrectly used a record ETag for this identity command; it now uses the required access ETag while retaining its persisted body, version and operation key. A later atomic manifest replacement encountered a Windows/OneDrive `EPERM`; bounded retries now preserve the previous manifest without deleting or truncating it. The accepted application receipt was recovered by replaying its saved operation. Neither interruption triggered rollback, deletion, fabricated stages or weakened domain checks.

The successful application and two reruns completed with **96 recorded operations, all results reconciled and zero pending entries**. SHA-256 snapshots of eight business tables matched across the final rerun. The original six account names, emails and password credentials, plus the local environment file, were verified unchanged. Normal authentication/session and access-audit activity is separate from those business-table invariants. Local scenario IDs and full operation payloads remain in the ignored seed manifest.

ASTRA reviewed the SOL implementation and corrected actor-specific comparison fingerprints, actual agreed-start scheduling, interrupted-request replay, account-helper handling, Singapore calendar dates and atomic manifest replacement. Strict TypeScript checking and read-only target checking passed before execution. SOL agents reached their usage limit during final review; ASTRA completed the remaining review and corrections directly.

Seven live-browser captures cover all four roles, the three-quotation comparison and a 390px payment view. Browser verification reported no exceptions, caught programming errors or page overflow. ASTRA visually inspected the populated CM/MCST/Contractor/Admin home pages, comparison and narrow payment view: role actions, real sample amounts, pending approval, receipt distinctions and `[Demo]` selected-repair labels are present and readable. No frontend styling or behavior was changed for this data-seeding task.

This is local desktop demonstration evidence. It does not certify production release, native devices, real contractor credentials, real financial events or the open product-policy gates. Time-based demo reminders and quote expiry continue to follow the real application clock; the seed does not freeze or rewind them.
