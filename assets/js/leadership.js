/* Leadership Lab for Path 03 (Bring It to the Ring).
   Source: "Bring It to the Ring 2 and 3" planning documents (15 competencies in five domains, four development levels,
   Leadership Challenges, growth plans). Student-facing and self-reported only: mentor, teacher and peer views are not built.
   Product rules applied: no single score per student, no "type" labels, "not yet tried" is never a low score,
   every plan includes a strength to use, and nothing a student writes leaves the device (events carry ids and counts only).
   Safety words are never used here to score or pick leaders. */
(function () {
  const DOMAINS = [
    { id: "self", name: "Self-Leadership", line: "Leading yourself before leading others.", comps: ["self_awareness", "responsibility", "self_discipline"] },
    { id: "relational", name: "Relational Leadership", line: "Building relationships and influencing others positively.", comps: ["communication", "empathy", "inclusion"] },
    { id: "team", name: "Team Leadership", line: "Helping people work together toward common goals.", comps: ["teamwork", "conflict", "initiative"] },
    { id: "strategic", name: "Strategic Leadership", line: "Thinking critically, making decisions, and creating solutions.", comps: ["decisions", "creativity", "adaptability"] },
    { id: "community", name: "Community Leadership", line: "Leading with integrity, service, and purpose.", comps: ["integrity", "service", "vision"] }
  ];

  // name = competency; can = student-facing "I can" line; acts = development activities (the activity library)
  const COMPS = {
    self_awareness: { name: "Self-Awareness & Confidence", can: "I know my strengths and areas to grow, and I share my ideas with confidence.", acts: ["Fill out a personal strengths inventory and write a short reflection.", "Share one idea in a small group, then note how it felt."] },
    responsibility: { name: "Personal Responsibility & Accountability", can: "I take ownership, admit mistakes, and do what I said I would do.", acts: ["Take on one small job with clear check-in points.", "Keep a weekly list of promises and mark each one kept or reworked."],
      look: ["I need reminders to finish what I agreed to do.", "I finish my part with reminders and take guidance when I make a mistake.", "I finish what I commit to on my own and own my mistakes.", "I show accountability and help teammates build reliable habits."] },
    self_discipline: { name: "Self-Discipline & Goal Achievement", can: "I set goals, manage my time, and keep going when it gets hard.", acts: ["Set one weekly goal and track it every day.", "Break a big task into three steps with dates."] },
    communication: { name: "Communication & Active Listening", can: "I say my ideas clearly, listen respectfully, and ask good questions.", acts: ["Practice a one-minute talk, then a listening round where you sum up what you heard.", "Lead a short discussion and sum up others' views."],
      look: ["I need reminders to take turns, listen, or share respectfully.", "I share ideas and listen well in set activities with some support.", "I speak clearly, listen closely, and respond respectfully without prompting.", "I lead open conversations, clear up misunderstandings, and help others speak up."] },
    empathy: { name: "Empathy & Emotional Intelligence", can: "I notice how others feel, think about their side, and manage my own feelings.", acts: ["Work through a perspective-taking scenario and retell it from the other person's side.", "Name your feeling and one calming move before a hard talk."] },
    inclusion: { name: "Respect, Inclusion & Collaboration", can: "I value differences, include others, and make space for quieter voices.", acts: ["Design a group activity that gets everyone involved.", "Invite two people who haven't spoken yet to share, and thank them."] },
    teamwork: { name: "Teamwork & Cooperation", can: "I do my part for the group goal, share jobs, and support teammates.", acts: ["Rotate through facilitator, contributor, and coordinator roles.", "Finish a team challenge and give each teammate one thank-you."] },
    conflict: { name: "Conflict Resolution & Problem Solving", can: "I help work through disagreements and look for fair solutions.", acts: ["Do a supervised mediation role-play with an adult, then talk it over.", "Pick a school problem, list three solutions, and pick one."],
      look: ["I need a lot of help to handle a disagreement in a good way.", "I can name a problem and join in a solution with guidance.", "I listen to other views and work toward a good solution on my own.", "I help find fair solutions and teach others how to handle conflict."] },
    initiative: { name: "Initiative & Positive Influence", can: "I step up without being asked and encourage good choices without pressuring anyone.", acts: ["Spot one thing to improve at school and suggest a first step.", "Start one positive thing with a friend or group."] },
    decisions: { name: "Critical Thinking & Decision Making", can: "I weigh the facts and what might happen before I choose.", acts: ["Do a leadership decision-making simulation (try the Fight Forward scenarios).", "Compare three options for a real choice and explain your pick."] },
    creativity: { name: "Creativity & Innovation", can: "I come up with ideas and try new ways to solve things.", acts: ["Design a new solution to a challenge in your community.", "Write ten ideas for one problem, then pick the most doable."] },
    adaptability: { name: "Adaptability & Resilience", can: "I adjust when plans change and learn from setbacks.", acts: ["Redo a project plan after an unexpected obstacle.", "Write a setback-to-comeback reflection."] },
    integrity: { name: "Integrity & Ethical Leadership", can: "I am honest, fair, and trustworthy, even when it is hard.", acts: ["Work through an ethical decision scenario and say who is affected.", "Pick one time to choose fairness over what is easy, then reflect."] },
    service: { name: "Service & Community Engagement", can: "I help others, join service projects, and notice what my community needs.", acts: ["Plan and finish a small community-service project.", "Ask three people what the community needs and share what you hear."] },
    vision: { name: "Vision, Purpose & Empowering Others", can: "I set a positive direction, motivate peers, and help others grow.", acts: ["Write and share a short leadership vision.", "Teach one skill to a younger or newer student."] }
  };

  const LEVELS = [
    { n: 1, name: "Emerging", d: "I'm starting to notice this and need a lot of guidance or reminders." },
    { n: 2, name: "Developing", d: "I do this sometimes and can do it with some support." },
    { n: 3, name: "Demonstrating", d: "I do this on my own in situations I know." },
    { n: 4, name: "Inspiring", d: "I do this in many situations and help others learn to do it." }
  ];
  const levelName = n => (LEVELS[n - 1] || {}).name || "Not yet tried";

  const CHALLENGES = [
    { id: "lead_discussion", title: "Lead a group discussion", blurb: "Pick the question, keep it fair, sum it up. The “Lead this round” button in the ring counts too.", skills: ["communication", "inclusion", "teamwork"] },
    { id: "service_project", title: "Organize a small service project", blurb: "Spot a need, make a simple plan, and see it through.", skills: ["service", "initiative", "self_discipline"] },
    { id: "welcome", title: "Welcome a new student", blurb: "Make someone new feel like they belong.", skills: ["empathy", "inclusion", "initiative"] },
    { id: "team_assignment", title: "Coordinate a team assignment", blurb: "Help a group split up the work and finish together.", skills: ["teamwork", "responsibility", "vision"] },
    { id: "school_idea", title: "Propose a school improvement idea", blurb: "Share one practical idea with a first step.", skills: ["initiative", "decisions", "creativity"] },
    { id: "mediation", title: "Practice working through a disagreement", blurb: "A practice scenario, not a real fight. Do it with an adult watching.", skills: ["conflict", "empathy", "communication"], adult: true }
  ];
  const SUPPORT = [["alone", "On my own"], ["some", "A little help"], ["lots", "A lot of help"]];
  const HORIZONS = [30, 60, 90];

  const user = window.FFAuth && FFAuth.getUser && FFAuth.getUser();
  if (!user) return;
  const KEY = `ff.leadership.v1:${user.id}`;
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const write = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };
  const data = Object.assign({ checks: [], challenges: [], plan: null }, read(KEY, {}));
  const save = () => write(data);
  const log = (type, d) => { try { FFAuth.logEvent(type, d); } catch (e) { /* tracking off */ } };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith("on")) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? "" : v);
    }
    n.append(...kids.flat().filter(k => k != null && k !== false)); return n;
  }
  const root = document.getElementById("lab-root");
  if (!root) return;

  const TABS = [["check", "My strengths"], ["challenges", "Leadership challenges"], ["plan", "Growth plan"], ["journey", "My journey"]];
  let tab = "check", domainIx = 0, draft = null, building = null, answering = null, planDraft = null;

  const latest = () => (data.checks.length ? data.checks[data.checks.length - 1].scores : {});
  const baseline = () => (data.checks.length ? data.checks[0].scores : {});
  const dateStr = iso => new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });

  // ---------- shared bits ----------
  function meter(level, base) {
    const segs = [1, 2, 3, 4].map(i => el("span", { class: "seg" + (i <= level ? " on" : "") + (base && i === base && base !== level ? " was" : "") }));
    return el("span", { class: "meter", "aria-hidden": "true" }, segs);
  }
  function chips(items, current, onPick, label) {
    return el("div", { class: "chips", role: "group", "aria-label": label },
      items.map(([val, text]) => el("button", { type: "button", class: "pill", "aria-pressed": String(current === val), onclick: () => onPick(val) }, text)));
  }

  // ---------- Tab 1: strengths check ----------
  function renderCheck() {
    if (!draft) draft = Object.assign({}, latest());
    const dom = DOMAINS[domainIx];
    const box = el("div", {});
    box.append(
      el("p", { class: "section-sub" }, "Rate yourself honestly. This is for you, not a grade. “Not yet tried” just means you haven’t had a chance. Quiet leadership counts: listening, helping behind the scenes, and following through all count."),
      el("details", { class: "levels" }, el("summary", {}, "What the levels mean"),
        el("ul", {}, LEVELS.map(l => el("li", {}, el("b", {}, `${l.n} ${l.name}: `), l.d)), el("li", {}, el("b", {}, "Not yet tried: "), "I haven’t had the chance. That is not a low score."))),
      el("div", { class: "pills", role: "group", "aria-label": "Leadership areas" },
        DOMAINS.map((d, i) => el("button", { type: "button", class: "pill", "aria-pressed": String(i === domainIx), onclick: () => { domainIx = i; render(); } }, d.name))),
      el("p", { class: "hint" }, dom.line));
    dom.comps.forEach(id => {
      const c = COMPS[id];
      box.append(el("fieldset", { class: "comp" },
        el("legend", {}, c.name),
        el("p", {}, `“${c.can}”`),
        chips([[0, "Not yet tried"], ...LEVELS.map(l => [l.n, `${l.n} ${l.name}`])], draft[id], v => { draft[id] = v; render(); }, c.name),
        c.look && draft[id] ? el("p", { class: "hint" }, draft[id] === 0 ? "No problem. Try a challenge to get a chance to practice." : `What this looks like: ${c.look[draft[id] - 1]}`) : null));
    });
    const answered = Object.keys(draft).length;
    box.append(el("div", { class: "actions" },
      el("button", { class: "btn", type: "button", onclick: saveCheck, disabled: answered === 0 ? true : null }, "Save my check-in"),
      el("span", { class: "hint" }, `${answered} of 15 answered. ${data.checks.length ? `Last saved ${dateStr(data.checks[data.checks.length - 1].at)}.` : "Your first check-in is your starting point."}`)));
    return box;
  }
  function saveCheck() {
    const scores = Object.assign({}, draft);
    data.checks.push({ at: new Date().toISOString(), scores }); save();
    const vals = Object.values(scores);
    log("leadership_check", { rated: vals.filter(v => v > 0).length, notYet: vals.filter(v => v === 0).length, scores, source: "self" });
    draft = null; flash("Saved. Check “My journey” to see where you are."); render();
  }

  // ---------- Tab 2: leadership challenges ----------
  function renderChallenges() {
    const box = el("div", {});
    box.append(el("p", { class: "section-sub" }, "A challenge is a real chance to practice. You set a goal first, try it, then look back. Then try it again to see if it sticks."),
      el("p", { class: "notice" }, el("span", {}, el("strong", {}, "Keep it about the challenge. "), "What you write here stays on this device and isn’t read by anyone. If something is hurting, don’t put it here. Talk to a safety adult or use the ",
        el("a", { href: "coaching-corner.html" }, "Coaching Corner"), ".")));
    if (building) { box.append(beforeForm()); return box; }
    if (answering) { box.append(afterForm(data.challenges.find(c => c.id === answering))); return box; }
    const open = data.challenges.filter(c => c.status === "planned");
    if (open.length) {
      box.append(el("h3", { class: "sub" }, "In progress"), el("ul", { class: "clist" }, open.map(c => {
        const t = CHALLENGES.find(x => x.id === c.type);
        return el("li", { class: "citem" },
          el("b", {}, t.title, c.followUpOf ? " (try again)" : ""),
          el("p", {}, `Goal: ${c.goal}`),
          el("p", { class: "hint" }, `Practicing: ${c.skills.map(s => COMPS[s].name).join(", ")}`),
          el("button", { class: "btn", type: "button", onclick: () => { answering = c.id; render(); } }, "I did it. Look back"));
      })));
    }
    box.append(el("h3", { class: "sub" }, "Start a challenge"), el("ul", { class: "grid cgrid" }, CHALLENGES.map(t =>
      el("li", {}, el("button", { class: "tile", type: "button", onclick: () => { building = { type: t.id, goal: "", confidence: 0, skills: t.skills.slice(), approach: "" }; render(); } },
        el("span", { class: "num" }, t.adult ? "With an adult" : "On your own or with a group"), el("h3", {}, t.title), el("p", {}, t.blurb))))));
    const done = data.challenges.filter(c => c.status === "done");
    if (done.length) {
      box.append(el("h3", { class: "sub" }, "Looked back on"), el("ul", { class: "clist" }, done.map(c => {
        const t = CHALLENGES.find(x => x.id === c.type);
        const again = data.challenges.some(x => x.followUpOf === c.id);
        return el("li", { class: "citem" },
          el("b", {}, t.title), el("span", { class: "hint" }, ` · ${dateStr(c.doneAt)}`),
          el("p", { class: "hint" }, `Confidence ${c.confidence} → ${c.after.confidence}. Support: ${(SUPPORT.find(s => s[0] === c.after.support) || [])[1] || ""}.`),
          el("p", {}, c.after.next ? `Next time: ${c.after.next}` : ""),
          again ? el("span", { class: "hint" }, "Follow-up started.") : el("button", { class: "btn btn-ghost", type: "button", onclick: () => startFollowUp(c) }, "Try it again (follow-up)"));
      })));
    }
    box.append(el("p", { class: "hint" }, "Mentors will be able to add what they saw. For now, ask a mentor to watch and tell you what they noticed."));
    return box;
  }
  function beforeForm() {
    const b = building, t = CHALLENGES.find(x => x.id === b.type);
    const goal = el("textarea", { maxlength: "240", "aria-label": "My goal", placeholder: "By the end I want to…" }); goal.value = b.goal;
    const approach = el("textarea", { maxlength: "240", "aria-label": "My plan", placeholder: "First I will… then I will…" }); approach.value = b.approach;
    goal.addEventListener("input", () => { b.goal = goal.value; }); approach.addEventListener("input", () => { b.approach = approach.value; });
    return el("div", { class: "card" },
      el("h3", { class: "sub" }, t.title),
      t.adult ? el("p", { class: "hint" }, "Do this one with a mentor or teacher present.") : null,
      el("label", { class: "hint" }, "My goal"), goal,
      el("label", { class: "hint" }, "How confident am I right now? (1 = not at all, 5 = very)"),
      chips([1, 2, 3, 4, 5].map(n => [n, String(n)]), b.confidence, v => { b.confidence = v; render(); }, "Confidence before"),
      el("label", { class: "hint" }, "Skills I’ll practice (pick up to 3)"),
      el("div", { class: "chips", role: "group", "aria-label": "Skills" }, Object.keys(COMPS).map(id =>
        el("button", { type: "button", class: "pill", "aria-pressed": String(b.skills.includes(id)), onclick: () => {
          if (b.skills.includes(id)) b.skills = b.skills.filter(s => s !== id); else if (b.skills.length < 3) b.skills.push(id); render(); } }, COMPS[id].name))),
      el("label", { class: "hint" }, "My plan"), approach,
      el("div", { class: "actions" },
        el("button", { class: "btn", type: "button", onclick: () => {
          if (!b.goal.trim() || !b.confidence || !b.skills.length) { flash("Add a goal, your confidence, and at least one skill."); return; }
          const rec = { id: uid(), type: b.type, goal: b.goal.trim(), approach: b.approach.trim(), confidence: b.confidence, skills: b.skills, status: "planned", at: new Date().toISOString(), followUpOf: b.followUpOf || null };
          data.challenges.push(rec); save(); building = null;
          log("challenge_plan", { challenge: rec.type, skills: rec.skills, confidence: rec.confidence, followUp: !!rec.followUpOf });
          render(); }}, "Save my plan"),
        el("button", { class: "btn btn-ghost", type: "button", onclick: () => { building = null; render(); } }, "Cancel")));
  }
  function startFollowUp(c) {
    building = { type: c.type, goal: c.goal, confidence: 0, skills: c.skills.slice(), approach: "", followUpOf: c.id }; render();
  }
  function afterForm(c) {
    const t = CHALLENGES.find(x => x.id === c.type);
    const a = { happened: "", well: "", next: "", support: "", confidence: 0 };
    const mk = (key, label) => { const ta = el("textarea", { maxlength: "300", "aria-label": label }); ta.addEventListener("input", () => { a[key] = ta.value; }); return [el("label", { class: "hint" }, label), ta]; };
    const holder = el("div", { class: "card" }, el("h3", { class: "sub" }, `Look back: ${t.title}`), el("p", { class: "hint" }, `My goal was: ${c.goal}`));
    holder.append(...mk("happened", "What happened?"), ...mk("well", "What went well?"), ...mk("next", "What will I try next time?"));
    const sup = el("div", {}), conf = el("div", {});
    const paint = () => {
      sup.replaceChildren(el("label", { class: "hint" }, "How much help did I have?"), chips(SUPPORT, a.support, v => { a.support = v; paint(); }, "Help I had"));
      conf.replaceChildren(el("label", { class: "hint" }, "How confident am I now? (1 to 5)"), chips([1, 2, 3, 4, 5].map(n => [n, String(n)]), a.confidence, v => { a.confidence = v; paint(); }, "Confidence after"));
    };
    paint();
    holder.append(sup, conf, el("div", { class: "actions" },
      el("button", { class: "btn", type: "button", onclick: () => {
        if (!a.support || !a.confidence) { flash("Pick how much help you had and how confident you are now."); return; }
        c.status = "done"; c.doneAt = new Date().toISOString(); c.after = { happened: a.happened.trim(), well: a.well.trim(), next: a.next.trim(), support: a.support, confidence: a.confidence };
        save(); answering = null;
        log("challenge_done", { challenge: c.type, skills: c.skills, support: a.support, confidenceBefore: c.confidence, confidenceAfter: a.confidence, followUp: !!c.followUpOf });
        flash("Nice work. Try it again later to see what carried over."); render(); } }, "Save"),
      el("button", { class: "btn btn-ghost", type: "button", onclick: () => { answering = null; render(); } }, "Back")));
    return holder;
  }

  // ---------- Tab 3: growth plan ----------
  function renderPlan() {
    const box = el("div", {});
    const now = latest();
    if (!data.checks.length) {
      box.append(el("p", { class: "section-sub" }, "A growth plan starts from your strengths check. Do the check-in first."),
        el("button", { class: "btn", type: "button", onclick: () => { tab = "check"; render(); } }, "Go to My strengths"));
      return box;
    }
    if (data.plan && !planDraft) {
      const p = data.plan;
      box.append(el("p", { class: "section-sub" }, `Your plan started ${dateStr(p.startedAt)}. Tick goals off as you finish them. When a due date comes up, do a new check-in to see your growth. Finishing an activity is good, and the new check-in shows if the skill grew.`),
        el("ul", { class: "clist" }, p.items.map((it, i) => el("li", { class: "citem" },
          el("b", {}, COMPS[it.comp].name, it.role === "strength" ? " (a strength to use)" : ""),
          el("p", {}, `Goal: ${it.goal}`), el("p", { class: "hint" }, `Activity: ${it.activity}`),
          el("p", { class: "hint" }, `Due ${dateStr(it.due)} (${it.days} days)`),
          it.done ? el("span", { class: "hint" }, `Done ${dateStr(it.done)}`) : el("button", { class: "btn btn-ghost", type: "button", onclick: () => {
            it.done = new Date().toISOString(); save(); log("growth_goal_done", { competency: it.comp, role: it.role, days: it.days }); render(); } }, "Mark done")))),
        el("div", { class: "actions" },
          el("button", { class: "btn btn-ghost", type: "button", onclick: () => { planDraft = { priorities: p.items.filter(i => i.role === "grow").map(i => i.comp), strength: (p.items.find(i => i.role === "strength") || {}).comp || "", goals: {}, acts: {}, days: {} }; render(); } }, "Change my plan"),
          el("button", { class: "btn", type: "button", onclick: () => { tab = "check"; render(); } }, "New check-in")));
      return box;
    }
    if (!planDraft) planDraft = { priorities: [], strength: "", goals: {}, acts: {}, days: {} };
    const d = planDraft, ids = Object.keys(COMPS);
    const rated = ids.filter(i => now[i] > 0), suggested = rated.filter(i => now[i] <= 2);
    box.append(el("p", { class: "section-sub" }, "You choose. Pick one or two things to grow and one strength to use. A good plan builds on what you already do well."),
      el("label", { class: "hint" }, `Things I want to grow (pick up to 2)${suggested.length ? ". Suggested from your check-in are marked ★." : ""}`),
      el("div", { class: "chips", role: "group", "aria-label": "Things to grow" }, ids.map(id => el("button", { type: "button", class: "pill", "aria-pressed": String(d.priorities.includes(id)), onclick: () => {
        if (d.priorities.includes(id)) d.priorities = d.priorities.filter(x => x !== id); else if (d.priorities.length < 2 && id !== d.strength) d.priorities.push(id); render(); } }, (suggested.includes(id) ? "★ " : "") + COMPS[id].name))),
      el("label", { class: "hint" }, "A strength I will use"),
      el("div", { class: "chips", role: "group", "aria-label": "Strength to use" }, ids.filter(id => !d.priorities.includes(id)).map(id =>
        el("button", { type: "button", class: "pill", "aria-pressed": String(d.strength === id), onclick: () => { d.strength = id; render(); } }, (now[id] >= 3 ? "✓ " : "") + COMPS[id].name))));
    const picks = [...d.priorities.map(id => [id, "grow"]), ...(d.strength ? [[d.strength, "strength"]] : [])];
    picks.forEach(([id, role]) => {
      const c = COMPS[id], goal = el("textarea", { maxlength: "200", "aria-label": `Goal for ${c.name}`, placeholder: role === "grow" ? "In a few weeks I will…" : "I will use this strength to…" });
      goal.value = d.goals[id] || ""; goal.addEventListener("input", () => { d.goals[id] = goal.value; });
      box.append(el("fieldset", { class: "comp" }, el("legend", {}, `${c.name} · ${role === "grow" ? "grow" : "use"}`),
        el("label", { class: "hint" }, "Activity"), chips(c.acts.map(a => [a, a]), d.acts[id], v => { d.acts[id] = v; render(); }, `Activity for ${c.name}`),
        el("label", { class: "hint" }, "My goal"), goal,
        el("label", { class: "hint" }, "How long?"), chips(HORIZONS.map(n => [n, `${n} days`]), d.days[id], v => { d.days[id] = v; render(); }, "Time frame")));
    });
    box.append(el("div", { class: "actions" },
      el("button", { class: "btn", type: "button", onclick: () => {
        if (!d.priorities.length || !d.strength || picks.some(([id]) => !d.acts[id] || !(d.goals[id] || "").trim() || !d.days[id])) { flash("Pick something to grow, a strength, and an activity, goal, and time for each."); return; }
        const t0 = new Date();
        data.plan = { startedAt: t0.toISOString(), items: picks.map(([id, role]) => ({ comp: id, role, activity: d.acts[id], goal: d.goals[id].trim(), days: d.days[id], due: new Date(t0.getTime() + d.days[id] * 864e5).toISOString(), done: null })) };
        save(); log("growth_plan_set", { grow: d.priorities, strength: d.strength, days: picks.map(([id]) => d.days[id]) });
        planDraft = null; flash("Plan saved."); render(); } }, "Save my plan"),
      data.plan ? el("button", { class: "btn btn-ghost", type: "button", onclick: () => { planDraft = null; render(); } }, "Cancel") : null));
    return box;
  }

  // ---------- Tab 4: my journey ----------
  // What a mentor recorded for this student (skill, level, help, date). Needs a server sign-in; the mentor's note and name are never sent to the student.
  let mentorRows = null;
  function mentorSaw() {
    const box = el("div", { class: "card jcard" });
    if (!(window.FFAuth && FFAuth.getToken && FFAuth.getToken())) return null;
    const paint = () => {
      const rows = (mentorRows || []).filter(o => o.level > 0);
      box.replaceChildren(el("h3", { class: "sub" }, "What an adult saw"),
        rows.length ? el("ul", { class: "jlist" }, rows.slice(0, 8).map(o => el("li", {}, el("span", { class: "jname" }, (COMPS[o.competency] || {}).name || o.competency),
          meter(o.level, 0), el("span", { class: "hint" }, `${o.source === "teacher" ? "A teacher" : "A mentor"} saw ${levelName(o.level)} · ${(SUPPORT.find(x => x[0] === o.assistance) || [])[1] || ""} · ${dateStr(o.at)}`))))
          : el("p", { class: "hint" }, mentorRows ? "A mentor or teacher has not added anything yet. Ask one to watch you try a challenge." : "Loading…"),
        el("p", { class: "hint" }, "An adult’s view is one more point of view, not a grade. It can differ from yours."));
    };
    paint();
    if (!mentorRows) FFAuth.serverFetch("/student/observations").then(r => { mentorRows = r ? r.observations : []; paint(); });
    return box;
  }
  function renderJourney() {
    const box = el("div", {});
    const saw = mentorSaw();
    if (!data.checks.length) {
      box.append(el("p", { class: "section-sub" }, "Your journey shows up here after your first check-in."), el("button", { class: "btn", type: "button", onclick: () => { tab = "check"; render(); } }, "Do my check-in"));
      if (saw) box.append(saw);
      return box;
    }
    const now = latest(), base = baseline(), multi = data.checks.length > 1;
    const strong = Object.keys(COMPS).filter(i => now[i] >= 3), notYet = Object.keys(COMPS).filter(i => !(now[i] > 0));
    const growing = data.plan ? data.plan.items.filter(i => i.role === "grow").map(i => i.comp) : [];
    box.append(el("p", { class: "section-sub" }, `Your own ratings from ${dateStr(data.checks[data.checks.length - 1].at)}. They are not a grade and they change as you practice.${multi ? " The faint segment marks where you started." : ""}`));
    if (strong.length) box.append(el("p", {}, el("b", {}, "Strengths so far: "), strong.map(i => COMPS[i].name).join(", ")));
    if (growing.length) box.append(el("p", {}, el("b", {}, "What I’m growing: "), growing.map(i => COMPS[i].name).join(", ")));
    DOMAINS.forEach(dm => box.append(el("div", { class: "card jcard" }, el("h3", { class: "sub" }, dm.name),
      el("ul", { class: "jlist" }, dm.comps.map(id => {
        const lv = now[id] || 0, b = base[id] || 0;
        const text = lv ? levelName(lv) + (multi && b && b !== lv ? ` (started at ${levelName(b)})` : "") : "Not yet tried";
        return el("li", {}, el("span", { class: "jname" }, COMPS[id].name), meter(lv, multi ? b : 0), el("span", { class: "hint" }, text));
      })))));
    if (notYet.length) box.append(el("p", { class: "hint" }, `Not yet tried: ${notYet.map(i => COMPS[i].name).join(", ")}. A challenge is a good way to try them.`));
    const done = data.challenges.filter(c => c.status === "done").length, goals = data.plan ? data.plan.items.filter(i => i.done).length : 0;
    if (saw) box.append(saw);
    box.append(el("p", {}, `Check-ins: ${data.checks.length} · Challenges looked back on: ${done} · Plan goals done: ${goals}`),
      el("p", { class: "hint" }, "Self-ratings only for now. Mentor, teacher and peer views are planned. Nothing here is used to rank students or decide who gets to lead."));
    return box;
  }

  // ---------- Frame ----------
  let toast = "";
  function flash(msg) { toast = msg; render(); setTimeout(() => { if (toast === msg) { toast = ""; const t = root.querySelector(".toast"); if (t) t.textContent = ""; } }, 4000); }
  function render() {
    const body = { check: renderCheck, challenges: renderChallenges, plan: renderPlan, journey: renderJourney }[tab]();
    root.replaceChildren(
      el("div", { class: "tabs", role: "tablist", "aria-label": "Leadership Lab" }, TABS.map(([id, name]) =>
        el("button", { type: "button", role: "tab", class: "pill", "aria-selected": String(id === tab), "aria-pressed": String(id === tab), onclick: () => { tab = id; building = answering = null; if (id !== "plan") planDraft = null; render(); } }, name))),
      el("p", { class: "toast hint", role: "status", "aria-live": "polite" }, toast), body);
  }
  render();
})();
