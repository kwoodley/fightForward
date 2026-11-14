"""Student identity: roster-issued opaque ids, a personal join code and a PIN.

Why: ids used to be made from first names, so two students could collide, anyone could type a classmate's name, and names ended up
in analytics. Now the roster (set up by Fight Forward or the school) issues each student:
  - an opaque id (`s` + 12 random characters) that carries no name and is the only id in events and reports,
  - a personal join code (like K7M2-9QXA) and a 6-digit PIN, handed out on a card. The PIN is stored only as a salted hash.
Signing in with the code and PIN returns a session token. Events sent with that token take their student id, org, site and group from
the roster, never from the browser, so one student cannot send events as another.
An optional first name (for the greeting) is kept in the login table, is returned only to that student, and never enters events,
aggregates or the audit log.
"""
import secrets
from datetime import timedelta
import hashlib
from auth import hash_password, verify_password, now, stamp, MAX_FAILS, LOCK_MINUTES

SESSION_HOURS = 8
CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"   # no 0/O, 1/I/L
_DUMMY = hash_password("000000")

def init(db):
    db.execute("""CREATE TABLE IF NOT EXISTS student_login (
        student_id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, pin_hash TEXT NOT NULL, display_name TEXT NOT NULL DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1, failed_count INTEGER NOT NULL DEFAULT 0, locked_until TEXT NOT NULL DEFAULT '')""")
    db.execute("""CREATE TABLE IF NOT EXISTS student_sessions (
        token_hash TEXT PRIMARY KEY, student_id TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL)""")

def normalize_code(code):
    return "".join(ch for ch in (code or "").upper() if ch.isalnum())

def _format(raw):
    return raw[:4] + "-" + raw[4:]

def _new_code(db):
    while True:
        raw = "".join(secrets.choice(CODE_ALPHABET) for _ in range(8))
        if not db.execute("SELECT 1 FROM student_login WHERE code = ?", (raw,)).fetchone():
            return raw

def _new_pin():
    return "%06d" % secrets.randbelow(1_000_000)

def issue(db, org, site, group, grade="", display_name="", consent=False):
    """Creates the roster row and the login. Returns (student_id, join_code, pin). The PIN cannot be read back later."""
    student_id = "s" + "".join(secrets.choice("abcdefghjkmnpqrstuvwxyz23456789") for _ in range(12))
    raw, pin = _new_code(db), _new_pin()
    with db:
        db.execute("""INSERT INTO roster (student_id, org, site, group_name, grade, status, consent, enrolled_at)
            VALUES (?,?,?,?,?,'active',?,?)""", (student_id, org, site, group, grade, int(consent), stamp(now())[:10]))
        db.execute("INSERT INTO student_login (student_id, code, pin_hash, display_name) VALUES (?,?,?,?)",
                   (student_id, raw, hash_password(pin), display_name.strip()[:20]))
    return student_id, _format(raw), pin

def reset_pin(db, student_id):
    pin = _new_pin()
    with db:
        n = db.execute("UPDATE student_login SET pin_hash = ?, failed_count = 0, locked_until = '' WHERE student_id = ?", (hash_password(pin), student_id)).rowcount
        db.execute("DELETE FROM student_sessions WHERE student_id = ?", (student_id,))
    return pin if n else None

def set_active(db, student_id, active):
    with db:
        n = db.execute("UPDATE student_login SET active = ?, failed_count = 0, locked_until = '' WHERE student_id = ?", (int(active), student_id)).rowcount
        if not active:
            db.execute("DELETE FROM student_sessions WHERE student_id = ?", (student_id,))
    return n

def unlock(db, student_id):
    with db:
        return db.execute("UPDATE student_login SET failed_count = 0, locked_until = '' WHERE student_id = ?", (student_id,)).rowcount

def login(db, code, pin):
    """Returns (token, expires_at, profile) or None. Unknown code, wrong PIN, locked and disabled all look the same."""
    raw = normalize_code(code)
    row = db.execute("""SELECT l.student_id, l.pin_hash, l.display_name, l.active, l.failed_count, l.locked_until, r.org, r.site, r.group_name, r.grade, r.status
        FROM student_login l JOIN roster r ON r.student_id = l.student_id WHERE l.code = ?""", (raw,)).fetchone()
    if not row:
        verify_password(pin or "", _DUMMY)
        return None
    sid, pin_hash, name, active, fails, locked_until, org, site, group, grade, status = row
    if not active or status != "active" or (locked_until and locked_until > stamp(now())):
        verify_password(pin or "", _DUMMY)
        return None
    if not verify_password(pin or "", pin_hash):
        fails += 1
        with db:
            if fails >= MAX_FAILS:
                db.execute("UPDATE student_login SET failed_count = 0, locked_until = ? WHERE student_id = ?",
                           (stamp(now() + timedelta(minutes=LOCK_MINUTES)), sid))
            else:
                db.execute("UPDATE student_login SET failed_count = ? WHERE student_id = ?", (fails, sid))
        return None
    token = secrets.token_urlsafe(32)
    expires = stamp(now() + timedelta(hours=SESSION_HOURS))
    with db:
        db.execute("UPDATE student_login SET failed_count = 0, locked_until = '' WHERE student_id = ?", (sid,))
        db.execute("DELETE FROM student_sessions WHERE expires_at < ?", (stamp(now()),))
        db.execute("INSERT INTO student_sessions (token_hash, student_id, created_at, expires_at) VALUES (?,?,?,?)",
                   (hashlib.sha256(token.encode()).hexdigest(), sid, stamp(now()), expires))
    return token, expires, {"id": sid, "name": name, "org": org, "site": site, "group": group, "grade": grade}

def resolve(db, token):
    """{id, org, site, group, consent} for a student session token, or None."""
    if not token:
        return None
    row = db.execute("""SELECT r.student_id, r.org, r.site, r.group_name, r.consent FROM student_sessions t
        JOIN student_login l ON l.student_id = t.student_id JOIN roster r ON r.student_id = t.student_id
        WHERE t.token_hash = ? AND t.expires_at > ? AND l.active = 1 AND r.status = 'active'""",
        (hashlib.sha256(token.encode()).hexdigest(), stamp(now()))).fetchone()
    return dict(zip(("id", "org", "site", "group", "consent"), row)) if row else None

def logout(db, token):
    with db:
        db.execute("DELETE FROM student_sessions WHERE token_hash = ?", (hashlib.sha256((token or "").encode()).hexdigest(),))
