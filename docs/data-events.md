# Fight Forward data events

What each page would need to log to feed the Youth Impact Dashboard (see `FFBrain.pages` and `dashboard.html`).
Status reflects the code as of this writing. Everything is in `localStorage` today; there is no server.

## Shared envelope (every event)

| Field | Notes |
|---|---|
| `studentId` | `user.id` from `FFAuth` |
| `org`, `site`, `group` | From the roster (`ff.roster.v1`); `auth.js` currently keeps `school` and `group` only. Add `org` and `site`. |
| `type` | Event name from the tables below |
| `at` | ISO timestamp |
| `sessionId` | **New.** One id per visit, from sign-in to sign-out. Needed to pair start and end check-ins and compute time spent. |
| `consent` | Whether guardian consent is on file. Server should refuse to store events without it where required. |

## Service 1: Engagement and participation

| Event | Source | Status | Gap |
|---|---|---|---|
| `session_start` / `session_end` | `auth.js` sign-in, sign-out | Missing | Add both, with `sessionId`. Handle closed tabs with a `pagehide` end. |
| `module_open` | `fight-forward.html` `openModule` | Missing | Log open so abandoned modules and missed sessions can be counted. |
| `module_complete` | `ctx.complete` → `ff.progress.v1` | Stored | Add `durationMs`. |
| `page_view` per path | each Path page | Missing | Lets us show Path 01-04 usage. |

Time spent = sum of `module_open` to `module_complete`, plus workout `secs`, plus session length.

## Service 2: Decision-making development

Stored today in `ff.decisions.v2:<id>` by `ctx.record` (`modules.js`): `moduleId, type, pressure, support, choice, move, rating, confidence, msToDecide, month, week, at`.

| Needed | Status | Gap |
|---|---|---|
| Option selected, time to decision | Stored (`choice`, `msToDecide`) | None |
| Skill area (peer pressure, conflict, emotional control, responsible choices) | Partial | `pressure` exists; confirm it maps 1:1 to the four dashboard skills, or add a `skill` field to each module. |
| Changed answer after coaching/reflection | Missing | Add `changedAfterDebrief` (picked a different option on retry) and `attempt` number. |
| Improvement over time | Derivable | Compare `rating` by skill across `month`/`week`. Needs a baseline: tag the first scenario per skill as `phase: "pre"`. |
| Repeat attempts | Missing | Same `moduleId` logged again overwrites progress; keep every attempt as its own row. |

Framing rule: report trends and growth. Never label a student "good" or "bad", and never produce one overall score.

## Service 3: Check-in and well-being trends

`welcome.html` calls `FFAuth.logCheckin({ phase: "start", feeling, reason })` into `ff.checkins.<id>`.

| Needed | Status | Gap |
|---|---|---|
| Start check-in | Stored | Add `sessionId`. |
| End check-in | Missing (comment in `auth.js` says "later") | Add `phase: "end"` screen before sign-out. |
| Change start to end | Derivable once `sessionId` exists | |
| `reason` is free text from a fixed list | Stored | Store the reason id, not the label, so wording can change. |

Privacy: dashboard shows aggregates only, with a minimum group size (mockup uses 10). Individual check-ins are visible only to explicitly permitted roles. "I'd rather not say" is counted but never probed. No diagnostic language anywhere.

## Service 4: Program outcomes and impact reporting

No new events. Reports are computed from services 1-3, 6 and 7, plus:

| Needed | Gap |
|---|---|
| Enrollment | Roster record with `enrolledAt` and `status` |
| Pre/post measures | The `phase: "pre" | "post"` tag from service 2, and a short survey if agreed with the organization |
| Report generation | Server job, monthly/quarterly/semester/annual, export to PDF and CSV |

## Service 5: Early support indicators

Derived, never captured directly. Candidate rules (tune with a youth-development advisor):

- Participation drops by more than half versus the student's own previous 4 weeks.
- Three or more `down` or `stress` start check-ins in 7 days.
- Same skill area rated low on 3 consecutive attempts.
- Repeated Coach's Corner contacts (count only, not content).

Output is a flag to an authorized adult: "may benefit from a check-in." Log `flag_created`, `flag_viewed`, `flag_actioned` (with who) for the audit trail. The flag never goes to the student or into a score.

Safety messages are a separate path: the `ff.safety.queue.v1` queue already routes urgent items to a safety adult. Keep that out of analytics, and never aggregate message text.

## Service 6: Impact Lab cardio

Stored today in `ff.workouts.v1:<id>` as `{ id, secs, at }` when a workout finishes (`impact-lab.html`).

| Needed | Status | Gap |
|---|---|---|
| Participation, duration | Stored | Add `workout_start` and `completed: false` for quit-early sessions. |
| Workout kind and level | Derivable from `id` | |
| Punch count, accuracy, speed | **Not capturable** | Workouts are timed guided moves with no sensor. Needs a camera/pose model, wearable, or bag sensor. Decide before promising these in the pitch. |
| Calories | Not capturable | Could be estimated from duration, kind and age, and labeled as an estimate. |
| Endurance, improvement | Derivable (proxy) | Longer completed workouts at higher level over time. |

## Service 7: B.I.2.T.R. (Bring It to the Ring) leadership

Stored today in `ff.ring.thread.v1:<id>:<month>` as `{ name, text, q, at }` (`bring-it-to-the-ring.html`). Free text, no leadership structure.

| Needed | Status | Gap |
|---|---|---|
| Sessions led, time facilitating | Missing | Add a `facilitator` role per session and `facilitate_start/end`. |
| Questions introduced | Partly (`q`) | Distinguish prompts the student wrote from prompts they picked. |
| Invitations to others | Missing | Add an "invite someone to share" action and log it. |
| Redirects, respectful disagreement, conflict practice | Missing | Needs facilitator or peer tagging (a one-tap rubric), not text analysis. |

Do not run sentiment analysis on posts to fill these in. Use explicit actions or adult-entered observations.

## Cross-cutting requirements

- **Server first.** `localStorage` is per device and clearable. Nothing here works for an organization until events go to a backend (`POST /events`, batched, retried offline).
- **Roster and roles.** Roles: student, mentor/coach, site lead, org admin, safety adult, Fight Forward staff. Access scoped by org → site → group → student.
- **Consent and compliance.** Guardian consent where required, and design for FERPA and COPPA/state student-privacy laws. Get counsel to review before schools pilot.
- **Minimum necessary.** Don't store message text, free-text reasons, or names in analytics tables. Use ids, and join to the roster only for authorized views.
- **Retention.** Per-org retention period and a delete-student action that removes events.
- **Audit log.** Record every dashboard view of individual-level data.
- **Small groups.** Suppress any cut under a minimum size (default 10).

## Suggested build order

1. `sessionId`, `session_start/end`, `module_open`, attempt rows, end check-in (small client changes).
2. Event queue plus backend endpoint, roster with org/site/group.
3. Aggregate API and wire `dashboard.html` to it (replace sample data).
4. Derived early-support flags and audit log.
5. Cardio sensing and B.I.2.T.R. facilitation tracking, once the product decisions above are made.
