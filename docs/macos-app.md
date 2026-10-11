# macOS application guide

Date: 2026-10-11 (Asia/Jakarta).
Version: 0.2.0.
Target: Apple silicon, macOS 13+.

## App bundle

Packaging generates desktop/release/Focus-Studio-0.2.0-mac-arm64.zip; generated archives are excluded from this repository. It contains Focus Studio.app. If you have the archive, extract it, move the app to Applications, and open it through Finder. Once installed, the app works independently of Terminal, a browser, and Codex.

This cloud-built preview is not Developer ID signed or notarized. Gatekeeper may block launch. Use macOS's app-specific Open Anyway option only if it is offered and you trust this build. Do not disable Gatekeeper globally.

If the downloaded preview cannot launch, use the source on your Mac: install Node 24+, run npm ci and npm start in desktop/, or run npm run package:mac to produce a local ad-hoc-signed build. macOS packaging/signing has not been run in this Linux environment. Developer ID signing and notarization need a Mac and the app owner's Apple developer credentials.

See the [illustrated walkthrough](user-guide.md) and [screenshot gallery](preview.md) for examples of the interface.

## Daily workflow

1. Capture everything in All tasks; assign a project, priority, estimated effort, and a deadline if relevant.
2. Plan a few doable items for Today. The daily summary includes overdue work and totals the remaining estimated effort.
3. Prefer a short priority list; the app suggests reducing high priorities when more than three are planned, while allowing any number.
4. Use Focus on a task, pause when needed, and finish with a reflection.
5. Optionally mark the linked task complete during reflection. This does not automatically mark all subtasks complete.
6. Review the session journal and export a backup when you want to retain a portable copy.

Overdue unfinished deadlines appear in Today even if the planned date is later. Upcoming excludes work already actionable today. Finished tasks live in Completed. Completed items from older days do not inflate today's progress.

The suggested next task ranks overdue work before priority, then date. Effort estimates are planning estimates, not a measurement of actual productivity.

## Task details

Each task can have notes, a project, high/normal/low priority, a planned date, a separate deadline, a 15–90 minute effort estimate, and up to 100 subtasks. Plan for assigns the work to a day; Deadline identifies when it must be done.

Task Focus chooses a 25, 45, or 60 minute session from the estimate. You can change that duration before starting. You can continue using several sessions for a longer task; saved sessions retain task identity.

Tasks can be edited, completed/reopened, or deleted. Deleting a task keeps saved session history. A task currently linked to an unfinished session must be finished/reset before deletion.

An idea can become a task through the inbox's plus action. Search matches task titles, projects, notes, and subtasks.

## Mac controls

| Command | Action |
| --- | --- |
| Command N | New task |
| Command Shift J | Capture an idea |
| Command 1 / 2 / 3 / 4 | Studio / To-dos / Inbox / Journal |
| Command comma | Preferences |
| Command Shift E / I | Export / import backup |
| Command Shift F | Immersive focus |
| Space | Start/pause a session when not typing in the Studio |
| Command Q | Quit the application |

Closing the Mac window hides it and keeps the app/menu-bar timer running. Open it from the Dock or menu bar. Quitting ends the process; the session deadline is recovered on the next launch. The app inhibits application suspension while a session is running; it does not prevent the screen or Mac from sleeping.

A silent system notification is emitted on a running-to-complete transition while the app is alive. Delivery depends on macOS notification settings and Focus modes. There are no timed task-deadline reminder notifications in this version.

The Dock badge counts unfinished Today/overdue tasks. None of these shortcuts are global shortcuts across other apps.

## Local data and recovery

Data lives at ~/Library/Application Support/Focus Studio/studio.json, using Electron's userData directory. Writes are serialized in the main process, written to a temporary file, flushed, and renamed atomically. studio.previous.json retains the previous valid saved state. It is a recovery snapshot, not a substitute for periodic exports.

Use File → Export Backup to save a portable JSON copy. Import explicitly replaces the current studio after confirmation. Export first to keep the previous workspace. The app accepts v1 web exports and v2 desktop backups. Unknown versions and oversized backups are rejected.

If existing data is unreadable, it remains untouched and the app opens a temporary workspace. Import a valid backup to recover; the unreadable bytes are retained in a separate local file. A disk-write error shows save feedback so you can export before quitting.

A 10 MB backup limit protects the local I/O boundary. There is no automatic web sync, account sync, model inference, calendar access, or automatic updater.

## Verification limits

The actual Electron UI was tested on Linux with a graphical virtual display. The macOS bundle was cross-built and structurally inspected for the arm64 binary, bundle identity, app version, icon, local app archive, and included docs.

A real Mac is still needed to check Finder launch, Gatekeeper/signing, menu-bar template rendering, Dock badge, notifications, sleep/wake, traffic-light controls, and VoiceOver. The ZIP is a preview artifact, not a notarized distribution release.
