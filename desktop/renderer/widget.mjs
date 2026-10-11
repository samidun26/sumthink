const $ = id => document.getElementById(id);
const bridge = window.focusWidgets;
function action(value) { bridge.action(value); }
function render(snapshot) {
  if (!snapshot) { $('widget-feedback').textContent = 'Open Focus Studio to load your workspace.'; return; }
  $('remaining').textContent = snapshot.today.remaining;
  $('workload').textContent = `${snapshot.today.minutes} min estimated · ${snapshot.today.overdue} overdue`;
  $('widget-tasks').replaceChildren();
  for (const task of snapshot.today.tasks) {
    const row = document.createElement('div'); row.className = 'task';
    const check = document.createElement('button'); check.className = 'complete'; check.setAttribute('aria-label', 'Complete task: ' + task.title); check.onclick = () => action({ type: 'complete', id: task.id });
    const title = document.createElement('div'); title.className = 'title'; title.textContent = task.title;
    const project = document.createElement('small'); project.textContent = `${task.project} · ${task.estimate} min`; title.append(project);
    const focus = document.createElement('button'); focus.className = 'focus'; focus.textContent = 'Focus'; focus.setAttribute('aria-label', 'Focus on task: ' + task.title); focus.onclick = () => action({ type: 'focus', id: task.id });
    row.append(check, title, focus); $('widget-tasks').append(row);
  }
  if (!snapshot.today.tasks.length) { const text = document.createElement('p'); text.className = 'empty'; text.textContent = 'A clear day. Capture one useful next step.'; $('widget-tasks').append(text); }
  $('widget-focus-title').textContent = snapshot.timer.title;
  $('widget-timer').textContent = `${String(Math.floor(snapshot.timer.remaining / 60)).padStart(2, '0')}:${String(snapshot.timer.remaining % 60).padStart(2, '0')}`;
  $('widget-timer-toggle').textContent = { idle: 'Begin focus', running: 'Pause', paused: 'Resume', complete: 'Reflect & finish' }[snapshot.timer.phase];
  $('widget-week-minutes').textContent = snapshot.week.minutes;
  $('widget-week-tasks').textContent = snapshot.week.completed;
}
document.querySelectorAll('[data-action]').forEach(button => button.onclick = () => action({ type: button.dataset.action }));
$('widget-timer-toggle').onclick = () => action({ type: 'timer' });
$('widget-capture').onsubmit = event => { event.preventDefault(); const title = $('widget-title').value.trim(); if (title) { action({ type: 'add', title }); $('widget-feedback').textContent = 'Capturing…'; } };
$('widget-pin').onclick = () => { const enabled = $('widget-pin').getAttribute('aria-pressed') !== 'true'; $('widget-pin').setAttribute('aria-pressed', String(enabled)); bridge.pin(enabled); };
$('widget-close').onclick = () => bridge.close();
bridge.onFeedback(value => { $('widget-feedback').textContent = value.message; if (value.captureTitle === $('widget-title').value.trim()) $('widget-title').value = ''; });
bridge.onUpdate(render);
bridge.snapshot().then(render).catch(() => { $('widget-feedback').textContent = 'Could not load the studio. Reopen this window.'; });
