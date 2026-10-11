# Architecture

Current: standalone Electron macOS desktop application under desktop/.
Historical web prototype: dist/.

## Modules

| Module | Responsibility |
| --- | --- |
| desktop/main.cjs | Application lifecycle, native menus, single instance, tray, Dock, notifications, trusted IPC and local protocol |
| desktop/preload.cjs | Narrow isolated bridge: load/save/import/export, timer/task status, menu commands |
| desktop/storage.cjs | Size-limited JSON validation, atomic writes, previous snapshot, corrupt-data preservation |
| desktop/renderer/core.mjs | Versioned state and deadline timer logic |
| desktop/renderer/tasks.mjs | Task validation, local dates, views, ordering, daily workload |
| desktop/renderer/app.mjs | UI state, task editor, subtask interactions, sessions, dialogs, backup calls |
| desktop/renderer/index.html / style.css | Immersive interface and task planning layout |
| desktop/scripts/package-mac.mjs | Reproducible arm64 app/ZIP packaging and external documentation resources |

The application bundles its local renderer and has no production runtime dependency beyond the packaged Electron runtime. Development dependencies are pinned by desktop/package-lock.json. There is no hosted backend or runtime network access.

## Desktop boundary

The renderer loads from an allowlisted focus://app origin. Only the app's known HTML, module, CSS, and icon files are served. Node integration is off, context isolation and renderer sandbox are on, and new windows/navigation are blocked. CSP denies network connections, and the default session rejects HTTP/HTTPS and permission requests.

The main process checks IPC sender identity, main-frame identity, and the application URL before granting operations. The bridge does not expose generic filesystem paths, arbitrary code execution, or shell commands. Export/import choose paths through native dialogs. Documentation is packaged outside app.asar so a system viewer can open it.

Development desktop tests use a temporary data directory only when app.isPackaged is false. The production app ignores that test override.

## Storage and schema

The app uses Electron userData, normally ~/Library/Application Support/Focus Studio/. studio.json holds version 2 state, and studio.previous.json retains the prior valid state. Atomic writes create a mode-0600 temporary file, flush it, and rename it; main-process synchronous operations serialize saves. Imports require explicit replacement confirmation and validated JSON under 10 MB.

Unreadable saved data blocks ordinary saves and opens a temporary workspace. Explicit backup recovery retains original unreadable bytes separately. Failed imports leave the current studio intact.

Version 2 adds tasks, activeTaskId, and taskId in timers/session records. The parser migrates v1 web exports and keeps their ideas, sessions, preferences, and timer state.

A task holds id, title, notes, project, priority, dueDate, plannedDate, estimate, done, createdAt, completedAt, and subtasks. Each subtask has id/title/done. Dates are YYYY-MM-DD calendar dates; Today uses the local day rather than UTC.

## Planning logic

Unfinished overdue deadlines are included in Today. Upcoming excludes tasks already actionable today. Completed items from past days do not inflate today's summary. Workload sums estimates of unfinished Today tasks only. Recommended task order is overdue first, then high/normal/low priority, then date.

Subtask completion is independent of parent completion. Task deletion retains historical sessions. Editing/deleting a task does not rewrite previously recorded session titles.

## Focus and lifecycle

An absolute timer deadline survives reload and relaunch. Pause freezes remaining time; resume creates a new deadline. A session records its taskId and elapsed focus seconds, reflection, and next step. Completion can also complete the linked task explicitly.

On Mac, closing the window hides it while the app remains alive. Command Q quits. A running session disables application suspension; display sleep and system sleep are still allowed. After wake/relaunch, deadline arithmetic resolves elapsed time. There is no activity monitoring or claim that elapsed time represents observed work.

The tray menu shows session state and a running countdown. The Dock badge counts actionable Today work. A silent native notification is emitted once on running-to-complete while the app runs; OS settings may suppress delivery.

## Build and validation

Cross-packaging produces a Mach-O arm64 application for macOS 13+. The Linux build preserves Electron's binary signatures without modifying the integrity digest; it has no Developer ID signature or notarization. Mac packaging uses local ad-hoc signing with hardened runtime explicitly disabled and can apply the runtime integrity digest. Packaging verifies bundle links and, on macOS, the deep signature and absence of the incompatible local runtime flag before archiving. The install:mac command stages and verifies a fresh copy before replacing the personal Applications installation; it retains the previous app and preserves the userData directory.

Nine model/storage scenarios and the real Electron UI journey ran on Linux. Native Mac presentation, signing, Finder launch, notifications, sleep/wake, and VoiceOver remain device checks.
