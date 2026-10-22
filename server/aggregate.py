"""Aggregate numbers for the Youth Impact Dashboard. Group totals only; never per-student output.

Rules (from the product concept doc):
  - Only students on the roster with status "active" are counted, scoped by org, site and group.
  - Any figure built from fewer than MIN_GROUP students is suppressed, and a whole scope smaller than that is hidden.
  - Complementary suppression: if a small child (a group within a site, or a site within an org) is hidden, the siblings are
    hidden too until the hidden total reaches MIN_GROUP, so the parent minus its visible children cannot expose the few.
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

def sizes(db, parent, column):
    """Enrolled count per child (column = 'site' or 'group_name') under the parent filters."""
    where, args = ["status = 'active'"], []
    for col, val in parent.items():
        if val:
            where.append("%s = ?" % col); args.append(val)
    return dict(db.execute("SELECT %s, COUNT(*) FROM roster WHERE %s GROUP BY 1" % (column, " AND ".join(where)), args).fetchall())

def hidden_children(counts, min_group):
    hidden = {name for name, n in counts.items() if n < min_group}
    rest = sorted((n, name) for name, n in counts.items() if name not in hidden)
    total = sum(counts[name] for name in hidden)
    while hidden and total < min_group and rest:
        n, name = rest.pop(0)
        hidden.add(name); total += n
    return hidden

def is_hidden(db, scope, min_group):
    if scope.get("group"):
        counts = sizes(db, {"org": scope.get("org"), "site": scope.get("site")}, "group_name")
        return scope["group"] in hidden_children(counts, min_group)
    if scope.get("site"):
        return scope["site"] in hidden_children(sizes(db, {"org": scope.get("org")}, "site"), min_group)
    return False

def scopes(db, min_group):
    """Org > site > group tree for the dashboard's pickers. Counts of hidden groups are withheld."""
    rows = db.execute("SELECT org, site, group_name, COUNT(*) FROM roster WHERE status = 'active' GROUP BY 1, 2, 3").fetchall()
    tree = {}
    for org, site, group, n in rows:
        tree.setdefault(org, {}).setdefault(site, {})[group] = n
    out = []
    org_sites = {o: {st: sum(g.values()) for st, g in sts.items()} for o, sts in tree.items()}
    for org, sts in tree.items():
        hid_sites = hidden_children(org_sites[org], min_group)
        site_list = []
        for site, groups in sts.items():
            hid_groups = hidden_children(groups, min_group)
            site_list.append({"name": site, "enrolled": None if site in hid_sites else org_sites[org][site],
                              "groups": [{"name": g, "enrolled": None if g in hid_groups else n} for g, n in sorted(groups.items())]})
        total = sum(org_sites[org].values())
        out.append({"name": org, "enrolled": total if total >= min_group else None, "sites": sorted(site_list, key=lambda x: x["name"])})
    return {"minGroup": min_group, "orgs": sorted(out, key=lambda x: x["name"])}

def aggregate(db, scope, start, end, min_group):
    """scope = {"org":..., "site":..., "group":...} (any may be empty). start/end are datetimes."""
    where, args = ["r.status = 'active'"], []
    for key, col in (("org", "org"), ("site", "site"), ("group", "group_name")):
        if scope.get(key):
            where.append("r.%s = ?" % col); args.append(scope[key])
    roster = "SELECT r.student_id FROM roster r WHERE " + " AND ".join(where)
    enrolled = db.execute("SELECT COUNT(*) FROM (%s)" % roster, args).fetchone()[0]
    out = {"scope": scope, "period": {"from": stamp(start), "to": stamp(end)}, "minGroup": min_group}
    if enrolled < min_group or is_hidden(db, scope, min_group):
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

    # Impact Lab: participation and effort only. Punch count and accuracy need a sensor and are not captured.
    youth, started = q("SELECT COUNT(DISTINCT student_id), COUNT(*) " + base + "AND type = 'workout_start'")[0]
    if youth < min_group:
        out["cardio"] = {"suppressed": True}
    else:
        ended, finished, secs = q("SELECT COUNT(*), SUM(json_extract(payload, '$.completed') = 1), SUM(json_extract(payload, '$.secs')) " +
                                  base + "AND type = 'workout_end'")[0]
        by_kind = dict(q("SELECT json_extract(payload, '$.kind'), COUNT(*) " + base + "AND type = 'workout_start' GROUP BY 1"))
        out["cardio"] = {"youth": youth, "youthPercent": pct(youth, enrolled), "started": started, "finished": finished or 0,
                         "finishedPercent": min(100, pct(finished or 0, started)), "minutesMoving": round((secs or 0) / 60),
                         "startedByKind": by_kind}

    # B.I.2.T.R. leadership: explicit actions only (leading a round, questions asked, invitations). Nothing is read from what students write.
    leaders = q("SELECT COUNT(DISTINCT student_id) " + base + "AND type = 'facilitate_start'")[0][0]
    joined = q("SELECT COUNT(DISTINCT student_id) " + base + "AND type = 'ring_enter'")[0][0]
    if leaders < min_group:
        out["leadership"] = {"suppressed": True, "joinedPercent": pct(joined, enrolled) if joined >= min_group else None}
    else:
        led, secs = q("SELECT COUNT(*), SUM(json_extract(payload, '$.secs')) " + base + "AND type = 'facilitate_end'")[0]
        sources = dict(q("SELECT json_extract(payload, '$.source'), COUNT(*) " + base + "AND type = 'question_introduced' GROUP BY 1"))
        invites = q("SELECT COUNT(*) " + base + "AND type = 'invite_sent'")[0][0]
        out["leadership"] = {"youthLeading": leaders, "youthPercent": pct(leaders, enrolled), "sessionsLed": led,
                             "minutesFacilitating": round((secs or 0) / 60), "invitations": invites,
                             "questionsPicked": sources.get("picked", 0), "questionsWritten": sources.get("written", 0),
                             "joinedPercent": pct(joined, enrolled) if joined >= min_group else None}
    return out
