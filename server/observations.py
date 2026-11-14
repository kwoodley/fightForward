"""Mentor observations: what an adult saw a student do during a leadership challenge.

Rules (from the product concept doc and the Ring planning docs):
  - Only the `mentor` role can write or read observations, and only for active students with guardian consent on the roster
    in the mentor's own org, site and group. Everything is written to the audit log.
  - An observation is about one skill and a level at one point in time. It is not a grade, a label or a prediction.
    "Not observed" is stored as level 0 and is never a low score.
  - The free-text note stays in this table. It never enters events or aggregates and is never sent to the student's browser
    (students have no sign-in yet; see the student identity blocker in CLAUDE.md).
  - Safety concerns do not go here. They follow the school's safeguarding procedure.
"""
import json
from auth import now, stamp

COMPETENCIES = {"self_awareness", "responsibility", "self_discipline", "communication", "empathy", "inclusion", "teamwork", "conflict",
                "initiative", "decisions", "creativity", "adaptability", "integrity", "service", "vision"}
CHALLENGES = {"lead_discussion", "service_project", "welcome", "team_assignment", "school_idea", "mediation", "other"}
ASSISTANCE = {"alone", "some", "lots"}
MAX_NOTE = 500

def init(db):
    db.execute("""CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT, student_id TEXT NOT NULL, competency TEXT NOT NULL, level INTEGER NOT NULL,
        assistance TEXT NOT NULL DEFAULT '', challenge TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '',
        observer TEXT NOT NULL, at TEXT NOT NULL)""")
    db.execute("CREATE INDEX IF NOT EXISTS obs_student ON observations (student_id, at)")

def in_scope(staff):
    """SQL (and args) for the consented, active roster students this mentor may observe."""
    where, args = ["status = 'active'", "consent = 1"], []
    for key, col in (("org", "org"), ("site", "site"), ("group", "group_name")):
        where.append("%s = ?" % col); args.append(staff[key])
    return " AND ".join(where), args

def students(db, staff):
    where, args = in_scope(staff)
    return [r[0] for r in db.execute("SELECT student_id FROM roster WHERE %s ORDER BY student_id" % where, args)]

def validate(data):
    if not isinstance(data, dict) or not isinstance(data.get("studentId"), str) or not data["studentId"]:
        return "studentId is required"
    if data.get("competency") not in COMPETENCIES:
        return "competency must be one of the 15 leadership competencies"
    if data.get("level") not in (0, 1, 2, 3, 4) or isinstance(data.get("level"), bool):
        return "level must be 0 (not observed) to 4"
    if data.get("level") and data.get("assistance") not in ASSISTANCE:
        return "assistance must be alone, some or lots"
    if data.get("challenge", "other") not in CHALLENGES:
        return "unknown challenge"
    note = data.get("note", "")
    if not isinstance(note, str) or len(note) > MAX_NOTE:
        return "note must be text of at most %d characters" % MAX_NOTE
    return None

def add(db, staff, data):
    """Returns (id, error). error is 'scope' when the student is not one this mentor may observe."""
    where, args = in_scope(staff)
    if not db.execute("SELECT 1 FROM roster WHERE student_id = ? AND %s" % where, [data["studentId"], *args]).fetchone():
        return None, "scope"
    with db:
        cur = db.execute("INSERT INTO observations (student_id, competency, level, assistance, challenge, note, observer, at) VALUES (?,?,?,?,?,?,?,?)",
                         (data["studentId"], data["competency"], data["level"], data.get("assistance", "") if data["level"] else "",
                          data.get("challenge", "other"), data.get("note", "").strip(), staff["username"], stamp(now())))
    return cur.lastrowid, None

def listing(db, staff, student_id):
    where, args = in_scope(staff)
    if not db.execute("SELECT 1 FROM roster WHERE student_id = ? AND %s" % where, [student_id, *args]).fetchone():
        return None
    rows = db.execute("SELECT id, competency, level, assistance, challenge, note, observer, at FROM observations WHERE student_id = ? ORDER BY at DESC LIMIT 100", (student_id,))
    keys = ("id", "competency", "level", "assistance", "challenge", "note", "observer", "at")
    return [dict(zip(keys, r)) for r in rows]

def remove(db, staff, obs_id):
    """A mentor may delete an observation they wrote, for a student still in their scope."""
    where, args = in_scope(staff)
    with db:
        return db.execute("DELETE FROM observations WHERE id = ? AND observer = ? AND student_id IN (SELECT student_id FROM roster WHERE %s)" % where,
                          [obs_id, staff["username"], *args]).rowcount
