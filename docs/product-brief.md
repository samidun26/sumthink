# Product brief

Current product: Focus Studio for macOS, version 0.2.1.

## Confirmed owner context

The owner wants an immersive macOS application that improves productivity through to-dos and other useful features. They confirmed an Apple silicon Mac and want help across deadlines, prioritization, focus, and organizing projects because they have a heavy workload. They prefer eye-catching visuals and Markdown docs alongside the code. Sol 6.1 is the model they identified for this development work.

Their exact job and work habits remain unspecified; no role/persona has been invented.

## Product hypothesis

Bring capture, daily planning, execution, and reflection into one local workspace so the owner spends less effort deciding where their work belongs. The productivity benefit still requires feedback from a real workday; no measured improvement is claimed.

## Delivered journey

Capture task → assign project/priority/date/estimate → choose today's work → focus on a task → record progress and next step → optionally complete task → review completed work and the journal.

Supporting journeys: capture ideas, convert one into a task, manage subtasks, find overdue/upcoming work, export/import backups, and recover prior web-app data.

## Delivered scope

An offline Electron macOS app with Today/Upcoming/All/Completed, project filtering, search, priority, due/planned dates, effort estimates, subtasks, daily workload summaries, linked focus sessions, reflections, and local JSON data.

The immersive scenes, optional rain, and motion controls remain. Native features include menus/shortcuts, file dialogs, menu-bar timer, Dock badge, and focus completion notifications.

## Boundaries

Apple silicon, macOS 13+. The cloud-built preview is not Developer ID signed or notarized. Mac-specific runtime validation is pending.

No global shortcuts, deadline reminder notifications, recurring tasks, calendar integrations, sync, automatic updates, or live AI inference are included. The earlier hosted web app remains a separate prototype.

## Success criteria

The owner can capture work, plan today, focus on a linked task, and retrieve its result without changing tools. Data survives app relaunch; backups can be exported and restored, including old web exports. Paused time does not count toward sessions. Date-based planning uses the Mac's local calendar day. Effort estimates exclude completed tasks.

Real-world usefulness should be judged through owner feedback after an actual workday.
