# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm003.spec.ts >> WM003 RB and LB disconnect cleanup with neutral reconnect and keyboard fallback
- Location: e2e\wm003.spec.ts:395:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4173/?test=1
Call log:
  - navigating to "http://127.0.0.1:4173/?test=1", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e6]:
    - heading "This site can’t be reached" [level=1] [ref=e7]
    - paragraph [ref=e8]:
      - strong [ref=e9]: 127.0.0.1
      - text: refused to connect.
    - generic [ref=e10]:
      - paragraph [ref=e11]: "Try:"
      - list [ref=e12]:
        - listitem [ref=e13]: Checking the connection
        - listitem [ref=e14]:
          - link "Checking the proxy and the firewall" [ref=e15] [cursor=pointer]:
            - /url: "#buttons"
    - generic [ref=e16]: ERR_CONNECTION_REFUSED
  - generic [ref=e17]:
    - button "Reload" [ref=e19] [cursor=pointer]
    - button "Details" [ref=e20] [cursor=pointer]
```

# Test source

```ts
  74  |       },
  75  |       null,
  76  |       2,
  77  |     ),
  78  |   );
  79  | }
  80  | export async function start(p: Page) {
  81  |   await p.goto("/?test=1");
  82  |   await expect(p.locator("#loading")).toHaveClass(/hidden/);
  83  |   await p.getByRole("button", { name: /New Game/ }).click();
  84  |   await p.getByRole("button", { name: /Slot 1/ }).click();
  85  |   await p.getByRole("button", { name: /Normal/ }).click();
  86  | }
  87  | export async function look(p: Page, alpha: number, beta?: number) {
  88  |   const before = await state(p);
  89  |   const dx = (before.cameraAlpha - alpha) / 0.0035,
  90  |     dy = beta === undefined ? 0 : (beta - before.cameraBeta) / 0.0035;
  91  |   await p.locator("#game-canvas").dispatchEvent("mousedown", {
  92  |     clientX: 600,
  93  |     clientY: 380,
  94  |     button: 0,
  95  |     buttons: 1,
  96  |     bubbles: true,
  97  |   });
  98  |   for (let n = 1; n <= 10; n++) {
  99  |     await p.locator("body").dispatchEvent("mousemove", {
  100 |       clientX: 600 + (dx * n) / 10,
  101 |       clientY: 380 + (dy * n) / 10,
  102 |       buttons: 1,
  103 |       bubbles: true,
  104 |     });
  105 |     await p.waitForTimeout(20);
  106 |   }
  107 |   await p.locator("body").dispatchEvent("mouseup", {
  108 |     clientX: 600 + dx,
  109 |     clientY: 380 + dy,
  110 |     button: 0,
  111 |     bubbles: true,
  112 |   });
  113 |   await p.waitForTimeout(120);
  114 | }
  115 | interface Controls {
  116 |   down(k: string): Promise<void>;
  117 |   up(k: string): Promise<void>;
  118 |   press(k: string): Promise<void>;
  119 |   look(alpha: number, beta?: number): Promise<void>;
  120 | }
  121 | export const keyboard = (p: Page): Controls => ({
  122 |   down: (k) => p.keyboard.down(k),
  123 |   up: (k) => p.keyboard.up(k),
  124 |   press: (k) => p.keyboard.press(k),
  125 |   look: (a, b) => look(p, a, b),
  126 | });
  127 | export async function installPad(p: Page) {
  128 |   await p.addInitScript(() => {
  129 |     const w = window as any;
  130 |     w.__wm003pad = { connected: true, pressed: [], axes: [0, 0, 0, 0] };
  131 |     Object.defineProperty(navigator, "getGamepads", {
  132 |       configurable: true,
  133 |       value: () => {
  134 |         const s = w.__wm003pad;
  135 |         return s.connected
  136 |           ? [
  137 |               {
  138 |                 id: "DualSense Wireless Controller",
  139 |                 index: 0,
  140 |                 connected: true,
  141 |                 mapping: "standard",
  142 |                 timestamp: performance.now(),
  143 |                 axes: s.axes,
  144 |                 buttons: Array.from({ length: 17 }, (_, i) => ({
  145 |                   pressed: s.pressed.includes(i),
  146 |                   value: s.pressed.includes(i) ? 1 : 0,
  147 |                 })),
  148 |               },
  149 |             ]
  150 |           : [];
  151 |       },
  152 |     });
  153 |   });
  154 | }
  155 | export async function setPad(
  156 |   p: Page,
  157 |   pressed: number[] = [],
  158 |   axes: number[] = [0, 0, 0, 0],
  159 | ) {
  160 |   await p.evaluate(
  161 |     ({ pressed, axes }) =>
  162 |       Object.assign((window as any).__wm003pad, { pressed, axes }),
  163 |     { pressed, axes },
  164 |   );
  165 | }
  166 | export async function padTap(p: Page, n: number) {
  167 |   await setPad(p, [n]);
  168 |   await p.waitForTimeout(90);
  169 |   await setPad(p);
  170 |   await p.waitForTimeout(170);
  171 | }
  172 | export async function controllerStart(p: Page) {
  173 |   await installPad(p);
> 174 |   await p.goto("/?test=1");
      |           ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4173/?test=1
  175 |   await expect(p.locator("#loading")).toHaveClass(/hidden/);
  176 |   await padTap(p, 0);
  177 |   await p.waitForFunction(
  178 |     () =>
  179 |       window.__WM_DEBUG__!.getControllerStatus().lifecycle ===
  180 |       "CONTROLLER_READY",
  181 |   );
  182 |   await padTap(p, 0);
  183 |   await expect(
  184 |     p.getByRole("heading", { name: "Choose a save slot" }),
  185 |   ).toBeVisible();
  186 |   await padTap(p, 0);
  187 |   await padTap(p, 13);
  188 |   await padTap(p, 0);
  189 |   await expect(p.locator("#input-overlay")).toBeVisible();
  190 |   await p.waitForFunction(
  191 |     () =>
  192 |       window.__WM_DEBUG__!.getControllerStatus().lifecycle ===
  193 |       "CONTROLLER_READY",
  194 |   );
  195 | }
  196 | export function controller(p: Page): Controls {
  197 |   const held = new Set<string>(),
  198 |     buttons: Record<string, number> = {
  199 |       e: 6,
  200 |       c: 5,
  201 |       q: 4,
  202 |       Shift: 7,
  203 |       Space: 0,
  204 |       Escape: 9,
  205 |       r: 11,
  206 |     };
  207 |   const update = async (rx = 0, ry = 0) =>
  208 |     setPad(
  209 |       p,
  210 |       [...held].flatMap((k) => (buttons[k] === undefined ? [] : [buttons[k]!])),
  211 |       [
  212 |         (held.has("d") ? 1 : 0) - (held.has("a") ? 1 : 0),
  213 |         (held.has("s") ? 1 : 0) - (held.has("w") ? 1 : 0),
  214 |         rx,
  215 |         ry,
  216 |       ],
  217 |     );
  218 |   return {
  219 |     down: async (k) => {
  220 |       held.add(k);
  221 |       await update();
  222 |     },
  223 |     up: async (k) => {
  224 |       held.delete(k);
  225 |       await update();
  226 |     },
  227 |     press: async (k) => {
  228 |       held.add(k);
  229 |       await update();
  230 |       await p.waitForTimeout(75);
  231 |       held.delete(k);
  232 |       await update();
  233 |     },
  234 |     look: async (alpha, beta) => {
  235 |       for (let n = 0; n < 400; n++) {
  236 |         const s = await state(p),
  237 |           dx = s.cameraAlpha - alpha,
  238 |           dy = beta === undefined ? 0 : beta - s.cameraBeta;
  239 |         if (Math.abs(dx) < 0.009 && Math.abs(dy) < 0.009) break;
  240 |         await update(
  241 |           Math.abs(dx) < 0.009
  242 |             ? 0
  243 |             : Math.sign(dx) * (0.18 + Math.min(0.5, Math.abs(dx) * 0.6)),
  244 |           Math.abs(dy) < 0.009
  245 |             ? 0
  246 |             : Math.sign(dy) * (0.18 + Math.min(0.5, Math.abs(dy) * 0.6)),
  247 |         );
  248 |         await p.waitForTimeout(25);
  249 |       }
  250 |       await update();
  251 |       await p.waitForTimeout(150);
  252 |       const s = await state(p);
  253 |       expect(Math.abs(s.cameraAlpha - alpha)).toBeLessThan(0.04);
  254 |       if (beta !== undefined)
  255 |         expect(Math.abs(s.cameraBeta - beta)).toBeLessThan(0.04);
  256 |     },
  257 |   };
  258 | }
  259 | export async function stop(p: Page, controls = keyboard(p)) {
  260 |   for (const k of ["w", "a", "s", "d", "Shift", "c", "q", "e"])
  261 |     await controls.up(k);
  262 |   await p.waitForTimeout(350);
  263 | }
  264 | export async function route(
  265 |   p: Page,
  266 |   controls = keyboard(p),
  267 |   prefix = "keyboard",
  268 | ) {
  269 |   await controls.look(Math.PI / 2, 1.65);
  270 |   await controls.down("w");
  271 |   await controls.down("Shift");
  272 |   await wait(p, (s) => s.position.z < -21);
  273 |   await controls.down("e");
  274 |   await controls.press("Space");
```