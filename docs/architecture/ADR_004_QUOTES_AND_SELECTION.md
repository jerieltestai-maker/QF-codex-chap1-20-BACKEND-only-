# ADR 004 — Sealed quotations and exact-version procurement decisions

**Status:** accepted for the authorised local Chapters 07–08 build, 13 October 2026. Backend correctness and simple controls remain the owner's priority. G05 is resolved: editable 30-calendar-day suggestion with explicit Contractor confirmation. Earlier G06/G07 decisions continue to apply.

## Decision

Keep immutable quote terms separate from the organisation/round's current offer pointer. Withdrawal changes the offer state with an attributable reason; revision and reconfirmation create new immutable versions. Reconfirmation copies the original amount, terms and expiry. Conditional mandatory fields and the exact commitment are checked at submission. Quotes are sealed to their company and permitted estate users.

Selection checks current membership, estate authority, ticket version, displayed threshold version, displayed RFQ revision, exact quote version, current material scope, effective expiry and all applicable eligibility restrictions in one transaction. The existing shared advisory lock serializes these local commands with verification, membership changes and timer processing. Selection stores the complete exact comparison set, terms, cautions and acknowledgments. Amounts use integer cents; average retains a BigInt-derived rational numerator and denominator. Display rounding does not alter stored values.

At/below the explicitly configured threshold, CM selection authorises work. Above it, a CM nomination pauses quoting and creates one MCST response task. Selected price/scope remain held across former expiry; MCST approval rechecks current eligibility without expiring the held offer. MCST/Admin combined selection records the above-threshold acknowledgment when needed. A unique immutable work-authorisation record prevents competing authorisations on one ticket.

The Chapters 01–08 audit corrected the held-approval check to respect the approved fee exception: a fee restriction blocks new quoting/selection, while an already selected job continues. Required credentials and independent Admin restrictions remain checked; the exception does not grant a new selection. The audit also preserves sanitized evidence for exact owned RFQ history and adds explicit browser operation recovery without storing private decision bodies.

Rejected nominations preserve history and reopen the existing round for currently valid offers. Explicit reopening creates a separate round and freezes current trade-rule requirements; historical offers do not revive. Replacing a contractor after work authorisation creates a linked private ticket and preserves the original authority and obligations. Cancellation and incurred-cost handling belong to Chapter 14.

## Privacy

Contractors receive their own submissions, private requests, permitted historical RFQ scope and granted location reveals. They do not receive rivals' quotes or estate rationale. Approved visits and work authorisation create immutable organisation-scoped location grants. Prequote questions link to the exact reviewed RFQ revision; sanitized shared answers omit requesters and private source text. Material answers create an RFQ scope revision.

MCST-controlled CM concealment uses stable aliases. Optional narrative, PDF links/direct downloads and free-text decision reasons are withheld from masked CM views because they can identify bidders. Required free-text term explanations have known identity/contact redaction; human review remains necessary for identifying language that cannot be recognized automatically. MCST/Admin retain unmasked records. Private credential uploads are never repurposed as estate-visible quotation PDFs.

## Clocks

The real third distinct current eligible offer starts T17. Commands reconcile coverage before and after their mutation in the same transaction; the worker reconciles time-driven expiry. Coverage loss retains remaining eligible business milliseconds. Delayed-worker expiry pauses at the effective expiry boundary. Restoration resumes the remainder and preserves issued checkpoints. Completed selection tasks are archived; rejection can create a distinct new reselection iteration, rather than reopening a resolved task.

A scheduled review suppresses due selection follow-up until its explicit date; it preserves the original age and remaining budget. The date is not a fresh five/ten-day reset. Due original checkpoints can issue once when the scheduled date arrives. T07/T22 use one actor reminder at +2 business days and one Admin escalation at +5, anchored to the first successfully issued initial notice. Reading a notice is not a decision. Admin follow-up retains the shared acknowledgment/T11 mechanism.

## Limits

The global lock and reconciliation scan are intentionally simple for the local monolith. Scoped locking, query/load profiling and pagination belong to production hardening. Existing fail-closed malware scanning must be configured to enable PDF readiness in normal development. Paid providers, production deployment, reputation formulas, recommendation AI, MCST integrity policies and warranty automation are separate work and remain gated where applicable.
