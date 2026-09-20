import { installIsolatedStorage } from "./preview-storage.mjs";

const label = document.createElement("aside");
label.id = "wm-preview";
label.setAttribute("aria-label", "Preview information");
const title = document.createElement("strong");
title.textContent = "WM-006 preview · Separate saves";
label.append(title);
document.body.append(label);

let failure = false;
if (new URLSearchParams(location.search).get("diagnostics") === "1") {
  const details = document.createElement("span");
  details.id = "wm-preview-diagnostics";
  label.append(details);
  let lastInput = "keyboard / mouse";
  const keyboard = () => { lastInput = "keyboard / mouse"; };
  document.addEventListener("keydown", keyboard, { passive: true });
  document.addEventListener("pointerdown", keyboard, { passive: true });
  document.addEventListener("pointermove", event => { if (event.buttons) keyboard(); }, { passive: true });
  const update = () => {
    if (failure || document.hidden) return;
    const ready = document.querySelector('[data-controller-state="CONTROLLER_READY"]');
    if (ready) {
      try {
        const active = [...(navigator.getGamepads?.() ?? [])].some(pad =>
          pad?.connected && pad.mapping === "standard" &&
          (pad.axes.some(axis => Math.abs(axis) > 0.2) || pad.buttons.some(button => button.pressed || button.value > 0.5)));
        if (active) lastInput = "controller";
      } catch { /* The game's controller status remains authoritative. */ }
    } else if (lastInput === "controller") lastInput = "keyboard / mouse";
    const buttons = [...document.querySelectorAll("#menu-layer:not(.hidden) button")];
    const named = name => buttons.find(button => button.querySelector("span")?.textContent === name);
    const save = named("Save Game");
    const resume = named("Resume");
    const continuing = named("Continue");
    const fps = document.querySelector('#hud-layer:not(.hidden) [data-hud="position"]')?.textContent?.match(/([\d.]+) FPS/)?.[1];
    const fpsText = resume ? "paused" : fps ? `~${fps}` : "—";
    const saveText = save ? (save.disabled ? "unavailable here" : "available")
      : continuing ? (continuing.disabled ? "no saved run" : "Continue available") : "pause to check";
    details.textContent = `FPS: ${fpsText} · Input observed: ${lastInput} · Save: ${saveText}`;
  };
  update();
  setInterval(update, 500);
}

try {
  installIsolatedStorage(window);
  // Packaging substitutes the clean build's exact entry, without editing it.
  await import("./assets/index-uJryh28e.js");
} catch (error) {
  failure = true;
  document.getElementById("loading")?.classList.add("hidden");
  const message = document.createElement("p");
  message.id = "wm-preview-error";
  message.setAttribute("role", "alert");
  message.textContent = "This preview could not start in this browser. Please report that it did not load; no troubleshooting is needed.";
  label.append(message);
  console.error("WM-006 preview startup failed", error);
}

