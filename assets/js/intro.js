// Shows the path's art full-screen for 10 seconds (tap to skip), then fades to the page.
(function () {
  const el = document.getElementById("intro");
  if (!el) return;
  let done = false;
  function end() {
    if (done) return; done = true;
    el.classList.add("out"); document.body.classList.remove("intro-on");
    setTimeout(() => el.remove(), 1300);
  }
  el.addEventListener("click", end);
  setTimeout(end, 10000);
})();
