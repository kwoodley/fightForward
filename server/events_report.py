#!/usr/bin/env python3
"""Read-only look at what the dev server has stored. For testing; opens the database directly.

  python3 server/events_report.py                        counts by event type, and by student
  python3 server/events_report.py --student tester       that student's events in time order
  python3 server/events_report.py --student tester --last-session   only their most recent visit
  python3 server/events_report.py --find "some text"     how many stored events contain this text (should be 0 for anything a student typed)
  python3 server/events_report.py --audit                recent audit-log rows

Database: $FF_DB, or server/events.db.
"""
import argparse, json, os, sqlite3

DB = os.environ.get("FF_DB", os.path.join(os.path.dirname(os.path.abspath(__file__)), "events.db"))
SKIP = {"eventId", "studentId", "org", "site", "group", "type", "at", "sessionId"}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--student")
    ap.add_argument("--last-session", action="store_true")
    ap.add_argument("--find")
    ap.add_argument("--audit", action="store_true")
    a = ap.parse_args()
    db = sqlite3.connect("file:%s?mode=ro" % DB, uri=True)
    if a.find:
        n = db.execute("SELECT COUNT(*) FROM events WHERE payload LIKE ? OR student_id LIKE ?", ("%" + a.find + "%",) * 2).fetchone()[0]
        print("%d stored events contain %r" % (n, a.find))
    elif a.audit:
        for at, action, actor, detail in db.execute("SELECT at, action, actor, detail FROM audit ORDER BY rowid DESC LIMIT 30"):
            print("%s  %-18s %-10s %s" % (at, action, actor or "-", detail[:90]))
    elif a.student:
        q, args = "SELECT at, type, session_id, payload FROM events WHERE student_id = ?", [a.student]
        if a.last_session:
            row = db.execute("SELECT session_id FROM events WHERE student_id = ? ORDER BY at DESC, rowid DESC LIMIT 1", args).fetchone()
            if not row:
                return print("No events for", a.student)
            q += " AND session_id = ?"; args.append(row[0])
        rows = db.execute(q + " ORDER BY at, rowid", args).fetchall()
        for at, typ, sess, payload in rows:
            detail = " ".join("%s=%s" % (k, v) for k, v in json.loads(payload).items() if k not in SKIP)
            print("%s  %-20s %s" % (at[11:23], typ, detail))
        print("-- %d events, %d session(s)" % (len(rows), len({r[2] for r in rows})))
    else:
        print("Events by type:")
        for typ, n in db.execute("SELECT type, COUNT(*) FROM events GROUP BY 1 ORDER BY 2 DESC"):
            print("  %-22s %d" % (typ, n))
        print("Students with events: %d   Roster rows: %d" % (db.execute("SELECT COUNT(DISTINCT student_id) FROM events").fetchone()[0],
                                                              db.execute("SELECT COUNT(*) FROM roster").fetchone()[0]))
if __name__ == "__main__":
    main()
