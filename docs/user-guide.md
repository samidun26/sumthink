# How to use Focus Studio

Focus Studio brings tasks, focus sessions, ideas, and reflections into one offline Mac app. This walkthrough uses sample work. Screenshots show the actual Electron interface captured on Linux; macOS system controls are not pictured.

For installation and platform requirements, start with the [macOS app guide](macos-app.md). A packaged app opens from Applications without Terminal, a browser, or Codex running.

## 1. Capture a clear next step

Open **To-dos** and click **New task**, or press **Command N**. Give it a specific title such as “Prepare project proposal.” Add a project, priority, and estimated effort.

**Plan for** is the day you intend to work on it. **Deadline** is when it must be finished. Use notes for context and **Add subtask** to break larger work into smaller steps. Click **Save task**.

![Task editor with project, priority, planned date, deadline, effort, notes, and subtasks](screenshots/task-editor.png)

## 2. Make a manageable Today plan

Choose **Today** to see work planned for today and unfinished overdue deadlines. The daily summary shows remaining tasks, estimated effort, and overdue work. Start with a few achievable items; the suggested next task considers overdue work, then priority and date.

Use **Upcoming** for future work, **All tasks** for the open backlog, and **Completed** for finished tasks. Filter by project or search titles, notes, and subtasks. Open a task's details to check off subtasks. Use the task's circular completion control when the whole task is done.

![Today plan with daily workload, project filter, search, task priorities, and subtasks](screenshots/today.png)

## 3. Focus on one task

Click **Focus ↗** on a task. The Studio carries its title into the session and chooses a 25, 45, or 60 minute duration from its effort estimate. Adjust the duration before starting, then click **Begin focus**.

Use **Space** to start or pause while you are in the Studio and not typing. Leave a next step for your future self. Capture a passing thought without leaving your session. Sound is off by default; **Ambient sound** turns on generated rain when you want it.

![Active focus session linked to the project proposal with next-step and idea-capture panels](screenshots/focus-session.png)

## 4. Give the session more room

Click **Immerse** to expand the landscape and timer. Press **Escape** to return. Choose Golden hour, After hours, or Slow morning from the scenery cards in the Studio.

![Immersive landscape with the linked task and timer](screenshots/immersive.png)

**Make it yours** opens preferences for your name, work mode, and gentler motion. Sound stays a separate opt-in control.

## 5. Reflect and keep the next step

Click **Finish session** when you are ready, or reflect when the timer expires. Write what moved forward and the next step. For a linked task, tick **Mark this task complete** only when the task is finished, then click **Save session**. Completing the parent task does not check off every subtask.

![Session reflection with progress, next step, and optional linked-task completion](screenshots/reflection.png)

Open **Session journal** to review saved sessions and reflections. The sample session shown here is a short documentation demonstration, not a claimed completed 45-minute work session.

![Journal showing a saved demonstration session, reflection, and next step](screenshots/journal.png)

## 6. Turn ideas into actionable work

Use **Capture an idea** in the **Idea inbox**, or the Studio's quick-capture field. Search your ideas when needed. Each idea's controls let you focus on it, turn it into a task with the plus button, mark it done, or delete it.

Converting an idea opens a task editor with its text. Add dates and a project before saving. The original idea stays in the inbox until you mark it done or delete it.

![Idea inbox containing two sample ideas with focus, task conversion, done, and delete controls](screenshots/idea-inbox.png)

## 7. Keep a portable backup

Choose **File → Export Backup** or **Export your studio** in the journal to save a JSON backup. Choose **File → Import Backup** to restore a desktop backup or migrate a web-prototype export. Import replaces the current workspace after confirmation, so export first if you want to keep it. Finish or reset an active session before importing.

Work saves locally on your Mac. There is a previous-state recovery snapshot, but no automatic cross-device sync. See [local data and recovery](macos-app.md#local-data-and-recovery) for details.

## Handy Mac shortcuts

| Shortcut | Action |
| --- | --- |
| Command N | New task |
| Command 1 / 2 / 3 / 4 | Studio / To-dos / Idea inbox / Session journal |
| Command Shift J | Capture an idea |
| Command K | Quick actions |
| Command Shift F | Toggle immersive focus |
| Command comma | Preferences |
| Command Shift E / I | Export / import a backup |
| Space | Start/pause in the Studio when not typing |
| Command Q | Quit |

These are app shortcuts. Closing the Mac window keeps the app and menu-bar timer running; Command Q quits. Reopening recovers a saved session deadline. Focus notifications depend on macOS settings and require the app to be running.
