// Module engines: animated video scenes, A/B/C scenarios, games, and the coach who explains every answer.
(function () {
  const { MOVES, PRESSURE, SUPPORT } = window.FF_CONTENT;
  const KEYS = "ABC";

  // ---------- Helpers ----------
  function el(tag, attrs = {}, ...kids) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") node.className = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const kid of kids) node.append(kid);
    return node;
  }
  function chips(mod) {
    const out = el("div", { class: "tags" }, el("span", { class: "chip type-" + mod.type }, TYPE_LABEL[mod.type]));
    if (mod.pressure) out.append(el("span", { class: "chip" }, el("b", {}, "Pressure: "), PRESSURE[mod.pressure]));
    if (mod.support) out.append(el("span", { class: "chip" }, el("b", {}, "Corner: "), SUPPORT[mod.support]));
    return out;
  }
  const TYPE_LABEL = { video: "Video scenario", scenario: "Scenario", game: "Game" };

  // ---------- Avatars (simple SVG characters) ----------
  function avatarSVG(c, mood = "neutral") {
    const skin = c.skin || "#e0ac69", shirt = c.shirt || "#444", hairC = c.hairColor || "#222";
    const brows = {
      angry:   '<path d="M33 37L46 43M67 37L54 43" stroke="#1a1a1a" stroke-width="3.2" stroke-linecap="round"/>',
      sad:     '<path d="M33 43L46 38M67 43L54 38" stroke="#1a1a1a" stroke-width="3" stroke-linecap="round"/>',
      worried: '<path d="M33 43L46 38M67 43L54 38" stroke="#1a1a1a" stroke-width="3" stroke-linecap="round"/>',
      shock:   '<path d="M34 36Q40 32 46 36M54 36Q60 32 66 36" stroke="#1a1a1a" stroke-width="3" fill="none" stroke-linecap="round"/>'
    }[mood] || '<path d="M34 39H46M54 39H66" stroke="#1a1a1a" stroke-width="2.6" stroke-linecap="round"/>';
    const mouth = {
      happy:   '<path d="M40 58Q50 70 60 58" stroke="#1a1a1a" stroke-width="3" fill="none" stroke-linecap="round"/>',
      sad:     '<path d="M42 66Q50 58 58 66" stroke="#1a1a1a" stroke-width="3" fill="none" stroke-linecap="round"/>',
      angry:   '<path d="M42 65H58" stroke="#1a1a1a" stroke-width="3.4" stroke-linecap="round"/>',
      worried: '<path d="M41 65Q45.5 61 50 65Q54.5 69 59 65" stroke="#1a1a1a" stroke-width="2.8" fill="none" stroke-linecap="round"/>',
      shock:   '<ellipse cx="50" cy="64" rx="4.5" ry="6" fill="#1a1a1a"/>'
    }[mood] || '<path d="M43 63H57" stroke="#1a1a1a" stroke-width="3" stroke-linecap="round"/>';

    let hair = "";
    if (c.hair === "short") hair = `<path d="M24 46Q22 18 50 17Q78 18 76 46Q70 31 50 30Q30 31 24 46Z" fill="${hairC}"/>`;
    if (c.hair === "long")  hair = `<path d="M22 60Q16 16 50 16Q84 16 78 60L72 60Q72 32 50 30Q28 32 28 60Z" fill="${hairC}"/>`;
    if (c.hair === "cap") hair = `<path d="M23 42Q22 16 50 16Q78 16 77 42Z" fill="${c.cap || "#d92b2f"}"/><path d="M23 42H92Q92 47 84 47H23Z" fill="${c.cap || "#d92b2f"}"/>`;
    const whistle = c.whistle ? '<path d="M50 94L50 112" stroke="#999" stroke-width="2"/><rect x="44" y="110" width="12" height="7" rx="3" fill="#ddd" stroke="#888"/>' : "";

    return `<svg viewBox="0 0 100 140" aria-hidden="true" focusable="false">
      <path d="M12 140Q12 96 50 92Q88 96 88 140Z" fill="${shirt}"/>
      <rect x="42" y="76" width="16" height="20" rx="6" fill="${skin}"/>
      <ellipse cx="25" cy="50" rx="4" ry="6" fill="${skin}"/><ellipse cx="75" cy="50" rx="4" ry="6" fill="${skin}"/>
      <ellipse cx="50" cy="48" rx="26" ry="29" fill="${skin}"/>
      ${hair}
      <circle cx="40" cy="49" r="3.4" fill="#1a1a1a"/><circle cx="60" cy="49" r="3.4" fill="#1a1a1a"/>
      ${brows}${mouth}${whistle}
    </svg>`;
  }
  const COACH = { skin: "#8d5524", shirt: "#16161a", hair: "cap", cap: "#d92b2f", whistle: true };

  // ---------- Animated video scene ----------
  const SETTINGS = { field: "Practice field", hallway: "School hallway", phone: "Phone", classroom: "Classroom", cafeteria: "Cafeteria" };

  function cutscene(scene, { onEnd } = {}) {
    const n = scene.cast.length;
    const actors = {};
    const castRow = el("div", { class: "cast" });
    scene.cast.forEach((c, i) => {
      const fig = el("div", { class: "fig" });
      fig.innerHTML = avatarSVG(c);
      const actor = el("div", { class: "actor" }, fig, el("span", { class: "actor-name" }, c.name));
      actor.dataset.x = String(((2 * i + 1) / (2 * n)) * 100);
      actors[c.id] = { def: c, node: actor, fig };
      castRow.append(actor);
    });

    const place = el("span", { class: "stage-label" }, scene.place || SETTINGS[scene.setting]);
    const narr = el("div", { class: "narr", hidden: "" });
    const bubble = el("div", { class: "bubble", hidden: "" });
    const phoneList = el("ul", { class: "phone-list" });
    const phone = el("div", { class: "phone", hidden: "" }, el("div", { class: "phone-bar" }, "Messages"), phoneList);
    const playBig = el("button", { class: "stage-play", type: "button", "aria-label": "Play the scene" },
      el("span", { class: "tri", "aria-hidden": "true" }), "Watch the scene");
    const stage = el("div", { class: "stage", "data-setting": scene.setting }, place, castRow, phone, narr, bubble, playBig);

    const bar = el("span", { class: "progress-bar" });
    const playBtn = el("button", { class: "btn btn-ghost small", type: "button" }, "Play");
    const replayBtn = el("button", { class: "btn btn-ghost small", type: "button", hidden: "" }, "Replay");
    const skipBtn = el("button", { class: "btn btn-ghost small", type: "button" }, "Skip to choices");
    const controls = el("div", { class: "scene-controls" },
      playBtn, replayBtn, el("div", { class: "progress", "aria-hidden": "true" }, bar), skipBtn);
    const root = el("div", { class: "scene", role: "group", "aria-label": "Animated scene. Captions show what everyone says." }, stage, controls);

    let idx = -1, timer = null, playing = false, ended = false;

    function setMood(id, mood) { const a = actors[id]; if (a) a.fig.innerHTML = avatarSVG(a.def, mood); }
    function reset() {
      Object.keys(actors).forEach(id => setMood(id, "neutral"));
      stage.dataset.setting = scene.setting;
      place.textContent = scene.place || SETTINGS[scene.setting];
      stage.classList.remove("phone-mode");
      phone.hidden = true; phoneList.replaceChildren(); narr.hidden = true; bubble.hidden = true;
      Object.values(actors).forEach(a => a.node.classList.remove("speaking"));
    }
    function duration(text) { return 1500 + (text || "").length * 55; }

    function show(i) {
      const b = scene.beats[i];
      Object.values(actors).forEach(a => a.node.classList.remove("speaking"));
      bubble.hidden = true; narr.hidden = true;
      bar.style.width = ((i + 1) / scene.beats.length) * 100 + "%";

      if (b.set) {
        stage.dataset.setting = b.set;
        place.textContent = b.place || SETTINGS[b.set];
        stage.classList.remove("phone-mode");
        phone.hidden = true; phoneList.replaceChildren();
        return 700;
      }
      if (b.narr) {
        narr.textContent = b.narr; narr.hidden = false;
        return duration(b.narr);
      }
      if (b.msg) {
        stage.classList.add("phone-mode"); phone.hidden = false;
        const li = b.from === "sys"
          ? el("li", { class: "sysmsg" }, b.msg)
          : b.from === "you"
            ? el("li", { class: "msg mine" }, el("span", { class: "msg-text" }, b.msg))
            : el("li", { class: "msg" }, el("span", { class: "msg-from" }, b.from), el("span", { class: "msg-text" }, b.msg));
        phoneList.append(li);
        phoneList.scrollTop = phoneList.scrollHeight;
        return duration(b.msg);
      }
      if (b.who) {
        const a = actors[b.who];
        a.node.classList.add("speaking");
        setMood(b.who, b.mood || "neutral");
        const x = Math.min(68, Math.max(32, Number(a.node.dataset.x)));
        bubble.style.left = x + "%";
        bubble.replaceChildren(el("b", {}, a.def.name + ": "), b.say);
        bubble.hidden = false;
        return duration(b.say);
      }
      return 800;
    }

    function step() {
      clearTimeout(timer);
      if (!root.isConnected) { playing = false; return; }
      idx += 1;
      if (idx >= scene.beats.length) { finish(); return; }
      const ms = show(idx);
      timer = setTimeout(step, ms);
    }
    function finish() {
      playing = false; ended = true;
      playBtn.hidden = true; replayBtn.hidden = false;
      skipBtn.hidden = true;
      playBig.hidden = true;
      if (onEnd) onEnd();
    }
    function play() {
      if (ended) return;
      playBig.hidden = true;
      playing = true; playBtn.textContent = "Pause";
      if (idx < 0) reset();
      else idx -= 1;           // resume: replay the beat we paused on
      step();
    }
    function pause() { playing = false; clearTimeout(timer); playBtn.textContent = "Play"; }

    playBig.addEventListener("click", play);
    playBtn.addEventListener("click", () => (playing ? pause() : play()));
    replayBtn.addEventListener("click", () => {
      clearTimeout(timer); idx = -1; ended = false; reset();
      replayBtn.hidden = true; playBtn.hidden = false; skipBtn.hidden = false;
      bar.style.width = "0";
      play();
    });
    skipBtn.addEventListener("click", () => { clearTimeout(timer); idx = scene.beats.length; show(scene.beats.length - 1); finish(); });

    return { node: root, focus: () => playBig.focus({ preventScroll: true }) };
  }

  // ---------- Coach (avatar who explains every answer) ----------
  function coachBox(intro, items) {
    const fig = el("div", { class: "coach-fig" });
    fig.innerHTML = avatarSVG(COACH, "happy");
    return el("div", { class: "coach" },
      el("div", { class: "coach-who" }, fig, el("span", { class: "coach-name" }, "Coach")),
      el("div", { class: "coach-talk" },
        el("p", { class: "coach-intro" }, intro),
        el("ul", { class: "why-list" }, ...items.map(it =>
          el("li", { class: "why " + it.cls },
            el("div", { class: "why-head" },
              it.key ? el("span", { class: "choice-key", "aria-hidden": "true" }, it.key) : "",
              el("span", { class: "why-title" }, it.title),
              el("span", { class: "tag " + it.cls }, it.tag),
              it.picked ? el("span", { class: "picked" }, "You picked this") : ""
            ),
            el("p", { class: "why-text" }, it.why)
          )
        ))
      )
    );
  }
  const RATING = {
    best:  { tag: "Strong play", cls: "best" },
    ok:    { tag: "Decent, not the best", cls: "ok" },
    rough: { tag: "Rough call", cls: "rough" }
  };
  const INTRO = {
    best:  "Strong play! That’s the move I’d want you to make. Here’s the full breakdown of every answer:",
    ok:    "Not bad. That move keeps you safe, but there’s a stronger one. Here’s the full breakdown of every answer:",
    rough: "That one could backfire, but this is practice, and practice is where you learn. Here’s the full breakdown of every answer:"
  };

  // ---------- Decision flow (video scenarios and text scenarios) ----------
  // Calls ctx.record(...) and ctx.complete(...) so the page can save progress.
  function decision(mod, host, ctx) {
    const startedAt = performance.now();
    let picked = null, msToDecide = 0;

    const choiceButtons = mod.choices.map((c, i) =>
      el("button", { class: "choice", type: "button", "aria-pressed": "false", onclick: () => pick(i) },
        el("span", { class: "choice-key", "aria-hidden": "true" }, KEYS[i]),
        el("span", {}, c.text)
      )
    );
    const sureStep = el("div", { class: "step", hidden: "" },
      el("p", { class: "prompt", id: "sure-label" }, "How sure are you about that call?"),
      el("div", { class: "scale", role: "group", "aria-labelledby": "sure-label" },
        ...[1, 2, 3, 4, 5].map(n => el("button", { type: "button", onclick: () => finish(n) }, String(n))),
        el("button", { class: "skip-link", type: "button", onclick: () => finish(null) }, "Skip")
      ),
      el("div", { class: "scale-ends", "aria-hidden": "true" }, el("span", {}, "Not sure"), el("span", {}, "Totally sure"))
    );
    const debrief = el("div", { class: "step", hidden: "" });

    host.append(
      el("p", { class: "prompt" }, "What do you do?"),
      el("ul", { class: "choices" }, ...choiceButtons.map(b => el("li", {}, b))),
      sureStep, debrief
    );

    function pick(i) {
      if (picked !== null) return;
      picked = i;
      msToDecide = Math.round(performance.now() - startedAt);
      choiceButtons.forEach((b, j) => { b.disabled = true; b.setAttribute("aria-pressed", String(i === j)); });
      sureStep.hidden = false;
      sureStep.querySelector("button").focus({ preventScroll: true });
    }

    function finish(confidence) {
      const choice = mod.choices[picked];
      ctx.record({
        moduleId: mod.id, type: mod.type, pressure: mod.pressure, support: mod.support,
        choice: picked, move: choice.move, rating: choice.rating, confidence, msToDecide
      });
      ctx.complete(mod.id, { rating: choice.rating });
      sureStep.hidden = true;
      debrief.replaceChildren(
        el("p", { class: "prompt" }, "Coach breaks it down"),
        coachBox(INTRO[choice.rating], mod.choices.map((c, i) => ({
          key: KEYS[i], title: c.text, tag: RATING[c.rating].tag, cls: RATING[c.rating].cls, why: c.why, picked: i === picked
        }))),
        el("p", { class: "outcome-note" }, "There’s no perfect score here. You’re building the habit of picking your move on purpose."),
        endActions(ctx, mod)
      );
      debrief.hidden = false;
      debrief.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function endActions(ctx, mod) {
    const next = ctx.nextModule(mod);
    return el("div", { class: "actions" },
      next ? el("button", { class: "btn", type: "button", onclick: () => ctx.open(next) }, "Next: " + next.title) : "",
      el("button", { class: "btn btn-ghost", type: "button", onclick: () => ctx.open(mod) }, "Run it back"),
      el("button", { class: "btn btn-ghost", type: "button", onclick: ctx.close }, "Back to the session")
    );
  }

  // ---------- Games ----------
  function scoreIntro(score, total) {
    const r = score / total;
    const line = r >= 0.85 ? "Champion-level round!" : r >= 0.6 ? "Solid round!" : "Good start. This stuff takes practice.";
    return `${line} You got ${score} out of ${total}. Here’s the full breakdown:`;
  }

  // Sort game: one card at a time, put it in a bucket.
  function sortGame(mod, host, ctx) {
    const cards = mod.cards;
    let i = 0, score = 0;
    const answers = [];
    const area = el("div", { class: "game-area" });
    host.append(area);
    ask();

    function ask() {
      const card = cards[i];
      const feedback = el("p", { class: "game-feedback", "aria-live": "polite" }, "");
      const buttons = mod.buckets.map((b, bi) =>
        el("button", { class: "choice", type: "button", onclick: () => answer(b.key, buttons, feedback) },
          el("span", { class: "choice-key", "aria-hidden": "true" }, KEYS[bi]), el("span", {}, b.label))
      );
      area.replaceChildren(
        el("div", { class: "game-top" },
          el("span", {}, `Card ${i + 1} of ${cards.length}`), el("span", {}, `Score: ${score}`)),
        el("div", { class: "game-card" }, card.text),
        el("ul", { class: "choices" }, ...buttons.map(b => el("li", {}, b))),
        feedback
      );
    }
    function answer(key, buttons, feedback) {
      const card = cards[i];
      const right = key === card.answer;
      if (right) score += 1;
      answers.push(key);
      buttons.forEach(b => { b.disabled = true; });
      feedback.textContent = right ? "✓ Nice, that’s right." : "✗ Not quite. We’ll go over it at the end.";
      feedback.className = "game-feedback " + (right ? "good" : "bad");
      setTimeout(() => { if (!area.isConnected) return; i += 1; i < cards.length ? ask() : done(); }, 900);
    }
    function done() {
      const label = key => mod.buckets.find(b => b.key === key).label;
      ctx.complete(mod.id, { score, total: cards.length });
      area.replaceChildren(
        el("p", { class: "prompt" }, "Coach breaks it down"),
        coachBox(scoreIntro(score, cards.length), cards.map((c, ci) => {
          const right = answers[ci] === c.answer;
          return {
            title: c.text,
            tag: right ? "You got it" : `You said ${label(answers[ci])}`,
            cls: right ? "best" : "rough",
            why: (right ? "" : `It’s “${label(c.answer)}.” `) + c.why
          };
        })),
        endActions(ctx, mod)
      );
    }
  }

  // Spot game: tap every item that matches, then check.
  function spotGame(mod, host, ctx) {
    const picked = new Set();
    const buttons = mod.items.map((it, i) =>
      el("button", { class: "choice", type: "button", "aria-pressed": "false", onclick: () => toggle(i) },
        el("span", { class: "choice-key", "aria-hidden": "true" }, ""), el("span", {}, it.text))
    );
    const check = el("button", { class: "btn", type: "button", onclick: done }, "Check my answers");
    const area = el("div", { class: "game-area" },
      el("p", { class: "prompt" }, mod.prompt),
      el("ul", { class: "choices" }, ...buttons.map(b => el("li", {}, b))),
      el("div", { class: "actions" }, check)
    );
    host.append(area);

    function toggle(i) {
      const on = !picked.has(i);
      on ? picked.add(i) : picked.delete(i);
      buttons[i].setAttribute("aria-pressed", String(on));
      buttons[i].querySelector(".choice-key").textContent = on ? "✓" : "";
    }
    function done() {
      let score = 0;
      const items = mod.items.map((it, i) => {
        const chosen = picked.has(i);
        const right = chosen === it.hit;
        if (right) score += 1;
        const tag = it.hit ? (chosen ? "You spotted it" : "You missed this one") : (chosen ? "Not one of them" : "Correct, not one");
        return { title: it.text, tag, cls: right ? "best" : "rough", why: it.why };
      });
      ctx.complete(mod.id, { score, total: mod.items.length });
      area.replaceChildren(
        el("p", { class: "prompt" }, "Coach breaks it down"),
        coachBox(scoreIntro(score, mod.items.length), items),
        endActions(ctx, mod)
      );
      area.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  // ---------- Module player ----------
  // Fills `host` with the whole module. ctx = { record, complete, nextModule, open, close }
  function play(mod, host, ctx) {
    host.replaceChildren();
    if (mod.type === "video") {
      host.append(el("p", { class: "setup" }, "Watch the scene, then make the call."));
      const choicesHost = el("div", { class: "choices-host", hidden: "" });
      let revealed = false;
      const reveal = () => {
        if (revealed) return; revealed = true;
        choicesHost.hidden = false;
        decision(mod, choicesHost, ctx);
      };
      if (mod.videoSrc) {
        const v = el("video", { class: "real-video", controls: "", playsinline: "", src: mod.videoSrc });
        v.addEventListener("ended", reveal);
        host.append(v, el("button", { class: "btn btn-ghost small", type: "button", onclick: reveal }, "Skip to choices"));
      } else {
        const scene = cutscene(mod.scene, { onEnd: reveal });
        host.append(scene.node);
        scene.focus();
      }
      host.append(choicesHost);
    } else if (mod.type === "scenario") {
      host.append(el("p", { class: "setup" }, mod.setup));
      decision(mod, host, ctx);
    } else if (mod.kind === "sort") {
      host.append(el("p", { class: "setup" }, mod.intro));
      sortGame(mod, host, ctx);
    } else if (mod.kind === "spot") {
      host.append(el("p", { class: "setup" }, mod.intro));
      spotGame(mod, host, ctx);
    }
  }

  window.FFModules = { play, chips, el, TYPE_LABEL };
})();
