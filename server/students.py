"""Issue and manage student logins (run on the server, like staff.py).

  python3 server/students.py issue --org "Eastside" --site "Rec Center" --group "Group A" --count 3 --consent
  python3 server/students.py issue --org ... --site ... --group ... --names "Ana,Bo,Cy"   (first names for the greeting only)
  python3 server/students.py list [--group "Group A"]      (ids and status only; join codes and PINs cannot be read back)
  python3 server/students.py reset-pin --id s4k2...         (prints a new PIN once)
  python3 server/students.py unlock|disable|enable --id s4k2...

`issue` prints one card per student: join code and PIN. The PIN is shown once and stored only as a hash. Hand the cards out in
person, keep no copy, and issue a new PIN if one is lost. Use FF_DB to pick the database, as with staff.py.
"""
import argparse, sys
import auth, server, studentauth

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("action", choices=["issue", "list", "reset-pin", "unlock", "disable", "enable"])
    ap.add_argument("--org", default=""); ap.add_argument("--site", default=""); ap.add_argument("--group", default="")
    ap.add_argument("--grade", default=""); ap.add_argument("--count", type=int, default=1)
    ap.add_argument("--names", default="", help="comma-separated first names (optional, greeting only)")
    ap.add_argument("--consent", action="store_true", help="guardian consent is on file")
    ap.add_argument("--id")
    a = ap.parse_args()
    db = server.connect()
    try:
        if a.action == "issue":
            if not (a.org and a.site and a.group):
                sys.exit("--org, --site and --group are required")
            names = [n.strip() for n in a.names.split(",") if n.strip()]
            count = len(names) or a.count
            if not 1 <= count <= 200:
                sys.exit("--count must be 1 to 200")
            print("%-14s %-11s %s" % ("ID (internal)", "JOIN CODE", "PIN"))
            for i in range(count):
                sid, code, pin = studentauth.issue(db, a.org, a.site, a.group, a.grade, names[i] if names else "", a.consent)
                print("%-14s %-11s %s%s" % (sid, code, pin, "   " + names[i] if names else ""))
            server.audit(db, "students_issued", {"count": count, "org": a.org, "site": a.site, "group": a.group, "consent": a.consent}, actor="ops")
            print("\nThe PINs are shown once. Hand out the cards, keep no copy.")
            return
        if a.action == "list":
            q, args = "SELECT l.student_id, r.org, r.site, r.group_name, r.consent, l.active, l.locked_until FROM student_login l JOIN roster r USING (student_id)", []
            if a.group:
                q += " WHERE r.group_name = ?"; args.append(a.group)
            for r in db.execute(q + " ORDER BY r.org, r.site, r.group_name, l.student_id", args):
                print("%-14s %s / %s / %s  consent=%s  %s%s" % (r[0], r[1], r[2], r[3], "yes" if r[4] else "NO", "active" if r[5] else "DISABLED",
                      "  locked until " + r[6] if r[6] > auth.stamp(auth.now()) else ""))
            return
        if not a.id:
            sys.exit("--id is required")
        if a.action == "reset-pin":
            pin = studentauth.reset_pin(db, a.id)
            if not pin:
                sys.exit("No such student.")
            print("New PIN (shown once):", pin)
        else:
            n = studentauth.unlock(db, a.id) if a.action == "unlock" else studentauth.set_active(db, a.id, a.action == "enable")
            if not n:
                sys.exit("No such student.")
            print("Done.")
        server.audit(db, "student_" + a.action.replace("-", "_"), {"studentId": a.id}, actor="ops")
    finally:
        db.close()

if __name__ == "__main__":
    main()
