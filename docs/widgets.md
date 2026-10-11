# Mac widgets

Version 0.3.0 offers two ways to keep your plan nearby. Floating widgets are part of Focus Studio. Desktop and Notification Center widgets come from a separate native WidgetKit companion.

| | Floating window | Native widgets |
| --- | --- | --- |
| Contents | Today, focus timer, seven-day totals | Today, Focus, Week |
| Actions | Capture, complete, select a task, start/pause/resume; open the main app | Click to open the relevant app view |
| Updating | Live while Focus Studio runs | macOS schedules updates; running countdown draws from the saved deadline |
| Requirements | Focus Studio 0.3.0, macOS 13+, Apple silicon | macOS 14+, full Xcode to build, Apple silicon |
| Verification | Real Electron workflow tested on Linux | Source/project checks passed; Xcode build, sandbox read, registration, and rendering need Mac confirmation |

## Update the app

From your existing checkout:

```sh
cd "$HOME/sumthink/desktop"
git pull --ff-only
npm ci
npm run install:mac
```

The installer preserves your tasks and sessions and retains the previous app. Version 0.3.0 retains the local signing correction from 0.2.1, which the owner confirmed opens successfully.

## Keep a floating window beside your work

In **To-dos**, click **Floating widgets ↗**. You can also choose **View → Floating Widgets**, use **Command Shift W**, or open it from the menu-bar menu.

![Actual floating companion with sample tasks, a live focus session, and weekly totals](screenshots/floating-widgets.png)

- Drag its header to place it beside your current work. **Pin** keeps it above other windows; click again to release it.
- Type a small next step and press Enter or **+**. It becomes a General task planned for today. The field clears after the main app accepts it.
- Use the round control to complete a task. Recurring tasks create their next occurrence through the same completion flow.
- **Focus** selects a task and opens Studio. Start the session from either window.
- **Begin focus / Pause / Resume** controls the same session. **Reflect & finish** opens reflection in the main app when the countdown is complete. The **Reflect ↗** shortcut opens Studio, where you can finish an active session early.
- Arrows open Today, Studio, or the journal. Closing this window leaves the main app running.

Finish open dialogs in the main app before changing tasks through the companion. A rejected capture stays in the input so you can retry. Quitting Focus Studio closes the floating window.

## Build and install desktop/Notification Center widgets

You already have full Xcode. Open it once and let its first-run setup finish. Then run this from desktop/ after updating the app:

```sh
npm run install:widgets
```

This builds **Focus Studio Widgets.app** and its embedded WidgetKit extension using Xcode, verifies the copied signatures, installs the companion in ~/Applications, registers the extension, and opens the setup window. Existing companion versions are retained as .backup directories. It does not replace or edit your studio data.

The project uses local ad-hoc signing. It does not purchase services or require a paid Developer ID subscription to compile. Native widget availability with this local signing configuration still needs confirmation on the intended Mac. This is a local development companion, without notarization or an App Store distribution configuration.

1. Open the updated **Focus Studio** once so it writes a local widget snapshot.
2. In the companion window, confirm it shows your snapshot summary. Click **Refresh widgets** if needed.
3. Right-click the Mac desktop and choose **Edit Widgets**. Search **Focus Studio Widgets**.
4. Add **Today** (small or medium), **Focus** (small), or **Week** (medium).
5. Add them to Notification Center through its **Edit Widgets** control as well.

Native widget screenshots will be added after a Mac build and visual check. The floating-window image above is an actual Electron capture; it is not a WidgetKit preview.

## What each native widget does

**Today** shows the remaining workload and up to three next tasks, ordered the same way as the app. Medium size adds project labels and overdue count. Clicking opens To-dos.

**Focus** shows the saved task and countdown, or the paused time. A running countdown uses its absolute deadline so WidgetKit can draw it without refreshing the extension each second. At the deadline, the timeline changes to “Time to reflect.” Clicking opens Studio; reflection is saved in the main app.

**Week** shows actual saved session minutes and task completions over seven local calendar days. Clicking opens the journal. Estimated task effort is not counted as focused time.

Widgets display when their snapshot was saved. They retain the last saved summary if Focus Studio is quit. Open the app to refresh the day and task counts. macOS controls WidgetKit refresh timing, so task edits may not appear immediately. Leaving the companion open requests timeline refreshes when its summary changes; you can close it after setup and rely on scheduled widget refreshes.

## Local snapshot and privacy

The app writes ~/Library/Application Support/Focus Studio/widget-snapshot.json atomically on saves and local-day rollover. It contains counts, three task titles/projects/estimates/priorities, current timer title/status/deadline, and weekly totals. It omits notes, subtasks, idea text, reflections, and the full session history. Titles can be visible on your desktop; place the widgets accordingly.

The companion and extension are sandboxed with a read-only, home-relative file exception for this single snapshot. They read it, never studio.json, and never write task data. This exception is for local development; any App Store release would need a reviewed sharing/signing design. No cloud account, calendar permission, network API, model inference, or ongoing service fee is introduced.

## Troubleshooting

**Xcode command-line tools selected instead of full Xcode**

If xcodebuild says its active developer directory is a command-line-tools instance, select your installed full Xcode in **Xcode → Settings → Locations → Command Line Tools**. Run `xcodebuild -version`, then retry the installer.

**Build fails**

Keep the first Xcode error, not only the final “BUILD FAILED” line. Open the committed project for inspection:

```sh
open ../widgets/FocusStudioWidgets.xcodeproj
```

Choose scheme **FocusStudioWidgets** and destination **My Mac**. Source and entitlements are under widgets/. The command-line installer regenerates the committed project; make persistent project setting changes in widgets/scripts/project.mjs as well.

**Companion shows no readable snapshot**

Launch the updated main app and save a task. Confirm the snapshot exists:

```sh
ls -l "$HOME/Library/Application Support/Focus Studio/widget-snapshot.json"
```

Reopen the companion and press **Refresh widgets**. If the file exists but still cannot be read, capture any sandbox denial from Console; the file exception must be validated on-device. Do not grant broad disk access just to hide this error.

**Widgets missing from the gallery**

Open the installed companion once, then close and reopen Edit Widgets. Check registration:

```sh
pluginkit -m -v -i dev.focusstudio.widgets.extension
```

If still missing, retain the build output and registration result. Gallery visibility and local signature acceptance are pending device checks; reinstalling repeatedly will not establish their cause.

## Development acceptance on the Mac

After installation, check the small/medium layouts, snapshot read, both widget galleries, click-through to all three app views, paused/running/expired countdown, task edits, local-day rollover, and stale saved-time labels after quitting. This checklist records outstanding native validation, not required permission to implement the feature.
