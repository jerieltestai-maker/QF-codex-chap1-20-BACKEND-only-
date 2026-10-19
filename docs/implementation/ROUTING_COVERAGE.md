# Lifecycle routing coverage

Plan 0.3 · 2026-10-13 · lifecycle 2026-10-12-v14. [Master](../IMPLEMENTATION_PLAN.md). Generated from the manifest and current sources; no policy is decided by generation.

A static index of the current model, not an additional workflow. See [Node reference](../review/NODE_REFERENCE.md) for full guards and [Diagrams](../review/DIAGRAMS.md) for visuals. No anchor automatically becomes a separate required page.

## Every directed route

| From | Trigger / outcome label | To | Route kind | Implementation chapters |
| --- | --- | --- | --- | --- |
| I1 | Improve with AI | I2 | flow | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| I1 | Continue manually | I3 | flow | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| I2 | Draft available | I3 | flow | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| I3 | Refine again | I2 | flow | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| I3 | CM or MCST publishes | Q1 | flow | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| Q1 | Valid quote arrives | Q2 | flow | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) → [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| Q1 | Question received | Q3 | side | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) → [07 — Quotes, shared Q&A and site visits](chapters/07_QUOTES_QA_AND_VISITS.md) |
| Q3 | Ordinary answer | Q1 | flow | [07 — Quotes, shared Q&A and site visits](chapters/07_QUOTES_QA_AND_VISITS.md) → [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| Q3 | Material answer | Q4 | flow | [07 — Quotes, shared Q&A and site visits](chapters/07_QUOTES_QA_AND_VISITS.md) |
| Q1 | Scope change or expiry | Q4 | side | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) → [07 — Quotes, shared Q&A and site visits](chapters/07_QUOTES_QA_AND_VISITS.md) |
| Q4 | Valid update submitted | Q2 | flow | [07 — Quotes, shared Q&A and site visits](chapters/07_QUOTES_QA_AND_VISITS.md) → [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| Q1 | Visit requested | Q5 | side | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) → [07 — Quotes, shared Q&A and site visits](chapters/07_QUOTES_QA_AND_VISITS.md) |
| Q5 | Visit approved and held | Q6 | flow | [07 — Quotes, shared Q&A and site visits](chapters/07_QUOTES_QA_AND_VISITS.md) |
| Q5 | Visit declined | Q1 | flow | [07 — Quotes, shared Q&A and site visits](chapters/07_QUOTES_QA_AND_VISITS.md) → [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| Q6 | Valid revision submitted | Q2 | flow | [07 — Quotes, shared Q&A and site visits](chapters/07_QUOTES_QA_AND_VISITS.md) → [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| Q2 | CM selects with rationale | S1 | flow | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| Q1 | CM or MCST cancels | C1 | side | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| S1 | Above threshold | S2 | flow | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| S1 | At or below threshold | W1 | flow | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) → [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) |
| S2 | MCST approves | W1 | flow | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) → [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) |
| S2 | MCST rejects | S3 | flow | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| S2 | Cancel before authorisation | C1 | side | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| S2 | No response | E1 | side | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) → [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) |
| W1 | Valid estimate or reason, then Start | W2 | flow | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) |
| W2 | Open completion form | W3 | flow | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) → [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| W3 | Invoice and declaration submitted together | R1 | flow | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| W2 | Change proposed | V1 | side | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) → [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| W1 | CM or MCST chooses Cancel job | C2 | side | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| W2 | CM or MCST chooses Cancel job | C2 | side | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| W2 | Cannot continue | E2 | side | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) |
| V1 | Terms confirmed | V2 | flow | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V2 | Required approval given | V3 | flow | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| R1 | Unsatisfactory work | R2 | flow | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| R2 | Repair submitted | R1 | flow | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| R1 | Invoice mismatch | R3 | flow | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| R3 | Inspection outstanding or acceptance affected | R1 | flow | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| R3 | Additional work claimed | V1 | flow | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) → [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| R3 | Difference disputed | D1 | flow | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| R2 | Remedy disputed | D1 | flow | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| R1 | Original job work accepted | R4 | flow | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) → [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| R1 | No response | E1 | side | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) → [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) |
| R4 | Work or acceptance concern | R1 | flow | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) → [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| R4 | Nonzero invoice confirmed | P1 | flow | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| R4 | No response | E1 | side | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) → [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) |
| P1 | Proof and Payment Sent; notify | P2 | flow | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P2 | Agreed partial balance | P3 | flow | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P3 | Recorded transfer now needs receipt review | P2 | flow | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P3 | Disputed payment | E3 | flow | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| P2 | Full receipt confirmed | P4 | flow | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P4 | Full receipt or agreed fallback anchor | F1 | side | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) → [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| C6 | Nonzero settlement due | P1 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) → [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| D1 | Remedy agreed | R2 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) → [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| D1 | Escalation or no response | D2 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D2 | Request | D3 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D5 | Unresolved external blocker | D7 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D6 | Obligations performed | D8 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D6 | Resolution fails | D2 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D7 | New evidence or outcome | D2 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D8 | Inspect | R1 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) → [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| D8 | Settlement confirmation still needed | C6 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D8 | Agreed balance remains | P3 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) → [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| F1 | 30 days pass | F2 | side | [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| F3 | Contractor response required | D1 | flow | [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| P6 | Later fault reported | F3 | side | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) → [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| P6 | Request Admin Support | E3 | side | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| E3 | Admin triages the same case | D2 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| B1 | Fee payment reported | B2 | flow | [13 — Contractor QuoteFix billing](chapters/13_QUOTEFIX_BILLING.md) |
| B1 | Deadline passes | B3 | flow | [13 — Contractor QuoteFix billing](chapters/13_QUOTEFIX_BILLING.md) |
| B3 | Payment evidence supplied | B2 | flow | [13 — Contractor QuoteFix billing](chapters/13_QUOTEFIX_BILLING.md) |
| B2 | Balance remains after deadline | B3 | flow | [13 — Contractor QuoteFix billing](chapters/13_QUOTEFIX_BILLING.md) |
| Q1 | Urgent RFQ published | U1 | side | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| U1 | Admin takes coordination | U2 | flow | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| U2 | Attendance found | U3 | flow | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| U2 | No attendance confirmed | U4 | flow | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| U4 | Continue human sourcing | U2 | flow | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| U3 | Normal selection applies | S1 | flow | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) → [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| E1 | Substantive dispute identified | D2 | flow | [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| E2 | CM or MCST chooses Cancel job | C2 | flow | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| E2 | Previously started; authorised resumption | W2 | flow | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) |
| C6 | Zero settlement, no cases | C7 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| P4 | Cancellation claim: verify settlement | D8 | flow | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D8 | Aftercare obligation verified | F5 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) → [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| F6 | Publication review needed | F4 | side | [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) → [16 — Reputation, passport and AI comparison](chapters/16_REPUTATION_PASSPORT_AND_AI.md) |
| B2 | Full receipt verified | B4 | flow | [13 — Contractor QuoteFix billing](chapters/13_QUOTEFIX_BILLING.md) |
| B1 | Zero fees assessed | B4 | flow | [13 — Contractor QuoteFix billing](chapters/13_QUOTEFIX_BILLING.md) |
| R4 | Zero payable confirmed | P0 | side | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P0 | Performed work: zero-payable anchor | F1 | side | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) → [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| S4 | Rule: remain pending MCST | S2 | side | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| V1 | Proposer withdraws | V4 | flow | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V2 | Approver rejects or proposer withdraws | V4 | flow | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V3 | Automatic context check | V5 | flow | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V4 | Automatic context check | V5 | flow | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V5 | Before start; able to proceed | W1 | flow | [10 — Variations and return routing](chapters/10_VARIATIONS.md) → [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) |
| V5 | Work ongoing; safe and feasible | W2 | flow | [10 — Variations and return routing](chapters/10_VARIATIONS.md) → [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) |
| V5 | Invoice context: reconcile first | R3 | flow | [10 — Variations and return routing](chapters/10_VARIATIONS.md) → [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| V5 | Review context; invoice already reconciled | R1 | flow | [10 — Variations and return routing](chapters/10_VARIATIONS.md) → [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| V5 | Authorised work cannot continue | E2 | side | [10 — Variations and return routing](chapters/10_VARIATIONS.md) → [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) |
| W1 | Change before start | V1 | side | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) → [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| E2 | Work still unauthorised | C1 | side | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| E2 | Not started; authorised to begin | W1 | flow | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) |
| P2 | Notification + 7 calendar days; no response | P7 | side | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P7 | full balance covered | P4 | flow | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P7 | Undisputed amount assumed; balance remains | P3 | flow | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P3 | MCST must send remaining balance | P1 | flow | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| Q1 | Request Admin Support | E3 | side | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| W2 | Request Admin Support | E3 | side | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| R3 | Request Admin Support | E3 | side | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| P2 | Payment Issue | E3 | side | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| B3 | Request Admin Support | E3 | side | [13 — Contractor QuoteFix billing](chapters/13_QUOTEFIX_BILLING.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| F4 | Request Admin Support | E3 | side | [16 — Reputation, passport and AI comparison](chapters/16_REPUTATION_PASSPORT_AND_AI.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| E2 | Evidence or outcome unresolved | D2 | side | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| G1 | Admin approves | G2 | side | [05 — Contractor verification](chapters/05_CONTRACTOR_VERIFICATION.md) |
| G2 | One month before expiry | G3 | side | [05 — Contractor verification](chapters/05_CONTRACTOR_VERIFICATION.md) |
| G3 | Renewal evidence supplied | G1 | side | [05 — Contractor verification](chapters/05_CONTRACTOR_VERIFICATION.md) |
| G3 | Expiry reached | G4 | side | [05 — Contractor verification](chapters/05_CONTRACTOR_VERIFICATION.md) |
| G4 | Renewal submitted | G1 | side | [05 — Contractor verification](chapters/05_CONTRACTOR_VERIFICATION.md) |
| G4 | active work affected | E2 | side | [05 — Contractor verification](chapters/05_CONTRACTOR_VERIFICATION.md) → [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) |
| C2 | CM or MCST confirms; immediate | C4 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| C1 | Selected contractor needs notice | C4 | side | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| C4 | Okay plus no-additional-claim confirmation | C9 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| C4 | Contractor selects Admin Intervention | C3 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| C3 | Explanation submitted | C8 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| C8 | Admin reviews case | D2 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| W3 | CM or MCST chooses Cancel job | C2 | side | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| R1 | CM or MCST chooses Cancel job | C2 | side | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| R2 | CM or MCST chooses Cancel job | C2 | side | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| R3 | CM or MCST chooses Cancel job | C2 | side | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| R4 | CM or MCST chooses Cancel job | C2 | side | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D2 | Admin chooses status backtrack | A1 | side | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| P6 | Admin reopens a review | A1 | side | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| C8 | Explicit admin restoration | A1 | side | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| A1 | Saved; route automatically | A2 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| A2 | Before start | W1 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) → [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) |
| A2 | Work | W2 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) → [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) |
| A2 | Work review | R1 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) → [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| A2 | Invoice correction | R3 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) → [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| A2 | Invoice confirmation | R4 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) → [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| Q2 | MCST selects above threshold | M1 | flow | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| Q2 | MCST confirms at/below threshold | M2 | flow | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| M1 | Back; nothing committed | Q2 | flow | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| M1 | Yes I know; select and approve | M2 | flow | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| M2 | Work authorised | W1 | flow | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) → [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) |
| D8 | Cancellation obligations verified | C7 | side | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| W2 | Admin chooses status change | A1 | side | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| S3 | compare remaining valid offers | Q2 | flow | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| S3 | fresh offers needed | S5 | flow | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| S5 | explicitly publish next round | Q1 | flow | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) → [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| P4 | Ordinary job: existing conditions satisfied | P6 | flow | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P0 | Ordinary job: existing conditions satisfied | P6 | flow | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| D8 | Ordinary job: case resolved and all closure conditions hold | P6 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) → [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P4 | Existing blocking case remains open | D2 | side | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| P0 | Existing blocking case remains open | D2 | side | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| P1 | Approved follow-up; same support case | P8 | side | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P8 | Admin requests concrete payment update | P9 | flow | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P9 | Not sent: MCST still owes payment | P1 | flow | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P9 | Proof and Payment Sent; notify | P2 | flow | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P9 | Promised update missed | P8 | side | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| C9 | Existing confirmed amount still unpaid | P1 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) → [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| C9 | No outstanding payment or blocking obligation | C7 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| P4 | Cancellation accepted; existing payment settled | C7 | flow | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| P1 | Request Admin Support | E3 | side | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| R3 | Reconciled; work acceptance still valid | R4 | flow | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) → [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| R4 | Invoice-only correction | R3 | flow | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) → [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| D8 | Original invoice needs confirmation | R4 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) → [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| C6 | Confirmed zero; derive payment outcome | P0 | side | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) → [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P1 | Record dates separately | P10 | side | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P10 | First notification anchors T+7D | P7 | side | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P9 | Payment concern needs review | D2 | flow | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D8 | Evidence still disputed | D2 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D8 | Undisputed recorded transfer; verify receipt | P2 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) → [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| F2 | No response | F7 | side | [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| F7 | CM responds | F2 | side | [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| C4 | Seven calendar days; internal cutoff | C10 | side | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| C10 | Timely claim remains open | C8 | normal | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| C10 | Existing confirmed debt remains due | P1 | normal | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) → [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| C10 | No claim, debt or blocking obligation | C7 | normal | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| F2 | 1–3 stars | F8 | normal | [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| F8 | Saved | F6 | normal | [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| F2 | 4–5 stars | F9 | normal | [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| F9 | Saved | F6 | normal | [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| F2 | Unable to assess | F10 | side | [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| F10 | Saved | F6 | normal | [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| D3 | Submit evidence | D2 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D2 | Sufficient | D9 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D9 | More facts | D2 | side | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D9 | Admin issues resolution | D4 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D9 | Admin records binding verdict | D5 | side | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D9 | Offline outcome still unresolved | D7 | side | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D5 | Admin publishes recorded verdict | D4 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D4 | Outstanding action proceeds | D6 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D4 | Exact settlement needs confirmation | C6 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D4 | Already performed; verify obligations | D8 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D6 | Physical remedy remains | R2 | flow | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) → [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| R1 | Aftercare pass | D8 | flow | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) → [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| Q1 | Under 3 at sourcing checkpoint | E1 | side | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) → [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) |
| Q2 | Selection follow-up due | E1 | side | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) → [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) |
| E1 | Continue sourcing | Q1 | flow | [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) → [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| E1 | Selection action | Q2 | flow | [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) → [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| W2 | Work or estimate deadline missed | E1 | side | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) → [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) |
| E1 | Follow up on work | W2 | flow | [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) → [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) |
| W1 | Scheduled start not recorded | E1 | side | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) → [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) |
| E1 | Follow up on start | W1 | flow | [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) → [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) |

## Situation-specific next actors

These preserve the source's conditional waiting-on lines. A generic Role responsible label is not a substitute. Labels are proposed except where source copy approval is explicit.

| Node / situation | Waiting-on line | Next anchor | Owning chapter |
| --- | --- | --- | --- |
| S3 — CM handles reselection | Pending: CM selects another contractor | Q2 | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| S3 — MCST takes over selection | Pending: MCST selects and approves another contractor | Q2 | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| R1 — Inspection · initial review | Pending: CM reviews the work and invoice | R4 | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| R1 — Inspection [2nd] · corrected work | Pending: CM inspects the corrected work — Inspection [2nd] | R4 | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| R1 — Inspection [3rd] · further correction | Pending: CM inspects the corrected work — Inspection [3rd] | R4 | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| R1 — Inspection [4th] · further correction | Pending: CM inspects the corrected work — Inspection [4th] | R4 | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| P3 — Remaining balance not sent | Pending: MCST to send the remaining payment | P1 | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P3 — Receipt needs confirmation | Pending: Contractor to verify payment received | P2 | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| V2 — CM is required approver | Pending: CM approves the variation | V3 | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V2 — MCST is required approver | Pending: MCST approves the variation | V3 | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V3 — Before work starts | Pending: Contractor to begin the authorised work | W1 | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V3 — Physical work continuing | Pending: Contractor to complete the work | W2 | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V3 — Invoice needs correction | Pending: Contractor explains or corrects the invoice | R3 | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V3 — Completion review outstanding | Pending: CM reviews the work and invoice | R1 | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V3 — MCST performs completion review | Pending: MCST reviews the work and invoice | R1 | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V3 — Unable to continue | Pending: Admin to review interruption of works | E2 | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| C2 — CM cancels | Pending: CM confirms cancellation | C4 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| C2 — MCST cancels | Pending: MCST confirms cancellation | C4 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| C6 — Normal MCST confirmation | Pending: MCST confirms the agreed settlement | P1 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| C6 — Explicit admin override | Pending: Admin records the settlement confirmation override | P1 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D3 — Contractor costs or work evidence | Pending: Contractor supplies the requested evidence | D2 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D3 — MCST payment or approval evidence | Pending: MCST supplies the requested evidence | D2 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D3 — CM site or cancellation evidence | Pending: CM supplies the requested evidence | D2 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D3 — Payment: MCST clarifies transfer proof | Pending: MCST supplies the missing transfer details | D2 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D3 — Payment: Contractor identifies credit | Pending: Contractor supplies the payment issue details | D2 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D4 — Contractor acknowledgment outstanding | Pending: Contractor acknowledges the final resolution | D6 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D4 — MCST acknowledgment outstanding | Pending: MCST acknowledges the final resolution | D6 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D4 — CM acknowledgment outstanding | Pending: CM acknowledges the final resolution | D6 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D6 — Contractor remedy | Pending: Contractor completes the recorded remedy | R2 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D6 — MCST settlement payment | Pending: MCST sends the confirmed settlement payment | P1 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D6 — Contractor refund | Pending: Contractor records the required refund | D8 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D6 — Admin record correction | Pending: Admin records the authorised correction | D8 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D8 — Corrected round needs fresh inspection | Pending: CM reviews the work and invoice | R1 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D8 — Settlement needs confirmation | Pending: MCST confirms the agreed settlement | C6 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D8 — Recorded transfer needs receipt confirmation | Pending: Contractor to verify payment received | P2 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D8 — Execution evidence remains disputed | Pending: Admin reviews the resolution evidence | D2 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| U3 — CM selection outstanding | Pending: CM selects the contractor | S1 | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| U3 — MCST approval outstanding | Pending: MCST approves the selected contractor | S2 | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| E1 — MCST approval overdue | Pending: MCST decides the outstanding approval; Admin follows up | S2 | [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) |
| E1 — CM review overdue | Pending: CM reviews completion; Admin follows up | R1 | [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) |
| E1 — Contractor response overdue | Pending: Contractor responds to the issue; Admin follows up | D1 | [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) |
| E1 — Insufficient quotation coverage | Pending: Admin follows up with contractors for quotations | Q1 | [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) |
| E1 — CM selection outstanding | Pending: CM selects a contractor; Admin follows up | Q2 | [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) |
| E1 — MCST selection outstanding | Pending: MCST selects and approves a contractor; Admin follows up | Q2 | [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) |
| E1 — Completion target missed | Pending: Contractor completes the work; Admin follows up | W2 | [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) |
| E1 — Temporary completion estimate overdue | Pending: Contractor supplies a completion estimate; Admin reviews any extension | W2 | [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) |
| E1 — Scheduled start has not been recorded | Pending: Contractor records Start or explains the delay; Admin follows up | W1 | [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) |
| V4 — Before work starts | Pending: Contractor to begin the authorised work | W1 | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V4 — Physical work continuing | Pending: Contractor to complete the work | W2 | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V4 — Invoice needs correction | Pending: Contractor explains or corrects the invoice | R3 | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V4 — Completion review outstanding | Pending: CM reviews the work and invoice | R1 | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V4 — MCST performs completion review | Pending: MCST reviews the work and invoice | R1 | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V4 — Unable to continue | Pending: Admin to review interruption of works | E2 | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V5 — Before work starts | Pending: Contractor to begin the authorised work | W1 | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V5 — Physical work continuing | Pending: Contractor to complete the work | W2 | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V5 — Invoice needs correction | Pending: Contractor explains or corrects the invoice | R3 | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V5 — Completion review outstanding | Pending: CM reviews the work and invoice | R1 | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V5 — MCST performs completion review | Pending: MCST reviews the work and invoice | R1 | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V5 — Unable to continue | Pending: Admin to review interruption of works | E2 | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| A2 — Restore before start | Pending: Contractor to begin the authorised work | W1 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| A2 — Restore active work | Pending: Contractor to complete the work | W2 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| A2 — Return to completion review | Pending: CM reviews the work and invoice | R1 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| A2 — Return to invoice reconciliation | Pending: Contractor explains or corrects the invoice | R3 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| A2 — Return to financial confirmation | Pending: MCST to confirm invoice is correct | R4 | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| S5 — CM reopens quotations | Pending: CM reopens quotations | Q1 | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| S5 — MCST reopens quotations | Pending: MCST reopens quotations | Q1 | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
