#!/usr/bin/env python3
"""Load SYNTHETIC test data into a running dev server, for trying the dashboard. Never use against real data.

  python3 server/demo_data.py --ops-token $FF_ADMIN_TOKEN [--url http://localhost:8787]

Creates org "Test Org", site "Test Site" with three groups:
  Group A  13 demo students + your real test student "tester" (14): shown
  Group B  4 students, under the minimum of 10: hidden
  Group C  12 students: hidden too, because a hidden small group also hides its next-smallest sibling, so that
           the site total minus the visible groups cannot reveal the 4 (this is the complementary-hiding rule)
Then adds about three weeks of made-up events for the demo students. Student ids start with "demo", so they are easy to spot and delete.
Safe to run twice: event ids are fixed, so the server ignores repeats.
"""
import argparse, json, random, urllib.request, uuid
from datetime import datetime, timedelta, timezone

SKILLS = ["peer", "conflict", "emotion", "responsible"]
FEELINGS = ["great", "good", "okay", "down", "stress"]
RATINGS = ["best", "ok", "rough"]

def call(url, method, path, token, body):
    req = urllib.request.Request(url + path, method=method, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "Authorization": "Bearer " + token} if token else {"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:8787")
    ap.add_argument("--ops-token", required=True)
    a = ap.parse_args()
    rng = random.Random(7)
    ids_a = ["demo%02d" % i for i in range(1, 14)]
    ids_b = ["demo%02d" % i for i in range(14, 18)]
    ids_c = ["demo%02d" % i for i in range(18, 30)]
    group_of = lambda sid: "Group A" if sid in ids_a or sid == "tester" else "Group B" if sid in ids_b else "Group C"
    roster = [{"studentId": s, "org": "Test Org", "site": "Test Site", "group": group_of(s), "consent": True} for s in ids_a + ["tester"] + ids_b + ids_c]
    print("roster:", call(a.url, "PUT", "/roster", a.ops_token, {"students": roster}))

    now = datetime.now(timezone.utc)
    events = []
    def ev(sid, day, minute, typ, session, **data):
        at = (now - timedelta(days=day, minutes=minute)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
        key = "%s|%s|%s|%s|%s" % (sid, day, minute, typ, json.dumps(data, sort_keys=True))
        events.append({"eventId": str(uuid.uuid5(uuid.NAMESPACE_URL, "ff-demo/" + key)), "studentId": sid, "org": "Test Org",
                       "site": "Test Site", "group": group_of(sid), "type": typ, "at": at, "sessionId": session, **data})
    for sid in ids_a + ids_b + ids_c:
        for day in rng.sample(range(0, 21), 5):
            sess = "%s-d%d" % (sid, day)
            ev(sid, day, 60, "session_start", sess)
            ev(sid, day, 59, "checkin", sess, phase="start", feeling=rng.choice(FEELINGS), reason="x")
            for page in rng.sample(["fight_forward", "impact_lab", "ring", "coaching_corner"], 2):
                ev(sid, day, 58, "page_view", sess, page=page)
            skill = rng.choice(SKILLS)
            for n in range(2):
                mid = "demo-module-%d" % rng.randint(1, 6)
                ev(sid, day, 50 - n * 5, "module_open", sess, moduleId=mid, moduleType="scenario", skill=skill, attempt=1)
                ev(sid, day, 49 - n * 5, "decision", sess, moduleId=mid, moduleType="scenario", skill=skill, rating=rng.choices(RATINGS, [3 + (21 - day) / 7, 3, 2])[0], attempt=1)
                ev(sid, day, 48 - n * 5, "module_complete", sess, moduleId=mid, moduleType="scenario", skill=skill, attempt=1, durationMs=60000)
            if rng.random() < 0.6:
                done = rng.random() < 0.75
                ev(sid, day, 30, "workout_start", sess, workoutId="cardio-starter", kind=rng.choice(["Cardio", "Boxing basics"]), level="Starter", plannedSecs=410)
                ev(sid, day, 24, "workout_end", sess, workoutId="cardio-starter", completed=done, reason="finished" if done else "left", secs=410 if done else 120)
            if rng.random() < 0.35:
                ev(sid, day, 20, "ring_enter", sess, topic="Communication")
                ev(sid, day, 19, "facilitate_start", sess, topic="Communication")
                ev(sid, day, 18, "question_introduced", sess, topic="Communication", source=rng.choice(["picked", "written"]))
                ev(sid, day, 17, "invite_sent", sess, topic="Communication")
                ev(sid, day, 15, "facilitate_end", sess, topic="Communication", secs=240, questions=1, invitations=1, reason="stopped")
            ev(sid, day, 5, "checkin", sess, phase="end", feeling=rng.choice(FEELINGS[:3]), reason="y")
            ev(sid, day, 4, "session_end", sess, reason="signout", durationMs=3300000, endCheckin=True)
    for i in range(0, len(events), 400):
        print("events:", call(a.url, "POST", "/events", None, {"events": events[i:i + 400]}))
    print("Loaded synthetic data for %d demo students (demo01-demo29). Delete each with DELETE /students/<id> (ops token)." % len(ids_a + ids_b + ids_c))

if __name__ == "__main__":
    main()
