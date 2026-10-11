# Validation

## Local Mac packaging correction — version 0.2.1

An Apple silicon device crash report confirmed dyld rejected the existing Electron framework because “mapping process and mapped file (non-platform) have different Team IDs.” Local ad-hoc signing inherited the signing library’s hardened-runtime default. The corrected configuration explicitly disables hardened runtime for local ad-hoc builds; it does not alter system-wide macOS settings or the renderer sandbox.

Twelve model/storage/bundle checks passed on Linux: the original nine checks plus signature-output cases, valid/broken framework links, and rejection of bundle links to external code. The new bundle checker also passed against the previously generated real macOS bundle’s structure. Linux cross-packaging of 0.2.1 completed with the new checks; its ZIP integrity, framework symlink, and bundle version were verified. Cross-packaging does not validate the native signing correction. On macOS, packaging and installation additionally require deep/strict codesign verification and confirm the local main signature has no hardened-runtime flag.

The installer stages and verifies the new app before replacing the personal Applications copy, retains the previous app, and leaves user data untouched. Native codesign execution, install replacement, and successful launch of 0.2.1 still need confirmation on a Mac; the user-provided 0.2.0 crash is device evidence of the problem, not validation of the fix.

## Visual documentation — 11 October 2026

`DISPLAY=:99 npm run capture:previews` ran the real Electron app on Linux/Xvfb and captured eight UI states with sample tasks and ideas: Today, task editor, linked focus, immersive view, reflection, idea inbox, journal, and preferences. No JavaScript errors were reported. The isolated temporary profile was removed after capture. Images are documentation examples, not user data or evidence of macOS system behavior. The short saved session records actual elapsed demo time.

The README embeds the existing app logo and current previews. The illustrated user guide and preview gallery use repository-relative image paths for GitHub rendering. Markdown/image targets and PNG integrity were checked before upload.

## Desktop version 0.2.0 — 11 October 2026 (Asia/Jakarta)

| Check | Result | Evidence and limit |
| --- | --- | --- |
| Desktop JS syntax | Passed | Main, preload, storage, and renderer modules |
| npm test | 9 passed | Six task/timer/migration cases; three filesystem/backup cases |
| DISPLAY=:99 npm run test:desktop | Passed | Actual Electron UI and preload/main IPC on Linux/Xvfb; no JavaScript errors |
| Apple silicon cross-package and ZIP inspection | Passed | arm64 Mach-O, macOS 13 minimum, app ID/version, exact ASAR/source match, app icon, ZIP integrity, framework symlinks and included documentation |
| Packaged ASAR desktop journey | Passed on Linux | Same application archive exercised with the Linux Electron runtime; does not validate the Mac executable |
| Finder launch, Gatekeeper, Dock/tray, notifications, sleep/wake, VoiceOver | Not run | Requires macOS |

The desktop journey exercised task capture, priorities/estimates, projects/search, Today/Upcoming/Completed, subtasks, linked focus, optional complete-task flow, journal records, native menu-command wiring, persistence across application relaunch, native-dialog import/export IPC, v1 migration, invalid-import preservation, the protocol allowlist, renderer isolation, and a denied network fetch.

Native save/open/confirmation dialogs were stubbed in the desktop test; real IPC, validation, and filesystem I/O still ran. Platform-specific macOS UX is not verified by the Linux run. The preview screenshot uses isolated test tasks and does not populate a production studio.

The built app is an unsigned/non-notarized preview for local review. There is no claim that Gatekeeper will approve the ZIP.

## Earlier web prototype verification

Application checks passed on 11 October 2026 (Asia/Jakarta).

## Results

| Scenario or command | Environment | Result | Coverage or limit |
| --- | --- | --- | --- |
| node --check dist/app.mjs | Node 24, Linux | Passed | Application syntax |
| node tests/core.test.mjs | Node 24, Linux | 4 passed | Deadline/reload, pause/resume, expiration, saved-data validity |
| python tests/browser_smoke.py | Chromium, Linux; 1440×1080 and 390×844 | Passed | Full journey and recovery; no JavaScript errors |
| Safari and VoiceOver | macOS | Not run | Requires a Mac |

## Browser acceptance scenarios exercised

- Capture an idea, reload, search it, mark it done, delete it, and use it as a focus task.
- Display text containing script markup as text.
- Start, pause, resume, reload, and finish a session with consistent state.
- Record and retrieve reflections and next steps; export JSON with actual records.
- Persist name, work mode, scene, and gentler motion.
- Capture using the Command shortcut; leave immersive view with Escape.
- Make obscured controls inert during immersive view.
- Toggle optional audio explicitly on and off.
- Recover an expired deadline; dismiss reflection without repeatedly reopening it.
- Prevent a stale tab from overwriting a newer tab's state.
- Preserve corrupt storage while allowing temporary work.
- Use the phone layout without horizontal overflow.

Desktop/mobile screenshots live in screenshots/. These are real browser captures of a clean studio; sample notes and names belong only to isolated test contexts.

Early browser attempts exposed ambiguous selectors and test fixtures overwritten by normal page-exit persistence. Those fixtures were corrected; the final complete run passed.

## Remaining device checks

Verify macOS Safari, VoiceOver, physical Mac shortcuts, and audio behavior on the intended Mac. Browser checks in Linux do not establish those results. Completion requires an open page; no OS notification is promised. Signing and native packaging do not apply to this web app.
