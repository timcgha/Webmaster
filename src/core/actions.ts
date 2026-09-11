import type { SemanticActions } from "./types";

export type ControllerFamily = "xbox" | "playstation" | "generic";

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

const buttonPressed = (pad: GamepadLike, index: number): boolean =>
  Boolean(pad.buttons[index]?.pressed || (pad.buttons[index]?.value ?? 0) > 0.55);

function deadzone(value: number, threshold = 0.18): number {
  if (Math.abs(value) <= threshold) return 0;
  const scaled = (Math.abs(value) - threshold) / (1 - threshold);
  return Math.sign(value) * Math.min(1, scaled);
}

function direction(value: number): -1 | 0 | 1 {
  if (value > 0.5) return 1;
  if (value < -0.5) return -1;
  return 0;
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
  const pressed = pad.buttons.some((button) => button.pressed || button.value > 0.2);
  const moved = pad.axes.some((axis) => Math.abs(axis) > 0.2);
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
    neutral: !pressed && !moved,
    family: controllerFamily(pad.id),
  };
}

export class InputManager {
  private readonly heldKeys = new Set<string>();
  private readonly pressedKeys = new Set<string>();
  private mouseLookX = 0;
  private mouseLookY = 0;
  private mouseDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private previousPad: MappedGamepad | null = null;
  private padIdentity = "";
  private blockPadUntilNeutral = false;
  private abort = new AbortController();
  private family: ControllerFamily = "generic";

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onControllerStatus: (message: string, family: ControllerFamily) => void,
  ) {
    const signal = this.abort.signal;
    window.addEventListener("keydown", this.onKeyDown, { signal });
    window.addEventListener("keyup", this.onKeyUp, { signal });
    window.addEventListener("blur", this.releaseHeldActions, { signal });
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
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
      event.preventDefault();
    }
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

  private onGamepadDisconnected = (): void => {
    this.previousPad = null;
    this.padIdentity = "";
    this.blockPadUntilNeutral = true;
    this.onControllerStatus("Controller disconnected — keyboard and mouse are ready", this.family);
  };

  private onGamepadConnected = (event: GamepadEvent): void => {
    this.padIdentity = `${event.gamepad.index}:${event.gamepad.id}`;
    this.blockPadUntilNeutral = true;
    this.family = controllerFamily(event.gamepad.id);
    this.onControllerStatus("Controller connected — release controls, then press a button", this.family);
  };

  private currentPad(): GamepadLike | null {
    const pads = navigator.getGamepads?.() ?? [];
    const pad = Array.from(pads).find((candidate) => candidate?.connected);
    if (!pad) return null;
    return pad as unknown as GamepadLike;
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

    const rawPad = this.currentPad();
    if (rawPad) {
      const identity = `${rawPad.index}:${rawPad.id}`;
      const mapped = mapStandardGamepad(rawPad);
      if (identity !== this.padIdentity) {
        this.padIdentity = identity;
        this.blockPadUntilNeutral = true;
        this.family = mapped.family;
        this.onControllerStatus("Controller detected — release controls to activate", mapped.family);
      }
      if (this.blockPadUntilNeutral && mapped.neutral) {
        this.blockPadUntilNeutral = false;
        this.previousPad = mapped;
        this.onControllerStatus("Controller ready", mapped.family);
      }
      if (!this.blockPadUntilNeutral) {
        const previous = this.previousPad;
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
        this.previousPad = mapped;
      }
    } else {
      this.previousPad = null;
      this.padIdentity = "";
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
    this.blockPadUntilNeutral = true;
  };

  promptText(): string {
    if (this.family === "playstation") return "✕ Select / Jump  •  ○ Back  •  Options Pause";
    if (this.family === "xbox") return "A Select / Jump  •  B Back  •  Menu Pause";
    return "A / ✕ Select & Jump  •  B / ○ Back  •  Menu / Options Pause";
  }

  dispose(): void {
    this.abort.abort();
  }
}
