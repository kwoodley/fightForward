// Shared sign-in helper for every Fight Forward Academy page.
// There is no server yet, so "signing in" saves a first name and grade on this device only.
// Each student's progress is stored under their own key so a shared classroom device keeps them apart.
(function () {
  const USER_KEY = "ff.user.v1";

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

  function signIn(name) {
    const clean = name.replace(/\s+/g, " ").trim().slice(0, 20);
    const id = clean.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const p = lookupProfile(id);
    const user = {
      name: p.displayName || clean, id,
      grade: p.grade || "", school: p.school || "", group: p.group || "",
      level: p.level || "", progress: p.progress || {}, permissions: p.permissions || ["student"]
    };
    window.__ffUser = user;
    try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch (e) { /* storage unavailable */ }
    return user;
  }

  function signOut() {
    window.__ffUser = null;
    try { localStorage.removeItem(USER_KEY); } catch (e) { /* storage unavailable */ }
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
    document.querySelectorAll("[data-signout]").forEach(n => n.addEventListener("click", e => { e.preventDefault(); signOut(); }));
  }

  // Check-in answers (start of session now; end of session later) so we can compare how students feel.
  function logCheckin(entry) {
    const user = getUser(); if (!user) return;
    const key = "ff.checkins." + user.id;
    try {
      const all = JSON.parse(localStorage.getItem(key)) || [];
      all.push({ ...entry, at: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(all));
    } catch (e) { /* storage unavailable */ }
  }

  window.FFAuth = { logCheckin, getUser, signIn, signOut, requireUser, fillUser };
  document.addEventListener("DOMContentLoaded", fillUser);
})();
