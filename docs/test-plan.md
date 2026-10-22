# Fight Forward Academy: end-to-end test plan

Run this by hand, in a real browser, against the development server. It follows one student through every page, then checks the data on the server, then signs in as staff and checks the dashboard and the privacy rules. Allow about 90 minutes for parts 0 to 6.

Use fake names and fake messages throughout. Nothing here should touch real student data.

**Not expected to work yet (do not log these as bugs).** They are listed in part 8.

## How to record results

Copy the table at the end of this file. For each step write Pass, Fail or Blocked, and for a Fail note what you saw, the browser and device, and a screenshot. Steps are numbered so a failure can be referred to as "step 3.7".

---

## Part 0. Setup (about 10 minutes)

You need two terminal windows and Chrome. (Safari and a phone come in part 7.)

**0.1 Start a clean test server.** In terminal 1, from the project folder:

```
export FF_DB=server/test.db
rm -f server/test.db
FF_ADMIN_TOKEN=ops-test-token python3 server/server.py
```

Expect: `Fight Forward events server on http://localhost:8787`. Leave it running. The `ops-test-token` is a throwaway value for this test.

**0.2 Start the website.** In terminal 2, from the project folder:

```
python3 -m http.server 8000
```

**0.3 Check the server answers.** Open <http://localhost:8787/health>. Expect `{"ok": true}`.

**0.4 Put your test student on the roster and load demo data.** Open a third terminal in the project folder:

```
python3 server/demo_data.py --ops-token ops-test-token
```

Expect: `Loaded synthetic data for 29 demo students (demo01-demo29)`. This also puts your test student `tester` on the roster in Group A. Demo students are for the dashboard checks in part 5; they are not real.

**0.5 Create four staff accounts** in the same third terminal (the password is for testing only; the `FF_DB` line makes this tool use the test database):

```
export FF_DB=server/test.db
export FF_STAFF_PASSWORD='test-password-123'
python3 server/staff.py add --username fiona --role ff_staff
python3 server/staff.py add --username sam   --role site_lead --org "Test Org" --site "Test Site"
python3 server/staff.py add --username mo    --role mentor    --org "Test Org" --site "Test Site" --group "Group A"
python3 server/staff.py add --username sasha --role safety_adult
python3 server/staff.py list
```

Expect: `Done.` four times, then the list with four accounts.

**0.6 Point the student site at the server.** Open <http://localhost:8000/>. Open the browser developer tools (Chrome: View > Developer > Developer Tools), Console tab, and run:

```
localStorage.setItem("ff.events.url", "http://localhost:8787/events")
```

Reload the page. This tells the site where to send events (a real deployment will set this in a config file instead).

**0.7 Keep a way to look at stored events.** Whenever a step says "check the server", run this in the third terminal (where `FF_DB` is already set):

```
python3 server/events_report.py --student tester --last-session
```

---

## Part 1. One student, start to finish (about 35 minutes)

Use the student name **Tester** (the site turns it into the id `tester`). Do the steps in order in one browser window with developer tools open (Application tab > Local Storage > `http://localhost:8000` lets you see what is stored).

> The site picks the current month's lessons. If today's month has no lessons yet (as in October) it shows January's, and the Ring topic is Communication. That is expected.

### 1. Sign in and check-in

| # | Do | Expect |
|---|---|---|
| 1.1 | On the login page, submit with the name box empty | An error message appears and you stay on the page |
| 1.2 | Type `Tester` and click **Log in** | You land on the welcome page, which first shows a full-screen gate with "Tap to enter" |
| 1.3 | Click the gate | A sound plays (if your volume is on), the screen reveals "Welcome back, Tester" and a spoken greeting may play |
| 1.4 | Try clicking **Enter Here** before answering | Nothing happens (the button is disabled) |
| 1.5 | Pick a feeling, then a reason, then click **Enter Here** | You land on the lobby with four path cards. Pick "Down" once on a later run to check the "I'd rather not say" reason appears |
| 1.6 | Check Local Storage | `ff.user.v1`, `ff.session.v1`, `ff.events.v1:tester`, `ff.checkins.tester` exist |

### 2. Path 01: Fight Forward (decisions)

| # | Do | Expect |
|---|---|---|
| 2.1 | Click the **Fight Forward** card, wait out the intro or click to skip it | Page "Make the call". The week 1 session shows six modules |
| 2.2 | Open **The Group Project** (a scenario) and pick choice A | The choices lock and "How sure are you about that call?" appears |
| 2.3 | Click a number 1 to 5 | Coach's breakdown appears for every choice; your pick is marked; the module shows "Done" in the list |
| 2.4 | Click **Run it back** and pick a **different** choice, then a confidence | A second breakdown appears |
| 2.5 | Open **Called Out at Practice** (a video scene). Click **Skip to choices**, pick a choice, click **Skip** for confidence | Breakdown appears |
| 2.6 | Open **Tone Check** (a sorting game) and answer every card | Card-by-card feedback, then a score with Coach's breakdown |
| 2.7 | Open **Listening Check** (a tap-to-select game), tap a few, click **Check my answers** | Score and breakdown |
| 2.8 | Scroll to "Your fight record" | A summary appears. It shows moves and counts only: no single score, no "good/bad" label for you |
| 2.9 | Click **Leave the ring** during a new module | Returns to the list; nothing breaks |

### 3. Path 02: Impact Lab (workouts)

| # | Do | Expect |
|---|---|---|
| 3.1 | Go to the lobby and open **Impact Lab** | Workout tiles and a filter |
| 3.2 | Start **Stance & Guard** | A player with a countdown, a move name and a cue |
| 3.3 | Click **Pause**, wait 5 seconds, click **Resume** | The clock stopped while paused |
| 3.4 | Click **Skip** until the workout ends (11 steps) | "Workout complete". The tile shows a ✓ and the stats update |
| 3.5 | Start **Corner Cardio**, let it run about 20 seconds, then click **Leave the gym** | The player closes |
| 3.6 | Start **Round Burner**, then without leaving click a **different** workout tile | The new workout starts |
| 3.7 | Start any workout and close the browser tab without leaving. Reopen <http://localhost:8000/lobby.html> | You are still signed in |

### 4. Path 03: Bring It to the Ring

| # | Do | Expect |
|---|---|---|
| 4.1 | Open **Bring It to the Ring** | An animated walk to the ring; the opponent name is the topic ("Communication") |
| 4.2 | Click **Step into the ring** | The discussion room opens with Coach's question and "Lead this round" |
| 4.3 | Click **Question 2** | The question changes. Nothing else happens (you are not leading yet) |
| 4.4 | Click **Lead this round** | The button becomes **Stop leading**; an Ask box and "I invited someone to share" appear |
| 4.5 | Click **Question 3** | The question changes; "This round: 1 question asked" |
| 4.6 | Type `zebra-unique-test-phrase` in the Ask box and click **Ask** | Coach's box now says "You ask" and shows your text; "2 questions asked" |
| 4.7 | Click **I invited someone to share** twice | "2 invitations" |
| 4.8 | Post the message `zebra-unique-post-phrase` | It appears in the thread |
| 4.9 | Post the message `I want to hurt myself (this is a test)` | A care box appears with 988/911 and a link to the Coaching Corner. See part 8: nobody actually receives this |
| 4.10 | Click **Stop leading** | The question returns to Coach's; the lead panel closes |
| 4.11 | Click **Lead this round** again, then **Leave the ring** | You return to the walk screen |

### 5. Path 04: Coaching Corner

| # | Do | Expect |
|---|---|---|
| 5.1 | Open **Coaching Corner**, pick a topic, write a fake message, send it | It appears in "what you've sent" as waiting for a reply |
| 5.2 | Check Local Storage | `ff.coaching.v1:tester` has the message. No event was sent for the message itself (see 6.6) |

### 6. Log out and check the server

| # | Do | Expect |
|---|---|---|
| 6.1 | Click **Log out** | The "Nice work, Tester" page with "How are you feeling now?" and **Skip and log out** |
| 6.2 | Choose a feeling and reason, click **Log out** | You land on the login page and are signed out. Pressing the browser Back button and reloading a path page sends you back to login |
| 6.3 | Wait 30 seconds (or run `FFAuth.flush()` in the console before logging out in a repeat) | Events leave the browser |
| 6.4 | Run `python3 server/events_report.py --student tester --last-session` | A timeline in this order (details vary): |

Expected event order for 6.4:

```
session_start
page_view welcome          checkin (start)           page_view lobby
page_view fight_forward    module_open + decision + module_complete   (The Group Project, attempt=1)
module_open + decision + module_complete   (attempt=2, changedAfterDebrief=True)
module_open ... module_complete            (video; then each game: module_open and module_complete only, no decision)
page_view impact_lab       workout_start + workout_end (completed=True reason=finished)
workout_start + workout_end (completed=False reason=left)
workout_start + workout_end (reason=switched) + workout_start ...
page_view ring             ring_enter  facilitate_start  question_introduced (picked)  question_introduced (written)
invite_sent x2             ring_post (leading=True) x2     facilitate_end (reason=stopped)
facilitate_start  facilitate_end (reason=left_ring)  ring_leave (reason=left_ring)
page_view coaching_corner
page_view goodbye          checkin (end)             session_end (reason=signout endCheckin=True)
```

Then check these:

| # | Check | Expect |
|---|---|---|
| 6.5 | One `session_start`, one `session_end`, and every row shares the same session id | `-- N events, 1 session(s)` |
| 6.6 | `python3 server/events_report.py --find zebra-unique` | `0 stored events contain 'zebra-unique'`. What a student types never leaves the device |
| 6.7 | `python3 server/events_report.py --find hurt` | `0`. The safety-flagged post leaves no trace in analytics |
| 6.8 | Compare the two `ring_post` rows (the normal one and the flagged one) | Identical in shape: same fields, nothing marking either as flagged |
| 6.9 | The attempt-2 `decision` row | `attempt=2`, `changedAfterDebrief=True` (False if you picked the same choice) |
| 6.10 | `workout_end` rows | `secs` is small for the skipped workout (you skipped, not waited), and about the time you actually moved for the early leave |
| 6.11 | Event `checkin` rows | `feeling` and `reason` are short ids (for example `good`, `relaxed`), not label text |
| 6.12 | The workout you abandoned by closing the tab in 3.7 | A `workout_end` with `reason=page_closed` and `completed=False` in the same visit (you were still within the 30-minute window). Closing a tab is best-effort: if a browser blocks the last send, that one event can be missing, which is acceptable |

---

## Part 2. Things going wrong (about 15 minutes)

| # | Do | Expect |
|---|---|---|
| 2.1 | **Server down.** Sign in as Tester again. Stop the server (Ctrl-C in terminal 1). Open a module and complete it. In the Console run `JSON.parse(localStorage.getItem("ff.outbox.v1")).length` | A number above 0: events are waiting |
| 2.2 | Restart the server (same command as 0.1 **without** the `rm -f` line, so the data stays). Wait up to 30 seconds, or run `FFAuth.flush()` | The outbox count returns to 0. `events_report.py --student tester --last-session` shows the waiting events |
| 2.3 | **No duplicates.** In the Console run `localStorage.setItem("ff.outbox.v1", localStorage.getItem("ff.events.v1:tester"))` then `FFAuth.flush()` | The server accepts and ignores them. The counts in `events_report.py` do not change |
| 2.4 | **Idle timeout.** In the Console: `s=JSON.parse(localStorage.getItem("ff.session.v1")); s.lastSeen=new Date(Date.now()-3600e3).toISOString(); localStorage.setItem("ff.session.v1",JSON.stringify(s))`, then reload and open a module | The old session ends with `session_end reason=timeout` and a new `session_start` begins |
| 2.5 | **Switching students on one device.** Log out (skip the check-in), sign in as `Ava`, then without logging out go to <http://localhost:8000/index.html?switch> and sign in as `Sam` | `session_end reason=abandoned` for Ava; events for Sam have a new session id |
| 2.6 | **Private window.** Open a private/incognito window, go to the site, sign in as `Priv`, set the events URL (0.6) and complete a module | Everything works. Closing the window discards the stored data, as expected |
| 2.7 | **Wrong server address.** In the Console set `localStorage.setItem("ff.events.url","http://localhost:9999/events")` and use the site for a minute | No error shown to the student; the site stays fast; the outbox grows. Restore the right URL afterward |
| 2.8 | **Garbage to the server.** `curl -X POST localhost:8787/events -d 'nope'` and `curl -X POST localhost:8787/events -d '{"events":[{"eventId":"a","studentId":"x","type":"safety_message","at":"z","sessionId":"s"}]}'` | Both return a 400 with a short error; nothing is stored |

---

## Part 3. Consent rule (about 5 minutes)

| # | Do | Expect |
|---|---|---|
| 3.1 | Stop the server. Start it again with `FF_REQUIRE_CONSENT=1` added to the command (keep `FF_DB` and the token) | Starts normally |
| 3.2 | As a new student `Nocon` (not on the roster), do one module and log out, then flush | Server replies with `skipped` events; `events_report.py --find nocon` returns 0 |
| 3.3 | As `Tester` (on the roster with consent), do one module | Events are stored |
| 3.4 | Restart the server without `FF_REQUIRE_CONSENT` for the rest of the test | |

---

## Part 4. Staff sign-in and the dashboard (about 25 minutes)

Open <http://localhost:8000/dashboard.html>.

| # | Do | Expect |
|---|---|---|
| 4.1 | Before signing in | A "Mockup · sample data only" label and invented figures |
| 4.2 | Open **Sign in for live data**, keep the address `http://localhost:8787`, username `fiona`, password `test-password-123`, click **Sign in** | "Signed in as fiona · Fight Forward staff · all organizations". The label becomes "Live data · this month" |
| 4.3 | Choose **Test Org › Test Site** (period **This year**) | The cards show real numbers for 30 youth: enrolled, participation, check-in totals, path usage, Impact Lab, and B.I.2.T.R. |
| 4.4 | In the group box choose **Group A** | 14 youth enrolled; figures fill in. This includes your test student |
| 4.5 | Choose **Group B (small group)** | Every card says "Hidden: groups under 10 youth are not shown" |
| 4.6 | Choose **Group C (small group)** | Also hidden. Group C has 12 youth, but it is hidden because hiding Group B alone would let someone subtract and expose Group B's 4. This is deliberate |
| 4.7 | Switch the period to **This month**, **This quarter**, **This year** | The numbers change and nothing errors. The "Skill change" shows "Not enough history yet" where there is no previous period |
| 4.8 | Check the Support opportunities card | It says "Not tracked yet". It does not list any student |
| 4.9 | Look at every live card | No student names, no per-student scores, no check-in reasons, no message text |
| 4.10 | Click **Sign out, use sample data** | Back to the sample view. Reload: you stay signed out |

**Roles.** Sign out between each, then sign in:

| # | Sign in as | Expect |
|---|---|---|
| 4.11 | `sam` (site lead) | Only **Test Org › Test Site** is offered; no "All sites" |
| 4.12 | `mo` (mentor, Group A) | Site box shows only Test Site; group box shows only **Group A**, with no "All groups" |
| 4.13 | `sasha` (safety adult) | The dashboard stays on the sample view and shows "Your account does not cover that part of the program." No live data is shown. Reload the page: you are still signed out |
| 4.14 | Wrong password for `fiona`, 3 times | The same generic message each time: "Sign in failed. Check your details, or wait a few minutes if you have tried several times." |
| 4.15 | Wrong password 5 times in total, then the right password | Still refused (locked for 15 minutes). Run `python3 server/staff.py unlock --username fiona`, then sign in works |
| 4.16 | An unknown username | The same generic message (it must not reveal whether the account exists) |

**Direct checks with the command line** (replace TOKEN with the `token` from a login):

```
curl -s -X POST localhost:8787/auth/login -d '{"username":"mo","password":"test-password-123"}'
curl -s -H "Authorization: Bearer TOKEN" "localhost:8787/api/aggregate?org=Test%20Org&site=Test%20Site&group=Group%20C"
curl -s -H "Authorization: Bearer ops-test-token" localhost:8787/api/aggregate
```

| # | Check | Expect |
|---|---|---|
| 4.17 | The mentor asking for Group C | HTTP 403 `outside your scope` |
| 4.18 | The ops token reading analytics | 401. The shared token cannot read analytics |
| 4.19 | A staff token sending `PUT /roster` | 401. Staff cannot provision |
| 4.20 | Audit trail: `python3 server/events_report.py --audit` | Rows for each sign-in, failed sign-in, scope view, aggregate view and denied request, each with the staff username |

---

## Part 5. Privacy rules (about 10 minutes)

| # | Do | Expect |
|---|---|---|
| 5.1 | **Small-group hiding.** Already covered by 4.5 and 4.6 | |
| 5.2 | **Not a single score.** Read every card and the "Your fight record" page for the student | Counts and trends only. No overall number per child anywhere |
| 5.3 | **No labels for a child.** On the student's debrief, the words "Strong play / Decent / Rough call" refer to choices in practice, not to the child | Confirm the wording reads that way to you; note any line that sounds like a judgement of the student |
| 5.4 | **Delete a student.** `curl -X DELETE -H "Authorization: Bearer ops-test-token" localhost:8787/students/demo01` | `{"events": N, "roster": 1}`. `events_report.py --find demo01` returns 0, and Group A now shows 13 enrolled |
| 5.5 | **Safety stays out of analytics.** `python3 server/events_report.py` | There is no event type for messages or safety flags. The type list contains only the ones listed in the plan |
| 5.6 | **Check-in reasons not shown.** Search the aggregate JSON from step 4 for `reason` | It does not appear in the aggregate output |

---

## Part 6. Content and flow review (about 15 minutes, human judgement)

| # | Do | Look for |
|---|---|---|
| 6.1 | Read every scenario, game and breakdown on Path 01 as a parent would | Anything confusing, unsafe, or that blames a child |
| 6.2 | Read the Ring and Coaching Corner notices | They promise that a safety adult is notified and can read messages. This is **not true yet** (part 8). Note the exact wording for later |
| 6.3 | Read the welcome and goodbye check-ins | The wording is a self-report, not a diagnosis; the "I'd rather not say" option is present for Down and Stressed |
| 6.4 | Try every **Log out** link on every page | All lead to the "Before you go" page; the welcome page's **Not you? Log out** skips it |

---

## Part 7. Devices and accessibility (about 20 minutes)

Repeat parts 1.1 to 1.5, 2.2 to 2.3, 3.2 to 3.4, 4.2 to 4.4 on each of:

| # | Device | Note |
|---|---|---|
| 7.1 | Chrome on a laptop or Chromebook | The main target |
| 7.2 | Safari on a Mac | Sound should start after you tap the gate |
| 7.3 | Safari on an iPhone | To reach your computer from the phone, run the web server as `python3 -m http.server 8000 --bind 0.0.0.0`, start the API server and use your computer's address; then set `ff.events.url` to `http://<computer address>:8787/events` on the phone. Note: this is only for testing on your own network |
| 7.4 | Chrome on an Android phone | Same approach |

On each, check:

| # | Check | Expect |
|---|---|---|
| 7.5 | Narrow screen (phone, or a browser window about 375 px wide) | No sideways scrolling on any page; text readable without zooming |
| 7.6 | Tap targets | Buttons and chips are easy to hit (about 44 px) |
| 7.7 | Keyboard only (Tab, Enter, Space) | You can sign in, answer a check-in, pick scenario choices, run a workout, and post in the Ring without a mouse. Focus is always visible |
| 7.8 | Screen reader (VoiceOver or NVDA) on the login, a scenario and the check-in | Buttons have names; selected states are announced; the safety care box is announced when it appears |
| 7.9 | Reduce motion (system setting) | The welcome animations calm down |
| 7.10 | Sound off | Everything still works; the site is understandable without audio |
| 7.11 | Slow connection (Chrome developer tools > Network > Slow 4G) | Pages still load; the site works without the external fonts if they fail |
| 7.12 | School-like filtering: block `fonts.googleapis.com` (developer tools > Network > Block request URL) | The site still works with fallback fonts |

---

## Part 8. Known gaps: confirm they are still gaps

These are known and recorded in `docs/deployment-plan.md`. Checking them here makes sure nobody mistakes them for working features.

| # | Gap | How to confirm |
|---|---|---|
| 8.1 | Safety and Coaching Corner messages are not delivered to anyone | After 4.9 and 5.1, look in the server database and logs: nothing arrived. The messages exist only in the browser's `ff.safety.queue.v1` and `ff.coaching.v1:tester` |
| 8.2 | Student id comes from the first name | Sign in as `Sam` on two devices: both use the same id `sam`. Typing a classmate's name opens their local record |
| 8.3 | No HTTPS | The server runs on plain `http://` |
| 8.4 | `POST /events` accepts anyone | `curl` with any `studentId` is accepted if it is on the roster and (when required) has consent |
| 8.5 | Early-support, redirect/disagreement and punch-count cards | Show "Not tracked yet" or a plain note |
| 8.6 | Data lives on one device until it syncs | If the server is never reachable, nothing reaches staff |

---

## Clean up

- Stop both servers (Ctrl-C).
- Delete the test data: `rm server/test.db`.
- In each browser used, clear this site's data (developer tools > Application > Clear storage) so test records do not mix with later use.

## Results log

| Step | Pass / Fail / Blocked | Browser and device | Notes or screenshot |
|---|---|---|---|
| 0.1 | | | |
| 0.2 | | | |
| 1.1 | | | |
| … | | | |

(Add a row per step.)
