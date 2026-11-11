import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const HTML_PATH = path.resolve(process.cwd(), "public/atlas.html");
const htmlSource = fs.readFileSync(HTML_PATH, "utf8");

/**
 * Lightweight DOM & Event simulation tailored for public/atlas.html
 */
function createAtlasEnv() {
  const elementsById = new Map();
  const docListeners = new Map();
  const winListeners = new Map();
  const storage = new Map();
  const fetchCalls = [];

  class ClassList {
    constructor(el, initial = "") {
      this.el = el;
      this.set = new Set(initial.split(/\s+/).filter(Boolean));
    }
    _sync() {
      this.el._className = [...this.set].join(" ");
    }
    add(...cls) {
      cls.forEach((c) => c && this.set.add(c));
      this._sync();
    }
    remove(...cls) {
      cls.forEach((c) => this.set.delete(c));
      this._sync();
    }
    contains(c) {
      return this.set.has(c);
    }
    toggle(c, force) {
      const shouldHave = force !== undefined ? !!force : !this.set.has(c);
      if (shouldHave) this.set.add(c);
      else this.set.delete(c);
      this._sync();
      return shouldHave;
    }
  }

  class MockElement {
    constructor(tagName = "div", id = "") {
      this.tagName = tagName.toUpperCase();
      this.id = id;
      this._className = "";
      this.classList = new ClassList(this, "");
      this.style = { setProperty() {} };
      this.dataset = {};
      this.attributes = new Map();
      this.children = [];
      this.parentElement = null;
      this.listeners = new Map();
      this._innerHTML = "";
      this.textContent = "";
      this.value = "";
      this.scrollTop = 0;
      this.offsetWidth = 100;
      this.width = 1280;
      this.height = 800;
      if (id) elementsById.set(id, this);
    }
    get className() {
      return this._className;
    }
    set className(v) {
      this._className = String(v || "");
      this.classList = new ClassList(this, this._className);
    }
    get innerHTML() {
      return this._innerHTML;
    }
    set innerHTML(html) {
      this._innerHTML = String(html || "");
      this.textContent = this._innerHTML.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      parseIdsFromHTML(this._innerHTML, this);
    }
    setAttribute(k, v) {
      this.attributes.set(k, String(v));
      if (k === "id") {
        this.id = String(v);
        elementsById.set(this.id, this);
      } else if (k === "class") {
        this.className = String(v);
      } else if (k.startsWith("data-")) {
        const camel = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        this.dataset[camel] = String(v);
      }
    }
    getAttribute(k) {
      return this.attributes.get(k) ?? null;
    }
    appendChild(child) {
      if (child && typeof child === "object") {
        child.parentElement = this;
        this.children.push(child);
      }
      return child;
    }
    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(fn);
    }
    dispatchEvent(evt) {
      evt.target = evt.target || this;
      evt.stopPropagation = evt.stopPropagation || (() => { evt._stopped = true; });
      evt.preventDefault = evt.preventDefault || (() => { evt.defaultPrevented = true; });
      const fns = this.listeners.get(evt.type) || [];
      for (const fn of fns) fn(evt);
      if (!evt._stopped) {
        const docFns = docListeners.get(evt.type) || [];
        for (const fn of docFns) fn(evt);
      }
    }
    click() {
      this.dispatchEvent({ type: "click", target: this });
    }
    focus() {
      document.activeElement = this;
    }
    getBoundingClientRect() {
      return { left: 200, top: 200, width: 80, height: 80, right: 280, bottom: 280 };
    }
    getContext() {
      return {
        setTransform() {},
        fillRect() {},
        createRadialGradient() {
          return { addColorStop() {} };
        },
        beginPath() {},
        arc() {},
        fill() {},
        save() {},
        restore() {},
      };
    }
    querySelector(sel) {
      if (sel === ".node-inner") {
        if (!this._nodeInner) this._nodeInner = new MockElement("div");
        return this._nodeInner;
      }
      if (sel === ".reticle-wrap") {
        if (!this._reticleWrap) this._reticleWrap = new MockElement("div");
        return this._reticleWrap;
      }
      if (sel === ".planet-disc") {
        if (!this._planetDisc) this._planetDisc = new MockElement("div");
        return this._planetDisc;
      }
      return null;
    }
    closest(sel) {
      if (sel === "[data-act]") {
        let cur = this;
        while (cur) {
          if (cur.dataset && cur.dataset.act) return cur;
          cur = cur.parentElement;
        }
        return null;
      }
      if (sel === "[data-act='claim-comet']") {
        let cur = this;
        while (cur) {
          if (cur.dataset && cur.dataset.act === "claim-comet") return cur;
          cur = cur.parentElement;
        }
        return null;
      }
      return null;
    }
  }

  function parseIdsFromHTML(html, parentEl = null) {
    const tagRegex = /<([a-zA-Z0-9]+)\s+([^>]*?)>/g;
    let m;
    while ((m = tagRegex.exec(html)) !== null) {
      const tag = m[1];
      const attrs = m[2];
      const idMatch = attrs.match(/\bid="([^"]+)"/);
      const clsMatch = attrs.match(/\bclass="([^"]+)"/);
      const actMatch = attrs.match(/\bdata-act="([^"]+)"/);
      if (idMatch) {
        const id = idMatch[1];
        let el = elementsById.get(id);
        if (!el) {
          el = new MockElement(tag, id);
        }
        if (clsMatch) el.className = clsMatch[1];
        const dataRegex = /\bdata-([a-z0-9-]+)="([^"]*)"/g;
        let dm;
        while ((dm = dataRegex.exec(attrs)) !== null) {
          const camel = dm[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          el.dataset[camel] = dm[2];
        }
        if (parentEl) el.parentElement = parentEl;
      } else if (actMatch && parentEl) {
        const btn = new MockElement(tag);
        if (clsMatch) btn.className = clsMatch[1];
        const dataRegex = /\bdata-([a-z0-9-]+)="([^"]*)"/g;
        let dm;
        while ((dm = dataRegex.exec(attrs)) !== null) {
          const camel = dm[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          btn.dataset[camel] = dm[2];
        }
        btn.parentElement = parentEl;
        parentEl.children.push(btn);
      }
    }
  }

  // Pre-populate static IDs from public/atlas.html
  const bodyHtml = htmlSource.replace(/<script>[\s\S]*?<\/script>/g, "");
  parseIdsFromHTML(bodyHtml, null);

  const document = {
    body: new MockElement("body", "body"),
    activeElement: null,
    getElementById(id) {
      return elementsById.get(id) || null;
    },
    createElement(tag) {
      return new MockElement(tag);
    },
    createElementNS(_ns, tag) {
      return new MockElement(tag);
    },
    addEventListener(type, fn) {
      if (!docListeners.has(type)) docListeners.set(type, []);
      docListeners.get(type).push(fn);
    },
    dispatchEvent(evt) {
      const fns = docListeners.get(evt.type) || [];
      for (const fn of fns) fn(evt);
    },
  };

  const windowObj = {
    innerWidth: 1440,
    innerHeight: 900,
    devicePixelRatio: 1,
    location: {
      origin: "https://idemap.vercel.app",
      pathname: "/atlas.html",
      hash: "",
      search: "",
      href: "https://idemap.vercel.app/atlas.html",
    },
    history: {
      replaceState() {},
    },
    localStorage: {
      getItem: (k) => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: (k) => storage.delete(k),
    },
    navigator: {
      vibrate() {},
      clipboard: { writeText() {} },
    },
    confirm: () => true,
    requestAnimationFrame: () => 1,
    setTimeout: () => 1,
    clearTimeout: () => {},
    performance: { now: () => Date.now() },
    addEventListener(type, fn) {
      if (!winListeners.has(type)) winListeners.set(type, []);
      winListeners.get(type).push(fn);
    },
    fetch: async (url, opts) => {
      fetchCalls.push({ url, opts });
      return { ok: true, json: async () => [] };
    },
  };
  windowObj.window = windowObj;
  windowObj.top = windowObj;
  windowObj.document = document;

  const scriptMatch = htmlSource.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, "Expected inline <script> in public/atlas.html");

  const context = vm.createContext({
    window: windowObj,
    document,
    localStorage: windowObj.localStorage,
    navigator: windowObj.navigator,
    location: windowObj.location,
    history: windowObj.history,
    performance: windowObj.performance,
    fetch: windowObj.fetch,
    requestAnimationFrame: windowObj.requestAnimationFrame,
    setTimeout: windowObj.setTimeout,
    clearTimeout: windowObj.clearTimeout,
    console,
    Date,
    Math,
    JSON,
    Array,
    Object,
    Set,
    Map,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    Promise,
    URLSearchParams,
    encodeURIComponent,
    decodeURIComponent,
    parseInt,
    parseFloat,
    isNaN,
  });

  // Expose top-level `let`/`const` bindings on `globalThis.__test` for direct inspection
  const instrumentedScript = `
    ${scriptMatch[1]}
    globalThis.__test = {
      get STATE() { return STATE; },
      set STATE(v) { STATE = v; },
      get focusId() { return focusId; },
      set focusId(v) { focusId = v; },
      get selectedId() { return selectedId; },
      set selectedId(v) { selectedId = v; },
      get deskTopBarCollapsed() { return deskTopBarCollapsed; },
      get orbitPaused() { return orbitPaused; },
      get scene() { return scene; },
      P, childIds, descendants, ancestorsChain,
      taskStats, strainCount, strainPenalty, activityMass, weightedChildrenHealth,
      computeHealth, healthBreakdown, orbitalAlignmentStatus,
      taskXP, tierBaseXP, levelFromXP, xpForLevel, levelInfo, levelOf, levelInfoOf,
      evolutionTier, cosmicTitle, evaluateSolarShieldsAndComet, claimCometQuest,
      dive, select, toggleTask, undoRecurringCycle, deleteTask,
      openModal, closeModal, openTaskModal, confirmTask,
      openForge, openEditPlanet, confirmForge, deletePlanet,
      openTodayCheckinModal, renderTodayCheckinModal, triageOverdueTasks,
      openCmdModal, parseNaturalQuickAdd, executeCmdQuickCreate,
      openCosmeticsModal, renderCosmeticsModal,
      render, renderTopBar, renderHUD, renderMobile, rebuildScene,
      todayISO, addDays,
    };
  `;

  vm.runInContext(instrumentedScript, context);
  return {
    app: context.__test,
    document,
    window: windowObj,
    elementsById,
    fetchCalls,
    triggerClickAct(act, data = {}) {
      const btn = new MockElement("button");
      btn.dataset = { act, ...data };
      document.dispatchEvent({
        type: "click",
        target: btn,
        stopPropagation() {},
        preventDefault() {},
      });
    },
    triggerKeydown(key, extra = {}) {
      document.dispatchEvent({
        type: "keydown",
        key,
        target: document.activeElement || document.body,
        preventDefault() {},
        stopPropagation() {},
        ...extra,
      });
    },
  };
}

test("Bug 1 Fix: Clicking '+ Add Task' inside Today Focus modal opens standard taskModal IN FRONT of todayCheckinModal and updates Today queue", () => {
  const { app, document, triggerClickAct, triggerKeydown } = createAtlasEnv();

  // 1. Open Today Focus modal
  triggerClickAct("open-today-focus");
  const todayModal = document.getElementById("todayCheckinModal");
  const todayBody = document.getElementById("todayCheckinBody");
  assert.equal(todayModal.classList.contains("hidden"), false, "todayCheckinModal should be visible");

  // 2. Verify Today Focus header renders data-act="add-task" (+ Add Task) and NOT data-act="open-cmd"
  assert.match(todayBody.innerHTML, /data-act="add-task"/, "Today Focus should have a standard + Add Task button");
  assert.doesNotMatch(todayBody.innerHTML, /data-act="open-cmd"/, "Today Focus should not open the weird command bar popup");

  // 3. Click + Add Task while Today Focus modal is open
  triggerClickAct("add-task", { pid: "" });
  const taskModal = document.getElementById("taskModal");
  assert.equal(taskModal.classList.contains("hidden"), false, "taskModal should open");

  // Verify z-index stacking: taskModal MUST be strictly above todayCheckinModal!
  const todayZ = parseInt(todayModal.style.zIndex || "50", 10);
  const taskZ = parseInt(taskModal.style.zIndex || "50", 10);
  assert.ok(taskZ > todayZ, `Expected taskModal zIndex (${taskZ}) > todayCheckinModal zIndex (${todayZ})`);

  // Verify default due date is pre-filled to today
  assert.equal(document.getElementById("inputTaskDue").value, app.todayISO());

  // 4. Test Escape key closes ONLY the topmost modal (taskModal), leaving todayCheckinModal open
  triggerKeydown("Escape");
  assert.equal(taskModal.classList.contains("hidden"), true, "Escape should close topmost taskModal");
  assert.equal(todayModal.classList.contains("hidden"), false, "todayCheckinModal underneath should remain open");

  // 5. Re-open taskModal from Today Focus, create a task, and verify Today Focus immediately shows it
  triggerClickAct("add-task", { pid: "planet-home" });
  document.getElementById("inputTaskTitle").value = "Fix solar array";
  document.getElementById("selectTaskPlanet").value = "planet-home";
  document.getElementById("selectTaskDiff").value = "4";
  document.getElementById("inputTaskDue").value = app.todayISO();
  triggerClickAct("task-confirm");

  assert.equal(taskModal.classList.contains("hidden"), true, "taskModal closes after confirmTask");
  assert.equal(todayModal.classList.contains("hidden"), false, "todayCheckinModal stays open");
  assert.match(todayBody.innerHTML, /Fix solar array/, "Newly created task immediately appears in Today's Priority Queue");

  // 6. Edit the task from inside Today Focus modal and verify it opens on top and updates Today Focus
  const createdTask = app.P("planet-home").tasks[0];
  triggerClickAct("edit-task", { pid: "planet-home", tid: createdTask.id });
  assert.equal(taskModal.classList.contains("hidden"), false, "taskModal opens for editing");
  assert.ok(parseInt(taskModal.style.zIndex, 10) > parseInt(todayModal.style.zIndex, 10), "Edit taskModal is above todayCheckinModal");
  document.getElementById("inputTaskTitle").value = "Fix solar array v2";
  triggerClickAct("task-confirm");
  assert.match(todayBody.innerHTML, /Fix solar array v2/, "Edited task title immediately updates in Today Focus modal");

  // 7. Delete the task from inside Today Focus modal and verify Today Focus refreshes
  triggerClickAct("del-task", { pid: "planet-home", tid: createdTask.id });
  assert.doesNotMatch(todayBody.innerHTML, /Fix solar array v2/, "Deleted task is removed from Today Focus modal");
});

test("Bug 2 Fix: Single click on an orbiting planet navigates directly inside the planet (zooms in & focuses HUD)", () => {
  const { app, document } = createAtlasEnv();

  assert.equal(app.focusId, null, "Initially focused at Life core");
  const homeNode = app.scene.kidEls["planet-home"];
  assert.ok(homeNode, "Home planet node exists in orbital scene");

  // Single click on Home planet
  homeNode.click();

  assert.equal(app.focusId, "planet-home", "First click immediately dives into planet-home");
  assert.equal(app.selectedId, null, "selectedId is cleared because planet-home is now the focused center");

  const hud = document.getElementById("telemetryPanel");
  assert.match(hud.innerHTML, /Home/, "Right HUD panel immediately focuses on Home");
  assert.match(hud.innerHTML, /Focused/, "HUD shows Focused state for Home");

  // Single click on wayback node returns to Life core
  assert.ok(app.scene.wbEl, "Wayback parent node exists when inside a planet");
  app.scene.wbEl.click();
  assert.equal(app.focusId, null, "Clicking wayback node returns directly to Life");
});

test("Desktop Collapsible Top Bar & User Avatar Menu controls (Pause Orbit, Sync, Sound, Collapse)", () => {
  const { app, document, triggerClickAct } = createAtlasEnv();

  // Verify bottom-left Focus/Pause bar is removed
  assert.equal(document.getElementById("focusLabel"), null, "Old bottom-left focusLabel should not exist");

  // Open User Avatar menu
  const topMenu = document.getElementById("topOverflowMenu");
  assert.equal(topMenu.classList.contains("hidden"), true);
  triggerClickAct("top-menu");
  assert.equal(topMenu.classList.contains("hidden"), false, "Clicking avatar opens topOverflowMenu");

  // Toggle Pause Orbit inside User Avatar menu
  assert.equal(app.orbitPaused, false);
  triggerClickAct("pause");
  assert.equal(app.orbitPaused, true);
  assert.match(document.getElementById("lblPauseOrbit").textContent, /Resume Orbit Drift/);
  assert.match(document.getElementById("badgePauseState").textContent, /Paused/);

  // Collapse and expand Desktop Top Bar
  const actionsDeck = document.getElementById("deskTopActions");
  assert.equal(app.deskTopBarCollapsed, false);
  assert.equal(actionsDeck.classList.contains("hidden"), false);
  triggerClickAct("toggle-desk-topbar");
  assert.equal(app.deskTopBarCollapsed, true);
  assert.equal(actionsDeck.classList.contains("hidden"), true, "Quick actions deck hides when collapsed");
  assert.equal(document.getElementById("btnCollapseTopBar").textContent, "»");
});

test("§4 Health & Leveling Engine: Gravity-Weighted Propagation, Clear Orbit Bonus, 48h Strain Shield & Tiered Curves", () => {
  const { app } = createAtlasEnv();

  // 1. Tiered Leveling Constants (§4D)
  const home = app.P("planet-home");
  assert.equal(app.tierBaseXP(null), 250, "Life Core uses B=250");
  assert.equal(app.tierBaseXP(home), 120, "Root sector uses B=120");

  // Create two child satellites under Home: an active struggling moon and an empty moon
  const satActiveId = "planet-sat-active";
  const satEmptyId = "planet-sat-empty";
  app.STATE.planets[satActiveId] = {
    id: satActiveId, name: "Kitchen", icon: "🍳", color: "#3B7A57",
    parentId: "planet-home", childrenIds: [], xp: 80,
    tasks: [
      { id: "t1", title: "Overdue Epic", diff: 5, due: app.addDays(-2), recur: "", streak: 0, history: [], done: false },
      { id: "t2", title: "Overdue Routine", diff: 3, due: app.addDays(-1), recur: "", streak: 0, history: [], done: false },
    ],
    strain: { fin: true, psy: false }, notes: [], timeline: [],
  };
  app.STATE.planets[satEmptyId] = {
    id: satEmptyId, name: "Attic", icon: "✨", color: "#4A6FA5",
    parentId: "planet-home", childrenIds: [], xp: 0,
    tasks: [], strain: { fin: false, psy: false }, notes: [], timeline: [],
  };
  home.childrenIds = [satActiveId, satEmptyId];
  app.render();

  assert.equal(app.tierBaseXP(app.P(satActiveId)), 80, "Leaf satellite uses B=80");
  assert.equal(Math.floor(app.levelOf(app.P(satActiveId))), 2, "80 XP on satellite reaches Level 2");

  // 2. Gravity-Weighted Parent Health (§4A): active struggling moon has much higher activityMass than empty moon
  const massActive = app.activityMass(app.P(satActiveId));
  const massEmpty = app.activityMass(app.P(satEmptyId));
  assert.ok(massActive >= 8, `Expected high activity mass (${massActive}) for satellite with 2 overdue tasks + strain`);
  assert.equal(massEmpty, 1, "Empty satellite has baseline mass 1");

  const hActive = app.computeHealth(app.P(satActiveId));
  const hEmpty = app.computeHealth(app.P(satEmptyId));
  const hHome = app.computeHealth(home);
  const unweightedAvg = Math.round((hActive + hEmpty) / 2);
  assert.ok(hHome < unweightedAvg, `Gravity-weighted parent health (${hHome}%) should pull closer to active struggling moon (${hActive}%) than naive average (${unweightedAvg}%)`);

  // 3. 48-Hour Rolling Strain Shield (§4C)
  const satActive = app.P(satActiveId);
  assert.equal(app.strainPenalty(satActive, { doneToday: 0, doneYesterday: 0 }), 15, "1 active strain = 15% drag");
  assert.equal(app.strainPenalty(satActive, { doneToday: 0, doneYesterday: 1 }), 9, "1 completion yesterday provides 6% residual shield (15 - 6 = 9%)");
  assert.equal(app.strainPenalty(satActive, { doneToday: 1, doneYesterday: 1 }), 0, "1 completion today + 1 yesterday fully neutralizes 15% strain drag");

  // 4. Clear Orbit Equilibrium Bonus (+10%) & 7d Momentum (§4B)
  const social = app.P("planet-social");
  social.tasks.push({
    id: "t-soc-1", title: "Call best friend", diff: 3, due: app.todayISO(), recur: "", streak: 0, history: [], done: false,
  });
  app.toggleTask("planet-social", "t-soc-1");
  const stSocial = app.taskStats(social);
  assert.equal(stSocial.recentBonus, 5, "Diff 3 completion grants +(2+3)=+5% momentum");
  assert.equal(stSocial.clearOrbitBonus, 10, "Zero overdue + zero strain + everCompleted grants +10% Clear Orbit bonus");
  assert.equal(app.computeHealth(social), 100, "85% base + 5% momentum + 10% clear orbit reaches 100% health");
});

test("§5 Gamification: Solar Flare Streak Shield, Passing Comet Quest, Orbital Alignment & Evolution Tiers", () => {
  const { app } = createAtlasEnv();

  // 1. Evolution Tiers (§5.1) & Cosmic Titles (§5.5)
  assert.equal(app.evolutionTier(1).name, "Proto-Planet");
  assert.equal(app.evolutionTier(3).name, "Terrestrial World");
  assert.equal(app.evolutionTier(5).name, "Ringed Giant");
  assert.equal(app.evolutionTier(10).name, "Luminous Star-World");
  assert.equal(app.cosmicTitle(1), "Stardust Wanderer");
  assert.equal(app.cosmicTitle(5), "Sector Navigator");
  assert.equal(app.cosmicTitle(20), "Architect of Spheres");

  // 2. Solar Flare Streak Shield auto-freezes overdue recurring habit (§5.3)
  const biz = app.P("planet-business");
  biz.solarShields = 1;
  biz.tasks.push({
    id: "t-rec-1", title: "Inbox Zero", diff: 2, due: app.addDays(-1), recur: "daily", streak: 5, history: [{ at: Date.now() - 86400000 * 2, xp: 20 }], done: false,
  });
  app.evaluateSolarShieldsAndComet();
  assert.equal(biz.solarShields, 0, "Solar shield consumed to protect overdue streak");
  assert.equal(biz.tasks[0].due, app.todayISO(), "Overdue recurring task due date advanced to today");
  assert.equal(biz.tasks[0].streak, 5, "5-day streak preserved");

  // 3. Passing Comet Bonus Quest (§5.4)
  assert.ok(app.STATE.dailyComet, "Daily comet spawned");
  assert.equal(app.STATE.dailyComet.claimed, false);
  const cometPid = app.STATE.dailyComet.targetPid;
  const xpBeforeComet = app.P(cometPid).xp || 0;
  const claimed = app.claimCometQuest();
  assert.equal(claimed, true, "Comet quest claimed");
  assert.equal(app.STATE.dailyComet.claimed, true);
  assert.equal(app.P(cometPid).xp, xpBeforeComet + 60, "+60 Comet XP awarded to target planet");

  // 4. Orbital Alignment 1.25x XP Combo when 3 root sectors have completions today (§5.2)
  ["planet-home", "planet-business", "planet-hobbies"].forEach((pid, idx) => {
    app.P(pid).tasks.push({
      id: `t-align-${idx}`, title: `Align ${idx}`, diff: 2, due: app.todayISO(), recur: "", streak: 0, history: [], done: false,
    });
    app.toggleTask(pid, `t-align-${idx}`);
  });
  const align = app.orbitalAlignmentStatus();
  assert.equal(align.active, true, "3 active root sectors activate Orbital Alignment");
  assert.equal(align.multiplier, 1.25, "Orbital Alignment grants 1.25x XP multiplier");
  assert.equal(app.taskXP(2, 0), 25, "Routine task (20 XP base) earns 25 XP during 1.25x Orbital Alignment");
});

test("Recurring habit cycling, undo cycle, overdue triage & Health Inspector modal", () => {
  const { app, document, triggerClickAct } = createAtlasEnv();

  const hob = app.P("planet-hobbies");
  hob.tasks.push({
    id: "t-habit", title: "Practice guitar", diff: 3, due: app.todayISO(), recur: "daily", streak: 2, history: [], done: false,
  });
  app.toggleTask("planet-hobbies", "t-habit");
  assert.equal(hob.tasks[0].streak, 3, "Cycling recurring task increments streak to 3");
  assert.equal(hob.tasks[0].due, app.addDays(1), "Daily recurring task advances due date to tomorrow");
  assert.equal(hob.tasks[0].history.length, 1);

  // Undo recurring cycle
  app.undoRecurringCycle("planet-hobbies", "t-habit");
  assert.equal(hob.tasks[0].streak, 2, "Undoing cycle restores previous streak");
  assert.equal(hob.tasks[0].due, app.todayISO(), "Undoing cycle restores previous due date");

  // Overdue Triage
  hob.tasks.push({
    id: "t-over", title: "Restring acoustic", diff: 2, due: app.addDays(-3), recur: "", streak: 0, history: [], done: false,
  });
  app.triageOverdueTasks("planet-hobbies", 0);
  assert.equal(hob.tasks[1].due, app.todayISO(), "Triage moves overdue task to today");

  // Health Inspector / Cosmetics Modal renders breakdown
  triggerClickAct("open-cosmetics", { id: "planet-hobbies" });
  const cosmBody = document.getElementById("cosmeticsModalBody");
  assert.match(cosmBody.innerHTML, /Gravity-Weighted Health Inspector/);
  assert.match(cosmBody.innerHTML, /Clear Orbit/);
  assert.match(cosmBody.innerHTML, /Solar Shields/);
});

test("Guest mode isolation: never calls Supabase fetch when unauthenticated", () => {
  const { app, fetchCalls, triggerClickAct } = createAtlasEnv();
  triggerClickAct("login-guest");
  app.P("planet-home").tasks.push({
    id: "t-guest", title: "Local task", diff: 2, due: app.todayISO(), recur: "", streak: 0, history: [], done: false,
  });
  app.toggleTask("planet-home", "t-guest");
  assert.equal(fetchCalls.length, 0, "Guest mode must never make network calls to Supabase");
});
