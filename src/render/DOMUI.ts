// DOM UI overlay: HUD, touch D-pad + interact, and modal screens (battle, dialogue, shop,
// menu, victory, gameover). Reads GameState and dispatches Command objects to the SimRunner.
// Pure presentation — no game rules. Persistence (save/load) lives here too (localStorage).

import type { SimRunner } from "./SimRunner";
import type { GameState } from "../sim/types";
import { serialize, SAVE_KEY } from "../sim/save";

export class DOMUI {
  private runner: SimRunner;
  private root: HTMLElement;
  private hud!: HTMLElement;
  private modal!: HTMLElement;
  private message!: HTMLElement;
  private dpadActiveDir: string | null = null;
  private moveTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSig = "";

  constructor(runner: SimRunner, root: HTMLElement) {
    this.runner = runner;
    this.root = root;
    this.build();
    runner.subscribe((s) => this.render(s));
    // Autosave when the tab is backgrounded/hidden (persist current progress).
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.save("Autosaved.");
    });
  }

  private save(toast: string) {
    try {
      localStorage.setItem(SAVE_KEY, serialize(this.runner.state));
      this.message.textContent = toast;
    } catch {
      // storage full / disabled — non-fatal
    }
  }

  /** Autosave order of operations: lastTask tracks the mode before the current one. */
  private lastTask = "field";

  private checkBattleEnd(s: GameState) {
    // save when a battle resolves back to field, or on victory/gameover
    if (this.lastTask === "battle" && (s.mode === "field" || s.mode === "victory")) {
      this.save("Saved after battle.");
    }
    this.lastTask = s.mode;
  }

  private el(cls: string, parent?: HTMLElement): HTMLElement {
    const e = document.createElement("div");
    e.className = cls;
    (parent ?? this.root).appendChild(e);
    return e;
  }

  private build() {
    this.root.classList.add("game-shell");
    // HUD
    this.hud = this.el("hud");
    this.hud.innerHTML = `
      <div class="hud-stats">
        <span id="hud-name" class="hud-name"></span>
        <span id="hud-lv"></span>
        <div class="bar hp"><i id="hud-hp-fill"></i></div>
        <span id="hud-hp-text"></span>
        <div class="bar mp"><i id="hud-mp-fill"></i></div>
        <span id="hud-mp-text"></span>
        <span id="hud-gold" class="hud-gold"></span>
      </div>
      <div id="hud-message" class="hud-message"></div>
    `;
    // World controls (D-pad + interact), only visible in field mode
    const ctl = this.el("world-controls");
    ctl.innerHTML = `
      <div class="dpad">
        <button class="d-btn up" data-dir="up">▲</button>
        <button class="d-btn left" data-dir="left">◀</button>
        <button class="d-btn down" data-dir="down">▼</button>
        <button class="d-btn right" data-dir="right">▶</button>
      </div>
      <button id="btn-interact" class="btn-interact">✦</button>
    `;
    this.wireDpad(ctl);
    // Modal overlay
    this.modal = this.el("modal");
    this.modal.style.display = "none";
    this.message = document.getElementById("hud-message") as HTMLElement;
  }

  private wireDpad(ctl: HTMLElement) {
    const press = (dir: string) => {
      if (this.dpadActiveDir === dir) return;
      this.dpadActiveDir = dir;
      this.runner.send({ type: "move", dir: dir as "up" });
      // hold-to-walk: ~6 tiles/sec
      if (this.moveTimer !== null) clearInterval(this.moveTimer);
      this.moveTimer = setInterval(() => {
        if (this.runner.state.mode !== "field") return;
        this.runner.send({ type: "move", dir: dir as "up" });
      }, 155);
    };
    const release = () => {
      this.dpadActiveDir = null;
      if (this.moveTimer !== null) { clearInterval(this.moveTimer); this.moveTimer = null; }
    };
    ctl.querySelectorAll<HTMLButtonElement>(".d-btn").forEach((b) => {
      const dir = b.dataset.dir!;
      const start = (e: Event) => { e.preventDefault(); press(dir); };
      b.addEventListener("pointerdown", start);
      b.addEventListener("pointerup", release);
      b.addEventListener("pointerleave", release);
    });
    const interact = ctl.querySelector("#btn-interact") as HTMLButtonElement;
    interact.addEventListener("click", () => this.runner.send({ type: "interact" }));
  }

  // ---------------------------------------------------------------- render
  render(s: GameState) {
    // Gate DOM work behind a signature so we don't rebuild modal HTML at 60fps.
    const sig = JSON.stringify([
      s.mode, s.tick, s.hero.hp, s.hero.mp, s.hero.level, s.gold, s.message,
      s.quest.stage, s.dialogue?.lineIndex, s.shop?.name,
      s.battle?.enemies.map((e) => e.hp).join(","),
      s.battle?.log[s.battle.log.length - 1],
    ]);
    if (sig === this.lastSig) return;
    this.lastSig = sig;

    this.checkBattleEnd(s);

    // HUD always
    const gid = (id: string) => document.getElementById(id) as HTMLElement;
    gid("hud-name").textContent = s.hero.name;
    gid("hud-lv").textContent = `Lv ${s.hero.level}`;
    gid("hud-hp-text").textContent = `${s.hero.hp}/${s.hero.base.maxHp}`;
    gid("hud-mp-text").textContent = `${s.hero.mp}/${s.hero.base.maxMp}`;
    gid("hud-gold").textContent = `💰 ${s.gold}`;
    (gid("hud-hp-fill") as HTMLElement).style.width = `${(s.hero.hp / s.hero.base.maxHp) * 100}%`;
    (gid("hud-mp-fill") as HTMLElement).style.width = `${(s.hero.mp / s.hero.base.maxMp) * 100}%`;
    this.message.textContent = s.message ?? "";
    const ctl = this.root.querySelector<HTMLElement>(".world-controls")!;
    ctl.style.display = s.mode === "field" ? "grid" : "none";

    // Modal per mode
    if (s.mode === "battle") { this.renderBattle(s); return; }
    if (s.mode === "dialogue") { this.renderDialogue(s); return; }
    if (s.mode === "shop") { this.renderShop(s); return; }
    if (s.mode === "menu") { this.renderMenu(s); return; }
    if (s.mode === "victory") { this.renderVictory(s); return; }
    if (s.mode === "gameover") { this.renderGameOver(s); return; }
    this.modal.style.display = "none";
  }

  private showModal(inner: string) {
    this.modal.innerHTML = inner;
    this.modal.style.display = "flex";
  }

  // ------------------------------------------------------- battle
  private renderBattle(s: GameState) {
    const b = s.battle!;
    const enemies = b.enemies.map((e) =>
      `<div class="enemy ${e.alive ? "" : "dead"}">${e.name} <span>${e.hp}/${e.maxHp}</span></div>`
    ).join("");
    const invUsable = s.inventory.filter((i) => this.runner.world.items[i.id]?.battleUse);
    const skillBtns = s.hero.skills.map((sk) => {
      const skd = this.runner.world.skills[sk];
      return `<button class="skill-btn" data-skill="${sk}" ${s.hero.mp < skd.mpCost ? "disabled" : ""}>${skd.name} (${skd.mpCost}MP)</button>`;
    }).join("");
    const itemBtns = invUsable.map((i) =>
      `<button class="item-btn" data-item="${i.id}">${this.runner.world.items[i.id!]?.name ?? i.id} x${i.count}</button>`
    ).join("");
    this.showModal(`
      <div class="battle-panel">
        <h2>Battle!</h2>
        <div class="enemies">${enemies}</div>
        <div class="battle-log">${b.log.slice(-3).join("<br/>")}</div>
        <div class="battle-actions">
          <button class="act" data-action="attack">Attack</button>
          <button class="act" data-action="guard">Guard</button>
          <button class="act" data-open="skills">Skill</button>
          <button class="act" data-open="items">Item</button>
        </div>
        <div class="battle-submenu" id="battle-skills" hidden>${skillBtns || "<p>No skills yet.</p>"}</div>
        <div class="battle-submenu" id="battle-items" hidden>${itemBtns || "<p>No usable items.</p>"}</div>
      </div>
    `);
    this.bind(this.modal, ".act[data-action]", (btn) => {
      this.runner.send({ type: "battleAction", action: btn.dataset.action as "attack" | "guard" });
    });
    this.bind(this.modal, ".act[data-open='skills']", () => this.toggleSub("battle-skills"));
    this.bind(this.modal, ".act[data-open='items']", () => this.toggleSub("battle-items"));
    this.bind(this.modal, ".skill-btn", (btn) => {
      this.runner.send({ type: "battleSkill", skillId: btn.dataset.skill!, target: 0 });
    });
    this.bind(this.modal, ".item-btn", (btn) => {
      this.runner.send({ type: "battleUseItem", itemId: btn.dataset.item! });
    });
  }

  // ------------------------------------------------------- dialogue
  private renderDialogue(s: GameState) {
    const d = s.dialogue!;
    const line = d.lines[d.lineIndex] ?? "";
    const name = d.npcId === "__sign__" ? "Signpost" : this.runner.world.npcs[d.npcId]?.name ?? "";
    this.showModal(`
      <div class="dialogue" data-advance="1">
        <div class="dialog-name">${name}</div>
        <p class="dialog-text">${escapeHtml(line)}</p>
        <p class="dialog-hint">Tap to continue ▸</p>
      </div>
    `);
    const box = this.modal.querySelector(".dialogue")!;
    box.addEventListener("click", () => this.runner.send({ type: "dialogueNext" }));
  }

  // ------------------------------------------------------- shop
  private renderShop(s: GameState) {
    const shop = s.shop!;
    const items = shop.items.map((id) => {
      const it = this.runner.world.items[id];
      return `<div class="shop-item"><span>${it.name} — ${it.buy}</span>
        <button data-buy="${id}">Buy</button></div>`;
    }).join("");
    const inv = s.inventory.map((i) => {
      const it = this.runner.world.items[i.id!];
      return it && i.count > 0 ? `<div class="shop-item"><span>${it.name} x${i.count} (${it.sell})</span>
        <button data-sell="${i.id!}">Sell</button></div>` : "";
    }).join("");
    this.showModal(`
      <div class="shop">
        <h2>${shop.name}</h2>
        <h3>Buy</h3><div class="shop-list">${items}</div>
        <h3>Sell</h3><div class="shop-list">${inv}</div>
        <button class="act" data-leave="1">Leave</button>
      </div>
    `);
    this.bind(this.modal, "[data-buy]", (btn) => this.runner.send({ type: "shopBuy", itemId: btn.dataset.buy! }));
    this.bind(this.modal, "[data-sell]", (btn) => this.runner.send({ type: "shopSell", itemId: btn.dataset.sell! }));
    this.bind(this.modal, "[data-leave]", () => this.runner.send({ type: "shopLeave" }));
  }

  // ------------------------------------------------------- menu
  private renderMenu(s: GameState) {
    this.showModal(`
      <div class="menu">
        <h2>Menu</h2>
        <p>Items:</p><ul>
          ${s.inventory.map((i) => { const it = this.runner.world.items[i.id!]; return `<li>${it?.name ?? i.id} x${i.count}</li>`; }).join("")}
        </ul>
        <p>Weapon: ${s.hero.weapon ? this.runner.world.items[s.hero.weapon]?.name : "none"} | Armor: ${s.hero.armor ? this.runner.world.items[s.hero.armor]?.name : "none"}</p>
        <p>Quest: ${questText(s)}</p>
        <div class="battle-actions">
          <button class="act" data-save="1">Save</button>
          <button class="act" data-resume="1">Resume</button>
        </div>
      </div>
    `);
    this.bind(this.modal, "[data-save]", () => { localStorage.setItem(SAVE_KEY, serialize(this.runner.state)); this.showToast("Game saved."); });
    this.bind(this.modal, "[data-resume]", () => this.runner.send({ type: "toggleMenu" }));
  }

  // ------------------------------------------------------- victory / gameover
  private renderVictory(_s: GameState) {
    this.showModal(`
      <div class="end-screen">
        <h1>✦ Victory ✦</h1>
        <p>The Sunstone is restored. Sunvale is saved, and your legend begins.</p>
        <p class="tiny">Crafted by an autonomous coding agent. — Thank you for playing.</p>
        <button class="act" data-new="1">Play New Game</button>
      </div>
    `);
    this.bind(this.modal, "[data-new]", () => window.location.reload());
  }
  private renderGameOver(_s: GameState) {
    this.showModal(`
      <div class="end-screen">
        <h1>☠ Defeated ☠</h1>
        <p>You fall in the dark. But the shrine remembers...</p>
        <button class="act" data-retry="1">Retry from Save</button>
      </div>
    `);
    this.bind(this.modal, "[data-retry]", () => window.location.reload());
  }

  private toggleSub(id: string) {
    const el = document.getElementById(id)!;
    el.hidden = !el.hidden;
  }
  private bind(scope: HTMLElement, sel: string, fn: (btn: HTMLButtonElement) => void) {
    scope.querySelectorAll<HTMLButtonElement>(sel).forEach((b) => b.addEventListener("click", () => fn(b)));
  }
  private showToast(t: string) {
    this.message.textContent = t;
  }
}

function questText(s: GameState): string {
  const stages: Record<string, string> = {
    none: "Talk to the Gatekeeper.",
    accepted: "Recover the Sunstone from the Sunken Crypt.",
    dungeon_cleared: "Return to the Gatekeeper with the Sunstone.",
    complete: "Quest complete — Sunvale is saved!",
  };
  return stages[s.quest.stage] ?? s.quest.stage;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}