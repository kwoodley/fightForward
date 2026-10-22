# Fight Forward data events

What each page would need to log to feed the Youth Impact Dashboard (see `FFBrain.pages` and `dashboard.html`).
Status reflects the code as of this writing. Everything is in `localStorage` today; there is no server.

## Shared envelope (every event)

| Field | Notes |
|---|---|
| `studentId` | `user.id` from `FFAuth` |
| `org`, `site`, `group` | From the roster (`ff.roster.v1`); `auth.js` now keeps `org`, `site` and `group`. |
| `type` | Event name from the tables below |
| `at` | ISO timestamp |
| `sessionId` | **Built.** One id per visit, from sign-in to sign-out (`auth.js`). Pairs start and end check-ins and gives time spent. A visit also ends after 30 minutes idle. |
| `consent` | Whether guardian consent is on file. Server should refuse to store events without it where required. |

## Service 1: Engagement and participation

| Event | Source | Status | Gap |
|---|---|---|---|
| `session_start` / `session_end` | `auth.js` sign-in, sign-out | **Built** | `session_end` carries `reason` (`signout`, `timeout`, `abandoned`), `durationMs`, `endCheckin`. Closed tabs are closed at the last time seen (`lastSeen`, updated on `pagehide`), on the next sign-in or visit. |
| `module_open` | `fight-forward.html` `openModule` | **Built** | Carries `moduleId`, `type`, `skill`, `attempt`. |
| `module_complete` | `ctx.complete` → `ff.progress.v1` | **Built** | Has `attempt` and `durationMs`. |
| `page_view` per path | each Path page | **Built** | One `page_view` per page load for signed-in students, from `auth.js` (list `PAGES`): `welcome`, `lobby`, `fight_forward`, `impact_lab`, `ring`, `coaching_corner`, `goodbye`. The dashboard shows the share of youth who visited each of Paths 01-04. A Coaching Corner view is a visit count only; it says nothing about what was asked, and it is hidden under the minimum group size like everything else. |

Time spent = sum of `module_open` to `module_complete`, plus workout `secs`, plus session length.

## Service 2: Decision-making development

Stored in `ff.decisions.v2:<id>` by `ctx.record` (`modules.js`): `moduleId, type, skill, pressure, support, choice, move, rating, confidence, msToDecide, attempt, changedAfterDebrief, month, week, at`. Every finished attempt of any module (including games) is also a row in `ff.attempts.v1:<id>`.

| Needed | Status | Gap |
|---|---|---|
| Option selected, time to decision | Stored (`choice`, `msToDecide`) | None |
| Skill area (peer pressure, conflict, emotional control, responsible choices) | **Built** | Each module has a `skill` (`peer`, `conflict`, `emotion`, `responsible`; see `SKILLS` in `content.js`). `pressure` stays as a separate context tag. The tagging is a first pass; have a youth-development advisor review it. |
| Changed answer after coaching/reflection | **Built** | `attempt` and `changedAfterDebrief` (on attempt 2 and later, true if a different option was picked than last time). |
| Improvement over time | Derivable | Compare `rating` by skill across `month`/`week`. Needs a baseline: tag the first scenario per skill as `phase: "pre"`. |
| Repeat attempts | **Built** | Every attempt is its own row. `ff.progress.v1` still holds only the latest. |

Framing rule: report trends and growth. Never label a student "good" or "bad", and never produce one overall score.

## Service 3: Check-in and well-being trends

`welcome.html` calls `FFAuth.logCheckin({ phase: "start", feeling, reason })` into `ff.checkins.<id>`.

| Needed | Status | Gap |
|---|---|---|
| Start check-in | **Built** | Has `sessionId`. |
| End check-in | **Built** | `goodbye.html`, reached from every Log out link. Optional: "Skip and log out" records `endCheckin: false` on `session_end`. The "Not you?" link on the welcome page skips it. |
| Change start to end | Derivable (match `sessionId`) | |
| `reason` is from a fixed list | **Built** | Stored as an id (`FFAuth.FEELINGS` in `auth.js`). Older rows hold the label. |

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
| Participation, duration | **Built** | `workout_start` (`workoutId`, `kind`, `level`, `plannedSecs`) and exactly one `workout_end` per start: `completed`, `reason` (`finished`, `left`, `switched`, `page_closed`), `secs` of time actually moving (paused time excluded), `plannedSecs`, `stepsDone`, `stepsTotal`. `ff.workouts.v1` still holds only finished workouts. |
| Workout kind and level | Derivable from `id` | |
| Punch count, accuracy, speed | **Decided: in the pitch** | Workouts are timed guided moves with no sensor today. Needs a camera/pose model, wearable, or bag sensor. Pick the sensing approach (and its privacy review, since camera input of minors) before building. |
| Calories | Not capturable | Could be estimated from duration, kind and age, and labeled as an estimate. |
| Endurance, improvement | Derivable (proxy) | Longer completed workouts at higher level over time. |

## Service 7: B.I.2.T.R. (Bring It to the Ring) leadership

Stored today in `ff.ring.thread.v1:<id>:<month>` as `{ name, text, q, at }` (`bring-it-to-the-ring.html`). Free text, no leadership structure.

| Needed | Status | Gap |
|---|---|---|
| Sessions led, time facilitating | **Built** | "Lead this round" on the Ring page. `facilitate_start`, then `facilitate_end` with `secs` (capped at 1 hour), `questions`, `invitations`, `reason` (`stopped`, `left_ring`, `page_closed`). `ring_enter` / `ring_leave` track time in the ring, and `ring_post` counts posts. |
| Questions introduced | **Built** | `question_introduced` with `source` `picked` or `written`, only while leading. The text of a written question stays on the device. |
| Invitations to others | **Built** | "I invited someone to share" button (a tap when the student asks a quieter person in the room) logs `invite_sent`. No names. |
| Redirects, respectful disagreement, conflict practice | Missing | Needs facilitator or peer tagging (a one-tap rubric), not text analysis. Needs an observer role and a server-side thread first; today the thread lives on one device. |

Events carry counts and sources, never post text, and a post flagged by the safety screen sends exactly the same `ring_post` as any other post. Safety messages stay in `ff.safety.queue.v1`.

Do not run sentiment analysis on posts to fill these in. Use explicit actions or adult-entered observations.

## Cross-cutting requirements

- **Server first.** `localStorage` is per device and clearable. Nothing here works for an organization until events go to a backend (`POST /events`, batched, retried offline).
- **Roster and roles.** Roles: student, mentor/coach, site lead, org admin, safety adult, Fight Forward staff. Access scoped by org → site → group → student. **Staff sign-in is built in the dev server** (see "Staff sign-in" below); students still sign in by first name on the device.
- **Consent and compliance.** Guardian consent where required, and design for FERPA and COPPA/state student-privacy laws. Get counsel to review before schools pilot.
- **Minimum necessary.** Don't store message text, free-text reasons, or names in analytics tables. Use ids, and join to the roster only for authorized views.
- **Retention.** Per-org retention period and a delete-student action that removes events.
- **Audit log.** Record every dashboard view of individual-level data.
- **Small groups.** Suppress any cut under a minimum size (default 10).

## Suggested build order

1. ~~`sessionId`, `session_start/end`, `module_open`, attempt rows, end check-in~~ (done). Events are in `ff.events.v1:<id>` (capped at 5000).
2. Event queue plus backend endpoint (**built as a dev reference**), roster with org/site/group.
   - Client: events go to the `ff.outbox.v1` queue and are POSTed in batches of 100 to the URL in `window.FF_EVENTS_URL` or localStorage `ff.events.url`. With no URL set, nothing is sent. Retries on failure, flushes on load, every 30s, when back online, and on page close.
   - Events sent: `session_start`, `session_end`, `checkin` (ids only), `module_open`, `module_complete`, `decision`. Each has a unique `eventId`.
   - Server: `server/server.py` (standard library, SQLite). Try it: `python3 server/server.py`, then in the browser console `localStorage.setItem("ff.events.url", "http://localhost:8787/events")`. It ignores repeat `eventId`s and rejects unknown event types, so safety messages and free text cannot be sent by mistake.
   - Not done: per-site authentication, guardian-consent check, HTTPS, retention and delete-student, audit log, read APIs. The roster is still `localStorage`.
3. Aggregate API and `dashboard.html` wiring (**both built against the dev server**). The dashboard opens in sample mode; "Sign in for live data" takes the server address, username and password and switches to live mode, with "Sign out, use sample data" to switch back.
   - Roster: `PUT /roster` upserts `{studentId, org, site, group, grade, status, consent, enrolledAt}`. No names are stored. Set `FF_REQUIRE_CONSENT=1` to keep events only from students with consent on the roster (others are acknowledged but dropped).
   - `GET /api/aggregate?org=&site=&group=&from=&to=` returns group totals: enrolled, participation, engagement, per-skill share of "best" calls with change versus the previous period of equal length, and start/end check-in totals by feeling. Check-in reasons are never output. Only active roster students count; events from unrostered students are stored but not reported.
   - Small groups: a scope with fewer than `FF_MIN_GROUP` (default 10) enrolled is returned as `suppressed`, and any skill or check-in figure from fewer than that many youth is suppressed.
   - Provisioning calls (`PUT /roster`, `DELETE /students/<id>`) need the ops token `Authorization: Bearer $FF_ADMIN_TOKEN` (refused when no token is set). The ops token can no longer read analytics. Every call is written to the `audit` table with who made it. `DELETE /students/<id>` removes a student's roster row and events.
   - Complementary suppression: if a small group (or site) is hidden, its siblings are hidden too until the hidden total reaches the minimum, so subtracting from the parent total cannot expose the few. `GET /api/scopes` feeds the dashboard pickers and withholds counts for hidden groups. This covers enrolled counts; figures that depend on activity (for example youth with check-ins) have their own minimum but are not cross-checked between siblings.
   - Impact Lab in the API (`cardio`): workouts started, share finished, minutes moving, share of youth who did a workout, starts by kind. Suppressed under the minimum youth. Punch count and accuracy are still not captured.
   - B.I.2.T.R. in the API (`leadership`): rounds led, minutes facilitating, invitations, questions asked (picked vs written), share of youth who joined the ring. Suppressed when fewer than the minimum number of youth led a round.
   - Dashboard live cards: enrolled, participation, module completion, average session minutes, skill change, start/end check-in totals, engagement counts. Support opportunities shows "Not tracked yet". Impact Lab and B.I.2.T.R. are live.
   - Not yet in the API: Impact Lab, B.I.2.T.R. and early-support figures (no events for them yet).
4. Derived early-support flags and audit log.
5. Cardio sensing and B.I.2.T.R. facilitation tracking, once the product decisions above are made.

## Later: parent cycle

The owner wants to track a parent cycle later (a parent/guardian view and loop alongside the student). Not designed yet. Needs its own role, consent flow and what a guardian may see, and must respect the same rules: aggregates for organizations, no single score per child.

## Staff sign-in (dev server)

Built in `server/auth.py` and `server/staff.py`; the dashboard signs in with it.

| Role | Scope | Sees analytics |
|---|---|---|
| `ff_staff` (Fight Forward staff) | all organizations | yes |
| `org_admin` | one org | yes |
| `site_lead` | one site | yes |
| `mentor` (coach) | one group | yes |
| `safety_adult` | none | **no**. Can sign in, but safety messages are a separate path and never part of analytics. |

- Accounts are created on the server: `python3 server/staff.py add --username maria --role site_lead --org "Eastside" --site "Rec Center"` (asks for a password; `list`, `passwd`, `disable`, `enable`, `unlock` also exist). There is no self-signup.
- Passwords: at least 10 characters, stored as salted PBKDF2-SHA256. Session tokens are random, expire after 8 hours, and only their hash is stored. Disabling an account or changing its password ends its sessions.
- Five wrong passwords lock the account for 15 minutes. A wrong password, an unknown username, a locked account and a disabled account all return the same message.
- Scope is enforced on the server. A request outside the person's scope gets 403 (and is audited as `aggregate_denied`); a request that names less is filled in from their scope. `/api/scopes` lists only their branch and withholds totals above their level.
- Audit rows record the staff username for sign-in, sign-out, failed sign-in, scope list views, aggregate views and denied requests.
- Not done: HTTPS (required before any real use, since passwords and tokens cross the wire), password reset by email, two-factor sign-in, an audit-log viewer, the safety-adult inbox, and guardian accounts (the parent cycle).
