# Roadmap

Current priority: a useful standalone macOS app for an Apple silicon Mac.

| Milestone | Delivered result | Status |
| --- | --- | --- |
| Browser prototype | Immersive focus, ideas, and reflections | Completed previously |
| Desktop direction | Apple silicon target, local desktop architecture, broad productivity needs | Confirmed |
| Task workflow | Today/Upcoming/All/Completed, projects, priorities, dates, estimates, subtasks | Implemented |
| Focus integration | Linked task/session identity, optional complete-task step, daily workload | Implemented |
| Native shell | Menus, local JSON/backup, import/export, Dock badge, menu-bar timer, notifications | Implemented |
| Verification | Nine model/storage cases and actual Electron UI journey on Linux | Passed |
| Preview handoff | arm64 app bundle, ZIP, setup/usage/development docs | Cross-build ready |
| Mac release validation | Finder launch, Gatekeeper, menus, notifications, sleep/wake, VoiceOver | Requires Mac |
| Distribution release | Developer ID signing and notarization | Deferred |

## Next priorities

Use the app during a real workday and confirm whether Today helps the owner choose what to do next. Validate the preview on their Mac. Choose later integrations or automation from observed friction rather than assuming a job persona.

The owner asked for broad help across a heavy workload; dates, priorities, project grouping, and focus are included. Recurring tasks, deadline reminder notifications, calendar integration, cross-device sync, and AI task planning are future work, not delivered features.

## Documentation cadence

For each feature: define the need and acceptance scenario; record meaningful architecture decisions; implement a complete useful increment; verify behavior; update the docs and development log. Keep native-platform limitations explicit.
