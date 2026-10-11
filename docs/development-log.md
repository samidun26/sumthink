# Development log

## 11 October 2026 — Productivity and both Mac widget formats (0.3.0)

The owner chose both floating and desktop/Notification Center widgets and confirmed full Xcode is installed. Defined the increment and acceptance before implementation in feature-plan.md. Added inline quick capture, daily/weekdays/weekly recurrence after completion, and a seven-day review. Optional recurrence fields retain the v2 backup schema; completion keeps history and creates one future task with reset subtasks. Reopening does not create duplicate occurrences.

Added an isolated floating window with Today capture/completion, shared focus controls, pinning, and weekly totals. Main remains the storage boundary; modal-conflict feedback preserves unaccepted capture text. Added a limited atomic widget snapshot and allowlisted native deep links. Included native WidgetKit Today/Focus/Week widgets, a SwiftUI setup companion, deterministic Xcode project, and a local build/verify/install/register command. Native sharing uses a read-only sandbox exception for one summary file; it does not access full studio data.

Seventeen model/storage/bundle cases, the original real Electron journey, and a new real floating-widget journey passed on Linux. Ten actual UI captures were refreshed without JavaScript errors. An OpenStep parser accepted the Xcode project and checked target embedding, source references, plists, entitlements, and scheme XML. Native Xcode build, snapshot entitlement, registration, and WidgetKit rendering are pending on the Mac; the installer and troubleshooting guide make those checks concrete.

Updated the illustrated guide, gallery, widget install guide, README, architecture, roadmap, validation, and decision record. The main app is 0.3.0 and retains the 0.2.1 signing repair already confirmed by the owner. No model API, paid backend, or cloud data sharing was added.


## 11 October 2026 — Local Mac signing correction (0.2.1)

A device crash report from an Apple silicon Mac identified a dyld Team ID rejection of the bundled Electron framework at process launch. The framework was present: the ad-hoc packaging configuration inherited the signing library’s hardenedRuntime: true default. Changed local per-file signing to explicitly disable hardened runtime; Developer ID distribution remains a separate workflow.

Added bundle/signature checks before ZIP creation and an install:mac command that rebuilds, verifies, stages a fresh copy, retains the previous app, and preserves user data. Version 0.2.1 identifies the corrected build. No raw device identifiers or personal crash report are committed. The owner subsequently confirmed successful 0.2.1 launch after install:mac on their Apple silicon Mac.

## 11 October 2026 — Visual documentation

Added the existing app logo and interface previews to the README, a screenshot gallery, and an illustrated usage guide covering task capture, daily planning, focus, immersive view, reflection, ideas, and backups. Added a repeatable Electron capture command with a temporary sample profile. Eight desktop UI captures were produced on Linux/Xvfb without JavaScript errors; the capture profile was removed afterward. These images do not establish macOS-specific runtime behavior.

## 11 October 2026 — GitHub source handoff

Prepared source, tests, assets, and documentation for samidun26/sumthink at the owner’s request. Excluded installed dependencies, generated releases, local environment files, and hosting metadata. Clarified the source-build path in the README; the original hosted prototype remains unchanged. No CI workflows or paid services were added.

## 11 October 2026 — macOS app and productivity workflow

The owner clarified that the product should be a macOS app with to-do/productivity features, confirmed Apple silicon, and asked for broad help with a heavy workload. The implementation retains the immersive design in a standalone Electron application and adds Today/Upcoming/All/Completed, projects, priority, planned/deadline dates, effort estimates, subtasks, workload summaries, and linked task/focus sessions.

Native integration adds menus/shortcuts, a menu-bar timer, Dock badge, completion notifications, local file persistence with a previous snapshot, and native import/export. Web v1 exports migrate to desktop v2. The first-party app is offline with an allowlisted protocol and isolated preload bridge.

Nine model/storage checks and the actual Electron task/focus/backup/relaunch journey passed on Linux. Apple silicon cross-packaging created a macOS 13+ arm64 bundle. Native Mac launch/signing/Gatekeeper, notifications, tray/Dock, sleep/wake, and VoiceOver remain unverified. This is a preview without Developer ID signing/notarization.

Updated the Mac usage/install guide, architecture, brief, design, roadmap, validation, and decision 0002. The earlier web source and deployment remain historical artifacts. Final archive inspection and source handoff follow packaging.

Handoff checks verified the arm64 binary and macOS 13 requirement, bundle identity/version, exact application-archive/source match, custom icon, ZIP integrity, preserved framework symlinks, and included external documentation. The packaged ASAR passed the desktop journey in the Linux runtime. A small source archive and checksums accompany the preview build. No Mac executable launch was performed.

Early desktop test attempts were corrected for the named packager export and JavaScript Playwright assertion API. The final real desktop journey passed; temporary test data was removed.

## 11 October 2026 — Discovery and documentation setup

### Request

Create an immersive, useful experience for a macOS user, personalize it through follow-up questions, and keep well-planned documentation during development.

### Completed

- Asked about daily work and friction, product platform, immersion and style, model meaning, and documentation destination.
- Established the project documentation and update cadence.
- Proposed Focus Studio as an unvalidated starting concept.

### Decisions

Keep an initial Markdown documentation set in the project workspace while the destination preference is pending. Leave product scope and technology open until discovery answers are available.

### Verification

Documentation-only setup. No application build, runtime, or test results exist.

### Next

Reflect answers in the brief, select the smallest useful journey, specify acceptance scenarios, and choose the platform before implementation.

## 11 October 2026 — First usable version

### Discovery answers

The owner chose an immersive web app for Mac, an eye-catching style, Sol 6.1, and Markdown docs alongside source. Their role and daily friction remain open questions.

### Delivered

Implemented illustrated scenery, focus sessions, pause/resume/reload recovery, immersive view, optional soft rain, idea capture/search/actions, session reflection and next steps, personalization, and JSON export. State is browser-local and schema-versioned.

### Refinements

Added stale-tab protection, preservation of unreadable saved data, a single completion prompt per expired session, inert covered controls in immersive view, reduced-motion behavior, and readable supporting labels. Removed external font fetching.

### Verification

JavaScript syntax check and four state/timer scenarios passed. The full Chromium desktop/mobile journey passed with no JavaScript errors. Mac Safari and VoiceOver are not yet verified. See validation.md for evidence and limits.

### Documentation

Updated the product brief, design, architecture, roadmap, validation, user guide, and platform decision. The original browser prototype remains a separate artifact.
