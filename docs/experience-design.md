# Experience design

## Desktop productivity extension — version 0.2.0

The standalone app starts in To-dos with a warm daily-planning panel. Today, Upcoming, All tasks, and Completed keep actionable work separate from the full workload. The summary shows remaining tasks, estimated effort, overdue work, and daily completion progress.

Each task card has a completion control, readable project/priority/date metadata, a Focus action, and an editor. Notes and subtasks expand in place. The editor distinguishes a planned workday from a deadline. Search spans titles, notes, projects, and subtasks.

High-priority Today work has a soft recommendation to stay around three items; no hard cap prevents the owner from planning more. Overdue work is recommended first, then priority/date. This is deterministic sorting, not AI advice.

Native menus expose tasks, focus, preferences, backups, and views. The menu-bar timer and Dock badge reflect app state. These Mac-specific presentations still require device validation. Closing the window keeps the app running; quitting is explicit.

The following focus/scene principles originated in the web prototype and are retained in the desktop renderer.

## Direction

An illustrated room for intentional work. Cream panels and a forest-green sidebar frame an ambient mountain landscape. A large timer and one task sit at the center. Three scenes change the illustration without relocating controls. Gentle sun motion gives the scene life; system typography feels familiar on Mac.

## Main journey

1. Type a task or bring an inbox idea into the studio.
2. Choose 25, 45, or 60 minutes before beginning.
3. Begin focus; title and duration stay fixed until finish/reset.
4. Pause/resume, optionally immerse, and optionally enable soft rain.
5. Finish early or wait for completion; add a reflection and next step.
6. Save and retrieve the record in the journal; the next step remains in the studio.

Dismissed reflection leaves the session paused/complete and can be reopened. Reset confirms before discarding unfinished work. Expiration prompts once rather than repeatedly reopening a dismissed dialog.

## Supporting journeys

Quick capture saves a thought without leaving a session. Inbox search filters by text; completed ideas remain retrievable. An idea can become a task while the timer is idle. Delete confirms first.

Settings personalize name, work mode, and motion. Work mode supplies a title when the task is blank. Journal export downloads current state as JSON; import is not available.

## Interaction and accessibility

Controls use native elements and labels. Keyboard focus uses a visible orange outline. Modal dialogs handle focus. Immersive view makes obscured workspace controls inert, with a visible exit and Escape.

Shortcuts do not intercept text entry. Sound starts off. System reduced motion and gentler motion disable animation. Browser locale/timezone determines app clocks and dates; docs use Asia/Jakarta.

Responsive layouts condense the sidebar to an icon rail and then a bottom navigation bar. Supporting labels remain readable alongside the large focus timer.

## State feedback

Distinct empty inbox/journal and no-search-results states explain the next action. Timer controls distinguish idle/running/paused/complete. Save status reports storage failures and stale-tab conflicts. Toasts confirm meaningful actions; temporary work remains exportable.

Screenshots from verification live under screenshots/. Test names/notes are confined to isolated browser contexts.
