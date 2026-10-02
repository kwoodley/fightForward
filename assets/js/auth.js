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

  function signIn(name, grade) {
    const clean = name.replace(/\s+/g, " ").trim().slice(0, 20);
    const user = { name: clean, grade: grade || "", id: clean.toLowerCase().replace(/[^a-z0-9]+/g, "-") };
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

  window.FFAuth = { getUser, signIn, signOut, requireUser, fillUser };
  document.addEventListener("DOMContentLoaded", fillUser);
})();
