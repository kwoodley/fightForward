"""Aggregate numbers for the Youth Impact Dashboard. Group totals only; never per-student output.

Rules (from the product concept doc):
  - Only students on the roster with status "active" are counted, scoped by org, site and group.
  - Any figure built from fewer than MIN_GROUP students is suppressed, and a whole scope smaller than that is hidden.
  - Skill growth is a trend against the previous period of the same length, not a grade for anyone.
  - Check-ins are shown as feeling totals only. Reasons are never output.
"""
from datetime import datetime, timedelta, timezone

SKILLS = {"peer": "Peer pressure", "conflict": "Conflict resolution", "emotion": "Emotional control", "responsible": "Responsible choices"}
FEELINGS = ["great", "good", "okay", "down", "stress"]

def stamp(dt):
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")

def parse(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)

def pct(part, whole):
    return round(100 * part / whole) if whole else None

def aggregate(db, scope, start, end, min_group):
    """scope = {"org":..., "site":..., "group":...} (any may be empty). start/end are datetimes."""
    where, args = ["r.status = 'active'"], []
    for key, col in (("org", "org"), ("site", "site"), ("group", "group_name")):
        if scope.get(key):
            where.append("r.%s = ?" % col); args.append(scope[key])
    roster = "SELECT r.student_id FROM roster r WHERE " + " AND ".join(where)
    enrolled = db.execute("SELECT COUNT(*) FROM (%s)" % roster, args).fetchone()[0]
    out = {"scope": scope, "period": {"from": stamp(start), "to": stamp(end)}, "minGroup": min_group}
    if enrolled < min_group:
        out["suppressed"] = True
        return out

    def q(sql, extra=(), lo=None, hi=None):
        return db.execute(sql, [*args, lo or stamp(start), hi or stamp(end), *extra]).fetchall()
    base = "FROM events e WHERE e.student_id IN (%s) AND e.at >= ? AND e.at < ? " % roster

    active, sessions = q("SELECT COUNT(DISTINCT student_id), COUNT(*) " + base + "AND type = 'session_start'")[0]
    minutes = q("SELECT AVG(json_extract(payload, '$.durationMs')) " + base + "AND type = 'session_end'")[0][0]
    opened = dict(q("SELECT json_extract(payload, '$.moduleType'), COUNT(*) " + base + "AND type = 'module_open' GROUP BY 1"))
    done = dict(q("SELECT json_extract(payload, '$.moduleType'), COUNT(*) " + base + "AND type = 'module_complete' GROUP BY 1"))
    out["enrolled"] = enrolled
    out["participation"] = {"activeYouth": active, "percent": pct(active, enrolled), "sessions": sessions,
                            "avgSessionMinutes": round(minutes / 60000, 1) if minutes else None}
    out["engagement"] = {
        "scenariosCompleted": done.get("video", 0) + done.get("scenario", 0),
        "gamesCompleted": done.get("game", 0),
        "completionPercent": pct(sum(done.values()), sum(opened.values()))}

    # Skills: share of decisions rated "best", compared with the previous period of the same length.
    prev_lo = start - (end - start)
    skills = []
    for sid, label in SKILLS.items():
        def share(lo, hi):
            n, best, students = q(
                "SELECT COUNT(*), SUM(json_extract(payload, '$.rating') = 'best'), COUNT(DISTINCT student_id) " + base +
                "AND type = 'decision' AND json_extract(payload, '$.skill') = ?", (sid,), stamp(lo), stamp(hi))[0]
            return n, (best or 0), students
        n, best, students = share(start, end)
        row = {"skill": sid, "label": label}
        if students < min_group:
            row["suppressed"] = True
        else:
            pn, pbest, pstudents = share(prev_lo, start)
            row.update(decisions=n, youth=students, bestPercent=pct(best, n),
                       changePoints=(pct(best, n) - pct(pbest, pn)) if pstudents >= min_group else None)
        skills.append(row)
    out["skills"] = skills

    # Check-ins: totals by feeling, start and end of session. Reasons are not reported.
    mood = {}
    for phase in ("start", "end"):
        rows = q("SELECT json_extract(payload, '$.feeling'), COUNT(*), COUNT(DISTINCT student_id) " + base +
                 "AND type = 'checkin' AND json_extract(payload, '$.phase') = ? GROUP BY 1", (phase,))
        students = q("SELECT COUNT(DISTINCT student_id) " + base + "AND type = 'checkin' AND json_extract(payload, '$.phase') = ?", (phase,))[0][0]
        total = sum(c for _, c, _ in rows)
        if students < min_group:
            mood[phase] = {"suppressed": True}
        else:
            counts = {f: c for f, c, _ in rows}
            mood[phase] = {"checkins": total, "youth": students, "percent": {f: pct(counts.get(f, 0), total) for f in FEELINGS}}
    paired = q("SELECT COUNT(*) FROM (SELECT session_id " + base +
               "AND type = 'checkin' GROUP BY session_id HAVING COUNT(DISTINCT json_extract(payload, '$.phase')) = 2)")[0][0]
    mood["pairedSessions"] = paired
    out["checkins"] = mood
    return out
