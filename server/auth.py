"""Staff sign-in, sessions and role scope for the Fight Forward dev server. Standard library only.

Roles (scope = the org, site and group a person is limited to):
  ff_staff      Fight Forward staff       no scope: any organization
  org_admin     organization admin        org
  site_lead     site lead                 org + site
  mentor        mentor / coach            org + site + group
  safety_adult  authorized safety adult   may sign in, but sees no analytics (safety messages are a separate path)

Passwords are stored as salted PBKDF2-SHA256. Session tokens are random and only their hash is stored.
Five wrong passwords lock the account for 15 minutes. Failed and locked sign-ins get the same answer.
Create accounts with:  python3 server/staff.py add --username ... --role ...
"""
import base64, hashlib, hmac, os, secrets
from datetime import datetime, timedelta, timezone

ROLES = {
    "ff_staff": (), "org_admin": ("org",), "site_lead": ("org", "site"),
    "mentor": ("org", "site", "group"), "safety_adult": (),
}
VIEW_ROLES = set(ROLES) - {"safety_adult"}
SESSION_HOURS = 8
MAX_FAILS = 5
LOCK_MINUTES = 15
MIN_PASSWORD = 10
ITERATIONS = 600_000

def now():
    return datetime.now(timezone.utc)

def stamp(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def _b64(b):
    return base64.b64encode(b).decode()

def hash_password(password, iterations=ITERATIONS):
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    return "pbkdf2_sha256$%d$%s$%s" % (iterations, _b64(salt), _b64(digest))

def verify_password(password, stored):
    try:
        scheme, iterations, salt, digest = stored.split("$")
        if scheme != "pbkdf2_sha256":
            return False
        check = hashlib.pbkdf2_hmac("sha256", password.encode(), base64.b64decode(salt), int(iterations))
        return hmac.compare_digest(check, base64.b64decode(digest))
    except (ValueError, TypeError):
        return False

# Checked when the username does not exist, so a miss takes as long as a real attempt.
_DUMMY = hash_password("not-a-real-password")

def init(db):
    db.execute("""CREATE TABLE IF NOT EXISTS staff (
        username TEXT PRIMARY KEY, display_name TEXT NOT NULL DEFAULT '', password_hash TEXT NOT NULL, role TEXT NOT NULL,
        org TEXT NOT NULL DEFAULT '', site TEXT NOT NULL DEFAULT '', group_name TEXT NOT NULL DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1, failed_count INTEGER NOT NULL DEFAULT 0, locked_until TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT '')""")
    db.execute("""CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY, username TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL)""")

def validate_account(role, org, site, group, password=None):
    if role not in ROLES:
        return "role must be one of " + ", ".join(sorted(ROLES))
    needs = ROLES[role]
    given = {"org": org, "site": site, "group": group}
    for k in needs:
        if not given[k]:
            return "%s needs %s" % (role, ", ".join(needs))
    if role in ("ff_staff",) and any(given.values()):
        return "ff_staff has no scope"
    if any(given[k] for k in given if k not in needs) and role != "safety_adult":
        return "%s is scoped to %s only" % (role, ", ".join(needs))
    if password is not None and len(password) < MIN_PASSWORD:
        return "password must be at least %d characters" % MIN_PASSWORD
    return None

def create_or_update(db, username, password, role, org="", site="", group="", display_name=""):
    problem = validate_account(role, org, site, group, password)
    if problem:
        raise ValueError(problem)
    with db:
        db.execute("""INSERT INTO staff (username, display_name, password_hash, role, org, site, group_name, created_at)
            VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(username) DO UPDATE SET display_name=excluded.display_name,
            password_hash=excluded.password_hash, role=excluded.role, org=excluded.org, site=excluded.site,
            group_name=excluded.group_name, active=1, failed_count=0, locked_until=''""",
            (username.lower(), display_name, hash_password(password), role, org, site, group, stamp(now())))
        db.execute("DELETE FROM sessions WHERE username = ?", (username.lower(),))

def profile(row):
    username, display, role, org, site, group = row
    return {"username": username, "name": display or username, "role": role, "org": org, "site": site, "group": group}

def login(db, username, password):
    """Returns (token, expires_at, profile) or None. Failed and locked attempts look the same."""
    username = (username or "").strip().lower()
    row = db.execute("SELECT username, display_name, role, org, site, group_name, password_hash, active, failed_count, locked_until FROM staff WHERE username = ?",
                     (username,)).fetchone()
    if not row:
        verify_password(password or "", _DUMMY)
        return None
    *who, stored, active, fails, locked_until = row
    if not active or (locked_until and locked_until > stamp(now())):
        verify_password(password or "", _DUMMY)
        return None
    if not verify_password(password or "", stored):
        fails += 1
        with db:
            if fails >= MAX_FAILS:
                db.execute("UPDATE staff SET failed_count = 0, locked_until = ? WHERE username = ?",
                           (stamp(now() + timedelta(minutes=LOCK_MINUTES)), username))
            else:
                db.execute("UPDATE staff SET failed_count = ? WHERE username = ?", (fails, username))
        return None
    token = secrets.token_urlsafe(32)
    expires = stamp(now() + timedelta(hours=SESSION_HOURS))
    with db:
        db.execute("UPDATE staff SET failed_count = 0, locked_until = '' WHERE username = ?", (username,))
        db.execute("DELETE FROM sessions WHERE expires_at < ?", (stamp(now()),))
        db.execute("INSERT INTO sessions (token_hash, username, created_at, expires_at) VALUES (?,?,?,?)",
                   (hashlib.sha256(token.encode()).hexdigest(), username, stamp(now()), expires))
    return token, expires, profile(who)

def resolve(db, token):
    """The signed-in staff member for a session token, or None."""
    if not token:
        return None
    row = db.execute("""SELECT s.username, s.display_name, s.role, s.org, s.site, s.group_name FROM sessions t
        JOIN staff s ON s.username = t.username WHERE t.token_hash = ? AND t.expires_at > ? AND s.active = 1""",
        (hashlib.sha256(token.encode()).hexdigest(), stamp(now()))).fetchone()
    return profile(row) if row else None

def logout(db, token):
    with db:
        db.execute("DELETE FROM sessions WHERE token_hash = ?", (hashlib.sha256((token or "").encode()).hexdigest(),))

def clamp_scope(staff, requested):
    """The scope to query: what was asked for, filled in from the staff member's own scope.
    None if it asks for anything outside that scope."""
    out = {k: requested.get(k, "") for k in ("org", "site", "group")}
    for k in out:
        own = staff[k]
        if own:
            if out[k] and out[k] != own:
                return None
            out[k] = own
    return out
