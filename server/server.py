#!/usr/bin/env python3
"""Reference events endpoint for Fight Forward Academy. Standard library only.

  python3 server/server.py            # listens on :8787, stores in server/events.db

POST /events  { "events": [ {eventId, studentId, type, at, sessionId, ...}, ... ] }
  -> 200 { "accepted": n, "duplicates": n }   (repeat eventIds are ignored, so retries are safe)
  -> 400 if the body or any event is malformed (nothing from the batch is stored)
GET  /health  -> 200 { "ok": true }

This is a development stand-in. Before real students use it, it still needs: authentication per site/org,
guardian-consent checks, HTTPS, retention rules, audit logging and role-based read APIs (see docs/data-events.md).
"""
import json, os, sqlite3, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DB = os.environ.get("FF_DB", os.path.join(os.path.dirname(os.path.abspath(__file__)), "events.db"))
PORT = int(os.environ.get("PORT", "8787"))
ORIGIN = os.environ.get("FF_ALLOW_ORIGIN", "*")   # set to the site's origin outside development
MAX_BODY = 1_000_000
MAX_BATCH = 500
MAX_EVENT = 4096
# Only these event types are accepted. Safety messages and free text are deliberately not here.
TYPES = {"session_start", "session_end", "checkin", "module_open", "module_complete", "decision"}
REQUIRED = ("eventId", "studentId", "type", "at", "sessionId")
COLUMNS = ("eventId", "studentId", "org", "site", "group", "type", "at", "sessionId")

def connect():
    db = sqlite3.connect(DB)
    db.execute("""CREATE TABLE IF NOT EXISTS events (
        event_id TEXT PRIMARY KEY, student_id TEXT NOT NULL, org TEXT, site TEXT, group_name TEXT,
        type TEXT NOT NULL, at TEXT NOT NULL, session_id TEXT NOT NULL, payload TEXT NOT NULL,
        received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)""")
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

def store(db, batch):
    accepted = 0
    with db:
        for e in batch:
            payload = {k: v for k, v in e.items() if k not in COLUMNS}
            cur = db.execute(
                "INSERT OR IGNORE INTO events (event_id, student_id, org, site, group_name, type, at, session_id, payload) VALUES (?,?,?,?,?,?,?,?,?)",
                (e["eventId"], e["studentId"], e.get("org") or "", e.get("site") or "", e.get("group") or "",
                 e["type"], e["at"], e["sessionId"], json.dumps(payload)))
            accepted += cur.rowcount
    return accepted

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
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def do_GET(self):
        self._send(200, {"ok": True}) if self.path == "/health" else self._send(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/events":
            return self._send(404, {"error": "not found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY:
            return self._send(400, {"error": "bad body size"})
        try:
            events = json.loads(self.rfile.read(length)).get("events")
        except (ValueError, AttributeError):
            return self._send(400, {"error": "invalid JSON"})
        problem = validate(events)
        if problem:
            return self._send(400, {"error": problem})
        db = connect()
        try:
            accepted = store(db, events)
        finally:
            db.close()
        self._send(200, {"accepted": accepted, "duplicates": len(events) - accepted})

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))

if __name__ == "__main__":
    connect().close()
    print("Fight Forward events server on http://localhost:%d (db: %s)" % (PORT, DB))
    ThreadingHTTPServer(("", PORT), Handler).serve_forever()
