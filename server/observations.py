"""Adult observations: what a mentor or teacher saw a student do during a leadership challenge.

Rules (from the product concept doc and the Ring planning docs):
  - Only the `mentor` and `teacher` roles can write or read observations (each recorded with its source), and only for active students with guardian consent on the roster
    in their own org, site and group. Everything is written to the audit log.
  - An observation is about one skill and a level at one point in time. It is not a grade, a label or a prediction.
    "Not observed" is stored as level 0 and is never a low score.
  - The free-text note stays in this table. It never enters events or aggregates and is never sent to the student's browser
    (students have no sign-in yet; see the student identity blocker in CLAUDE.md).
  - Safety concerns do not go here. They follow the school's safeguarding procedure.
"""
import json, sqlite3
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
        observer TEXT NOT NULL, at TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'mentor')""")
    try:
        db.execute("ALTER TABLE observations ADD COLUMN source TEXT NOT NULL DEFAULT 'mentor'")   # databases made before teacher accounts
    except sqlite3.OperationalError:
        pass
    db.execute("CREATE INDEX IF NOT EXISTS obs_student ON observations (student_id, at)")

def in_scope(staff, alias=""):
    """SQL (and args) for the consented, active roster students this mentor or teacher may see. `alias` prefixes the roster columns."""
    a = alias + "." if alias else ""
    where, args = ["%sstatus = 'active'" % a, "%sconsent = 1" % a], []
    for key, col in (("org", "org"), ("site", "site"), ("group", "group_name")):
        where.append("%s%s = ?" % (a, col)); args.append(staff[key])
    return " AND ".join(where), args

ROLES = {"mentor", "teacher"}

def students(db, staff):
    """The group's consented, active students with the first name used for the greeting (if any), for a role that may see it."""
    where, args = in_scope(staff, "r")
    rows = db.execute("""SELECT r.student_id, COALESCE(l.display_name, '') FROM roster r LEFT JOIN student_login l ON l.student_id = r.student_id
        WHERE %s ORDER BY 2, 1""" % where, args)
    return [{"id": r[0], "name": r[1]} for r in rows]

def overview(db, staff):
    """Per-student progress for the group, for the adult who works with them: counts and dates only. No levels, scores or labels."""
    people = students(db, staff)
    out = []
    for p in people:
        sid = p["id"]
        one = lambda sql: db.execute(sql, (sid,)).fetchone()[0]
        out.append({**p, "checkins": one("SELECT COUNT(*) FROM events WHERE student_id = ? AND type = 'leadership_check'"),
                    "plan": one("SELECT COUNT(*) FROM events WHERE student_id = ? AND type = 'growth_plan_set'") > 0,
                    "challenges": one("SELECT COUNT(*) FROM events WHERE student_id = ? AND type = 'challenge_done'"),
                    "observations": one("SELECT COUNT(*) FROM observations WHERE student_id = ? AND level > 0"),
                    "lastSeen": (one("SELECT MAX(at) FROM events WHERE student_id = ?") or "")[:10]})
    return out

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
        cur = db.execute("INSERT INTO observations (student_id, competency, level, assistance, challenge, note, observer, at, source) VALUES (?,?,?,?,?,?,?,?,?)",
                         (data["studentId"], data["competency"], data["level"], data.get("assistance", "") if data["level"] else "",
                          data.get("challenge", "other"), data.get("note", "").strip(), staff["username"], stamp(now()), staff["role"]))
    return cur.lastrowid, None

def listing(db, staff, student_id):
    where, args = in_scope(staff)
    if not db.execute("SELECT 1 FROM roster WHERE student_id = ? AND %s" % where, [student_id, *args]).fetchone():
        return None
    rows = db.execute("SELECT id, competency, level, assistance, challenge, note, observer, at, source FROM observations WHERE student_id = ? ORDER BY at DESC LIMIT 100", (student_id,))
    keys = ("id", "competency", "level", "assistance", "challenge", "note", "observer", "at", "source")
    return [dict(zip(keys, r)) for r in rows]

def remove(db, staff, obs_id):
    """A mentor may delete an observation they wrote, for a student still in their scope."""
    where, args = in_scope(staff)
    with db:
        return db.execute("DELETE FROM observations WHERE id = ? AND observer = ? AND student_id IN (SELECT student_id FROM roster WHERE %s)" % where,
                          [obs_id, staff["username"], *args]).rowcount
