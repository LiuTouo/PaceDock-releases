function initMotion() {
  const root = document.documentElement;
  root.classList.add("js");
  if (!("IntersectionObserver" in window)) return;

  const wide = matchMedia("(min-width: 1024px) and (min-height: 760px)");
  const story = document.querySelector(".feature-story");
  const steps = [...story.querySelectorAll("[data-scene]")];
  const panels = [...story.querySelectorAll("[data-panel]")];
  const reveals = [
    ...document.querySelectorAll(
      ".section-heading, .feature, .secondary-features > p, .download-options > article, .quick-start > li, .closing-inner > *",
    ),
  ];
  let revealObserver;
  let sceneObserver;

  for (const element of reveals) {
    const peers = reveals.filter(
      (other) => other.parentElement === element.parentElement,
    );
    element.classList.add("reveal", `d${Math.min(peers.indexOf(element), 5)}`);
  }

  function showScene(name) {
    story.dataset.activeScene = name;
    for (const panel of panels) {
      panel.classList.toggle("is-active", panel.dataset.panel === name);
    }
  }

  function refreshMotion() {
    revealObserver?.disconnect();
    sceneObserver?.disconnect();
    root.classList.remove("motion-ready", "story-enabled");

    // Motion is optional: a failed observer must never hide the site or break the demo.
    try {
      revealObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add("in-view");
            revealObserver.unobserve(entry.target);
          }
        },
        { threshold: 0.08 },
      );
      for (const element of reveals) {
        if (!element.classList.contains("in-view"))
          revealObserver.observe(element);
      }
      root.classList.add("motion-ready");

      if (wide.matches) {
        const visible = new Map();
        sceneObserver = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting)
                visible.set(entry.target, entry.intersectionRatio);
              else visible.delete(entry.target);
            }
            const active = [...visible].sort((a, b) => b[1] - a[1])[0];
            if (active) showScene(active[0].dataset.scene);
          },
          {
            rootMargin: "-35% 0px -35% 0px",
            threshold: [0, 0.25, 0.5, 0.75, 1],
          },
        );
        showScene(story.dataset.activeScene);
        root.classList.add("story-enabled");
        for (const step of steps) sceneObserver.observe(step);
      }
    } catch {
      revealObserver?.disconnect();
      sceneObserver?.disconnect();
      root.classList.remove("motion-ready", "story-enabled");
    }
  }

  root.addEventListener("focusin", (event) => {
    const element = event.target.closest(".reveal");
    if (!element) return;
    element.classList.add("in-view");
    revealObserver?.unobserve(element);
  });
  wide.addEventListener("change", refreshMotion);
  refreshMotion();
}

function initParallax() {
  // Pointer tilt via the Web Animations API: the CSP blocks inline style
  // attributes, and cancel-and-retween keeps motion interruptible without any
  // per-frame style writes.
  const coarse = matchMedia("(hover: none), (pointer: coarse)");
  if (coarse.matches || !("IntersectionObserver" in window))
    return;
  const zone = document.querySelector(".hero");
  const stage = document.querySelector(".hero-visual");
  if (!zone || !stage) return;
  let tilt = null;
  let raf = 0;
  let pending = null;
  let visible = false;
  function tween(rx, ry) {
    tilt?.cancel();
    tilt = stage.animate(
      { transform: `perspective(900px) rotateX(${rx}) rotateY(${ry})` },
      { duration: 650, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" },
    );
  }
  function applyTilt(event) {
    const bounds = zone.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    tween(`${(-y * 4).toFixed(2)}deg`, `${(x * 5).toFixed(2)}deg`);
  }
  function rest() {
    tween("0deg", "0deg");
  }
  function onMove(event) {
    pending = event;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const current = pending;
      pending = null;
      if (current && visible) applyTilt(current);
    });
  }
  try {
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) rest(); // settle flat once the hero leaves the viewport
    });
    observer.observe(zone);
  } catch {
    // A failed observer must never break the page or the demo.
    return;
  }
  zone.addEventListener("pointermove", onMove);
  zone.addEventListener("pointerleave", rest);
}

function initSmoothScroll() {
  // Wheel-lerp smooth scrolling (design-site inertia). Native paths stay in
  // charge: any scroll we did not cause snaps the target back immediately.
  const coarse = matchMedia("(hover: none), (pointer: coarse)");
  if (coarse.matches) return;
  let target = null;
  let last = -1;
  let raf = 0;
  function loop() {
    raf = 0;
    const remaining = target - scrollY;
    if (Math.abs(remaining) < 0.5) {
      last = target;
      window.scrollTo(0, target);
      return;
    }
    last = scrollY + remaining * 0.14;
    window.scrollTo(0, last);
    raf = requestAnimationFrame(loop);
  }
  addEventListener(
    "wheel",
    (event) => {
      // Keep native behavior for pinch-zoom and horizontal scrolls in code blocks.
      if (
        event.ctrlKey ||
        event.defaultPrevented ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
      )
        return;
      event.preventDefault();
      const scale = event.deltaMode === 1 ? 16 : 1;
      const max = document.documentElement.scrollHeight - innerHeight;
      target = Math.max(
        0,
        Math.min(max, (target ?? scrollY) + event.deltaY * scale),
      );
      if (!raf) raf = requestAnimationFrame(loop);
    },
    { passive: false },
  );
  addEventListener(
    "scroll",
    () => {
      if (target === null) return;
      // A jump we did not author (anchor, keyboard, tests): resync instantly.
      if (Math.abs(scrollY - last) > 1.5) {
        target = scrollY;
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    { passive: true },
  );
}

const english = document.documentElement.lang === "en";
const copy = english
  ? {
      choose: "Select at least one candidate to start the test.",
      selected: "Candidates changed. Run the test again for a new ranking.",
      initial: "3 candidates selected. Press Start to see a demo ranking.",
      running: "Testing candidates with the synthetic load… (demo)",
      closeRace:
        "The top two are close—no preset winner. Choose which core to apply.",
      ready: "Ranking ready. Confirm to apply (demo).",
      singleReady:
        "Single candidate: nothing to compare against. You can still apply it (demo).",
      done: "Demo apply complete. No system settings were changed.",
      close: "close",
      solo: "no comparison",
      applied: "Applied",
      mask: "· demo mask",
      restore:
        "Restore stays available—back to the original Windows policy",
    }
  : {
      choose: "請至少勾選一個候選，才能開始測試。",
      selected: "候選已變更，請重新測試再排名。",
      initial: "已選 3 顆候選。按「開始測試」看示範排名。",
      running: "正在以合成負載測試候選……（示範）",
      closeRace: "前兩名差異接近——不預設勝者，請自行選擇要套用的核心。",
      ready: "排名出爐。確認後即可套用（示範）。",
      singleReady: "單一候選：沒有比較對象。仍可選擇套用（示範）。",
      done: "示範套用完成。未變更任何系統設定。",
      close: "差異接近",
      solo: "無比較對象",
      applied: "已套用",
      mask: "· 示範遮罩",
      restore: "還原入口隨時可用——回到 Windows 原始策略",
    };

// Fictional fixtures only: no GPU, driver, registry, or network access.
const candidates = english
  ? {
      core1: { name: "Core 1", lp: "LP 2, 3", score: 97.2 },
      core3: { name: "Core 3", lp: "LP 6, 7", score: 98.7 },
      core5: { name: "Core 5", lp: "LP 10, 11", score: 98.5 },
    }
  : {
      core1: { name: "實體核心 1", lp: "LP 2、3", score: 97.2 },
      core3: { name: "實體核心 3", lp: "LP 6、7", score: 98.7 },
      core5: { name: "實體核心 5", lp: "LP 10、11", score: 98.5 },
    };
const defaults = ["core1", "core3", "core5"];
// Bar widths are classes, not inline styles: the CSP forbids style attributes.
const barClass = { 98.7: "w90", 98.5: "w83", 97.2: "w40" };

const app = document.querySelector("#demo-app");
const picker = document.querySelector("#candidate-picker");
const inputs = [...picker.querySelectorAll('input[name="candidate"]')];
const testButton = document.querySelector("#test-button");
const applyButton = document.querySelector("#apply-button");
const resetButton = document.querySelector("#reset-demo");
const status = document.querySelector("#demo-status");
const empty = document.querySelector("#demo-empty");
const panel = document.querySelector("#ranking-panel");
const rankList = document.querySelector("#rank-list");
const winnerPicker = document.querySelector("#winner-picker");
const result = document.querySelector("#demo-result");
const resultList = document.querySelector("#result-list");
let ranking = null;
let completed = false;
let closeRace = false;

function focusDemo(element) {
  // Step changes need visible focus now, not partway through native smooth scrolling.
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: "center", behavior: "instant" });
}

function selectedCandidates() {
  return inputs.filter((input) => input.checked).map((input) => input.value);
}

function announce(message, warning = false) {
  status.textContent = message;
  status.dataset.tone = warning ? "warning" : "info";
}

function setStep(step) {
  for (const item of app.querySelectorAll("[data-step]")) {
    if (item.dataset.step === step) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  }
}

function clearRanking(initial = false) {
  ranking = null;
  completed = false;
  closeRace = false;
  rankList.replaceChildren();
  resultList.replaceChildren();
  winnerPicker.replaceChildren();
  winnerPicker.hidden = true;
  panel.hidden = true;
  result.hidden = true;
  empty.hidden = false;
  picker.disabled = false;
  testButton.disabled = selectedCandidates().length === 0;
  applyButton.disabled = true;
  setStep("select");
  announce(
    testButton.disabled
      ? copy.choose
      : initial
        ? copy.initial
        : copy.selected,
    testButton.disabled,
  );
}

function rankRow(id, index) {
  const candidate = candidates[id];
  const article = document.createElement("article");
  article.className = "rank-card";
  const heading = document.createElement("div");
  heading.className = "rank-card-heading";
  const title = document.createElement("h4");
  title.textContent = candidate.name;
  const meta = document.createElement("span");
  meta.className = "rank-meta";
  const pill = document.createElement("span");
  pill.className = "pill neutral";
  pill.textContent = `#${index + 1}`;
  meta.append(pill);
  if (closeRace && index === 1) {
    const close = document.createElement("span");
    close.className = "pill warning";
    close.textContent = copy.close;
    meta.append(close);
  }
  if (ranking.length === 1) {
    const solo = document.createElement("span");
    solo.className = "pill warning";
    solo.textContent = copy.solo;
    meta.append(solo);
  }
  heading.append(title, meta);
  const row = document.createElement("div");
  row.className = `gauge-row${index === 0 ? " winner" : index === 1 && closeRace ? " close" : " dim"}`;
  const rank = document.createElement("span");
  rank.className = "gauge-rank";
  rank.textContent = `#${index + 1}`;
  const name = document.createElement("span");
  name.className = "gauge-name";
  name.textContent = candidate.name;
  const small = document.createElement("small");
  small.textContent = candidate.lp;
  name.append(small);
  const score = document.createElement("span");
  score.className = "gauge-score";
  score.textContent = candidate.score.toFixed(1);
  const bar = document.createElement("span");
  bar.className = "gauge-bar";
  const fill = document.createElement("span");
  fill.className = barClass[candidate.score];
  bar.append(fill);
  row.append(rank, name, score, bar);
  const note = document.createElement("p");
  note.className = "rank-note";
  note.textContent = `${candidate.lp} · ${candidate.score.toFixed(1)} pts`;
  article.append(heading, row, note);
  return article;
}

function renderWinnerPicker(topTwo) {
  winnerPicker.replaceChildren();
  const legend = document.createElement("legend");
  legend.textContent = copy.closeRace;
  winnerPicker.append(legend);
  for (const id of topTwo) {
    const candidate = candidates[id];
    const label = document.createElement("label");
    label.className = "winner-option";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "winner";
    input.value = id;
    const text = document.createElement("span");
    const strong = document.createElement("strong");
    strong.textContent = candidate.name;
    text.append(strong);
    const score = document.createElement("span");
    score.className = "rank-score";
    score.textContent = candidate.score.toFixed(1);
    label.append(input, text, score);
    winnerPicker.append(label);
  }
  winnerPicker.hidden = false;
}

function updateApproval() {
  if (!closeRace) {
    applyButton.disabled = !ranking || completed;
    announce(ranking?.length === 1 ? copy.singleReady : copy.ready);
    return;
  }
  const chosen = winnerPicker.querySelector('input[name="winner"]:checked');
  applyButton.disabled = !chosen || completed;
  announce(chosen ? copy.ready : copy.closeRace, !chosen);
}

for (const input of inputs) {
  input.addEventListener("change", () => clearRanking());
}

testButton.addEventListener("click", () => {
  const selected = selectedCandidates();
  if (!selected.length || completed) return;
  announce(copy.running);
  ranking = [...selected].sort(
    (a, b) => candidates[b].score - candidates[a].score,
  );
  closeRace =
    ranking.length >= 2 &&
    (candidates[ranking[0]].score - candidates[ranking[1]].score) / 100 <=
      0.005;
  rankList.replaceChildren(...ranking.map((id, index) => rankRow(id, index)));
  if (closeRace) renderWinnerPicker(ranking.slice(0, 2));
  empty.hidden = true;
  result.hidden = true;
  panel.hidden = false;
  setStep("rank");
  updateApproval();
  focusDemo(document.querySelector("#ranking-title"));
});

winnerPicker.addEventListener("change", updateApproval);

applyButton.addEventListener("click", () => {
  if (!ranking || completed || applyButton.disabled) return;
  const chosen =
    winnerPicker.querySelector('input[name="winner"]:checked')?.value ??
    ranking[0];
  const candidate = candidates[chosen];
  completed = true;
  picker.disabled = true;
  testButton.disabled = true;
  applyButton.disabled = true;
  resultList.replaceChildren();
  const applied = document.createElement("li");
  applied.textContent = `${copy.applied} ${candidate.name}（${candidate.lp}）${copy.mask}`;
  const restore = document.createElement("li");
  restore.textContent = copy.restore;
  resultList.append(applied, restore);
  panel.hidden = true;
  empty.hidden = true;
  result.hidden = false;
  setStep("complete");
  announce(copy.done);
  focusDemo(document.querySelector("#result-title"));
});

resetButton.addEventListener("click", () => {
  for (const input of inputs) input.checked = defaults.includes(input.value);
  clearRanking(true);
  focusDemo(inputs[0]);
});

clearRanking(true);
app.hidden = false;
initMotion();
initParallax();
initSmoothScroll();
