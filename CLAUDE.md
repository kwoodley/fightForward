# Fight Forward Academy

Youth decision-making platform: a static site of plain HTML, CSS and JS. No build step, no framework, no server yet.
Open `index.html` in a browser to run it (or serve the folder with `python3 -m http.server`).

## Pages and flow
`index.html` (first-name login) → `welcome.html` (entrance gate, start-of-session check-in) → `lobby.html` (path cards) → … → Log out → `goodbye.html` (end-of-session check-in) →
- Path 01 `fight-forward.html`: practice decision-making scenarios and games
- Path 02 `impact-lab.html`: guided cardio and boxing workouts
- Path 03 `bring-it-to-the-ring.html` (B.I.2.T.R.): monthly youth discussion thread
- Path 04 `coaching-corner.html`: messages to a safety adult
- `dashboard.html`: organization Youth Impact Dashboard mockup (sample data only)

## Code layout
- `assets/css/site.css` shared styles; `paths.css` and `modules.css` for the path pages
- `assets/js/auth.js` sign-in, `FFAuth.logCheckin`; `content.js` curriculum data; `modules.js` scenario/game player; `intro.js`
- `assets/badges`, `assets/img` artwork
- `server/server.py` dev events endpoint (run `python3 server/server.py`)
- `docs/data-events.md` plan for the analytics events each page needs
- `FFBrain.pages`: product concept doc (the data and reporting layer is "the brain" of the platform)

## Conventions
- Pages build UI with a local `el(tag, attrs, ...kids)` helper and `$ = s => document.querySelector(s)`.
- Storage is `localStorage` wrapped in try/catch. Keys are versioned and per student: `ff.decisions.v2:<id>`, `ff.progress.v1:<id>`,
  `ff.workouts.v1:<id>`, `ff.checkins.<id>`, `ff.attempts.v1:<id>`, `ff.events.v1:<id>`, `ff.session.v1`, `ff.coaching.v1:<id>`, `ff.ring.thread.v1:<id>:<month>`, `ff.safety.queue.v1`, `ff.roster.v1`.
- Dark theme with CSS variables in `site.css` (`--red`, `--ink`, ...). Fonts: Anton for headings, Inter for body.
- Sound is synthesized with the Web Audio API in `welcome.html`; no audio files.
- Keep mobile working: fluid sizes, no horizontal scroll, 44px touch targets.

## Product rules (from the concept doc)
- Present decision data as development and trends, never "good/bad" labels, and never a single score per child.
- Check-in data is self-reported, shown to organizations only as aggregates, and never framed as a mental-health diagnosis.
- Early support flags go to an authorized adult, who decides what to do. No predicting who will "get in trouble".
- Privacy by design: role-based access, guardian consent, minimum data, retention rules, audit logs, small-group suppression.
- Safety messages (`ff.safety.queue.v1`) stay out of analytics.

## Where we left off
- Built the first client data changes from `docs/data-events.md`: session id with start/end (`auth.js`), end-of-session check-in (`goodbye.html`), `module_open`/`module_complete` events, per-attempt rows, and a `skill` tag on every module.
- New storage keys: `ff.session.v1` (current visit), `ff.events.v1:<id>` (event log), `ff.attempts.v1:<id>`.
- Built an event queue (`ff.outbox.v1`, in `auth.js`) and a dev reference server, `server/server.py` (stdlib + SQLite, `POST /events`). Off until `ff.events.url` is set. See `docs/data-events.md` build order step 2 for what is still missing (auth, consent check, HTTPS, retention, audit log).
- Dev server also has a roster (`PUT /roster`), `GET /api/aggregate` with small-group suppression, an audit table and delete-student; admin calls need `FF_ADMIN_TOKEN`.
- `dashboard.html` has a live mode ("Connect to live data": server address + admin token) next to the sample mode; the server hides small groups and their siblings (complementary suppression). Support and B.I.2.T.R. cards say "Not tracked yet".
- Impact Lab sends `workout_start`/`workout_end` events and the dashboard cardio card is live (no punch count or accuracy; needs a sensor).
- Next: events for B.I.2.T.R., page views, staff sign-in with roles instead of the admin token, then derived early-support flags. Still open from the first group: `page_view` and `workout_start` events.
- Decided: cardio sensing (punch count/accuracy) goes in the pitch; sensing approach and privacy review still to pick. A parent cycle is wanted later.
- Tried a heartbeat sound synced to the welcome-page logo pulse, with a two-step gate for Safari. Reverted at the user's request; not in the code.
- Idea list for sounds (not built): Impact Lab interval bells and countdown, check-in chip ticks, scenario lock-in thump, completion chimes, and one shared remembered mute setting.
