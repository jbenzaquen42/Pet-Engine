# Free-Roam Phase 5: Polish + Ship — Completion Record

Final phase of the free-roam rework. Delivered:

- [x] **Panel redesign** — compact single-column layout for the 420px tray window: cat cards, catalog grid, wrapping command bar, collapsible tools. Removed the dead desktop-mode control and the obsolete wide-window responsive CSS that fought the fixed height (`.app-shell` is now a flex column; `.workspace` flexes and scrolls internally). Verified at 420x620 in preview.
- [x] **First-run hint** — dismissable banner ("companions live on your desktop now… Ctrl+Alt+P brings this panel back"), persisted via `personal-pet-engine:first-run-seen`.
- [x] **Launch at login** — `launchAtLogin` setting → `app.setLoginItemSettings`; command-bar toggle.
- [x] **App icon** — `scripts/make-icon.mjs` renders `build/icon.png` (procedural cat-face, no image deps) used for window, tray, and installer.
- [x] **NSIS installer** — `electron-builder` config in `package.json`; `npm run dist` builds `Pet Engine Setup <version>.exe`. Output is redirected to `%LOCALAPPDATA%/pet-engine-release` because the project lives under OneDrive, which locks `release/` during the win-unpacked rename (EPERM). Verified: 77 MB installer built and signed.

**Ship command:** `npm run dist` (Windows). Artifact lands in `%LOCALAPPDATA%\pet-engine-release`.

All 57 unit tests pass; `npm run build` clean.
