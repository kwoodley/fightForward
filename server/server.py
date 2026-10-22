#!/usr/bin/env python3
"""Reference events endpoint for Fight Forward Academy. Standard library only.

  python3 server/server.py            # listens on :8787, stores in server/events.db

POST /events  { "events": [ {eventId, studentId, type, at, sessionId, ...}, ... ] }
  -> 200 { "accepted": n, "duplicates": n }   (repeat eventIds are ignored, so retries are safe)
  -> 400 if the body or any event is malformed (nothing from the batch is stored)
GET  /health  -> 200 { "ok": true }

Staff sign-in (accounts are made with server/staff.py; see auth.py for roles and lockout):
POST   /auth/login      { "username", "password" } -> { token, expiresAt, user }   (401 for any failure)
GET    /auth/me         current staff member
POST   /auth/logout
Reading needs  Authorization: Bearer <staff token>  and is limited to the person's org/site/group scope:
GET    /api/scopes      org > site > group tree with enrolled counts (hidden groups have null)
GET    /api/aggregate   ?org=&site=&group=&from=&to=  group totals only, small groups suppressed (default: last 30 days)

Provisioning needs  Authorization: Bearer $FF_ADMIN_TOKEN  (the ops token; with none set these are refused):
PUT    /roster          { "students": [ {studentId, org, site, group, grade, status, consent, enrolledAt}, ... ] }  upsert
DELETE /students/<id>   removes the student's roster row and every event
Every admin call is written to the audit table.

This is a development stand-in. Before real students use it, it still needs: authentication per site/org,
guardian-consent checks, HTTPS, retention rules, audit logging and role-based read APIs (see docs/data-events.md).
"""
import hmac, json, os, sqlite3, sys
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import aggregate
import auth

DB = os.environ.get("FF_DB", os.path.join(os.path.dirname(os.path.abspath(__file__)), "events.db"))
PORT = int(os.environ.get("PORT", "8787"))
ORIGIN = os.environ.get("FF_ALLOW_ORIGIN", "*")   # set to the site's origin outside development
ADMIN_TOKEN = os.environ.get("FF_ADMIN_TOKEN", "")
MIN_GROUP = int(os.environ.get("FF_MIN_GROUP", "10"))        # smallest group a figure may describe
REQUIRE_CONSENT = os.environ.get("FF_REQUIRE_CONSENT") == "1"  # only keep events from students with consent on the roster
STATUSES = {"active", "inactive", "withdrawn"}
MAX_BODY = 1_000_000
MAX_BATCH = 500
MAX_EVENT = 4096
# Only these event types are accepted. Safety messages and free text are deliberately not here.
TYPES = {"session_start", "session_end", "checkin", "module_open", "module_complete", "decision", "workout_start", "workout_end",
         "page_view", "ring_enter", "ring_leave", "ring_post", "facilitate_start", "facilitate_end", "question_introduced", "invite_sent"}
REQUIRED = ("eventId", "studentId", "type", "at", "sessionId")
COLUMNS = ("eventId", "studentId", "org", "site", "group", "type", "at", "sessionId")

def connect():
    db = sqlite3.connect(DB)
    db.execute("""CREATE TABLE IF NOT EXISTS events (
        event_id TEXT PRIMARY KEY, student_id TEXT NOT NULL, org TEXT, site TEXT, group_name TEXT,
        type TEXT NOT NULL, at TEXT NOT NULL, session_id TEXT NOT NULL, payload TEXT NOT NULL,
        received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)""")
    db.execute("""CREATE TABLE IF NOT EXISTS roster (
        student_id TEXT PRIMARY KEY, org TEXT NOT NULL DEFAULT '', site TEXT NOT NULL DEFAULT '', group_name TEXT NOT NULL DEFAULT '',
        grade TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active', consent INTEGER NOT NULL DEFAULT 0, enrolled_at TEXT NOT NULL DEFAULT '')""")
    db.execute("""CREATE TABLE IF NOT EXISTS audit (
        at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, action TEXT NOT NULL, detail TEXT NOT NULL, actor TEXT NOT NULL DEFAULT '')""")
    try:
        db.execute("ALTER TABLE audit ADD COLUMN actor TEXT NOT NULL DEFAULT ''")   # databases made before staff sign-in
    except sqlite3.OperationalError:
        pass
    auth.init(db)
    db.execute("CREATE INDEX IF NOT EXISTS events_student ON events (student_id, at)")
    db.execute("CREATE INDEX IF NOT EXISTS events_org ON events (org, site, group_name, type, at)")
    return db

def validate(batch):
    if not isinstance(batch, list) or not batch or len(batch) > MAX_BATCH:
        return "events must be a list of 1 to %d" % MAX_BATCH
    for e in batch:
        if not isinstance(e, dict):
            return "each event must be an object"
        if any(not isinstance(e.get(k), str) or not e[k] for k in REQUIRED):
            return "each event needs " + ", ".join(REQUIRED)
        if e["type"] not in TYPES:
            return "unknown event type: %s" % e["type"][:40]
        if len(json.dumps(e)) > MAX_EVENT:
            return "event too large"
    return None

def validate_roster(students):
    if not isinstance(students, list) or not students or len(students) > MAX_BATCH:
        return "students must be a list of 1 to %d" % MAX_BATCH
    for s in students:
        if not isinstance(s, dict) or not isinstance(s.get("studentId"), str) or not s["studentId"]:
            return "each student needs a studentId"
        if any(not isinstance(s.get(k, ""), str) or len(s.get(k, "")) > 80 for k in ("org", "site", "group", "grade", "enrolledAt")):
            return "org, site, group, grade, enrolledAt must be short strings"
        if s.get("status", "active") not in STATUSES:
            return "status must be one of " + ", ".join(sorted(STATUSES))
        if not isinstance(s.get("consent", False), bool):
            return "consent must be true or false"
    return None

def audit(db, action, detail, actor="ops"):
    with db:
        db.execute("INSERT INTO audit (action, detail, actor) VALUES (?, ?, ?)", (action, json.dumps(detail), actor))

def store(db, batch):
    """Returns (accepted, skipped). Skipped = no consent on file (when required). The client treats both as delivered."""
    accepted = skipped = 0
    consented = None
    if REQUIRE_CONSENT:
        consented = {r[0] for r in db.execute("SELECT student_id FROM roster WHERE consent = 1")}
    with db:
        for e in batch:
            if consented is not None and e["studentId"] not in consented:
                skipped += 1
                continue
            payload = {k: v for k, v in e.items() if k not in COLUMNS}
            cur = db.execute(
                "INSERT OR IGNORE INTO events (event_id, student_id, org, site, group_name, type, at, session_id, payload) VALUES (?,?,?,?,?,?,?,?,?)",
                (e["eventId"], e["studentId"], e.get("org") or "", e.get("site") or "", e.get("group") or "",
                 e["type"], e["at"], e["sessionId"], json.dumps(payload)))
            accepted += cur.rowcount
    return accepted, skipped

class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body=None):
        data = json.dumps(body if body is not None else {}).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", ORIGIN)
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def _bearer(self):
        header = self.headers.get("Authorization", "")
        return header[7:] if header.startswith("Bearer ") else ""

    def _admin(self):
        """True if the request carries the ops token (provisioning). Sends the refusal itself otherwise."""
        if ADMIN_TOKEN and hmac.compare_digest(self._bearer(), ADMIN_TOKEN):
            return True
        self._send(401, {"error": "ops token required"})
        return False

    def _staff(self, db, view=True):
        """The signed-in staff member, or None after sending the refusal. `view` also requires a role that may see analytics."""
        who = auth.resolve(db, self._bearer())
        if not who:
            self._send(401, {"error": "sign in required"})
            return None
        if view and who["role"] not in auth.VIEW_ROLES:
            self._send(403, {"error": "this role does not see analytics"})
            return None
        return who

    def _json_body(self, key=None):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY:
            self._send(400, {"error": "bad body size"})
            return None
        try:
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict):
                raise ValueError
            return data if key is None else data.get(key)
        except ValueError:
            self._send(400, {"error": "invalid JSON"})
            return None

    def _login(self):
        data = self._json_body()
        if data is None:
            return
        username, password = data.get("username"), data.get("password")
        failed = {"error": "Sign in failed. Check your details, or wait a few minutes if you have tried several times."}
        if not isinstance(username, str) or not isinstance(password, str) or len(username) > 80 or len(password) > 200:
            return self._send(401, failed)
        db = connect()
        try:
            result = auth.login(db, username, password)
            if not result:
                audit(db, "sign_in_failed", {"username": username.strip().lower()[:80]}, "")
                return self._send(401, failed)
            token, expires, who = result
            audit(db, "sign_in", {"role": who["role"]}, who["username"])
            self._send(200, {"token": token, "expiresAt": expires, "user": who})
        finally:
            db.close()

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/health":
            return self._send(200, {"ok": True})
        if url.path not in ("/auth/me", "/api/scopes", "/api/aggregate"):
            return self._send(404, {"error": "not found"})
        db = connect()
        try:
            who = self._staff(db, view=url.path != "/auth/me")
            if not who:
                return
            if url.path == "/auth/me":
                return self._send(200, {"user": who})
            if url.path == "/api/scopes":
                audit(db, "scopes_view", {}, who["username"])
                return self._send(200, aggregate.scopes(db, MIN_GROUP, who))
            qs = {k: v[0] for k, v in parse_qs(url.query).items()}
            try:
                end = aggregate.parse(qs["to"]) if qs.get("to") else datetime.now(timezone.utc)
                start = aggregate.parse(qs["from"]) if qs.get("from") else end - timedelta(days=30)
            except ValueError:
                return self._send(400, {"error": "from and to must be ISO dates"})
            if start >= end:
                return self._send(400, {"error": "from must be before to"})
            scope = auth.clamp_scope(who, {k: qs.get(k, "") for k in ("org", "site", "group")})
            if scope is None:
                audit(db, "aggregate_denied", {"asked": {k: qs.get(k, "") for k in ("org", "site", "group")}, "role": who["role"]}, who["username"])
                return self._send(403, {"error": "outside your scope"})
            audit(db, "aggregate_view", {"scope": scope, "from": qs.get("from"), "to": qs.get("to")}, who["username"])
            self._send(200, aggregate.aggregate(db, scope, start, end, MIN_GROUP))
        finally:
            db.close()

    def do_PUT(self):
        if self.path != "/roster":
            return self._send(404, {"error": "not found"})
        if not self._admin():
            return
        students = self._json_body("students")
        if students is None:
            return
        problem = validate_roster(students)
        if problem:
            return self._send(400, {"error": problem})
        db = connect()
        try:
            with db:
                for s in students:
                    db.execute("""INSERT INTO roster (student_id, org, site, group_name, grade, status, consent, enrolled_at)
                        VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(student_id) DO UPDATE SET org=excluded.org, site=excluded.site,
                        group_name=excluded.group_name, grade=excluded.grade, status=excluded.status, consent=excluded.consent,
                        enrolled_at=excluded.enrolled_at""",
                        (s["studentId"], s.get("org", ""), s.get("site", ""), s.get("group", ""), s.get("grade", ""),
                         s.get("status", "active"), int(s.get("consent", False)), s.get("enrolledAt", "")))
            audit(db, "roster_update", {"students": len(students)})
        finally:
            db.close()
        self._send(200, {"updated": len(students)})

    def do_DELETE(self):
        path = urlparse(self.path).path
        if not path.startswith("/students/") or len(path) <= len("/students/"):
            return self._send(404, {"error": "not found"})
        if not self._admin():
            return
        student = unquote(path[len("/students/"):])
        db = connect()
        try:
            with db:
                events = db.execute("DELETE FROM events WHERE student_id = ?", (student,)).rowcount
                roster = db.execute("DELETE FROM roster WHERE student_id = ?", (student,)).rowcount
            audit(db, "student_deleted", {"studentId": student, "events": events, "roster": roster})
        finally:
            db.close()
        self._send(200, {"events": events, "roster": roster})

    def do_POST(self):
        if self.path == "/auth/login":
            return self._login()
        if self.path == "/auth/logout":
            db = connect()
            try:
                who = auth.resolve(db, self._bearer())
                auth.logout(db, self._bearer())
                if who:
                    audit(db, "sign_out", {}, who["username"])
            finally:
                db.close()
            return self._send(200, {"ok": True})
        if self.path != "/events":
            return self._send(404, {"error": "not found"})
        events = self._json_body("events")
        if events is None:
            return
        problem = validate(events)
        if problem:
            return self._send(400, {"error": problem})
        db = connect()
        try:
            accepted, skipped = store(db, events)
        finally:
            db.close()
        self._send(200, {"accepted": accepted, "skipped": skipped, "duplicates": len(events) - accepted - skipped})

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))

if __name__ == "__main__":
    connect().close()
    print("Fight Forward events server on http://localhost:%d (db: %s)" % (PORT, DB))
    ThreadingHTTPServer(("", PORT), Handler).serve_forever()
