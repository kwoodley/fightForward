# Fight Forward Academy: deployment plan for a school pilot

Status: draft for discussion. Written against the code as of commit `736e9f2`. It is an engineering plan, not legal advice; the compliance items need counsel.

## 1. Where we are

| Piece | Today | Fit for a pilot? |
|---|---|---|
| Student site | Static HTML/CSS/JS, no build step. Progress in the student's browser (`localStorage`). | Yes, once served over HTTPS. |
| Events | Sent to `POST /events` if a URL is set (`window.FF_EVENTS_URL` or `localStorage "ff.events.url"`). Nothing is sent by default. | No: no way to configure the URL for real devices, and the endpoint accepts anyone. |
| Server | `server/server.py`: Python standard library, SQLite, runs on `localhost:8787`. Plain HTTP. | Good for development. Not built to face the internet (see 4.2). |
| Staff dashboard | Sign-in with roles, scoped to org/site/group, small-group hiding, audit log. | Mostly. Needs HTTPS and the items in section 3. |
| Student sign-in | First name only. The student id is the name with punctuation removed (`lamont`). | **No** (see 3.2). |
| Safety messages | `ff.safety.queue.v1` and `ff.coaching.v1` in the student's own browser. **Nobody receives them.** | **No** (see 3.1). |

## 2. Recommendation in one paragraph

Run a **small pilot (one or two sites, up to a few hundred students)** with the static site on a CDN host, the API as one container behind managed HTTPS, and SQLite on a persistent volume with continuous backup. Do **not** start the pilot until the three blockers in section 3 are fixed. Move to a managed Postgres database when the pilot proves out or a second server instance is needed. This keeps the first deployment small and cheap, and the code change for Postgres is contained (the queries in `server/aggregate.py` use SQLite's `json_extract`).

## 3. Blockers before any real student uses it

### 3.1 The safety path does not deliver anything

The Ring page tells students "a safety adult is notified", and the Coaching Corner says "only the safety team can read it" and "the adult has to act". Today those messages are written to the student's own browser and go nowhere. With real students this is a duty-of-care and honesty problem, not a nice-to-have.

Choose one before the pilot:

- **Build it (recommended).** A safety-adult inbox on the server, reading the existing queue shape, with: delivery to the `safety_adult` role only (the role already exists and is kept out of analytics); an immediate notification (email or SMS to the site's named safety adult); acknowledge, reply and resolve states; an audit trail; an on-call and escalation procedure the organization signs off; and a "what happens if nobody responds within N minutes" rule. Messages never enter the `events` table.
- **Or change the wording** so nothing promises a response, and tell students plainly to talk to a trusted adult in the room or use 988/911. This is a stopgap, not a pilot-ready design.

Needs from you: who the safety adults are at each pilot site, and the organization's existing reporting policy (mandated-reporter duties differ by state and role; counsel and the school should define them).

### 3.2 Student identity

Students sign in with a first name, and the id is derived from it. Consequences: two "Sam"s at a site share one record; anyone can type a classmate's name and open their record; and **names end up in the analytics tables as ids**, which contradicts our own rule of using opaque ids and joining to a roster only for authorized views.

Fix:

- The roster issues each student an **opaque id** and a **join code** (class code plus a short personal code or PIN, set by the site lead).
- A server endpoint exchanges the code for a short-lived student token, bound to the roster row (org, site, group, consent status).
- `POST /events` then requires that token and takes `studentId`, org, site and group **from the roster**, never from the client. This also stops anyone injecting events for another student.
- First names stay on the device for greetings only and are never sent.

### 3.3 Consent and compliance review

Run this workstream in parallel from day one, because school and district approval can take longer than the engineering.

- Data inventory: what we collect (self-reported feelings, decisions, timing, workout and discussion activity), why, who sees it, how long we keep it.
- Counsel to confirm which laws apply for the pilot's states and ages: FERPA (and whether we act as a "school official"), COPPA for under-13s (verifiable parental consent, or school-authorized consent where permitted), and state student-privacy laws. Expect district data-privacy agreements and a vendor security questionnaire.
- Guardian consent captured and recorded per student (`consent` on the roster already exists). Set `FF_REQUIRE_CONSENT=1` in production so events from students without consent are dropped.
- Retention per organization, a delete-student action (exists: `DELETE /students/<id>`), and a written data-deletion procedure.
- Published privacy policy and a plain-language page for students and guardians. The check-in framing rule stays: self-reported, aggregate-only, never a diagnosis.

## 4. Target architecture for the pilot

```
Students (school devices) ──HTTPS──▶ Static host / CDN  (site files)
        │
        └─────HTTPS (events, sign-in)──▶ API container ──▶ SQLite on persistent volume ──▶ encrypted backups
                                              ▲
Staff dashboard (same static site) ───HTTPS───┘
```

### 4.1 Hosting choices

| Option | What it is | Good | Watch out |
|---|---|---|---|
| **A. One small VM** | A single cloud server running a reverse proxy (for example Caddy, which handles HTTPS automatically), the API and SQLite. | Cheapest; most control; simple to understand. | You own patching, backups, uptime, and firewalling. A single point of failure. |
| **B. Platform as a service** (recommended for the pilot) | Static site on a CDN host; API as a container on a managed platform with a persistent volume and managed TLS. | Little ops work; deploys from git; HTTPS and restarts handled. | Check the provider offers a data-processing agreement and the region you need; persistent-volume and backup features vary. |
| **C. Major-cloud managed stack** | Static site on a CDN; API on a managed container service; managed Postgres; secrets manager; centralized logs. | Strongest compliance story; scales; districts often prefer known clouds. | More setup and cost; needs the Postgres change first; more to learn. |

Pick B for the pilot unless a district requires a specific cloud, in which case use C. Whichever you pick, confirm before signing: a data-processing agreement, US data residency, encryption at rest, and backup and restore features. I have not priced these; expect tens of dollars a month for A or B at pilot size, and more for C. Verify with the providers.

### 4.2 API hardening (the current server is not enough)

The standard-library HTTP server is fine on a laptop. Facing the internet it needs a proper front. Either (a) put it behind a reverse proxy that enforces request-size and time limits, or (b) port the same routes to a maintained web framework run by a production server. I recommend (b) during the Postgres-readiness work, and (a) in the meantime. Required in both cases:

- HTTPS only, with HSTS. Redirect HTTP to HTTPS.
- `FF_ALLOW_ORIGIN` set to the site's exact origin (the default `*` is for development).
- Rate limits on sign-in and on `/events`, per IP and per student token.
- SQLite settings: WAL mode and a busy timeout (not set today), one server instance only.
- Security headers on the static site: a strict Content-Security-Policy, `X-Content-Type-Options`, `Referrer-Policy`. The pages currently load fonts from Google Fonts; **self-host the fonts** so no student IP address goes to a third party and school web filters do not block them.
- Secrets (ops token, session settings) from the platform's secret store, never in the repo. Rotate the ops token; replace it with named operator accounts or restrict it to a private network.
- No personal data in server logs (no student ids with names, no message text).

### 4.3 Client configuration

Real devices cannot set `localStorage`. Add a small `assets/js/config.js` (loaded before `auth.js`) that sets `window.FF_EVENTS_URL` and the sign-in URL per environment, generated at deploy time. The dashboard server address becomes a fixed value instead of a text field.

### 4.4 Data and backups

- Daily encrypted backups plus continuous replication of the SQLite file to separate storage, retained per the retention policy.
- **Test a restore** before the pilot and again every quarter.
- Retention job that deletes events for withdrawn students and past the organization's retention period.
- Move to Postgres when any of these is true: more than one API instance is needed, the database passes a few million events, or a district requires it. Event volume at pilot size is small (roughly tens of thousands of events per week for a few hundred students), so SQLite is not the constraint.

## 5. Workstreams and order

| # | Workstream | Depends on | Gate it unlocks |
|---|---|---|---|
| 1 | Safety-adult inbox and notification, plus the organization's procedure | Named safety adults; counsel input | Any contact with real students |
| 2 | Student identity: roster ids, join codes, event auth, ids and scope from roster | Roster process with the site | Any contact with real students |
| 3 | Compliance review, consent flow, privacy policy, district agreements | Counsel | Pilot start |
| 4 | Hosting setup: staging and production, HTTPS, secrets, config file, self-hosted fonts, headers | Hosting choice | Staging test with staff |
| 5 | API hardening: rate limits, WAL, origin lock, log hygiene, framework port | 4 | Staging test with staff |
| 6 | Backups, restore test, retention job, monitoring and alerts | 4 | Pilot start |
| 7 | Security review (checklist, dependency check, ideally an outside test) | 4, 5 | Pilot start |
| 8 | Staff onboarding: accounts, a short guide, audit-log viewer for site leads | 4 | Pilot start |
| 9 | Pilot runbook: support contact, incident response, how to pause or delete data | all | Pilot start |

Rough sequence: 3 starts immediately. 1 and 2 are the first engineering work. 4 to 6 follow once the hosting choice is made. Do not invite real students until 1, 2, 3, 6, 7 and 9 are done. A staging deployment with staff and test accounts can run earlier.

I have not estimated calendar time; it depends mostly on how fast the consent, district and safety-adult decisions land, which engineering cannot speed up.

## 6. Checklist to go live

- [ ] Safety path delivers to a named person, with a written procedure
- [ ] Students have opaque ids and codes; events require a student token; scope comes from the roster
- [ ] Counsel sign-off; guardian consent recorded; `FF_REQUIRE_CONSENT=1`
- [ ] HTTPS everywhere; HSTS; origin locked; security headers; fonts self-hosted
- [ ] Rate limits on sign-in and events; SQLite WAL; one instance
- [ ] Secrets in a secret store; ops token rotated; default accounts removed
- [ ] Backups running; restore tested; retention and delete-student procedures tested
- [ ] Logs free of personal data; uptime and error alerts going to a person
- [ ] Security review done; findings fixed
- [ ] Staff accounts created; guide delivered; audit log reviewed at least once
- [ ] Pilot runbook and a way to pause everything within minutes

## 7. Decisions needed from you

1. **Hosting**: option A, B or C (my pick: B, unless a district requires a cloud).
2. **Safety path**: build the inbox before the pilot (my pick), or reduce the promise and delay it.
3. **Pilot size and sites**: how many sites and students, and which states (drives the legal review).
4. **Who owns operations** after launch: you, a contractor, or the host's managed service.
5. **Student sign-in method**: class code plus personal PIN (my pick), or school single sign-on if the pilot school uses it.

## 8. Risks

- **Approval time** for district privacy agreements may set the schedule more than any code.
- **Safety response**: a message that arrives and is not answered is worse than no channel. The procedure and staffing matter as much as the software.
- **Camera-based sensing** (punch count and accuracy) multiplies the privacy and consent burden because it captures minors on video. Keep it out of the pilot unless processing is entirely on the device and counsel agrees.
- **Small groups** limit what a pilot can report. With a minimum of 10 youth per figure, a single small site will see many cards hidden. Plan the pilot size around that.
- **Shared devices**: records are keyed in the browser by name until section 3.2 is done. Do not run a pilot on shared devices before then.
