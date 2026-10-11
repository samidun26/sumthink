# Productivity and Mac widgets — 0.3.0 plan

## User needs and delivered increment

The owner requested useful additions for a busy workload and chose both floating and desktop/Notification Center widgets. They confirmed version 0.2.1 opens on their Mac and full Xcode is installed.

| Need | Planned behavior | Acceptance |
| --- | --- | --- |
| Capture without a dialog | Inline quick-add creates a task planned for today | Enter saves one task and clears the field |
| Repeated work | Daily, weekdays, and weekly recurrence | First completion creates one next occurrence; reopening/recompleting does not duplicate it |
| Review actual progress | Seven-day session time and task completions | Counts use local calendar days and exclude future records |
| Keep work beside another app | Compact floating companion with Today, timer, and weekly totals | Shares the same studio, supports pinning, quick capture, and timer/task actions |
| Glance from the Mac desktop | Separate native WidgetKit companion with Today, Focus, and Week widgets | Reads a limited local snapshot and opens the appropriate Focus Studio view |

## Boundaries and data

The Electron app remains offline and uses v2 studio backups. Existing data defaults to no recurrence; new optional task fields round-trip through storage. Completing a recurring task retains its history and starts a new open occurrence with unchecked subtasks. Missed days are skipped, rather than flooding Today with catch-up tasks.

The floating companion has an isolated renderer and a narrow action bridge. The main renderer remains the writer of task/session data. The native WidgetKit companion reads widget-snapshot.json, a limited projection containing counts, three Today task titles/projects, timer status, and seven-day totals. It never edits studio.json.

Native widgets require macOS 14+ and full Xcode to build. A local sandbox read-only exception is limited to the snapshot file; no paid Developer ID account, server, or cloud sync is part of the local workflow. Desktop widgets refresh on WidgetKit's schedule, not every timer tick. Native build, registration, and presentation require validation on a Mac.

## Documentation and verification

Add recurrence/date/idempotence and week-summary checks, snapshot boundary checks, and real Electron companion journeys. Capture the new app features and floating companion. Update architecture, how-to instructions, installation, roadmap, and the development log. Keep native WidgetKit device validation separate from Linux checks.
