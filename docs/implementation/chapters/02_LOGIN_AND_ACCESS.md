# Chapter 02 — Login, accounts, estates and permissions

[Master](../../IMPLEMENTATION_PLAN.md) · Previous: [01](01_FOUNDATIONS.md) · Next: [03](03_WORKSPACE_RECORDS_AND_FILES.md)

**Dependencies:** 01. **Sources:** C33/C34/C46/C68/C69, O37; [architecture](../../architecture/WEB_MOBILE_ARCHITECTURE.md). Inherits all cross-cutting rules. **G01 resolved 13 October 2026:** email/password with verification/recovery; Admin invites CM/MCST and assigns estates; contractors apply pending human verification. Local account flows and permissions are implemented; see [verification evidence](../CH01_CH02_VERIFICATION.md). Production managed identity remains gated.

## 1. Outcome and build order

Build usable sign-in/out, account recovery, invitation/application handling and estate/organisation context. Then enforce permissions before adding customer data. Suggested flow: authenticated identity -> active named membership -> authorised context -> relevant dashboard, or an honest pending-access/verification screen.

Recommend managed identity with verified email, Admin-controlled initial estate memberships and Contractor applications. Email-based security recovery is a proposed identity mechanism, not permission to add email activity notifications. Native login later uses external-browser OAuth/PKCE; same QuoteFix membership records.

## 2. Screens and compulsory fields

| Screen/record | Required or conditional | Optional/system |
| --- | --- | --- |
| Sign in (E, G01) | Provider-required credential and verification; accessible error/submit | Session/actor supplied by server; no public role selector granting access |
| Recovery (E, G01) | Provider verification of account control | Non-enumerating response; login failure must not reveal estate membership |
| Accept invitation (E, G01) | Valid one-use invite, authenticated matching identity, named membership | Display role/estate; invitation expiry is provider/security policy to specify, not a ticket clock |
| Account/member record | **Required:** named user and active authorised role/context | Title/block label optional; titles do not change authority |
| Contractor application | **Required E:** organisation identity/contact and requested trade scope; verification evidence through chapter 05 | No self-verification or initial quote permission |
| Context switch | **Required E:** choose from memberships returned by server if several exist | One membership skips unnecessary choice; no multi-estate-CM product requirement invented |

Do not use a single shared MCST credential. Treasurer, Chair and Vice-chair have the same MCST permissions; CM block labels do not narrow estate access. Admin remains the approved single operational role/account arrangement, with no second-admin approval flow.

## 3. Permission contract

| Actor | Can see/do | Must be denied |
| --- | --- | --- |
| Unauthenticated | Login/recovery and permitted onboarding only | Ticket, quote, file, search, bell and export data |
| CM | Own estate CM workflows; contractor aliases if concealed | MCST payment recording, fee account, rival-estate records, restricted subject reports |
| MCST | Own estate CM capabilities, approvals/payment/settings/oversight and unmasked identities | Other estate without authority; Contractor fee account; a conduct report where named as subject |
| Contractor | Own organisation records and permitted eligible RFQs; verification status | Rival quotes, premature estate location, Admin powers or MCST actions |
| Admin | Approved cross-estate management/intervention commands | Erasing business history, claiming a bank transfer occurred merely by changing status |

Apply membership, role, resource and confidential-subject checks together. Pending/unverified Contractor can access onboarding and existing permitted account records but cannot submit quotes. Suspensions/restrictions later narrow capabilities without accidentally blocking completion of already authorised jobs.

## 4. State transitions, audit and clocks

Successful login creates a session, not membership. Invitation acceptance creates only the pre-authorised membership. Admin verification later changes eligibility separately. Logout revokes/ends the relevant session and clears account-scoped client data; explain any still-device-only draft before loss according to approved retention policy.

Membership change -> audit actor/before/after/time -> invalidate affected capabilities/caches -> future requests re-authorize. Do not trust an old token's role claim. Current-role users can complete a shared role task once; named actor is retained even when another member was originally notified.

No new business inactivity timer for sign-in, optional applications or unfinished signup. An actually submitted Admin verification request enters chapter 04's Admin queue/T18. Security token/session expiry values are engineering/provider settings; choose and document them, without adding customer deadlines.

## 5. API and exception behavior

`GET me/context`, provider/session callbacks, invitation/application commands, context switching and Admin membership changes. Validate return URLs to avoid redirect misuse. Web cookies are secure/HttpOnly with CSRF protection; native credentials use OS secure storage. Reauthentication preserves an unsubmitted draft for the same account when policy permits; it must not submit it under a different logged-in identity.

Every future permission requires denied-role tests through API, files, bell, search and export. UI hiding alone is insufficient. Explicit account removal/retention and permanent cache deletion remain G14/O37-D.

## 6. Verification tests

| ID | Scenario | Pass condition |
| --- | --- | --- |
| CH02-T01 | Valid, invalid, expired and replayed login/invite | Correct session/access outcome; no role escalation or leaked account existence |
| CH02-T02 | CM requests MCST payment endpoint | Denied server-side even with edited payload/button/role cookie |
| CH02-T03 | Two MCST title variants / two CM block labels | Same-role permissions equal; named actor and estate context preserved |
| CH02-T04 | User changes URL to another estate/file | No data/count/error leakage; authorization reapplied |
| CH02-T05 | MCST account is named subject in a report | Report excluded despite broad estate role; uninvolved authorised recipients still work |
| CH02-T06 | Membership revoked after mobile/web cached context | Next request/reconnect denies stale access and clears inaccessible cache; no claim of erasure while offline |
| CH02-T07 | Session expires during form / another user signs in | Draft not silently submitted or exposed to the new user; current actor validated |
| CH02-T08 | Unverified Contractor application completes login | Onboarding available; quote action remains blocked until verified |

## 7. Completion gate

Deliver login/recovery/invitation UX after G01 decision, permission matrix, session/access-change tests and bootstrap Admin procedure. Prove the API isolation before seeding real estates. Account deletion and native-specific storage remain their explicit later gates, not hidden implementations.
