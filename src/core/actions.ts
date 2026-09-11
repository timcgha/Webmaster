import type { SemanticActions } from "./types";

export type ControllerFamily = "xbox" | "playstation" | "generic";

export type ControllerLifecycleState =
  | "GAMEPAD_API_UNAVAILABLE"
  | "WAITING_FOR_CONTROLLER_INPUT"
  | "CONTROLLER_DETECTED_RELEASE_CONTROLS"
  | "CONTROLLER_READY"
  | "CONTROLLER_UNSUPPORTED"
  | "CONTROLLER_DISCONNECTED";

export interface GamepadButtonLike {
  pressed: boolean;
  value: number;
}

export interface GamepadLike {
  id: string;
  index: number;
  connected: boolean;
  mapping: string;
  axes: readonly number[];
  buttons: readonly GamepadButtonLike[];
}

export interface MappedGamepad {
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
  run: boolean;
  confirm: boolean;
  back: boolean;
  pause: boolean;
  recenter: boolean;
  menuX: -1 | 0 | 1;
  menuY: -1 | 0 | 1;
  neutral: boolean;
  family: ControllerFamily;
}

export interface ControllerDeviceDiagnostics {
  index: number;
  id: string;
  mapping: string;
  supported: boolean;
  axisCount: number;
  buttonCount: number;
  relevantAxes: readonly number[];
  pressedRelevantButtons: readonly string[];
  selected: boolean;
}

export interface ControllerStatus {
  apiAvailable: boolean;
  lifecycle: ControllerLifecycleState;
  message: string;
  family: ControllerFamily;
  selectedIndex: number | null;
  selectedId: string | null;
  devices: readonly ControllerDeviceDiagnostics[];
}

interface ControllerFrame {
  mapped: MappedGamepad | null;
  previous: MappedGamepad | null;
  acceptsInput: boolean;
}

const EMPTY_ACTIONS: SemanticActions = {
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  run: false,
  jumpPressed: false,
  recenterPressed: false,
  pausePressed: false,
  confirmPressed: false,
  backPressed: false,
  menuX: 0,
  menuY: 0,
  source: "keyboard-mouse",
};

const RELEVANT_BUTTONS = [0, 1, 7, 9, 10, 12, 13, 14, 15] as const;
const BUTTON_LABELS: Record<(typeof RELEVANT_BUTTONS)[number], string> = {
  0: "confirm/jump",
  1: "back",
  7: "run",
  9: "pause",
  10: "recenter",
  12: "d-pad up",
  13: "d-pad down",
  14: "d-pad left",
  15: "d-pad right",
};
const AXIS_DEADZONE = 0.18;
const NEUTRAL_AXIS_LIMIT = 0.24;
const SELECTION_AXIS_LIMIT = 0.45;
const NEUTRAL_BUTTON_LIMIT = 0.2;
const BUTTON_PRESS_LIMIT = 0.55;

const buttonPressed = (pad: GamepadLike, index: number): boolean =>
  Boolean(pad.buttons[index]?.pressed || (pad.buttons[index]?.value ?? 0) > BUTTON_PRESS_LIMIT);

function deadzone(value: number, threshold = AXIS_DEADZONE): number {
  if (Math.abs(value) <= threshold) return 0;
  const scaled = (Math.abs(value) - threshold) / (1 - threshold);
  return Math.sign(value) * Math.min(1, scaled);
}

function direction(value: number): -1 | 0 | 1 {
  if (value > 0.5) return 1;
  if (value < -0.5) return -1;
  return 0;
}

function isStandardMapping(pad: GamepadLike): boolean {
  return pad.mapping === "standard";
}

function relevantButtonActive(pad: GamepadLike, limit = BUTTON_PRESS_LIMIT): boolean {
  return RELEVANT_BUTTONS.some((index) => Boolean(pad.buttons[index]?.pressed || (pad.buttons[index]?.value ?? 0) > limit));
}

function deliberateMappedActivity(pad: GamepadLike): boolean {
  return pad.axes.slice(0, 4).some((axis) => Math.abs(axis) > SELECTION_AXIS_LIMIT) || relevantButtonActive(pad);
}

function rawActivity(pad: GamepadLike): boolean {
  return pad.axes.some((axis) => Math.abs(axis) > SELECTION_AXIS_LIMIT) ||
    pad.buttons.some((button) => button.pressed || button.value > BUTTON_PRESS_LIMIT);
}

function relevantNeutral(pad: GamepadLike): boolean {
  const axesNeutral = [0, 1, 2, 3].every((index) => Math.abs(pad.axes[index] ?? 0) <= NEUTRAL_AXIS_LIMIT);
  return axesNeutral && !relevantButtonActive(pad, NEUTRAL_BUTTON_LIMIT);
}

function roundAxis(value: number): number {
  return Math.round(value * 100) / 100;
}

export function controllerFamily(id: string): ControllerFamily {
  if (/xbox|xinput|microsoft/i.test(id)) return "xbox";
  if (/playstation|dualshock|dualsense|wireless controller/i.test(id)) return "playstation";
  return "generic";
}

export function mapStandardGamepad(pad: GamepadLike): MappedGamepad {
  const moveX = deadzone(pad.axes[0] ?? 0);
  const moveY = -deadzone(pad.axes[1] ?? 0);
  const lookX = deadzone(pad.axes[2] ?? 0);
  const lookY = deadzone(pad.axes[3] ?? 0);
  const dpadX = (buttonPressed(pad, 15) ? 1 : 0) - (buttonPressed(pad, 14) ? 1 : 0);
  const dpadY = (buttonPressed(pad, 13) ? 1 : 0) - (buttonPressed(pad, 12) ? 1 : 0);
  const menuX = direction(dpadX || moveX);
  const menuY = direction(dpadY || -moveY);
  return {
    moveX,
    moveY,
    lookX,
    lookY,
    run: buttonPressed(pad, 7),
    confirm: buttonPressed(pad, 0),
    back: buttonPressed(pad, 1),
    pause: buttonPressed(pad, 9),
    recenter: buttonPressed(pad, 10),
    menuX,
    menuY,
    neutral: relevantNeutral(pad),
    family: controllerFamily(pad.id),
  };
}

function controllerMessage(state: ControllerLifecycleState, family: ControllerFamily): string {
  if (state === "GAMEPAD_API_UNAVAILABLE") return "Controller: this browser cannot use gamepads — keyboard and mouse are ready";
  if (state === "WAITING_FOR_CONTROLLER_INPUT") return "Controller: press any button or move a stick to connect";
  if (state === "CONTROLLER_DETECTED_RELEASE_CONTROLS") return "Controller detected: release sticks and buttons";
  if (state === "CONTROLLER_UNSUPPORTED") return "Controller detected, but this browser mapping is unsupported — keyboard and mouse are ready";
  if (state === "CONTROLLER_DISCONNECTED") return "Controller disconnected — keyboard and mouse remain available";
  if (family === "xbox") return "Controller ready: Xbox controller";
  if (family === "playstation") return "Controller ready: PlayStation controller";
  return "Controller ready: game controller";
}

export class ControllerTracker {
  private lifecycle: ControllerLifecycleState = "WAITING_FOR_CONTROLLER_INPUT";
  private apiAvailable = true;
  private activeIndex: number | null = null;
  private activeIdentity = "";
  private family: ControllerFamily = "generic";
  private previousPad: MappedGamepad | null = null;
  private neutralSince: number | null = null;
  private lastPads: readonly GamepadLike[] = [];
  private observedDevice = false;
  private suppressPassiveUnsupported = false;
  private lastStatusSignature = "";

  constructor(
    private readonly now: () => number = () => performance.now(),
    private readonly neutralWindowMs = 120,
    private readonly onStatus?: (status: ControllerStatus) => void,
  ) {}

  private setLifecycle(next: ControllerLifecycleState): void {
    if (this.lifecycle === next) return;
    this.lifecycle = next;
    this.emitStatus();
  }

  private bind(pad: GamepadLike): void {
    this.activeIndex = pad.index;
    this.activeIdentity = `${pad.index}:${pad.id}`;
    this.family = controllerFamily(pad.id);
    this.previousPad = null;
    this.neutralSince = null;
    this.observedDevice = true;
    this.suppressPassiveUnsupported = false;
    this.lifecycle = isStandardMapping(pad) ? "CONTROLLER_DETECTED_RELEASE_CONTROLS" : "CONTROLLER_UNSUPPORTED";
    this.emitStatus();
  }

  private clearActive(state: ControllerLifecycleState): void {
    this.activeIndex = null;
    this.activeIdentity = "";
    this.previousPad = null;
    this.neutralSince = null;
    this.setLifecycle(state);
  }

  noteConnected(pad: GamepadLike): void {
    this.observedDevice = true;
    if (this.activeIndex !== null) return;
    if (!isStandardMapping(pad)) {
      this.bind(pad);
      return;
    }
    if (deliberateMappedActivity(pad)) this.bind(pad);
    else this.setLifecycle("WAITING_FOR_CONTROLLER_INPUT");
  }

  noteDisconnected(index: number): void {
    this.observedDevice = true;
    if (index === this.activeIndex) this.clearActive("CONTROLLER_DISCONNECTED");
    else this.emitStatus();
  }

  requireFreshInput(): void {
    this.previousPad = null;
    this.neutralSince = null;
    if (this.activeIndex !== null && this.lifecycle !== "CONTROLLER_UNSUPPORTED") {
      this.setLifecycle("CONTROLLER_DETECTED_RELEASE_CONTROLS");
    }
  }

  forgetActiveController(): void {
    this.activeIndex = null;
    this.activeIdentity = "";
    this.previousPad = null;
    this.neutralSince = null;
    this.suppressPassiveUnsupported = true;
    this.setLifecycle(this.apiAvailable ? "WAITING_FOR_CONTROLLER_INPUT" : "GAMEPAD_API_UNAVAILABLE");
  }

  sample(pads: readonly (GamepadLike | null)[], apiAvailable = true): ControllerFrame {
    this.apiAvailable = apiAvailable;
    this.lastPads = pads
      .filter((pad): pad is GamepadLike => Boolean(pad?.connected))
      .slice()
      .sort((left, right) => left.index - right.index);

    if (!apiAvailable) {
      this.activeIndex = null;
      this.activeIdentity = "";
      this.previousPad = null;
      this.neutralSince = null;
      this.setLifecycle("GAMEPAD_API_UNAVAILABLE");
      return { mapped: null, previous: null, acceptsInput: false };
    }

    if (this.lastPads.length > 0) this.observedDevice = true;

    let lostActive = false;
    let active = this.activeIndex === null ? null : this.lastPads.find((pad) => pad.index === this.activeIndex) ?? null;
    if (active && `${active.index}:${active.id}` !== this.activeIdentity) this.bind(active);

    if (!active && this.activeIndex !== null) {
      lostActive = true;
      this.clearActive("CONTROLLER_DISCONNECTED");
    }

    active = this.activeIndex === null ? null : this.lastPads.find((pad) => pad.index === this.activeIndex) ?? null;

    if (active && !isStandardMapping(active)) {
      const supportedGesture = this.lastPads.find((pad) => isStandardMapping(pad) && deliberateMappedActivity(pad));
      if (supportedGesture) {
        this.bind(supportedGesture);
        active = supportedGesture;
      } else {
        this.setLifecycle("CONTROLLER_UNSUPPORTED");
        return { mapped: null, previous: null, acceptsInput: false };
      }
    }

    if (!active) {
      const deliberate = this.lastPads.find((pad) => isStandardMapping(pad) && deliberateMappedActivity(pad));
      if (deliberate) {
        this.bind(deliberate);
        active = deliberate;
      } else {
        const unsupported = this.lastPads.find((pad) => !isStandardMapping(pad) && (rawActivity(pad) || !this.suppressPassiveUnsupported));
        if (unsupported) {
          this.bind(unsupported);
          return { mapped: null, previous: null, acceptsInput: false };
        }
        this.setLifecycle(lostActive || (this.lastPads.length === 0 && this.observedDevice) ? "CONTROLLER_DISCONNECTED" : "WAITING_FOR_CONTROLLER_INPUT");
        return { mapped: null, previous: null, acceptsInput: false };
      }
    }

    const mapped = mapStandardGamepad(active);
    if (this.lifecycle !== "CONTROLLER_READY") {
      if (!mapped.neutral) {
        this.neutralSince = null;
        this.previousPad = null;
        this.setLifecycle("CONTROLLER_DETECTED_RELEASE_CONTROLS");
        return { mapped, previous: null, acceptsInput: false };
      }

      const sampledAt = this.now();
      if (this.neutralSince === null) this.neutralSince = sampledAt;
      if (sampledAt - this.neutralSince >= this.neutralWindowMs) {
        this.previousPad = mapped;
        this.setLifecycle("CONTROLLER_READY");
      } else {
        this.setLifecycle("CONTROLLER_DETECTED_RELEASE_CONTROLS");
      }
      return { mapped, previous: null, acceptsInput: false };
    }

    const previous = this.previousPad;
    this.previousPad = mapped;
    return { mapped, previous, acceptsInput: true };
  }

  status(): ControllerStatus {
    return {
      apiAvailable: this.apiAvailable,
      lifecycle: this.lifecycle,
      message: controllerMessage(this.lifecycle, this.family),
      family: this.family,
      selectedIndex: this.activeIndex,
      selectedId: this.activeIndex === null ? null : this.lastPads.find((pad) => pad.index === this.activeIndex)?.id ?? null,
      devices: this.lastPads.map((pad) => ({
        index: pad.index,
        id: pad.id,
        mapping: pad.mapping || "(empty)",
        supported: isStandardMapping(pad),
        axisCount: pad.axes.length,
        buttonCount: pad.buttons.length,
        relevantAxes: [0, 1, 2, 3].map((index) => roundAxis(pad.axes[index] ?? 0)),
        pressedRelevantButtons: RELEVANT_BUTTONS.filter((index) => buttonPressed(pad, index)).map((index) => BUTTON_LABELS[index]),
        selected: pad.index === this.activeIndex,
      })),
    };
  }

  diagnosticsText(): string {
    const status = this.status();
    return JSON.stringify(
      {
        format: "webmaster-controller-diagnostics",
        version: 1,
        gamepadApiAvailable: status.apiAvailable,
        enumeratedDeviceCount: status.devices.length,
        lifecycle: status.lifecycle,
        selectedDevice: status.selectedIndex === null ? null : { index: status.selectedIndex, id: status.selectedId },
        devices: status.devices,
      },
      null,
      2,
    );
  }

  private emitStatus(): void {
    const status = this.status();
    const signature = JSON.stringify({
      apiAvailable: status.apiAvailable,
      lifecycle: status.lifecycle,
      selectedIndex: status.selectedIndex,
      selectedId: status.selectedId,
      devices: status.devices.map(({ index, id, mapping, supported }) => ({ index, id, mapping, supported })),
    });
    if (signature === this.lastStatusSignature) return;
    this.lastStatusSignature = signature;
    this.onStatus?.(status);
  }
}

export interface InputManagerOptions {
  getGamepads?: () => readonly (GamepadLike | null)[];
  now?: () => number;
  neutralWindowMs?: number;
}

export class InputManager {
  private readonly heldKeys = new Set<string>();
  private readonly pressedKeys = new Set<string>();
  private mouseLookX = 0;
  private mouseLookY = 0;
  private mouseDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private readonly abort = new AbortController();
  private readonly tracker: ControllerTracker;
  private readonly getGamepads: (() => readonly (GamepadLike | null)[]) | null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    onControllerStatus: (status: ControllerStatus) => void,
    options: InputManagerOptions = {},
  ) {
    const nativeGetGamepads = typeof navigator.getGamepads === "function" ? navigator.getGamepads.bind(navigator) : null;
    this.getGamepads = options.getGamepads ?? (nativeGetGamepads as (() => readonly (GamepadLike | null)[]) | null);
    this.tracker = new ControllerTracker(options.now, options.neutralWindowMs, onControllerStatus);
    const signal = this.abort.signal;
    window.addEventListener("keydown", this.onKeyDown, { signal });
    window.addEventListener("keyup", this.onKeyUp, { signal });
    window.addEventListener("blur", this.releaseHeldActions, { signal });
    window.addEventListener("focus", this.releaseHeldActions, { signal });
    window.addEventListener("gamepaddisconnected", this.onGamepadDisconnected, { signal });
    window.addEventListener("gamepadconnected", this.onGamepadConnected, { signal });
    canvas.addEventListener("mousedown", this.onPointerDown, { signal });
    window.addEventListener("mouseup", this.onPointerUp, { signal });
    window.addEventListener("mousemove", this.onPointerMove, { signal });
    canvas.addEventListener("contextmenu", (event) => event.preventDefault(), { signal });
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat && !this.heldKeys.has(event.code)) return;
    if (!event.repeat) this.pressedKeys.add(event.code);
    this.heldKeys.add(event.code);
    if (["Enter", "Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.heldKeys.delete(event.code);
  };

  private onPointerDown = (event: MouseEvent): void => {
    this.mouseDragging = true;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
  };

  private onPointerUp = (): void => {
    this.mouseDragging = false;
  };

  private onPointerMove = (event: MouseEvent): void => {
    if (!this.mouseDragging && document.pointerLockElement !== this.canvas) return;
    const fallbackX = event.clientX - this.lastPointerX;
    const fallbackY = event.clientY - this.lastPointerY;
    this.mouseLookX += event.movementX || fallbackX;
    this.mouseLookY += event.movementY || fallbackY;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
  };

  private onGamepadDisconnected = (event: GamepadEvent): void => {
    this.tracker.noteDisconnected(event.gamepad.index);
  };

  private onGamepadConnected = (event: GamepadEvent): void => {
    this.tracker.noteConnected(event.gamepad as unknown as GamepadLike);
  };

  private sampleController(): ControllerFrame {
    if (!this.getGamepads) return this.tracker.sample([], false);
    try {
      return this.tracker.sample(Array.from(this.getGamepads()), true);
    } catch {
      return this.tracker.sample([], false);
    }
  }

  sample(): SemanticActions {
    const actions: SemanticActions = { ...EMPTY_ACTIONS };
    const key = (code: string): boolean => this.heldKeys.has(code);
    const pressed = (code: string): boolean => this.pressedKeys.has(code);
    actions.moveX = (key("KeyD") || key("ArrowRight") ? 1 : 0) - (key("KeyA") || key("ArrowLeft") ? 1 : 0);
    actions.moveY = (key("KeyW") || key("ArrowUp") ? 1 : 0) - (key("KeyS") || key("ArrowDown") ? 1 : 0);
    actions.lookX = this.mouseLookX;
    actions.lookY = this.mouseLookY;
    actions.run = key("ShiftLeft") || key("ShiftRight");
    actions.jumpPressed = pressed("Space");
    actions.confirmPressed = pressed("Enter") || pressed("Space");
    actions.backPressed = pressed("Escape") || pressed("Backspace");
    actions.pausePressed = pressed("Escape") || pressed("KeyP");
    actions.recenterPressed = pressed("KeyR");
    actions.menuX = pressed("ArrowRight") || pressed("KeyD") ? 1 : pressed("ArrowLeft") || pressed("KeyA") ? -1 : 0;
    actions.menuY = pressed("ArrowDown") || pressed("KeyS") ? 1 : pressed("ArrowUp") || pressed("KeyW") ? -1 : 0;

    const frame = this.sampleController();
    if (frame.acceptsInput && frame.mapped) {
      const mapped = frame.mapped;
      const previous = frame.previous;
      const edge = (current: boolean, prior: boolean | undefined): boolean => current && !prior;
      actions.moveX = Math.abs(mapped.moveX) > Math.abs(actions.moveX) ? mapped.moveX : actions.moveX;
      actions.moveY = Math.abs(mapped.moveY) > Math.abs(actions.moveY) ? mapped.moveY : actions.moveY;
      actions.lookX += mapped.lookX * 16;
      actions.lookY += mapped.lookY * 16;
      actions.run ||= mapped.run;
      actions.jumpPressed ||= edge(mapped.confirm, previous?.confirm);
      actions.confirmPressed ||= edge(mapped.confirm, previous?.confirm);
      actions.backPressed ||= edge(mapped.back, previous?.back);
      actions.pausePressed ||= edge(mapped.pause, previous?.pause);
      actions.recenterPressed ||= edge(mapped.recenter, previous?.recenter);
      if (mapped.menuX !== 0 && mapped.menuX !== previous?.menuX) actions.menuX = mapped.menuX;
      if (mapped.menuY !== 0 && mapped.menuY !== previous?.menuY) actions.menuY = mapped.menuY;
      if (!mapped.neutral) actions.source = this.pressedKeys.size || this.heldKeys.size ? "mixed" : "gamepad";
    }

    this.pressedKeys.clear();
    this.mouseLookX = 0;
    this.mouseLookY = 0;
    return actions;
  }

  releaseHeldActions = (): void => {
    this.heldKeys.clear();
    this.pressedKeys.clear();
    this.mouseLookX = 0;
    this.mouseLookY = 0;
    this.mouseDragging = false;
    this.tracker.requireFreshInput();
  };

  controllerStatus(): ControllerStatus {
    return this.tracker.status();
  }

  controllerDiagnosticsText(): string {
    return this.tracker.diagnosticsText();
  }

  forgetActiveController(): void {
    this.tracker.forgetActiveController();
  }

  promptText(): string {
    const family = this.tracker.status().family;
    if (family === "playstation") return "✕ Select / Jump  •  ○ Back  •  Options Pause";
    if (family === "xbox") return "A Select / Jump  •  B Back  •  Menu Pause";
    return "A / ✕ Select & Jump  •  B / ○ Back  •  Menu / Options Pause";
  }

  dispose(): void {
    this.abort.abort();
  }
}
