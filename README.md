<p align="center">
  <img src="desktop/assets/app.png" width="112" height="112" alt="Focus Studio logo: a sun, checkmark, and layered green mountains">
</p>

# Focus Studio for macOS

A standalone, offline desktop workspace for a busy day: tasks, projects, priorities, due dates, subtasks, and immersive focus sessions.

Version 0.2.0 targets Apple silicon (M-series) Macs running macOS 13 or newer. The desktop app uses Electron with native macOS menus, Dock integration, a menu-bar timer, file dialogs, and completion notifications. It bundles its interface locally.

## Preview

![Today view with project tasks, priorities, subtasks, and daily workload](docs/screenshots/today.png)

| Focus on one task | Step into immersive view |
| --- | --- |
| ![Linked task and focus timer](docs/screenshots/focus-session.png) | ![Full-window immersive landscape and focus timer](docs/screenshots/immersive.png) |

These are actual desktop UI captures with sample work, taken in Electron on Linux. Mac system controls still need device validation. See the [full screenshot gallery](docs/preview.md) and [illustrated how-to guide](docs/user-guide.md).

## Get started

This repository contains source code and documentation. Build the app on your Mac using the commands below; generated app bundles and ZIPs are excluded from Git. If you already have the preview ZIP:

1. Extract Focus-Studio-0.2.0-mac-arm64.zip.
2. Move Focus Studio.app to Applications and open it.
3. Add your work with Command N, assign projects, and choose a manageable Today plan. Follow the [illustrated guide](docs/user-guide.md).
4. Use Focus on a task to begin a session. Finish with a reflection and optionally complete the task.

The bundle produced in this Linux workspace is a preview without Developer ID signing or Apple notarization. macOS may block it. See [the Mac installation guide](docs/macos-app.md) for the supported local-build alternative and validation limits.

## Useful workflows

- Today, Upcoming, All tasks, and Completed.
- Project filters, search across notes/subtasks, priority, due dates, planned dates, and effort estimates.
- A daily workload summary with overdue work and a suggested next task.
- Task-to-focus linking, reflections, and an optional complete-task step.
- Illustrated scenes, immersive view, gentler motion, and opt-in rain.
- A menu-bar countdown, native shortcuts, Dock badge, and focus completion notification.
- Local JSON persistence, a previous-state backup, and native import/export. Existing web exports can be imported.

## Develop on your Mac

Requires Node 24 or later. Dependencies are pinned in desktop/package-lock.json.

```sh
cd desktop
npm ci
npm start
```

Build an Apple silicon app bundle:

```sh
npm run package:mac
```

Packaging on a Mac applies an ad-hoc development signature; this is not Developer ID signing or notarization. The process also creates a ZIP under desktop/release/. Developer ID distribution remains a separate release step.

## Verify

```sh
cd desktop
npm test
npm run test:desktop
```

The real desktop test requires a graphical session. It was run on Linux with Xvfb and a Linux Electron runtime; it does not verify macOS-specific menu bar, Dock, notifications, Gatekeeper, or VoiceOver behavior.

See [documentation](docs/README.md), [the macOS guide](docs/macos-app.md), and [validation](docs/validation.md).

## Refresh documentation screenshots

After installing desktop dependencies, run `npm run capture:previews` from desktop/ in a graphical session. It captures the app using an isolated temporary profile and removes the sample data afterward. Linux environments need a display, for example `DISPLAY=:99 npm run capture:previews` with Xvfb running. See [capture notes](docs/preview.md#refresh-the-captures).

## Earlier web prototype

The original browser source remains under dist/. The desktop app has its own renderer under desktop/renderer/. The native app stores data in its own local file; it does not automatically read browser storage. Export from the web journal and import into the desktop app to transfer your data.
