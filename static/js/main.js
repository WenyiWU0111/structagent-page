// ── mobile nav toggle ───────────────────────────────────────────────
(function () {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.getElementById("navlinks");
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => links.classList.remove("open")));
  }
})();

// ── scroll reveal ───────────────────────────────────────────────────
function armReveal(scope) {
  const els = (scope || document).querySelectorAll(".reveal:not(.in)");
  if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
  const io = new IntersectionObserver((ents) => {
    ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  els.forEach((e) => io.observe(e));
}

// ── Skill Library gallery ───────────────────────────────────────────
async function buildSkills() {
  const grid = document.getElementById("skill-grid");
  if (!grid) return;
  let data;
  try { data = await (await fetch("static/data/skills.json")).json(); }
  catch (e) { grid.innerHTML = '<p class="lead">Skill data unavailable.</p>'; return; }

  const noteEl = document.getElementById("skill-note");
  if (noteEl) noteEl.innerHTML =
    `Mined <b>${data.total_mined}</b> reusable skills offline from solved trajectories — a curated <b>${data.skills.length}</b> shown here, filterable by application.`;

  // filter chips
  const chips = document.getElementById("skill-chips");
  const counts = {};
  data.skills.forEach((s) => (counts[s.domain] = (counts[s.domain] || 0) + 1));
  const mk = (key, label, n, active) =>
    `<button class="chip${active ? " active" : ""}" data-f="${key}">${label}<span class="c">${n}</span></button>`;
  chips.innerHTML = mk("all", "All", data.skills.length, true) +
    data.domains.map((d) => mk(d.key, d.label, counts[d.key] || 0, false)).join("");

  // cards
  grid.innerHTML = data.skills.map((s, i) => `
    <article class="card skill-card reveal ${["d1","d2","d3"][i%3]}" data-dom="${s.domain}">
      <div class="skill-top"><span class="pill">${s.domainLabel}</span></div>
      <h3>${s.title}</h3>
      <p class="skill-when">${s.when}</p>
      <div class="skill-meta"><span><b>${s.n_tasks}</b> source tasks</span><span><b>${s.steps.length}</b> steps</span></div>
      <button class="skill-toggle">View plan template →</button>
      <div class="skill-plan">
        <ol>${s.steps.map((t) => `<li>${t}</li>`).join("")}</ol>
        ${s.pitfall ? `<div class="skill-pitfall"><b>⚠ Pitfall.</b> ${s.pitfall}</div>` : ""}
      </div>
    </article>`).join("");

  // filter
  chips.addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    chips.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    b.classList.add("active");
    const f = b.dataset.f;
    grid.querySelectorAll(".skill-card").forEach((c) =>
      c.classList.toggle("hide", f !== "all" && c.dataset.dom !== f));
  });
  // expand
  grid.addEventListener("click", (e) => {
    const t = e.target.closest(".skill-toggle"); if (!t) return;
    const plan = t.nextElementSibling; const open = plan.classList.toggle("open");
    t.textContent = open ? "Hide plan template ↑" : "View plan template →";
  });

  armReveal(grid);
}

buildSkills();
armReveal(document);

// ── Demo case carousel ──────────────────────────────────────────────
(function () {
  const img = document.getElementById("demo-img");
  if (!img) return;
  const CASES = [
    { id: "payment", tab: "Verifier vs. hallucination", n: 8,
      blurb: "The task needs data <b>read from Calc</b> and <b>written into Thunderbird</b>. The baseline closes the spreadsheet and fabricates recipients — self-scoring 1/4 correct (0.0). StructAgent's ledger requires every outcome verified via the accessibility tree before the write step (1.0)." },
    { id: "iphone", tab: "Per-outcome checkpoints", n: 8,
      blurb: "Three independent product comparisons. The <b>per-outcome ledger</b> checkpoints each selection, so a single failed click can't silently undo the others." },
    { id: "bert", tab: "Ledger as anchor", n: 8,
      blurb: "A long Calc → Chrome → Calc → Writer pipeline. The verifier <b>reads the structured spreadsheet directly</b> instead of inferring the answer from screenshots." },
  ];
  const tabsEl = document.getElementById("demo-tabs"),
        blurbEl = document.getElementById("demo-blurb"),
        dotsEl = document.getElementById("demo-dots"),
        counterEl = document.getElementById("demo-counter"),
        prev = document.getElementById("demo-prev"), next = document.getElementById("demo-next");
  let ci = 0, si = 0;
  const src = (c, i) => `static/images/demos/${CASES[c].id}_${i + 1}.png`;
  CASES.forEach((c) => { for (let i = 0; i < c.n; i++) new Image().src = src(CASES.indexOf(c), i); });

  tabsEl.innerHTML = CASES.map((c, i) => `<button class="tab${i ? "" : " active"}" data-i="${i}">${c.tab}</button>`).join("");
  function render() {
    const c = CASES[ci];
    img.src = src(ci, si);
    tabsEl.querySelectorAll(".tab").forEach((t, i) => t.classList.toggle("active", i === ci));
    blurbEl.innerHTML = c.blurb;
    dotsEl.innerHTML = Array.from({ length: c.n }, (_, i) => `<button class="dot${i === si ? " active" : ""}" data-i="${i}"></button>`).join("");
    counterEl.textContent = `${si + 1} / ${c.n}`;
  }
  tabsEl.addEventListener("click", (e) => { const b = e.target.closest(".tab"); if (!b) return; ci = +b.dataset.i; si = 0; render(); });
  dotsEl.addEventListener("click", (e) => { const b = e.target.closest(".dot"); if (!b) return; si = +b.dataset.i; render(); });
  prev.addEventListener("click", () => { si = (si - 1 + CASES[ci].n) % CASES[ci].n; render(); });
  next.addEventListener("click", () => { si = (si + 1) % CASES[ci].n; render(); });
  render();
})();

// ── Trajectories: explorer + step-player (unified) ──────────────────
(async function () {
  const list = document.getElementById("traj-list");
  if (!list) return;
  let index, play;
  try {
    index = (await (await fetch("static/data/trajectories.json")).json()).runs || [];
    play = await (await fetch("static/data/trajectories_play.json")).json();
  } catch (e) { return; }
  const isPlay = (r) => r.ok && play[r.pid];
  const HF = "https://huggingface.co/datasets/WenyiWU0111/structagent-page-assets/resolve/main";
  const img = (pid, i) => `${HF}/traj/${pid}/s${i}.jpg`;
  const domMap = {}; index.forEach((r) => (domMap[r.dom] = r.domLabel));
  const domains = Object.entries(domMap).map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label));

  const solved = index.filter((r) => r.ok).length;
  document.getElementById("traj-stat").innerHTML =
    `<div class="s"><b>${index.length}</b><span>runs released</span></div>
     <div class="s"><b>${solved}</b><span>solved &amp; verified</span></div>
     <div class="s"><b>${Object.keys(play).length}</b><span>playable step-by-step</span></div>
     <div class="s"><b>${domains.length}</b><span>desktop domains</span></div>`;

  // featured: one per domain (prefer 27B), up to 12
  const featured = [], seen = new Set();
  for (const bb of ["27B", "9B"]) for (const r of index) {
    if (featured.length >= 12) break;
    if (r.bb === bb && isPlay(r) && !seen.has(r.dom)) { featured.push(r); seen.add(r.dom); }
  }
  for (const r of index) { if (featured.length >= 12) break; if (isPlay(r) && !featured.includes(r)) featured.push(r); }
  const grid = document.getElementById("traj-featured");
  grid.innerHTML = featured.map((r) => { const p = play[r.pid]; return `
    <article class="card tcard reveal" data-pid="${r.pid}">
      <div class="tthumb"><img src="${img(r.pid, p.nsteps)}" loading="lazy" alt=""><span class="tplay">▶</span></div>
      <div class="tcard-body">
        <div class="tpills"><span class="bb">${r.bb}</span><span class="dpill">${r.domLabel}</span></div>
        <p class="tinstr">${r.instr}</p>
        <span class="tsteps">${p.nsteps} steps · <span class="y">✓ solved</span></span>
      </div></article>`; }).join("");
  armReveal(grid);

  // index list
  const bbEl = document.getElementById("traj-bb"), domEl = document.getElementById("traj-dom"),
        more = document.getElementById("traj-more"), search = document.getElementById("traj-search");
  bbEl.innerHTML = ['<button class="chip active" data-bb="all">All backbones</button>',
    '<button class="chip" data-bb="9B">Qwen3.5-9B</button>', '<button class="chip" data-bb="27B">Qwen3.5-27B</button>',
    '<button class="chip" data-bb="solved">Solved only</button>'].join("");
  domEl.innerHTML = '<button class="chip active" data-dom="all">All domains</button>' +
    domains.map((d) => `<button class="chip" data-dom="${d.key}">${d.label}</button>`).join("");
  let bb = "all", dom = "all", solvedOnly = false, q = "", shown = 24;
  const filtered = () => index.filter((r) =>
    (bb === "all" || r.bb === bb) && (dom === "all" || r.dom === dom) && (!solvedOnly || r.ok) && (!q || r.instr.toLowerCase().includes(q)));
  function renderList() {
    const rows = filtered();
    list.innerHTML = rows.slice(0, shown).map((r) => { const pl = isPlay(r); return `
      <div class="trow${pl ? " play" : ""}"${pl ? ` data-pid="${r.pid}"` : ""}>
        <span class="ok ${r.ok ? "y" : "n"}">${r.ok ? "✓" : "✕"}</span>
        <span class="bb">${r.bb}</span><span class="dpill">${r.domLabel}</span>
        <span class="instr">${r.instr}</span>
        ${pl ? '<span class="rplay">▶ play</span>' : ""}
      </div>`; }).join("") || '<div class="tempty">No runs match these filters.</div>';
    more.hidden = rows.length <= shown;
    if (!more.hidden) more.textContent = `Show more (${rows.length - shown} more)`;
  }
  bbEl.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (!b) return;
    if (b.dataset.bb === "solved") { solvedOnly = !solvedOnly; b.classList.toggle("active"); }
    else { bb = b.dataset.bb; bbEl.querySelectorAll(".chip").forEach((c) => { if (c.dataset.bb !== "solved") c.classList.remove("active"); }); b.classList.add("active"); }
    shown = 24; renderList(); });
  domEl.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (!b) return;
    dom = b.dataset.dom; domEl.querySelectorAll(".chip").forEach((c) => c.classList.remove("active")); b.classList.add("active"); shown = 24; renderList(); });
  search.addEventListener("input", () => { q = search.value.trim().toLowerCase(); shown = 24; renderList(); });
  more.addEventListener("click", () => { shown += 40; renderList(); });
  renderList();

  // player modal
  const modal = document.getElementById("tplayer"), mImg = document.getElementById("tp-img"),
        mStep = document.getElementById("tp-step"), mCap = document.getElementById("tp-cap"),
        mProg = document.getElementById("tp-prog"), mBB = document.getElementById("tp-bb"),
        mDom = document.getElementById("tp-dom"), mInstr = document.getElementById("tp-instr"), mPlay = document.getElementById("tp-play");
  let cur = null, si = 0, timer = null, lastFocus = null;
  const stopAuto = () => { if (timer) { clearInterval(timer); timer = null; } mPlay.textContent = "▶ Play"; };
  function draw() {
    mImg.src = img(cur.pid, si + 1);
    mStep.textContent = `Step ${si + 1} / ${cur.p.nsteps}`;
    mCap.textContent = (cur.p.steps[si] || {}).cap || "";
    mProg.innerHTML = cur.p.steps.map((_, i) => `<div class="tp-seg ${i === si ? "on" : i < si ? "done" : ""}" data-i="${i}"></div>`).join("");
    if (si + 1 < cur.p.nsteps) new Image().src = img(cur.pid, si + 2);
  }
  const go = (i) => { si = (i + cur.p.nsteps) % cur.p.nsteps; draw(); };
  function openPlayer(pid) {
    const p = play[pid]; if (!p) return;
    cur = { pid, p }; si = 0; lastFocus = document.activeElement;
    mBB.textContent = p.bb; mDom.textContent = p.domLabel; mInstr.textContent = p.instr;
    p.steps.forEach((_, i) => new Image().src = img(pid, i + 1));
    draw(); modal.hidden = false; document.body.style.overflow = "hidden";
    document.getElementById("tp-close").focus();
  }
  function close() { stopAuto(); modal.hidden = true; document.body.style.overflow = ""; cur = null; if (lastFocus) lastFocus.focus(); }
  grid.addEventListener("click", (e) => { const c = e.target.closest(".tcard"); if (c) openPlayer(c.dataset.pid); });
  list.addEventListener("click", (e) => { const r = e.target.closest(".trow.play"); if (r) openPlayer(r.dataset.pid); });
  document.getElementById("tp-prev").addEventListener("click", () => { stopAuto(); go(si - 1); });
  document.getElementById("tp-next").addEventListener("click", () => { stopAuto(); go(si + 1); });
  mProg.addEventListener("click", (e) => { const s = e.target.closest(".tp-seg"); if (s) { stopAuto(); go(+s.dataset.i); } });
  document.getElementById("tp-close").addEventListener("click", close);
  document.getElementById("tp-backdrop").addEventListener("click", close);
  mPlay.addEventListener("click", () => {
    if (timer) { stopAuto(); return; }
    mPlay.textContent = "❚❚ Pause";
    timer = setInterval(() => { if (si + 1 >= cur.p.nsteps) { stopAuto(); return; } go(si + 1); }, 1400);
  });
  document.addEventListener("keydown", (e) => {
    if (modal.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") { stopAuto(); go(si - 1); }
    else if (e.key === "ArrowRight") { stopAuto(); go(si + 1); }
  });
})();
