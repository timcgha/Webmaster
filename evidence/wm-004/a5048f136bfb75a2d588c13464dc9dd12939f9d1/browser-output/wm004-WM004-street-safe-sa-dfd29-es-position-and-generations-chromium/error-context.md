# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm004.spec.ts >> WM004 street safe save reopen Continue preserves position and generations
- Location: e2e\wm004.spec.ts:99:1

# Error details

```
Test timeout of 120000ms exceeded.
```

# Page snapshot

```yaml
- main [ref=e2]:
  - generic "Webmaster 3D practice area" [ref=e3]
  - generic:
    - generic:
      - region "WEBMASTER":
        - paragraph: WEBMASTER PRACTICE NETWORK
        - heading "WEBMASTER" [level=1]
        - paragraph: Fast feet. Brave heart. A whole skyline to protect.
        - status:
          - generic: CONTROLLER
          - strong: "Controller: press any button or move a stick to connect"
        - generic:
          - button "New Game Choose a slot and difficulty" [ref=e4] [cursor=pointer]:
            - generic [ref=e5]: New Game
            - generic [ref=e6]: Choose a slot and difficulty
          - button "Continue Slot 1 • Normal • Reach the glowing sky gate" [ref=e7] [cursor=pointer]:
            - generic [ref=e8]: Continue
            - generic [ref=e9]: Slot 1 • Normal • Reach the glowing sky gate
          - button "Load Choose a manual save or checkpoint" [active] [ref=e10] [cursor=pointer]:
            - generic [ref=e11]: Load
            - generic [ref=e12]: Choose a manual save or checkpoint
          - button "Settings Camera and display" [ref=e13] [cursor=pointer]:
            - generic [ref=e14]: Settings
            - generic [ref=e15]: Camera and display
          - button "Controller Details Connection status and local diagnostics" [ref=e16] [cursor=pointer]:
            - generic [ref=e17]: Controller Details
            - generic [ref=e18]: Connection status and local diagnostics
        - paragraph: "A / ✕ Select & Jump • B / ○ Back • Menu / Options Pause • Keyboard: arrows + Enter / Esc"
  - status: Save confirmed.
```