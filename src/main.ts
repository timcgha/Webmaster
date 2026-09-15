import "./styles.css";
import { InputManager, type ControllerStatus } from "./core/actions";
import { SaveStore, saveStorageKeyForTests } from "./core/save";
import { SettingsStore } from "./core/settings";
import { courseLabel } from "./core/course";
import type {
  Difficulty,
  GameSettings,
  RunSavePayload,
  SemanticActions,
  SlotId,
  Vec3Data,
} from "./core/types";
import { GameWorld, type WorldFrame } from "./game/world";

type Screen =
  | "main"
  | "slots"
  | "difficulty"
  | "overwrite"
  | "load"
  | "settings"
  | "controller"
  | "play"
  | "pause";

interface MenuItem {
  label: string;
  detail?: string;
  disabled?: boolean;
  action: () => void;
}

declare global {
  interface Window {
    __WM_DEBUG__?: {
      getState: () => WorldFrame;
      getScreen: () => Screen;
      getCurrentRun: () => { slot: SlotId; difficulty: Difficulty } | null;
      setFixturePosition: (position: Vec3Data, label: string) => void;
      performance: () => ReturnType<GameWorld["performanceSummary"]>;
      saveKey: typeof saveStorageKeyForTests;
      getInputDebug: () => { lookXTotal: number; lookYTotal: number };
      getControllerStatus: () => ControllerStatus;
      getControllerDiagnostics: () => string;
    };
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas")!;
const menuLayer = document.querySelector<HTMLDivElement>("#menu-layer")!;
const hudLayer = document.querySelector<HTMLDivElement>("#hud-layer")!;
const toastLayer = document.querySelector<HTMLDivElement>("#toast-layer")!;
const loading = document.querySelector<HTMLDivElement>("#loading")!;

const saveStore = new SaveStore(window.localStorage);
const settingsStore = new SettingsStore(window.localStorage);
let app: WebmasterApp | null = null;

const world = await GameWorld.create(canvas, settingsStore.read(), {
  onProgress: (progress, label) => app?.onProgress(progress, label),
  onRecovery: (health, fullRetry) => app?.onRecovery(health, fullRetry),
  onFrame: (frame) => app?.onFrame(frame),
});

class WebmasterApp {
  private screen: Screen = "main";
  private returnFromSettings: "main" | "pause" = "main";
  private returnFromControllerDetails: "main" | "settings" | "pause" = "main";
  private menuItems: MenuItem[] = [];
  private selectedIndex = 0;
  private selectedSlot: SlotId = 1;
  private selectedDifficulty: Difficulty = "Normal";
  private currentRun: { slot: SlotId; difficulty: Difficulty } | null = null;
  private settings: GameSettings;
  private latestFrame: WorldFrame;
  private pauseSafeAtEntry = false;
  private toastTimer = 0;
  private fixtureLabel = "";
  private readonly input: InputManager;
  private controllerStatus!: ControllerStatus;
  private animationFrame = 0;
  private nextControllerDiagnosticsRefresh = 0;
  private lookXTotal = 0;
  private lookYTotal = 0;

  constructor() {
    this.settings = settingsStore.read();
    this.latestFrame = world.stateForTests();
    this.input = new InputManager(canvas, (status) => {
      this.controllerStatus = status;
      this.refreshControllerUi();
    });
    this.controllerStatus = this.input.controllerStatus();
    this.renderMain();
    this.animationFrame = requestAnimationFrame(this.loop);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.screen === "play") this.pauseGame();
    });
    loading.classList.add("hidden");
  }

  private loop = (timestamp: number): void => {
    const actions = this.input.sample();
    this.lookXTotal += actions.lookX;
    this.lookYTotal += actions.lookY;
    if (this.screen === "play") {
      if (actions.pausePressed) this.pauseGame();
      else world.update(actions);
    } else if (this.screen !== "main" || this.menuItems.length > 0) {
      this.handleMenuInput(actions);
    }
    if (
      this.screen === "controller" &&
      timestamp >= this.nextControllerDiagnosticsRefresh
    ) {
      this.nextControllerDiagnosticsRefresh = timestamp + 250;
      this.refreshControllerUi();
    }
    this.animationFrame = requestAnimationFrame(this.loop);
  };

  private handleMenuInput(actions: SemanticActions): void {
    if (actions.backPressed) {
      this.goBack();
      return;
    }
    if (this.screen === "settings" && actions.menuX !== 0) {
      this.adjustSelectedSetting(actions.menuX);
      return;
    }
    if (actions.menuY !== 0) this.moveSelection(actions.menuY);
    if (actions.confirmPressed) this.activateSelected();
  }

  private moveSelection(direction: -1 | 0 | 1): void {
    if (!direction || !this.menuItems.length) return;
    let next = this.selectedIndex;
    for (let count = 0; count < this.menuItems.length; count += 1) {
      next = (next + direction + this.menuItems.length) % this.menuItems.length;
      if (!this.menuItems[next]?.disabled) break;
    }
    this.selectedIndex = next;
    this.updateSelection();
  }

  private activateSelected(): void {
    const item = this.menuItems[this.selectedIndex];
    if (item && !item.disabled) item.action();
  }

  private updateSelection(): void {
    const buttons = Array.from(
      menuLayer.querySelectorAll<HTMLButtonElement>("[data-menu-item]"),
    );
    buttons.forEach((button, index) => {
      const selected = index === this.selectedIndex;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-current", selected ? "true" : "false");
      if (selected) button.focus({ preventScroll: true });
    });
  }

  private renderPanel(
    title: string,
    subtitle: string,
    items: MenuItem[],
    eyebrow = "WEBMASTER PRACTICE NETWORK",
  ): void {
    this.menuItems = items;
    this.selectedIndex = Math.max(
      0,
      items.findIndex((item) => !item.disabled),
    );
    menuLayer.classList.remove("hidden");
    hudLayer.classList.add("hidden");
    menuLayer.replaceChildren();
    const shade = document.createElement("div");
    shade.className = "menu-shade";
    const panel = document.createElement("section");
    panel.className = "menu-panel";
    panel.setAttribute("aria-label", title);
    panel.innerHTML = `<p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="menu-subtitle">${subtitle}</p>`;
    const controllerStatus = document.createElement("section");
    controllerStatus.className = "controller-status-card";
    controllerStatus.dataset.controllerStatusCard = "";
    controllerStatus.setAttribute("role", "status");
    controllerStatus.setAttribute("aria-live", "polite");
    controllerStatus.innerHTML = `<span>CONTROLLER</span><strong data-controller-status-message></strong>`;
    const list = document.createElement("div");
    list.className = "menu-list";
    items.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.menuItem = String(index);
      button.disabled = Boolean(item.disabled);
      button.innerHTML = `<span>${item.label}</span>${item.detail ? `<small>${item.detail}</small>` : ""}`;
      button.addEventListener("click", item.action);
      button.addEventListener("pointerenter", () => {
        if (!item.disabled) {
          this.selectedIndex = index;
          this.updateSelection();
        }
      });
      list.append(button);
    });
    const prompt = document.createElement("p");
    prompt.className = "control-prompt";
    prompt.dataset.controlPrompt = "";
    prompt.textContent = `${this.input.promptText()}  •  Keyboard: arrows + Enter / Esc`;
    panel.append(controllerStatus, list, prompt);
    shade.append(panel);
    menuLayer.append(shade);
    this.refreshControllerUi();
    queueMicrotask(() => this.updateSelection());
  }

  private renderMain(): void {
    this.screen = "main";
    world.stop();
    this.currentRun = null;
    const newest = saveStore.newest();
    this.renderPanel(
      "WEBMASTER",
      "Fast feet. Brave heart. A whole skyline to protect.",
      [
        {
          label: "New Game",
          detail: "Choose a slot and difficulty",
          action: () => this.renderSlots(),
        },
        {
          label: "Continue",
          detail: newest
            ? `Slot ${newest.slot} • ${newest.payload.difficulty} • ${newest.payload.progressLabel}`
            : "No saved run yet",
          disabled: !newest,
          action: () =>
            newest &&
            this.loadRun(
              newest.payload,
              `Continued slot ${newest.slot} ${newest.kind}`,
            ),
        },
        {
          label: "Load",
          detail: "Choose a manual save or checkpoint",
          action: () => this.renderLoad(),
        },
        {
          label: "Settings",
          detail: "Camera and display",
          action: () => this.openSettings("main"),
        },
        {
          label: "Controller Details",
          detail: "Connection status and local diagnostics",
          action: () => this.openControllerDetails("main"),
        },
      ],
    );
  }

  private slotDetail(slot: SlotId): string {
    const records = saveStore.inspectSlot(slot);
    const newest = [records.manual.payload, records.checkpoint.payload]
      .filter((payload): payload is RunSavePayload => Boolean(payload))
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (newest) return `${newest.difficulty} • ${newest.progressLabel}`;
    const warning =
      records.manual.status !== "empty"
        ? records.manual.message
        : records.checkpoint.status !== "empty"
          ? records.checkpoint.message
          : "Empty";
    return warning;
  }

  private renderSlots(): void {
    this.screen = "slots";
    this.renderPanel(
      "Choose a save slot",
      "Three local slots stay in this browser profile and exact site address.",
      ([1, 2, 3] as const).map((slot) => ({
        label: `Slot ${slot}`,
        detail: this.slotDetail(slot),
        action: () => {
          this.selectedSlot = slot;
          this.renderDifficulty();
        },
      })),
      "NEW GAME",
    );
  }

  private renderDifficulty(): void {
    this.screen = "difficulty";
    this.renderPanel(
      "Choose difficulty",
      "Movement stays equally responsive. Later enemies will become faster, tougher, and stronger.",
      (["Easy", "Normal", "Hard"] as const).map((difficulty) => ({
        label: difficulty,
        detail:
          difficulty === "Easy"
            ? "Gentle adventure"
            : difficulty === "Normal"
              ? "Balanced hero challenge"
              : "Bolder battles later",
        action: () => {
          this.selectedDifficulty = difficulty;
          const records = saveStore.inspectSlot(this.selectedSlot);
          const occupied = [
            records.manual.status,
            records.checkpoint.status,
          ].some((status) => status !== "empty");
          if (occupied) this.renderOverwrite();
          else this.startNewGame();
        },
      })),
      `NEW GAME • SLOT ${this.selectedSlot}`,
    );
  }

  private renderOverwrite(): void {
    this.screen = "overwrite";
    this.renderPanel(
      `Replace slot ${this.selectedSlot}?`,
      "This starts a new run. Choose Cancel to keep every existing record unchanged.",
      [
        {
          label: "Replace and start",
          detail: `${this.selectedDifficulty} difficulty`,
          action: () => this.startNewGame(),
        },
        {
          label: "Cancel",
          detail: "Keep this slot unchanged",
          action: () => this.renderDifficulty(),
        },
      ],
      "CONFIRM OVERWRITE",
    );
  }

  private newPayload(): RunSavePayload {
    return {
      schemaVersion: 1,
      slot: this.selectedSlot,
      difficulty: this.selectedDifficulty,
      health: 100,
      maxHealth: 100,
      position: { x: 0, y: 0, z: -8 },
      checkpoint: { x: 0, y: 0, z: -8 },
      progress: 0,
      progressLabel: "Reach the glowing sky gate",
      costumeId: "skyline-teal",
      completion: false,
      updatedAt: Date.now(),
    };
  }

  private startNewGame(): void {
    const payload = this.newPayload();
    const result = saveStore.replaceWithNewCheckpoint(
      this.selectedSlot,
      payload,
    );
    if (!result.ok) {
      this.toast(result.message, true);
      this.renderSlots();
      return;
    }
    this.currentRun = {
      slot: this.selectedSlot,
      difficulty: this.selectedDifficulty,
    };
    world.start(payload);
    this.enterPlay();
    this.toast(
      `Slot ${this.selectedSlot} started on ${this.selectedDifficulty}`,
    );
  }

  private renderLoad(): void {
    this.screen = "load";
    const items: MenuItem[] = [];
    for (const slot of [1, 2, 3] as const) {
      const records = saveStore.inspectSlot(slot);
      for (const kind of ["manual", "checkpoint"] as const) {
        const record = records[kind];
        items.push({
          label: `Slot ${slot} • ${kind === "manual" ? "Manual" : "Checkpoint"}`,
          detail: record.payload
            ? `${record.payload.difficulty} • ${record.payload.progressLabel}`
            : record.message,
          disabled: !record.payload,
          action: () =>
            record.payload &&
            this.loadRun(record.payload, `Loaded slot ${slot} ${kind}`),
        });
      }
    }
    if (!items.some((item) => !item.disabled)) {
      items.push({
        label: "Back",
        detail: "No valid saves are available",
        action: () => this.renderMain(),
      });
    }
    this.renderPanel(
      "Load a run",
      "Manual saves and rolling checkpoints are kept separately.",
      items,
      "LOCAL SAVES",
    );
  }

  private loadRun(payload: RunSavePayload, message: string): void {
    this.currentRun = { slot: payload.slot, difficulty: payload.difficulty };
    world.start(payload);
    this.input.releaseHeldActions();
    this.enterPlay();
    this.toast(message);
  }

  private enterPlay(): void {
    this.screen = "play";
    menuLayer.classList.add("hidden");
    hudLayer.classList.remove("hidden");
    this.renderHud(this.latestFrame);
    this.refreshControllerUi();
  }

  private pauseGame(): void {
    this.pauseSafeAtEntry = world.isSafe();
    if (!world.pause()) return;
    this.input.releaseHeldActions();
    this.renderPause();
  }

  private renderPause(): void {
    this.screen = "pause";
    const safeDetail = this.pauseSafeAtEntry
      ? "Grounded safe position ready"
      : "Unavailable while climbing, on a ceiling, pulling, swinging, airborne, landing or recovering — resume to reach safe ground";
    this.renderPanel(
      "Paused",
      "The city and all held inputs are frozen. Resume requires fresh input.",
      [
        {
          label: "Resume",
          detail: "Return to practice",
          action: () => this.resume(),
        },
        {
          label: "Save Game",
          detail: safeDetail,
          disabled: !this.pauseSafeAtEntry,
          action: () => this.saveManual(false),
        },
        {
          label: "Save & Quit",
          detail: safeDetail,
          disabled: !this.pauseSafeAtEntry,
          action: () => this.saveManual(true),
        },
        ...(this.latestFrame.training.active
          ? [
              {
                label: "Replay Climb & Pull",
                detail: "Return to the south ring; keep earned completion",
                action: () => {
                  world.replayTraining();
                  this.resume();
                },
              },
            ]
          : []),
        ...(this.latestFrame.skyline.active
          ? [
              {
                label: "Replay skyline route",
                detail: "Return to the first ring; keep earned completion",
                action: () => {
                  world.replaySkyline();
                  this.resume();
                },
              },
            ]
          : []),
        {
          label: "Restart at checkpoint",
          detail: "Full health, current progress",
          action: () => this.restart(),
        },
        {
          label: "Settings",
          detail: "Camera and display",
          action: () => this.openSettings("pause"),
        },
        {
          label: "Controller Details",
          detail: "Connection status and local diagnostics",
          action: () => this.openControllerDetails("pause"),
        },
        {
          label: "Replay 20-ring course",
          detail: "Start on the far practice roof; separate course progress restarts",
          action: () => { world.replayCourse(); this.resume(); },
        },
      ],
      `SLOT ${this.currentRun?.slot ?? "—"} • ${this.currentRun?.difficulty ?? "—"}`,
    );
  }

  private resume(): void {
    this.input.releaseHeldActions();
    world.resume();
    this.enterPlay();
  }

  private restart(): void {
    world.restart();
    this.input.releaseHeldActions();
    world.resume();
    this.enterPlay();
    this.toast("Ready again at the latest checkpoint");
  }

  private saveManual(quit: boolean): void {
    if (!this.currentRun || !this.pauseSafeAtEntry) {
      this.toast("Reach safe ground before saving.", true);
      return;
    }
    const payload = world.snapshot(
      this.currentRun.slot,
      this.currentRun.difficulty,
    );
    const result = saveStore.write(this.currentRun.slot, "manual", payload);
    this.toast(result.message, !result.ok);
    if (result.ok && quit) this.renderMain();
    else this.renderPause();
  }

  private openSettings(from: "main" | "pause"): void {
    this.returnFromSettings = from;
    this.renderSettings();
  }

  private renderSettings(): void {
    this.screen = "settings";
    const sensitivity = this.settings.cameraSensitivity.toFixed(1);
    this.renderPanel(
      "Settings",
      "Use left/right or select a row. Settings are local and never change run difficulty.",
      [
        {
          label: `Camera sensitivity: ${sensitivity}×`,
          detail: "Left / Right to adjust",
          action: () => this.adjustSetting(0, 1),
        },
        {
          label: `Invert vertical look: ${this.settings.invertY ? "On" : "Off"}`,
          detail: "Select to toggle",
          action: () => this.adjustSetting(1, 1),
        },
        {
          label: `Adaptive quality: ${this.settings.adaptiveQuality ? "On" : "Off"}`,
          detail: "Balances clarity and frame rate",
          action: () => this.adjustSetting(2, 1),
        },
        {
          label: "Controller Details",
          detail: "Connection status and local diagnostics",
          action: () => this.openControllerDetails("settings"),
        },
        { label: "Done", detail: "Return", action: () => this.closeSettings() },
      ],
      "ACCESSIBLE CAMERA & DISPLAY",
    );
  }

  private adjustSelectedSetting(direction: -1 | 1): void {
    if (this.selectedIndex <= 2)
      this.adjustSetting(this.selectedIndex, direction);
  }

  private adjustSetting(index: number, direction: -1 | 1): void {
    if (index === 0) {
      const next =
        Math.round((this.settings.cameraSensitivity + direction * 0.1) * 10) /
        10;
      this.settings.cameraSensitivity = Math.max(0.5, Math.min(2, next));
    } else if (index === 1) this.settings.invertY = !this.settings.invertY;
    else if (index === 2)
      this.settings.adaptiveQuality = !this.settings.adaptiveQuality;
    const persisted = settingsStore.write(this.settings);
    world.applySettings(this.settings);
    const selected = this.selectedIndex;
    this.renderSettings();
    this.selectedIndex = selected;
    this.updateSelection();
    if (!persisted)
      this.toast(
        "Settings could not be stored, but this session was updated.",
        true,
      );
  }

  private closeSettings(): void {
    if (this.returnFromSettings === "pause") this.renderPause();
    else this.renderMain();
  }

  private openControllerDetails(from: "main" | "settings" | "pause"): void {
    this.returnFromControllerDetails = from;
    this.renderControllerDetails();
  }

  private renderControllerDetails(): void {
    this.screen = "controller";
    this.nextControllerDiagnosticsRefresh = 0;
    this.renderPanel(
      "Controller Details",
      "Everything shown here stays in this browser. Nothing is sent or saved.",
      [
        {
          label: "Copy Diagnostics",
          detail: "Copy a small controller report for troubleshooting",
          action: () => void this.copyControllerDiagnostics(),
        },
        {
          label: "Forget active controller",
          detail: "Return to controller detection without changing your game",
          action: () => {
            this.input.forgetActiveController();
            this.controllerStatus = this.input.controllerStatus();
            this.refreshControllerUi();
            this.toast(
              "Controller cleared — press a button on the controller you want to use",
            );
          },
        },
        {
          label: "Back",
          detail: "Return",
          action: () => this.closeControllerDetails(),
        },
      ],
      "LOCAL CONTROLLER DIAGNOSTICS",
    );
    const panel = menuLayer.querySelector<HTMLElement>(".menu-panel")!;
    const details = document.createElement("pre");
    details.className = "controller-diagnostics";
    details.dataset.controllerDiagnostics = "";
    details.tabIndex = 0;
    details.setAttribute("aria-label", "Current controller diagnostics");
    panel.append(details);
  }

  private async copyControllerDiagnostics(): Promise<void> {
    const diagnostics = this.input.controllerDiagnosticsText();
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(diagnostics);
      this.toast("Controller diagnostics copied");
    } catch {
      const fallback = document.createElement("textarea");
      fallback.value = diagnostics;
      fallback.setAttribute("readonly", "");
      fallback.className = "copy-fallback";
      document.body.append(fallback);
      fallback.select();
      const copied = document.execCommand("copy");
      fallback.remove();
      this.toast(
        copied
          ? "Controller diagnostics copied"
          : "Copy unavailable — select the diagnostics text below",
        !copied,
      );
    }
  }

  private closeControllerDetails(): void {
    if (this.returnFromControllerDetails === "pause") this.renderPause();
    else if (this.returnFromControllerDetails === "settings")
      this.renderSettings();
    else this.renderMain();
  }

  private goBack(): void {
    if (this.screen === "slots" || this.screen === "load") this.renderMain();
    else if (this.screen === "difficulty") this.renderSlots();
    else if (this.screen === "overwrite") this.renderDifficulty();
    else if (this.screen === "settings") this.closeSettings();
    else if (this.screen === "controller") this.closeControllerDetails();
    else if (this.screen === "pause") this.resume();
  }

  onProgress(_progress: number, label: string): void {
    if (!this.currentRun) return;
    const payload = world.snapshot(
      this.currentRun.slot,
      this.currentRun.difficulty,
    );
    const result = saveStore.write(this.currentRun.slot, "checkpoint", payload);
    this.toast(result.ok ? `Checkpoint: ${label}` : result.message, !result.ok);
  }

  onRecovery(health: number, fullRetry: boolean): void {
    this.input.releaseHeldActions();
    this.toast(
      fullRetry
        ? "Hero recovered — full-health retry"
        : `Safe recovery — ${health} health remaining`,
    );
  }

  onFrame(frame: WorldFrame): void {
    this.latestFrame = frame;
    if (this.screen === "play") this.renderHud(frame);
  }

  private renderHud(frame: WorldFrame): void {
    const run = this.currentRun;
    const healthPercent = Math.round((frame.health / frame.maxHealth) * 100);
    if (!hudLayer.querySelector(".objective-card")) {
      hudLayer.innerHTML = `
      <section class="hud-card objective-card" aria-label="Current objective">
        <span class="hud-kicker" data-hud="practice"></span>
        <strong data-hud="objective"></strong>
      </section>
      <section class="hud-card health-card">
        <span class="hud-kicker">HERO ENERGY</span>
        <div class="health-track"><i data-hud="health-bar"></i></div>
        <strong data-hud="health"></strong>
      </section>
      <section class="hud-card run-card">
        <span data-hud="run"></span>
        <small data-hud="position"></small>
        <small data-hud="course"></small>
      </section>
      <section class="hud-card controller-hud-card" data-controller-status-card role="status" aria-live="polite">
        <span class="hud-kicker">CONTROLLER</span>
        <strong data-controller-status-message></strong>
      </section>
      <section id="input-overlay" class="input-overlay">
        <strong>Move</strong> WASD / Left Stick
        <strong>Look</strong> Drag / Right Stick
        <strong>Jump</strong> Space / A / ✕
        <strong>Run</strong> Shift / RT / R2
        <strong>Swing</strong> Hold E / LT / L2, release to let go
        <strong>Climb</strong> Hold C / RB / R1
        <strong>Pull</strong> Hold Q / LB / L1
        <strong>Recenter</strong> R / RS
        <strong>Pause</strong> Esc / Menu / Options
      </section>
      <section class="hud-card swing-card" aria-label="Swing status"><span class="hud-kicker" data-hud="swing-prompt"></span><strong data-hud="swing-state"></strong><small data-hud="swing-message"></small></section>
      <section class="hud-card traversal-card" aria-label="Climb and Pull status"><strong data-hud="traversal-state"></strong><small data-hud="traversal-message"></small></section>
      <p id="fixture-badge" class="fixture-badge hidden"></p>
      `;
    }
    hudLayer.querySelector<HTMLElement>("[data-hud='course']")!.textContent = courseLabel(frame.course, frame.position.y < -1);
    hudLayer.querySelector<HTMLElement>("[data-hud='practice']")!.textContent =
      frame.training.active
        ? `CLIMB & PULL ${Math.min(frame.training.stage + 1, 6)} / 6`
        : frame.skyline.active
          ? `SKYLINE ${Math.min(frame.skyline.stage + 1, 4)} / 4`
          : `PRACTICE ${Math.min(frame.progress + 1, 3)} / 3`;
    hudLayer.querySelector<HTMLElement>(
      "[data-hud='swing-state']",
    )!.textContent = frame.swing.web
      ? `Attached to ${frame.swing.web.anchorId.replace("ring-", "ring ")}`
      : frame.swing.targetId
        ? "Ring in reach"
        : "Find a glowing ring";
    hudLayer.querySelector<HTMLElement>(
      "[data-hud='swing-message']",
    )!.textContent = frame.swing.message;
    hudLayer.querySelector<HTMLElement>(
      "[data-hud='swing-prompt']",
    )!.textContent =
      `SWING: Hold E / ${this.input.controllerStatus().family === "playstation" ? "L2" : "LT"} • release to let go`;
    hudLayer.querySelector<HTMLElement>(".swing-card")!.style.top = frame
      .training.active
      ? "190px"
      : "";
    hudLayer
      .querySelector<HTMLElement>(".swing-card")!
      .classList.toggle(
        "hidden",
        (frame.training.active && frame.training.stage > 0) ||
          (!frame.skyline.active &&
            !frame.training.active &&
            frame.position.z < 16),
      );
    hudLayer.querySelector<HTMLElement>(
      "[data-hud='traversal-state']",
    )!.textContent =
      `CLIMB C / ${this.input.controllerStatus().family === "playstation" ? "R1" : "RB"} • PULL Q / ${this.input.controllerStatus().family === "playstation" ? "L1" : "LB"}`;
    hudLayer.querySelector<HTMLElement>(
      "[data-hud='traversal-message']",
    )!.textContent = frame.traversal.message;
    hudLayer
      .querySelector<HTMLElement>(".traversal-card")!
      .classList.toggle(
        "hidden",
        !frame.training.active && frame.position.z > -10,
      );
    hudLayer.querySelector<HTMLElement>("[data-hud='objective']")!.textContent =
      frame.progressLabel;
    const healthCard = hudLayer.querySelector<HTMLElement>(".health-card")!;
    healthCard.setAttribute("aria-label", `Health ${healthPercent} percent`);
    hudLayer.querySelector<HTMLElement>(
      "[data-hud='health-bar']",
    )!.style.width = `${healthPercent}%`;
    hudLayer.querySelector<HTMLElement>("[data-hud='health']")!.textContent =
      `${frame.health} / ${frame.maxHealth}`;
    hudLayer.querySelector<HTMLElement>("[data-hud='run']")!.textContent =
      `Slot ${run?.slot ?? "—"} • ${run?.difficulty ?? "—"}`;
    hudLayer.querySelector<HTMLElement>("[data-hud='position']")!.textContent =
      `${Math.round(frame.position.x)}, ${Math.round(frame.position.y)}, ${Math.round(frame.position.z)} • ${frame.fps} FPS`;
    const fixtureBadge = hudLayer.querySelector<HTMLElement>("#fixture-badge")!;
    fixtureBadge.textContent = this.fixtureLabel
      ? `TEST FIXTURE: ${this.fixtureLabel}`
      : "";
    fixtureBadge.classList.toggle("hidden", !this.fixtureLabel);
  }

  private refreshControllerUi(): void {
    if (!this.input || !this.controllerStatus) return;
    const status = this.input.controllerStatus();
    this.controllerStatus = status;
    document
      .querySelectorAll<HTMLElement>("[data-controller-status-card]")
      .forEach((card) => {
        card.dataset.controllerState = status.lifecycle;
        card.classList.toggle(
          "controller-ready",
          status.lifecycle === "CONTROLLER_READY",
        );
        card.classList.toggle(
          "controller-warning",
          status.lifecycle === "CONTROLLER_UNSUPPORTED" ||
            status.lifecycle === "GAMEPAD_API_UNAVAILABLE",
        );
        card.querySelector<HTMLElement>(
          "[data-controller-status-message]",
        )!.textContent = status.message;
      });
    document
      .querySelectorAll<HTMLElement>("[data-control-prompt]")
      .forEach((prompt) => {
        prompt.textContent = `${this.input.promptText()}  •  Keyboard: arrows + Enter / Esc`;
      });
    const diagnostics = document.querySelector<HTMLElement>(
      "[data-controller-diagnostics]",
    );
    if (diagnostics)
      diagnostics.textContent = this.input.controllerDiagnosticsText();
  }

  private toast(message: string, error = false): void {
    window.clearTimeout(this.toastTimer);
    toastLayer.textContent = message;
    toastLayer.className = error ? "visible error" : "visible";
    this.toastTimer = window.setTimeout(() => {
      toastLayer.className = "";
    }, 3600);
  }

  setFixturePosition(position: Vec3Data, label: string): void {
    this.fixtureLabel = label;
    world.setFixturePosition(position);
    this.renderHud(world.stateForTests());
  }

  getScreen(): Screen {
    return this.screen;
  }

  getCurrentRun(): { slot: SlotId; difficulty: Difficulty } | null {
    return this.currentRun ? { ...this.currentRun } : null;
  }

  getInputDebug(): { lookXTotal: number; lookYTotal: number } {
    return { lookXTotal: this.lookXTotal, lookYTotal: this.lookYTotal };
  }

  getControllerStatus(): ControllerStatus {
    return this.input.controllerStatus();
  }

  getControllerDiagnostics(): string {
    return this.input.controllerDiagnosticsText();
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrame);
    this.input.dispose();
  }
}

app = new WebmasterApp();

if (new URLSearchParams(location.search).has("test")) {
  window.__WM_DEBUG__ = {
    getState: () => world.stateForTests(),
    getScreen: () => app!.getScreen(),
    getCurrentRun: () => app!.getCurrentRun(),
    setFixturePosition: (position, label) =>
      app!.setFixturePosition(position, label),
    performance: () => world.performanceSummary(),
    saveKey: saveStorageKeyForTests,
    getInputDebug: () => app!.getInputDebug(),
    getControllerStatus: () => app!.getControllerStatus(),
    getControllerDiagnostics: () => app!.getControllerDiagnostics(),
  };
}

window.addEventListener("beforeunload", () => {
  app?.dispose();
  world.dispose();
});
