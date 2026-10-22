// Shared sign-in helper for every Fight Forward Academy page.
// There is no server yet, so "signing in" saves a first name and grade on this device only.
// Each student's progress is stored under their own key so a shared classroom device keeps them apart.
(function () {
  const USER_KEY = "ff.user.v1";
  const SESSION_KEY = "ff.session.v1";
  const EVENT_CAP = 5000;
  const IDLE_MS = 30 * 60 * 1000;   // no activity for this long ends the visit
  const OUTBOX_KEY = "ff.outbox.v1"; // events not yet accepted by the server
  const BATCH = 100;
  let memSession = null;            // keeps the visit working if storage is blocked

  function getUser() {
    try {
      const u = JSON.parse(localStorage.getItem(USER_KEY));
      if (u && typeof u.name === "string" && u.name.trim()) return u;
    } catch (e) { /* storage unavailable */ }
    return window.__ffUser || null;
  }

  // Stand-in for the school roster the server will provide. Until then, the back office can
  // pre-load profiles into localStorage "ff.roster.v1" ({ "lamont": { grade, school, group, level, permissions } }).
  // Grade is set when the account is created, never chosen by the student.
  function lookupProfile(id) {
    try { return (JSON.parse(localStorage.getItem("ff.roster.v1")) || {})[id] || {}; } catch (e) { return {}; }
  }

  // ---------- Sessions and events ----------
  // One session id per visit (sign-in to sign-out). Every event carries it, so start and end check-ins
  // can be paired and time spent can be worked out. Events wait in ff.events.v1:<id> until there is a server.
  function newId() {
    return window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || memSession; } catch (e) { return memSession; }
  }
  function writeSession(s) {
    memSession = s;
    try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch (e) { /* storage unavailable */ }
  }
  function appendEvent(s, type, data, at) {
    const key = "ff.events.v1:" + s.studentId;
    const event = { ...data, eventId: newId(), studentId: s.studentId, org: s.org, site: s.site, group: s.group, type, at, sessionId: s.id };
    try {
      const all = JSON.parse(localStorage.getItem(key)) || [];
      all.push(event);
      localStorage.setItem(key, JSON.stringify(all.slice(-EVENT_CAP)));
    } catch (e) { /* storage unavailable */ }
    enqueue(event);
  }

  // ---------- Event queue ----------
  // Events are sent to the server in batches. Until a URL is set (window.FF_EVENTS_URL, or localStorage "ff.events.url"),
  // nothing is sent. Failed sends stay in the outbox and are retried; the server ignores repeats by eventId.
  function eventsUrl() {
    try { return window.FF_EVENTS_URL || localStorage.getItem("ff.events.url") || ""; } catch (e) { return window.FF_EVENTS_URL || ""; }
  }
  function readOutbox() {
    try { return JSON.parse(localStorage.getItem(OUTBOX_KEY)) || []; } catch (e) { return []; }
  }
  function writeOutbox(list) {
    try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(list.slice(-EVENT_CAP))); } catch (e) { /* storage unavailable */ }
  }
  function enqueue(event) {
    if (!eventsUrl()) return;
    writeOutbox(readOutbox().concat(event));
    if (readOutbox().length >= BATCH) flush();
  }
  let flushing = false;
  // Sends one batch at a time until the outbox is empty or a send fails. `leaving` uses keepalive so it survives a page close.
  async function flush(leaving) {
    const url = eventsUrl();
    if (!url || flushing || !window.fetch) return;
    flushing = true;
    try {
      for (;;) {
        const batch = readOutbox().slice(0, BATCH);
        if (!batch.length) break;
        const res = await fetch(url, {
          method: "POST", headers: { "Content-Type": "application/json" }, keepalive: !!leaving,
          body: JSON.stringify({ events: batch })
        });
        // Success, or a rejection that will never succeed (bad request): drop the batch so it can't block the queue.
        const permanent = res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429;
        if (!res.ok && !permanent) break;
        const sent = new Set(batch.map(e => e.eventId));
        writeOutbox(readOutbox().filter(e => !sent.has(e.eventId)));
        if (leaving) break;
      }
    } catch (e) { /* offline or server down: try again later */ }
    flushing = false;
  }
  function startSession(user) {
    const now = new Date().toISOString();
    const s = { id: newId(), studentId: user.id, org: user.org || "", site: user.site || "", group: user.group || "", startedAt: now, lastSeen: now };
    writeSession(s);
    appendEvent(s, "session_start", {}, now);
    return s;
  }
  // `at` lets a visit that was never closed end at the last time we saw it.
  function endSession(reason, extra, at) {
    const s = readSession(); if (!s) return;
    const end = at || new Date().toISOString();
    appendEvent(s, "session_end", { reason, durationMs: Math.max(0, Date.parse(end) - Date.parse(s.startedAt)), ...extra }, end);
    writeSession(null);
  }
  // The visit for the signed-in student. Starts one if there isn't one, or if the last was idle too long.
  function currentSession() {
    const user = getUser(); if (!user) return null;
    const s = readSession();
    if (s && s.studentId === user.id) {
      if (Date.now() - Date.parse(s.lastSeen) <= IDLE_MS) return s;
      endSession("timeout", {}, s.lastSeen);
    } else if (s) {
      endSession("abandoned", {}, s.lastSeen);
    }
    return startSession(user);
  }
  function touch() {
    const s = readSession(); if (!s) return;
    s.lastSeen = new Date().toISOString();
    writeSession(s);
  }
  function logEvent(type, data) {
    const s = currentSession(); if (!s) return;
    const now = new Date().toISOString();
    appendEvent(s, type, data, now);
    s.lastSeen = now; writeSession(s);
  }

  function signIn(name) {
    const clean = name.replace(/\s+/g, " ").trim().slice(0, 20);
    const id = clean.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const p = lookupProfile(id);
    const stale = readSession();
    if (stale) endSession("abandoned", {}, stale.lastSeen);
    const user = {
      name: p.displayName || clean, id,
      grade: p.grade || "", school: p.school || "", org: p.org || "", site: p.site || "", group: p.group || "",
      level: p.level || "", progress: p.progress || {}, permissions: p.permissions || ["student"]
    };
    window.__ffUser = user;
    try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch (e) { /* storage unavailable */ }
    startSession(user);
    return user;
  }

  // Log out goes through the end-of-session check-in. `now` skips it (used by "Not you?" on the welcome page).
  function signOut(now) {
    if (now || !getUser()) finishSignOut({ endCheckin: false });
    else location.href = "goodbye.html";
  }
  function finishSignOut(extra) {
    endSession("signout", extra);
    window.__ffUser = null;
    try { localStorage.removeItem(USER_KEY); } catch (e) { /* storage unavailable */ }
    flush(true);
    location.href = "index.html";
  }

  // Pages other than the login page call this first. Sends signed-out visitors to the login page.
  function requireUser() {
    const user = getUser();
    if (!user) { location.replace("index.html"); return null; }
    return user;
  }

  // Fills any [data-user-name] / [data-user-initial] / [data-user-greeting] elements, and wires [data-signout].
  function fillUser() {
    const user = getUser();
    if (!user) return;
    document.querySelectorAll("[data-user-name]").forEach(n => { n.textContent = user.name; });
    document.querySelectorAll("[data-user-initial]").forEach(n => { n.textContent = user.name[0].toUpperCase(); });
    document.querySelectorAll("[data-user-greeting]").forEach(n => { n.textContent = "Welcome back, " + user.name; });
    document.querySelectorAll("[data-signout]").forEach(n => n.addEventListener("click", e => { e.preventDefault(); signOut(n.dataset.signout === "now"); }));
  }

  // Check-in questions, asked at the start and end of each session. Reasons are stored by id, so wording can change.
  const FEELINGS = [
    { id: "great", label: "😄 Great", why: [
      { id: "something-good", label: "Something good happened" }, { id: "slept-well", label: "I slept well" },
      { id: "with-friends", label: "I'm with friends" }, { id: "excited", label: "I'm excited for today" }] },
    { id: "good", label: "🙂 Good", why: [
      { id: "good-day", label: "Nothing special, just a good day" }, { id: "relaxed", label: "I'm relaxed" },
      { id: "home-good", label: "Things at home are good" }, { id: "school-good", label: "School is going well" }] },
    { id: "okay", label: "😐 Okay", why: [
      { id: "tired", label: "I'm tired" }, { id: "average-day", label: "Just an average day" },
      { id: "not-sure", label: "I'm not sure" }, { id: "on-my-mind", label: "Something's on my mind" }] },
    { id: "down", label: "😔 Down", why: [
      { id: "home", label: "Something at home" }, { id: "friends", label: "Something with friends" },
      { id: "school", label: "Something at school" }, { id: "no-sleep", label: "I'm tired or didn't sleep" },
      { id: "rather-not-say", label: "I'd rather not say" }] },
    { id: "stress", label: "😤 Stressed or angry", why: [
      { id: "conflict", label: "A conflict with someone" }, { id: "too-much", label: "Too much going on" },
      { id: "school", label: "Something at school" }, { id: "home", label: "Something at home" },
      { id: "rather-not-say", label: "I'd rather not say" }] }
  ];

  // Check-in answers ({ phase: "start" | "end", feeling, reason }), tagged with the session so start and end can be compared.
  function logCheckin(entry) {
    const user = getUser(); if (!user) return;
    const s = currentSession();
    const key = "ff.checkins." + user.id;
    try {
      const all = JSON.parse(localStorage.getItem(key)) || [];
      all.push({ ...entry, sessionId: s && s.id, at: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(all));
    } catch (e) { /* storage unavailable */ }
    logEvent("checkin", { phase: entry.phase, feeling: entry.feeling, reason: entry.reason });
  }

  window.FFAuth = { FEELINGS, logCheckin, logEvent, flush, getSession: currentSession, getUser, signIn, signOut, finishSignOut, requireUser, fillUser };
  document.addEventListener("DOMContentLoaded", () => { fillUser(); currentSession(); });
  // Remember when we last saw the student, so a closed tab still gets a sensible end time.
  addEventListener("pagehide", () => { touch(); flush(true); });
  addEventListener("online", () => flush());
  setInterval(flush, 30000);
  flush();
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") touch(); });
})();
