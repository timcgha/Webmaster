import { describe, expect, it } from "vitest";
import { ControllerTracker, controllerFamily, mapStandardGamepad, type GamepadLike } from "../src/core/actions";

interface PadOptions {
  index?: number;
  axes?: number[];
  pressed?: number[];
  values?: Record<number, number>;
  mapping?: string;
  connected?: boolean;
  buttonCount?: number;
}

function pad(id: string, options: PadOptions = {}): GamepadLike {
  const pressed = options.pressed ?? [];
  const values = options.values ?? {};
  return {
    id,
    index: options.index ?? 0,
    connected: options.connected ?? true,
    mapping: options.mapping ?? "standard",
    axes: options.axes ?? [0, 0, 0, 0],
    buttons: Array.from({ length: options.buttonCount ?? 17 }, (_, index) => ({
      pressed: pressed.includes(index),
      value: pressed.includes(index) ? 1 : values[index] ?? 0,
    })),
  };
}

function activate(tracker: ControllerTracker, activePad: GamepadLike, neutralPad: GamepadLike, advance: (milliseconds: number) => void): void {
  expect(tracker.sample([activePad]).acceptsInput).toBe(false);
  expect(tracker.status().lifecycle).toBe("CONTROLLER_DETECTED_RELEASE_CONTROLS");
  tracker.sample([neutralPad]);
  advance(121);
  expect(tracker.sample([neutralPad]).acceptsInput).toBe(false);
  expect(tracker.status().lifecycle).toBe("CONTROLLER_READY");
}

describe("standard Gamepad semantic mapping", () => {
  it("identifies Xbox, PlayStation, and generic prompt families", () => {
    expect(controllerFamily("Xbox Wireless Controller")).toBe("xbox");
    expect(controllerFamily("DualSense Wireless Controller")).toBe("playstation");
    expect(controllerFamily("8BitDo Pro")).toBe("generic");
  });

  it("maps standard sticks, south/east buttons, trigger, menu, and stick click", () => {
    const mapped = mapStandardGamepad(pad("Xbox Controller", { axes: [0.8, -0.7, 0.4, -0.5], pressed: [0, 1, 7, 9, 10] }));
    expect(mapped.moveX).toBeGreaterThan(0.7);
    expect(mapped.moveY).toBeGreaterThan(0.6);
    expect(mapped.lookX).toBeGreaterThan(0.2);
    expect(mapped.lookY).toBeLessThan(-0.3);
    expect(mapped).toMatchObject({ run: true, confirm: true, back: true, pause: true, recenter: true, family: "xbox" });
  });

  it("uses d-pad for menus and suppresses ordinary mapped-axis drift", () => {
    expect(mapStandardGamepad(pad("DualShock", { axes: [0.08, -0.1, 0.05, 0.02] })).neutral).toBe(true);
    expect(mapStandardGamepad(pad("DualShock", { pressed: [12, 15] }))).toMatchObject({ menuX: 1, menuY: -1 });
  });

  it("ignores unused extra axes and buttons when deciding mapped neutrality", () => {
    expect(mapStandardGamepad(pad("Xbox", { axes: [0, 0, 0, 0, -1, 0.72], values: { 5: 0.4 }, buttonCount: 20 })).neutral).toBe(true);
  });
});

describe("controller lifecycle and active-device selection", () => {
  it("reports an absent or failing Gamepad API without blocking keyboard fallback", () => {
    const tracker = new ControllerTracker();
    expect(tracker.sample([], false).acceptsInput).toBe(false);
    expect(tracker.status()).toMatchObject({ apiAvailable: false, lifecycle: "GAMEPAD_API_UNAVAILABLE", selectedIndex: null });
  });

  it("waits when no controller is exposed, consumes exposure, waits for stable release, then accepts only fresh input", () => {
    let now = 0;
    const tracker = new ControllerTracker(() => now, 120);
    expect(tracker.sample([]).acceptsInput).toBe(false);
    expect(tracker.status().lifecycle).toBe("WAITING_FOR_CONTROLLER_INPUT");

    const pressed = pad("Xbox Wireless Controller", { pressed: [0] });
    const neutral = pad("Xbox Wireless Controller");
    activate(tracker, pressed, neutral, (milliseconds) => { now += milliseconds; });

    const fresh = tracker.sample([pressed]);
    expect(fresh.acceptsInput).toBe(true);
    expect(fresh.mapped?.confirm).toBe(true);
    expect(fresh.previous?.confirm).toBe(false);
  });

  it("uses a bounded stable-neutral window and does not reinterpret a held input as neutral", () => {
    let now = 0;
    const tracker = new ControllerTracker(() => now, 100);
    const held = pad("DualSense Wireless Controller", { axes: [0.7, 0, 0, 0] });
    const neutral = pad("DualSense Wireless Controller");
    tracker.sample([held]);
    now = 500;
    tracker.sample([held]);
    expect(tracker.status().lifecycle).toBe("CONTROLLER_DETECTED_RELEASE_CONTROLS");
    tracker.sample([neutral]);
    now = 599;
    tracker.sample([neutral]);
    expect(tracker.status().lifecycle).toBe("CONTROLLER_DETECTED_RELEASE_CONTROLS");
    now = 600;
    tracker.sample([neutral]);
    expect(tracker.status().lifecycle).toBe("CONTROLLER_READY");
  });

  it("selects the meaningful second device instead of an idle first device and keeps the selection stable", () => {
    let now = 0;
    const tracker = new ControllerTracker(() => now, 100);
    const idleFirst = pad("Xbox idle", { index: 0 });
    const activeSecond = pad("DualSense Wireless Controller", { index: 1, pressed: [0] });
    tracker.sample([idleFirst, activeSecond]);
    expect(tracker.status()).toMatchObject({ selectedIndex: 1, family: "playstation" });
    const neutralSecond = pad("DualSense Wireless Controller", { index: 1 });
    tracker.sample([idleFirst, neutralSecond]);
    now = 101;
    tracker.sample([idleFirst, neutralSecond]);
    expect(tracker.status().lifecycle).toBe("CONTROLLER_READY");

    tracker.sample([pad("Xbox idle", { index: 0, pressed: [0] }), neutralSecond]);
    expect(tracker.status().selectedIndex).toBe(1);
  });

  it("releases a disconnected active device and requires a deliberate replacement gesture", () => {
    let now = 0;
    const tracker = new ControllerTracker(() => now, 100);
    const firstPressed = pad("Xbox Controller", { index: 0, pressed: [0] });
    const firstNeutral = pad("Xbox Controller", { index: 0 });
    activate(tracker, firstPressed, firstNeutral, (milliseconds) => { now += milliseconds; });

    tracker.sample([null, pad("DualSense Wireless Controller", { index: 1 })]);
    expect(tracker.status()).toMatchObject({ lifecycle: "CONTROLLER_DISCONNECTED", selectedIndex: null });
    tracker.sample([null, pad("DualSense Wireless Controller", { index: 1, pressed: [0] })]);
    expect(tracker.status()).toMatchObject({ lifecycle: "CONTROLLER_DETECTED_RELEASE_CONTROLS", selectedIndex: 1 });
  });

  it("restores the neutral gate after pause, resume, blur, or focus cleanup", () => {
    let now = 0;
    const tracker = new ControllerTracker(() => now, 100);
    const pressed = pad("Xbox Controller", { pressed: [0] });
    const neutral = pad("Xbox Controller");
    activate(tracker, pressed, neutral, (milliseconds) => { now += milliseconds; });
    tracker.requireFreshInput();
    expect(tracker.status().lifecycle).toBe("CONTROLLER_DETECTED_RELEASE_CONTROLS");
    expect(tracker.sample([pressed]).acceptsInput).toBe(false);
    tracker.sample([neutral]);
    now += 101;
    tracker.sample([neutral]);
    expect(tracker.status().lifecycle).toBe("CONTROLLER_READY");
  });

  it("rejects empty and non-standard mappings rather than applying standard indices", () => {
    const tracker = new ControllerTracker();
    tracker.sample([pad("Legacy DirectInput Controller", { mapping: "", pressed: [0] })]);
    expect(tracker.status()).toMatchObject({ lifecycle: "CONTROLLER_UNSUPPORTED", selectedIndex: 0 });
    expect(tracker.sample([pad("Legacy DirectInput Controller", { mapping: "", pressed: [0] })]).acceptsInput).toBe(false);
  });

  it("can forget an unsupported controller and lets a supported deliberate gesture take over", () => {
    const tracker = new ControllerTracker();
    const legacy = pad("Legacy DirectInput Controller", { index: 0, mapping: "" });
    tracker.sample([legacy]);
    tracker.forgetActiveController();
    expect(tracker.status().lifecycle).toBe("WAITING_FOR_CONTROLLER_INPUT");
    tracker.sample([legacy, pad("Xbox Controller", { index: 1, pressed: [0] })]);
    expect(tracker.status()).toMatchObject({ lifecycle: "CONTROLLER_DETECTED_RELEASE_CONTROLS", selectedIndex: 1 });
  });

  it("reports accurate transient diagnostics without save or persistence data", () => {
    const tracker = new ControllerTracker();
    tracker.sample([
      pad("Xbox Controller", { index: 0, axes: [0.6, 0, 0, 0, -1], pressed: [15], buttonCount: 20 }),
      pad("Legacy Controller", { index: 2, mapping: "" }),
    ]);
    const parsed = JSON.parse(tracker.diagnosticsText());
    expect(parsed).toMatchObject({
      format: "webmaster-controller-diagnostics",
      version: 1,
      gamepadApiAvailable: true,
      enumeratedDeviceCount: 2,
      lifecycle: "CONTROLLER_DETECTED_RELEASE_CONTROLS",
      selectedDevice: { index: 0, id: "Xbox Controller" },
    });
    expect(parsed.devices[0]).toMatchObject({
      index: 0,
      mapping: "standard",
      axisCount: 5,
      buttonCount: 20,
      relevantAxes: [0.6, 0, 0, 0],
      pressedRelevantButtons: ["d-pad right"],
      selected: true,
    });
    expect(tracker.diagnosticsText()).not.toMatch(/save|localStorage|health/i);
  });
});

describe("WM-002 swing semantic lifecycle",()=>{
  it("maps LT/L2 to swing while preserving RT/R2 run and both stick recenter routes",()=>{
    expect(mapStandardGamepad(pad("DualSense",{pressed:[6]}))).toMatchObject({swing:true,run:false,neutral:false});
    expect(mapStandardGamepad(pad("Xbox",{pressed:[7,11]}))).toMatchObject({swing:false,run:true,recenter:true});
    expect(mapStandardGamepad(pad("Xbox",{pressed:[10]})).recenter).toBe(true);
  });
  it("requires neutral release of LT after first exposure, pause/focus reset and reconnect",()=>{
    let now=0;const tracker=new ControllerTracker(()=>now);const held=pad("Xbox",{pressed:[6]}),neutral=pad("Xbox");
    expect(tracker.sample([held]).acceptsInput).toBe(false);now+=1000;expect(tracker.sample([held]).acceptsInput).toBe(false);
    tracker.sample([neutral]);now+=121;tracker.sample([neutral]);expect(tracker.sample([held])).toMatchObject({acceptsInput:true,mapped:{swing:true}});
    tracker.requireFreshInput();expect(tracker.sample([held]).acceptsInput).toBe(false);
    tracker.noteDisconnected(0);expect(tracker.sample([]).acceptsInput).toBe(false);expect(tracker.sample([held]).acceptsInput).toBe(false);
    expect(tracker.diagnosticsText()).toContain('swing web');
  });
});
