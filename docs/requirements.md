# Product requirements: MVP user flows

Scope: functional workflows and state behaviour for the Migration Hub MVP. Architecture lives in [architecture.md](architecture.md). Initial content covers the UK and Ireland, and only human-verified content is shown as verified.

Requirement IDs (`OB-`, `PS-`, `PL-`, `EC-`) are for traceability to tests.

## 0. Shared vocabulary

### Content status labels (every requirement, always with a verified date)

| Label         | Meaning                                                                                | Shown when                                              |
| ------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Verified      | Reviewed against the official source                                                   | `verified_at` within the freshness window               |
| Being checked | Source may have changed or the verification window has lapsed; content is under review | Stale, or a change was detected and not yet re-verified |
| Unverified    | Draft or never reviewed. Never shown to end users as guidance                          | Admin only                                              |

Each requirement also shows "Verified on <date>" and a source link. `Being checked` items still render, with a visible notice and the last verified date, and never hide or silently change.

### Screening result chips

Per criterion (deterministic rules, never AI):

| Criterion result | Chip text                 |
| ---------------- | ------------------------- |
| `met`            | Met                       |
| `not_met`        | Requirement appears unmet |
| `unknown`        | More information needed   |

Per pathway (overall, derived by fixed precedence):

| Overall outcome           | Chip text               | Rule                                                     |
| ------------------------- | ----------------------- | -------------------------------------------------------- |
| `potential_blocker`       | Potential blocker       | Any mandatory criterion is `not_met`                     |
| `more_information_needed` | More information needed | No mandatory `not_met`, at least one mandatory `unknown` |
| `potential_match`         | Potential match         | All mandatory criteria `met`                             |

Chips use text plus an icon, never colour alone. Wording is always tentative ("potential", "appears"). No percentages or likelihoods, and no promise of acceptance.

### Task completion label

Completed tasks show "Marked done by you" with the date. The system never marks a task done on the user's behalf.

---

## 1. Onboarding wizard

**Goal:** collect just enough profile data to screen pathways, with no dead ends.

### Steps

1. **Training:** country and institution of primary medical qualification, graduation year (required).
2. **Internship / experience:** internship status (`not_started | in_progress | completed | not_applicable`); completion date if completed; years of post-qualification experience (optional).
3. **Specialty:** current or intended specialty (searchable list plus "Not sure yet").
4. **Timeline:** target move window (`within_6_months | 6_12_months | 1_2_years | exploring`).
5. **Destinations:** one or more of the supported destinations, or "Not sure, show me options".
6. **Review:** summary with an Edit link per step, and a consent notice for storing profile data.

Each step has exactly one primary button ("Continue"; "Finish" on the review step). "Back" and "Skip for now" are secondary.

### Functional requirements

- **OB-1** Every field except the minimum set (qualification country, graduation year, destination or "Not sure") is skippable. Skipped answers are stored as `unknown`.
- **OB-2** Progress shows "Step n of 6" and is announced to assistive tech. Steps are reachable via URL (`/onboarding/<step>`).
- **OB-3** **Save and resume:** the wizard autosaves locally on every change (debounced), and saves to the server on each step completion when online. Returning users land on the first incomplete step with "Welcome back, continuing where you left off". The draft survives refresh, tab close and sign-out of the session, and is cleared on final submit or "Discard".
- **OB-4** Validation uses one Zod schema per step, shared by client and server. Errors are inline, specific and tied to the field, and never block "Back" or "Skip".
- **OB-5** Server is authoritative: the user ID comes from the session, never from the form.
- **OB-6** Completing the wizard (or reaching the minimum set) enables Pathway Discovery. The primary button on completion is "See my pathways".
- **OB-7** Profile can be edited later (More → Profile). Changing a screening-relevant field triggers re-screening and shows what changed.
- **OB-8** No identity documents or national ID numbers are collected.

### States

| State       | Behaviour                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Not started | Dashboard primary button: "Start your profile"                                                                                              |
| In progress | Dashboard primary button: "Continue your profile (step n of 6)"                                                                             |
| Complete    | Dashboard shows the next plan step                                                                                                          |
| Offline     | Wizard keeps working from the local draft; banner "You're offline. Your answers are saved on this device and will sync when you reconnect." |
| Save failed | Non-blocking message with "Retry"; local draft retained                                                                                     |

---

## 2. Pathway discovery and screening

**Goal:** show which official pathways may suit the user, with an honest statement of what is and isn't known.

### Flow

1. **Explore** lists destinations and pathways. Each card shows pathway name, regulator, content status, "Verified on <date>", and (if a profile exists) the overall screening chip.
2. **Pathway detail** shows the requirement list, each with: criterion result chip, content status label, verified date, plain-language summary, and a **Source** link to the official regulator page.
3. **Screening explanation:** each criterion shows "Why": the profile fields used and the rule applied. Unknown criteria show exactly which missing answer would resolve them, with an inline "Add this" action that opens the relevant profile field.
4. Primary button on pathway detail: "Add to my plan". If the overall chip is _Potential blocker_, the button remains available, but a notice states which requirements appear unmet and links to their sources. The user is informed, not blocked.

### Functional requirements

- **PS-1** Screening runs from explicit, versioned rule definitions stored with each requirement. No AI is involved, and the same inputs always give the same outputs.
- **PS-2** A criterion is `unknown` whenever any input field is missing. The system never assumes a value.
- **PS-3** The overall chip follows the precedence table in section 0. Only mandatory criteria affect it, and optional ones are shown without altering it.
- **PS-4** Every requirement renders status, verified date and source link. A requirement missing any of them is not rendered to end users, and an error is reported to admins.
- **PS-5** `Being checked` requirements are still shown, and the screening chip for any pathway that depends on one carries a note: "Some requirements are being checked."
- **PS-6** Results record the content version and rule version used and the time of screening, so results are explainable and reproducible.
- **PS-7** Users can compare up to three pathways side by side (chip, key requirements, estimated timeline from sourced data). The comparison shows no ranking score.
- **PS-8** Copy never states or implies a guarantee of registration or visa success, and each result carries the standing note "Preliminary. Confirm with the regulator."
- **PS-9** Changing the profile or publishing a new content version marks existing results as outdated and re-screens, preserving the previous result in history.

### States

| State                                  | Behaviour                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| No profile                             | Chips replaced with "Complete your profile to see how you match"; primary button: "Start your profile" |
| Partial profile                        | Chips show with unknown criteria listed; banner "Based on what you've told us so far"                  |
| No published content for a destination | Empty state "Not available yet", no placeholder requirements                                           |
| Loading                                | Skeleton cards, not a blank page                                                                       |
| Load error                             | Inline error with "Try again", cached results shown if available                                       |

---

## 3. Migration plan and task loop

**Goal:** turn a chosen pathway into an ordered list of actions, and keep it truthful as requirements change.

### Plan generation

- **PL-1** "Add to my plan" creates a plan from the pathway's reviewed task templates, copied and linked to the content version used.
- **PL-2** Tasks are ordered by an explicit dependency graph (topological order, ties broken by template order). Blocked tasks show "Waiting for: <task>" and cannot be started until dependencies are done, though users may mark something done out of order if they have already completed it elsewhere, with a confirmation.
- **PL-3** Dependency cycles are rejected at authoring time and at plan generation.
- **PL-4** Each task shows: title, plain-language description, the requirement(s) it satisfies with their status and verified date, source link, optional estimated cost (sourced, with currency), and optional due date.
- **PL-5** Only one task is the "Next step": the first unblocked, incomplete task by order. It is the Plan screen's single primary button ("Do next task") and the dashboard's primary action.

### Completion

- **PL-6** The user marks a task done with one action. It then shows "Marked done by you · <date>". Undo is available for 10 seconds and afterwards through "Mark as not done".
- **PL-7** Completion is stored per user per task and is independent of content versions. Nothing the user has recorded is deleted or reset by content updates.
- **PL-8** Completing a task recalculates dependent tasks and advances the next step.

### Changed-requirement handling

When a requirement linked to a plan task changes in a newly published version:

- **PL-9** The task gains a **"Requirement changed"** flag with a summary diff (before and after, effective date, source link). Content for that requirement shows `Being checked` until re-verified if applicable.
- **PL-10** A completed task **stays completed**. It shows "Marked done by you · <date>" plus the flag "Requirement changed since you completed this. Review". The user decides to keep it as done, or reopen it. The system never silently reverts completion.
- **PL-11** Changes to the plan structure (new, removed or reordered tasks, changed dependencies) arrive as a **proposed plan change** the user reviews and accepts or declines, per task. Declined changes are remembered and can be revisited. Nothing is applied automatically.
- **PL-12** Removed tasks that the user already completed are kept in history as "No longer required by <regulator>" rather than deleted.
- **PL-13** The user is notified in-app (and by reminder if enabled) once per change, and a dashboard banner links to the review screen. Reviewing is optional and never blocks other tasks.
- **PL-14** Every task and plan change is recorded in an activity log visible to the user.

### States

| State           | Behaviour                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| Empty plan      | "No plan yet" with primary button "Explore pathways"                                                                  |
| All tasks done  | "You've completed this plan's steps" with primary button "Review requirement updates" (or "Explore pathways" if none) |
| Pending changes | Banner "n updates to review", with primary button still "Do next task"                                                |
| Offline         | Plan is readable and tasks can be marked done; changes are queued and show "Waiting to sync"                          |

---

## 4. Edge cases and resilience

### Offline

- **EC-1** Saved plans, their tasks, and the referenced requirement snapshots (status, verified date, source) are available offline. Every cached item shows "Saved on this device · last updated <time>".
- **EC-2** Online-only features (Explore search of unsaved pathways, Ask, account changes) show a clear explanation instead of a failure: "This needs a connection."
- **EC-3** Offline edits (task completion, profile fields, drafts) are queued and synced in order on reconnect. A visible per-item state shows `Waiting to sync`, `Synced` or `Needs attention`.
- **EC-4** Sync conflicts (the same item changed elsewhere) are never silently overwritten. The user is shown both versions and chooses. Task completion by the user wins over any default.
- **EC-5** Cached regulatory content past its freshness window is displayed as `Being checked` with its original verified date. Offline never makes content look more current than it is.

### Partial profiles

- **EC-6** Every feature works with any profile state. Missing data produces `More information needed` and a specific prompt, never an error or a guess.
- **EC-7** A "Profile completeness" indicator links to the next most useful missing field, and is informational only, not the primary button.
- **EC-8** Required-for-screening fields are named per pathway ("To check this, we need: internship status").

### Slow or unreliable connections

- **EC-9** Pages render shell and skeletons immediately, and content streams in. No full-page spinners.
- **EC-10** Network operations have timeouts (about 10 s) with a visible "Still trying…" state after 3 s and a "Retry" action on failure. Writes are idempotent so retries are safe.
- **EC-11** Previously loaded or cached data is shown while refreshing (stale-while-revalidate), with a subtle "Updating…" indicator.
- **EC-12** Form submit buttons show a pending state and prevent double submission. Local autosave guarantees no data loss if the request fails.
- **EC-13** Target: usable on a mid-range Android on Slow 4G. Primary screens interactive in under 5 s on that profile.

### Stale and changing content ("Being checked")

- **EC-14** A requirement moves to `Being checked` when (a) its verification date exceeds the freshness window for its type, or (b) a monitor or admin flags a possible source change.
- **EC-15** `Being checked` content stays visible, labelled, with last verified date, source link and a note "We're confirming this with the regulator. Check the source before acting."
- **EC-16** Screening and plan tasks that depend on such content carry the same note, and completed tasks are not altered.
- **EC-17** When re-verified with no change, the label returns to `Verified` with a new date. When changed, the changed-requirement flow (PL-9 to PL-13) starts.
- **EC-18** Nothing is ever shown as current without a verified date. If the date is missing the item is hidden from users (see PS-4).

### Other

- **EC-19** Signed-out or expired session: local drafts remain on the device, with a prompt to sign in to sync. Private data is not shown to a signed-out user.
- **EC-20** "Delete local data" (More → Data controls) clears drafts, caches and the offline queue after warning that unsynced changes will be lost.
- **EC-21** All screens are keyboard-operable and screen-reader labelled, status is never conveyed by colour alone, and touch targets are at least 44 px.

---

## 5. Out of scope for the MVP

- AI-generated guidance (Ask is a feature-flagged "coming soon" state).
- Identity or credential document uploads.
- Automated submission to regulators.
- Success probabilities or rankings.
- Destinations beyond the UK and Ireland.

## 6. Acceptance checks (summary)

- Each primary screen has exactly one primary button.
- No requirement renders without status, verified date and source link.
- Screening outputs are reproducible from the same inputs and rule version.
- A completed task is never reverted by a content update.
- Wizard, plan and drafts remain usable offline and sync without loss.
- Stale content always shows as `Being checked` with its last verified date.
