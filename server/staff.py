#!/usr/bin/env python3
"""Manage staff accounts for the Fight Forward dev server (run on the server; it opens the database directly).

  python3 server/staff.py add --username maria --role site_lead --org Eastside --site "Rec Center" --name "Maria R."
  python3 server/staff.py list
  python3 server/staff.py passwd --username maria
  python3 server/staff.py disable --username maria     (also ends their sessions)
  python3 server/staff.py enable --username maria
  python3 server/staff.py unlock --username maria

The password is asked for at the prompt. FF_STAFF_PASSWORD can supply it for scripts and tests.
"""
import argparse, getpass, os, sqlite3, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import auth
import server

def password():
    pw = os.environ.get("FF_STAFF_PASSWORD")
    if pw:
        return pw
    first = getpass.getpass("Password: ")
    if first != getpass.getpass("Again: "):
        sys.exit("Passwords do not match.")
    return first

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("action", choices=["add", "list", "passwd", "disable", "enable", "unlock"])
    ap.add_argument("--username")
    ap.add_argument("--role")
    ap.add_argument("--org", default="")
    ap.add_argument("--site", default="")
    ap.add_argument("--group", default="")
    ap.add_argument("--name", default="")
    a = ap.parse_args()
    db = server.connect()
    try:
        if a.action == "list":
            for r in db.execute("SELECT username, role, org, site, group_name, active, locked_until FROM staff ORDER BY username"):
                print("%-16s %-13s %s / %s / %s  %s%s" % (r[0], r[1], r[2] or "*", r[3] or "*", r[4] or "*",
                      "active" if r[5] else "DISABLED", "  locked until " + r[6] if r[6] > auth.stamp(auth.now()) else ""))
            return
        if not a.username:
            sys.exit("--username is required")
        user = a.username.lower()
        if a.action == "add":
            if not a.role:
                sys.exit("--role is required")
            try:
                auth.create_or_update(db, user, password(), a.role, a.org, a.site, a.group, a.name)
            except ValueError as e:
                sys.exit(str(e))
        elif a.action == "passwd":
            row = db.execute("SELECT role, org, site, group_name, display_name FROM staff WHERE username = ?", (user,)).fetchone()
            if not row:
                sys.exit("No such account.")
            auth.create_or_update(db, user, password(), row[0], row[1], row[2], row[3], row[4])
        else:
            with db:
                n = db.execute("UPDATE staff SET active = ?, failed_count = 0, locked_until = '' WHERE username = ?",
                               (0 if a.action == "disable" else 1, user)).rowcount if a.action != "unlock" else \
                    db.execute("UPDATE staff SET failed_count = 0, locked_until = '' WHERE username = ?", (user,)).rowcount
                if a.action == "disable":
                    db.execute("DELETE FROM sessions WHERE username = ?", (user,))
            if not n:
                sys.exit("No such account.")
        server.audit(db, "staff_" + a.action, {"username": user}, actor="ops")
        print("Done.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
