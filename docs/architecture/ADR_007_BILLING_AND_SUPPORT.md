# ADR 007 — Private fee ledger and explicit support execution

Date: 18 October 2026. Status: accepted for the authorised local build.

## Decisions and authority

Chapters 13–14 are authorised by the owner. G08/O37-C was explicitly answered: calculate each 4% component independently, half-up to the nearest SGD cent. Keep the confirmed rates, full payable basis, MCST confirmation trigger, original +3 Singapore-business-day deadline, incremental adjustment deadlines, offsets and actual refund recording. Archival, retention and production deployment remain outside this decision.

## Financial records

`financial_confirmations` supplies an immutable, exact payable version for an original invoice, cancellation settlement or authorised adjustment. The original invoice confirmation remains unchanged. A source is unique independently of command-response caching. Integer-cent arithmetic uses BigInt, including the independently rounded difference from the preceding confirmed total; it never multiplies a difference by an independently rounded 8% rate.

Each component has immutable debit/credit entries. Credits offset unpaid liabilities of the same job/component in oldest-deadline order. Collections allocate exact verified amounts to outstanding debits; available paid-excess credits require actual refund execution. Unique bank references, source/component uniqueness, append-only triggers, allocation/refund capacity triggers and the existing transaction lock protect retries and races. Corrections never rewrite earlier deadlines. No extra fee, late penalty, minimum or refund turnaround is introduced.

The private Contractor account projection contains statements, payment reports, verified allocations and refunds. Estate-facing job history, notifications, comparisons and totals do not include the fee account. Admin bank-verification findings are withheld from Contractor statements. Overdue fees restrict new quotes and unselected offers; selected jobs remain accessible, and removal of a fee restriction leaves unrelated holds/credential requirements intact. Evidence awaiting verification is not a collection and not proof of nonpayment.

## Cancellation and support

Cancellation records the estate actor, reason and explicit confirmation immediately. It stops ordinary work and pending variations/procurement, preserving selected Contractor identity, confirmed debts, transfers and their actual/assumed receipt clocks. Cancellation notice issuance is durable and separate from notice scheduling/reading. Only first successful issue starts seven elapsed calendar days. The actor reminder is +2 business days; Admin attention uses the earlier of +5 business days or cutoff minus 24 hours. Expiry records neither Okay nor a waiver. Claims submitted in time can receive evidence later.

Cases use versioned review, evidence, execution and resolved states. Evidence returns to Admin review. Admin alone issues final resolutions and verifies domain execution. Party acknowledgments remain informational. Named evidence requests preserve subject exclusions and use ordinary response timers or an explicit Admin date; escalation tasks inherit the same support permission scope. Unresolved Admin acknowledgment/contact retains a dated task. Private offline references are not an in-app negotiation transcript.

Verification/account-access concerns also have explicit organisation or estate scope before any job exists. They reuse the same case engine and permission/task/file rules, without creating a fictional ticket, invoice or fee. Account-only cases cannot issue physical-work/settlement commands. A Contractor's subject/respondent directory contains its own organisation, never rival bidders; estate users retain permitted named/aliased counterparties.

Repair obligations use the shared physical completion and immutable inspection records. New work gets a fresh round; failed/older/unrelated acceptance cannot fulfil it. Round allocation considers all physical rounds, including aftercare. Financial obligations bind the exact confirmation; a later correction requires an explicit superseding resolution, preserving prior obligations as superseded rather than falsely verified. Payment/refund verdicts cannot fabricate execution. Domain completion moves the next task to Admin verification without automatically resolving the case.

Cancelled settlements preserve the Cancelled outcome. A positive settlement before authorisation can be paid without inventing a Start, completed repair or ordinary invoice cycle. Only an actual recorded Start plus confirmed full settlement supplies the `cancelled performed-work settlement` Feedback anchor. No-work cancellations have no such anchor. Date-only receipt precision and actual refund timing are preserved.

## Controlled correction and integration

Admin first previews the exact job/task/work/financial dependency snapshot, then supplies a reason and feasibility confirmation. Execution refuses changed dependencies. Original cancellation, authority, invoice, collection and payment records survive. Restoration keeps the original Contractor; replacement after authority uses the established linked new ticket. New physical work invalidates only current acceptance and creates an explicit repair duty with follow-up. Financial changes use separate confirmed adjustments.

The concurrently developed Chapters 15–16 own aftercare execution. Registered aftercare cases stay nonblocking for ordinary closure; generic support may accept evidence/follow-up but cannot bypass aftercare inspection, resolution or financial boundaries. Neither a fee nor an informational acknowledgment blocks ordinary job closure.

## Operational limits

This remains one local TypeScript/Fastify application and PostgreSQL-compatible database, with the existing coarse command lock. Production PostgreSQL, database-role/tamper protection, identity/storage/scanner providers, operational collection procedures and release validation require their own checks. Private support/fee attachment bytes use a transient browser-session queue; this does not decide the open persistent sensitive-cache/retention policy. No bank transfer is executed by the application.
