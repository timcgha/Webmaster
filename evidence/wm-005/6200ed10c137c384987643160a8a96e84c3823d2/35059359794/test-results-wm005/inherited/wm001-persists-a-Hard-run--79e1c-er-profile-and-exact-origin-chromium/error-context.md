# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm001.spec.ts >> persists a Hard run after closing and reopening the same browser profile and exact origin
- Location: e2e\wm001.spec.ts:754:1

# Error details

```
Error: expect(received).toBeCloseTo(expected, precision)

Expected: 3.6900000000000066
Received: 3.6966666666666734

Expected precision:    2
Expected difference: < 0.005
Received difference:   0.006666666666666821
```

# Test source

```ts
  696 | 
  697 | test("renders storage-unavailable records explicitly and refuses destructive replacement", async ({ page, browserName }) => {
  698 |   await page.addInitScript(() => {
  699 |     const nativeGetItem = Storage.prototype.getItem;
  700 |     const nativeSetItem = Storage.prototype.setItem;
  701 |     const nativeRemoveItem = Storage.prototype.removeItem;
  702 |     Storage.prototype.getItem = function (key: string): string | null {
  703 |       if (key.startsWith("webmaster.save.v1.")) throw new DOMException("Injected unavailable storage", "SecurityError");
  704 |       return nativeGetItem.call(this, key);
  705 |     };
  706 |     Storage.prototype.setItem = function (key: string, value: string): void {
  707 |       if (key.startsWith("webmaster.save.v1.")) throw new DOMException("Injected unavailable storage", "SecurityError");
  708 |       nativeSetItem.call(this, key, value);
  709 |     };
  710 |     Storage.prototype.removeItem = function (key: string): void {
  711 |       if (key.startsWith("webmaster.save.v1.")) throw new DOMException("Injected unavailable storage", "SecurityError");
  712 |       nativeRemoveItem.call(this, key);
  713 |     };
  714 |   });
  715 |   await ready(page);
  716 |   await page.getByRole("button", { name: /^Load/ }).click();
  717 |   await expect(page.getByRole("button", { name: /Slot 1 • Manual/ })).toContainText("unavailable");
  718 |   await page.getByRole("button", { name: /^Back/ }).click();
  719 |   await page.getByRole("button", { name: /New Game/ }).click();
  720 |   await page.getByRole("button", { name: /Slot 1/ }).click();
  721 |   await page.getByRole("button", { name: /Easy/ }).click();
  722 |   await expect(page.getByRole("heading", { name: "Replace slot 1?" })).toBeVisible();
  723 |   await page.getByRole("button", { name: /Replace and start/ }).click();
  724 |   await expect(page.getByRole("heading", { name: "Choose a save slot" })).toBeVisible();
  725 |   await expect(page.locator("#toast-layer")).toContainText("Existing data was restored");
  726 |   await page.screenshot({ path: `${captures}/${browserName}-storage-unavailable-explicit.png` });
  727 | });
  728 | 
  729 | test("remains controllable under a second real-time CPU/frame profile", async ({ page, context, browserName }, testInfo) => {
  730 |   test.skip(browserName !== "chromium", "Chromium CDP supplies the explicit second rendered timing profile.");
  731 |   const cdp = await context.newCDPSession(page);
  732 |   await cdp.send("Emulation.setCPUThrottlingRate", { rate: 2 });
  733 |   await ready(page);
  734 |   await newGameWithMouse(page, 2, "Normal");
  735 |   const before = await state(page);
  736 |   await hold(page, ["w"], 1_200);
  737 |   const after = await state(page);
  738 |   expect(after.position.z).toBeGreaterThan(before.position.z + 3);
  739 |   expect(after.position.z).toBeLessThan(before.position.z + 8);
  740 |   expect(after.grounded).toBe(true);
  741 |   await page.keyboard.press("Space");
  742 |   await page.waitForTimeout(150);
  743 |   expect((await state(page)).position.y).toBeGreaterThan(0.1);
  744 |   await page.waitForTimeout(1_000);
  745 |   expect((await state(page)).grounded).toBe(true);
  746 |   await page.screenshot({ path: `${captures}/${browserName}-second-timing-profile.png` });
  747 |   await writeFile(
  748 |     testInfo.outputPath("second-timing-profile.json"),
  749 |     JSON.stringify({ engine: "Chromium CDP", cpuThrottlingRate: 2, start: before.position, finish: after.position }, null, 2),
  750 |   );
  751 |   await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  752 | });
  753 | 
  754 | test("persists a Hard run after closing and reopening the same browser profile and exact origin", async ({ playwright, browserName }, testInfo) => {
  755 |   test.skip(browserName !== "chromium", "Persistent-profile close/reopen evidence is captured on Chromium; WebKit receives ordinary rendered coverage.");
  756 |   const userDataDir = testInfo.outputPath("persistent-profile");
  757 |   const persistentOptions = {
  758 |     headless: true,
  759 |       ...(process.env.WM_BROWSER_CHANNEL ? {channel:process.env.WM_BROWSER_CHANNEL} : {}),
  760 |     viewport: { width: 1280, height: 720 },
  761 |     ...(process.env.WM_CHROMIUM_PATH ? { executablePath: process.env.WM_CHROMIUM_PATH } : {}),
  762 |   };
  763 |   let context = await playwright.chromium.launchPersistentContext(userDataDir, persistentOptions);
  764 |   let page = await context.newPage();
  765 |   await ready(page);
  766 |   await newGameWithMouse(page, 3, "Hard");
  767 |   await hold(page, ["w", "Shift"], 1_350);
  768 |   expect((await state(page)).progress).toBe(1);
  769 |   const savedPosition = (await state(page)).position;
  770 |   await page.keyboard.press("Escape");
  771 |   await page.getByRole("button", { name: /^Save Game/ }).click();
  772 |   await expect(page.locator("#toast-layer")).toContainText("Save confirmed");
  773 |   const savedPayload = await activeSavePayload(page, 3, "manual");
  774 |   expect(savedPayload).toMatchObject({
  775 |     schemaVersion: 1,
  776 |     slot: 3,
  777 |     difficulty: "Hard",
  778 |     health: 100,
  779 |     maxHealth: 100,
  780 |     checkpoint: { x: 0, y: 0, z: 1.2 },
  781 |     progress: 1,
  782 |     progressLabel: "Reach the golden sun pad",
  783 |     costumeId: "skyline-teal",
  784 |     completion: false,
  785 |   });
  786 |   await context.close();
  787 | 
  788 |   context = await playwright.chromium.launchPersistentContext(userDataDir, persistentOptions);
  789 |   page = await context.newPage();
  790 |   await ready(page);
  791 |   await expect(page.getByRole("button", { name: /Continue/ })).toContainText("Hard");
  792 |   await page.getByRole("button", { name: /Continue/ }).click();
  793 |   await expect(page.locator("#input-overlay")).toBeVisible();
  794 |   const restored = await state(page);
  795 |   expect(restored.position.x).toBeCloseTo(savedPosition.x, 2);
> 796 |   expect(restored.position.z).toBeCloseTo(savedPosition.z, 2);
      |                               ^ Error: expect(received).toBeCloseTo(expected, precision)
  797 |   expect(restored).toMatchObject({ health: 100, progress: 1, progressLabel: "Reach the golden sun pad", grounded: true });
  798 |   expect(await page.evaluate(() => window.__WM_DEBUG__!.getCurrentRun())).toEqual({ slot: 3, difficulty: "Hard" });
  799 |   expect(await activeSavePayload(page, 3, "manual")).toEqual(savedPayload);
  800 |   await page.screenshot({ path: `${captures}/chromium-persistent-reopen.png` });
  801 |   await context.close();
  802 | });
  803 | 
  804 | test("labels corrupt and incompatible save fixtures without hiding valid choices", async ({ page, browserName }) => {
  805 |   await page.addInitScript(() => {
  806 |     localStorage.setItem("webmaster.save.v1.slot1.manual.a", "{not-json");
  807 |     localStorage.setItem("webmaster.save.v1.slot2.checkpoint.a", JSON.stringify({ format: "webmaster-save", schemaVersion: 99 }));
  808 |   });
  809 |   await ready(page);
  810 |   await page.getByRole("button", { name: /^Load/ }).click();
  811 |   await expect(page.getByRole("button", { name: /Slot 1 • Manual/ })).toContainText("damaged");
  812 |   await expect(page.getByRole("button", { name: /Slot 2 • Checkpoint/ })).toContainText("incompatible");
  813 |   await page.screenshot({ path: `${captures}/${browserName}-invalid-save-fixtures.png` });
  814 | });
  815 | 
  816 | test("keeps the rendered HUD and menus usable at 1920x1080 and representative iPad landscape", async ({ page, browserName }) => {
  817 |   if (browserName === "chromium") await page.setViewportSize({ width: 1920, height: 1080 });
  818 |   await ready(page);
  819 |   await expectInViewport(page, ".menu-panel");
  820 |   await newGameWithMouse(page, 1, "Easy");
  821 |   for (const selector of [".objective-card", ".health-card"]) await expectInViewport(page, selector);
  822 |   await page.waitForTimeout(2200);
  823 |   const samples = await page.evaluate(() => window.__WM_DEBUG__!.performance());
  824 |   expect(samples.samples.length).toBeGreaterThanOrEqual(1);
  825 |   expect(samples.minimum).toBeGreaterThanOrEqual(30);
  826 |   const suffix = browserName === "chromium" ? "1920x1080" : "1194x834-ipad-landscape";
  827 |   await page.screenshot({ path: `${captures}/${browserName}-${suffix}.png` });
  828 |   if (browserName === "chromium") {
  829 |     await page.setViewportSize({ width: 1194, height: 834 });
  830 |     for (const selector of [".objective-card", ".health-card", "#input-overlay"]) await expectInViewport(page, selector);
  831 |     await page.screenshot({ path: `${captures}/chromium-1194x834-representative-ipad-layout-not-safari.png` });
  832 |   }
  833 |   await writeFile(
  834 |     `${captures}/${browserName}-performance-samples.json`,
  835 |     JSON.stringify({ viewport: browserName === "chromium" ? [1920, 1080] : [1194, 834], samples, limitation: "Headless Linux software-rendering observation; not a physical Windows or iPad measurement." }, null, 2),
  836 |   );
  837 | });
  838 | 
```