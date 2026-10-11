import { STORAGE_KEY, SCENES, freshState, freshTimer, parseState, remainingSeconds, elapsedSeconds, startTimer, pauseTimer, tickTimer } from './core.mjs';
import { localDay, normalizeTask, sortTasks, taskMatches, daySummary, isOverdue } from './tasks.mjs';

const $ = id => document.getElementById(id);
let state;
let storageProblem = '';
try {
  if (window.focusDesktop) {
    const loaded = window.focusDesktop.loadState();
    if (loaded.error) throw new Error(loaded.error);
    state = parseState(loaded.raw);
  } else state = parseState(localStorage.getItem(STORAGE_KEY));
}
catch { state = freshState(); storageProblem = 'Saved data could not be read. A temporary studio is open; export any new work before leaving.'; }
let currentView = 'studio';
let toastTimer;
let audio;
let audioNodes = [];
let soundOn = false;
let storageReadable = !storageProblem;
let completionPrompted = false;
let taskFilter = 'today';
let editingTaskId = null;
let savedRevision = 0;
let lastDay = localDay();

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 4200);
}
function persist() {
  if (!storageReadable) { $('save-status').textContent = 'Temporary — export to keep your work'; return; }
  if (window.focusDesktop) {
    const revision = ++savedRevision;
    $('save-status').textContent = 'Saving on your Mac…';
    window.focusDesktop.saveState(JSON.stringify(state)).then(result => {
      if (revision !== savedRevision) return;
      if (!result.ok) throw new Error(result.error);
      $('save-status').textContent = 'Saved on your Mac';
    }).catch(() => { $('save-status').textContent = 'Could not save — export a backup'; toast('Your Mac could not save this change. Export your studio before quitting.'); });
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $('save-status').replaceChildren();
    const dot = document.createElement('span'); dot.className = 'saved-dot';
    $('save-status').append(dot, ' Saved on this device');
  } catch {
    $('save-status').textContent = 'Storage unavailable — export your work';
    toast('Your browser could not save. Export your studio from the journal.');
  }
}
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function iconButton(icon, label, onClick) {
  const button = element('button', 'icon-button'); button.setAttribute('aria-label', label);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#i-' + icon); svg.append(use); button.append(svg);
  button.addEventListener('click', onClick); return button;
}
function setView(view) {
  if (document.body.classList.contains('immersed')) immerse(false);
  currentView = ['studio', 'tasks', 'ideas', 'journal'].includes(view) ? view : 'tasks';
  for (const name of ['studio', 'tasks', 'ideas', 'journal']) $(name + '-view').hidden = name !== currentView;
  document.querySelectorAll('[data-view]').forEach(button => {
    button.classList.toggle('active', button.dataset.view === currentView);
    if (button.dataset.view === currentView) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  $('page-label').textContent = { studio: 'Studio', tasks: 'To-dos', ideas: 'Idea inbox', journal: 'Session journal' }[currentView];
  history.replaceState(null, '', '#' + currentView);
  if (currentView === 'ideas') renderIdeas();
  if (currentView === 'journal') renderJournal();
  if (currentView === 'tasks') renderTasks();
  window.scrollTo({ top: 0 });
}
function applyPreferences() {
  document.body.dataset.scene = state.scene;
  document.body.classList.toggle('gentle-motion', state.gentle);
  $('scene-name').textContent = SCENES[state.scene].name;
  $('scene-caption').textContent = SCENES[state.scene].caption;
  document.querySelectorAll('[data-theme]').forEach(button => {
    const selected = button.dataset.theme === state.scene;
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
  });
  $('profile-name').textContent = state.owner ? state.owner + '’s studio' : 'Your personal studio';
  $('avatar').textContent = state.owner ? [...state.owner][0].toLocaleUpperCase() : 'Y';
  $('greeting').textContent = state.owner ? 'Find your flow, ' + state.owner + '.' : 'Find your flow.';
  $('focus-title').placeholder = 'What will you make space for?';
}
function openDialog(id) { if (!document.querySelector('dialog[open]')) $(id).showModal(); }
function openSettings() {
  $('owner-name').value = state.owner; $('work-mode').value = state.work; $('motion-setting').checked = state.gentle;
  openDialog('settings-dialog');
}
function renderTimer() {
  const remaining = remainingSeconds(state.timer);
  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');
  $('timer').innerHTML = minutes + '<span>:</span>' + seconds;
  $('timer').setAttribute('aria-label', `${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds remaining`);
  const running = state.timer.phase === 'running';
  const complete = state.timer.phase === 'complete';
  $('start-focus').querySelector('span').textContent = complete ? 'Reflect & finish' : running ? 'Pause focus' : state.timer.phase === 'paused' ? 'Resume focus' : 'Begin focus';
  $('start-focus').querySelector('use').setAttribute('href', running ? '#i-pause' : '#i-play');
  $('finish-focus').hidden = state.timer.phase === 'idle';
  $('focus-title').readOnly = state.timer.phase !== 'idle';
  $('focus-status').textContent = { idle: 'MAKE ROOM FOR ONE THING', running: 'YOU ARE RIGHT WHERE YOU NEED TO BE', paused: 'A BREATH. THEN BEGIN AGAIN.', complete: 'YOU MADE SPACE. THAT MATTERS.' }[state.timer.phase];
  document.querySelectorAll('[data-minutes]').forEach(button => {
    const selected = Number(button.dataset.minutes) * 60 === state.timer.duration;
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
    button.disabled = state.timer.phase !== 'idle';
  });
  document.title = state.timer.phase === 'idle' ? 'Focus Studio — Find your flow' : `${minutes}:${seconds} · Focus Studio`;
  window.focusDesktop?.timerStatus({ phase: state.timer.phase, remaining, title: state.timer.title });
}
function toggleTimer() {
  if (currentView !== 'studio') setView('studio');
  state.timer = tickTimer(state.timer);
  if (state.timer.phase === 'complete') { openFinish(); return; }
  if (state.timer.phase === 'running') state.timer = pauseTimer(state.timer);
  else {
    if (state.timer.phase === 'idle') {
      state.title = $('focus-title').value.trim();
      state.timer.title = state.title || state.work;
      state.timer.taskId = state.tasks.some(t => t.id === state.activeTaskId && !t.done) ? state.activeTaskId : null;
      $('focus-title').value = state.timer.title;
    }
    state.timer = startTimer(state.timer);
  }
  persist(); renderTimer();
}
function resetTimer() {
  if (state.timer.phase !== 'idle') {
    if (!confirm('Reset this session? Its focused time will not be added to your journal. Choose Finish session to keep it.')) return;
  }
  state.timer = freshTimer(state.timer.duration / 60);
  completionPrompted = false;
  $('focus-title').value = state.title; persist(); renderTimer();
}
function openFinish() {
  if (document.querySelector('dialog[open]')) return;
  if (state.timer.phase === 'idle') return;
  if (state.timer.phase === 'running') state.timer = pauseTimer(state.timer);
  const seconds = elapsedSeconds(state.timer);
  $('finish-summary').textContent = `${formatDuration(seconds)} for “${state.timer.title || state.work}”. Take a moment to leave yourself a useful thread.`;
  $('reflection').value = ''; $('session-next').value = state.nextStep;
  $('complete-focus-task').checked = false;
  $('complete-task-label').hidden = !state.tasks.some(task => task.id === state.timer.taskId && !task.done);
  persist(); renderTimer(); openDialog('finish-dialog');
}
function finishSession(event) {
  event.preventDefault();
  if (state.timer.phase === 'idle') return;
  state.nextStep = $('session-next').value.trim();
  state.sessions.unshift({ id: crypto.randomUUID(), title: state.timer.title || state.work,
    seconds: elapsedSeconds(state.timer), reflection: $('reflection').value.trim(), nextStep: state.nextStep, createdAt: new Date().toISOString(), taskId: state.timer.taskId });
  if ($('complete-focus-task').checked && !$('complete-task-label').hidden) {
    const task = state.tasks.find(task => task.id === state.timer.taskId);
    if (task) { task.done = true; task.completedAt = new Date().toISOString(); state.activeTaskId = null; }
  }
  state.timer = freshTimer(state.timer.duration / 60);
  completionPrompted = false;
  $('next-step').value = state.nextStep; $('focus-title').value = state.title;
  persist(); renderTimer(); renderJournal(); renderTasks(); $('finish-dialog').close(); toast('Session saved. A little further along.');
}
function formatDuration(seconds) {
  if (seconds < 60) return `${Math.floor(seconds)} sec`;
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
function addIdea(text) {
  const clean = text.trim(); if (!clean) { toast('Give your thought a little detail first.'); return false; }
  state.ideas.unshift({ id: crypto.randomUUID(), text: clean.slice(0, 1000), createdAt: new Date().toISOString(), done: false });
  persist(); renderIdeas(); renderJournal(); return true;
}
function renderIdeas() {
  const active = state.ideas.filter(item => !item.done).length;
  $('idea-count').textContent = String(active); $('idea-summary').textContent = `${active} open · ${state.ideas.length} captured`;
  const query = $('idea-search').value.toLocaleLowerCase().trim();
  const ideas = state.ideas.filter(item => item.text.toLocaleLowerCase().includes(query));
  $('ideas-list').replaceChildren();
  if (!ideas.length) {
    const empty = element('div', 'empty-state');
    empty.append(element('span', '', 'A little spark.'), element('h2', '', query ? 'No matching thoughts yet.' : 'Make room for a thought.'), element('p', '', query ? 'Try another word to find your idea.' : 'Ideas don’t arrive on a schedule. Give yours a place to land.'));
    if (!query) { const button = element('button', 'secondary-button', 'Capture your first idea'); button.onclick = () => openDialog('capture-dialog'); empty.append(button); }
    $('ideas-list').append(empty); return;
  }
  for (const idea of ideas) {
    const card = element('article', 'idea-card' + (idea.done ? ' done' : ''));
    card.append(element('span', 'eyebrow', idea.done ? 'TENDED TO' : 'A LITTLE SPARK'), element('p', '', idea.text));
    const footer = element('div', 'idea-card-footer');
    const time = element('time', '', new Date(idea.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })); time.dateTime = idea.createdAt; footer.append(time);
    const focusButton = iconButton('arrow', 'Focus on this idea', () => {
      if (state.timer.phase !== 'idle') { toast('Finish or reset your current session first.'); return; }
      state.activeTaskId = null; state.title = idea.text.slice(0, 140); $('focus-title').value = state.title; persist(); setView('studio'); $('start-focus').focus();
    }); footer.append(focusButton);
    footer.append(iconButton('plus', 'Turn idea into a task', () => openTask(null, idea.text)));
    const doneButton = iconButton('check', idea.done ? 'Reopen idea' : 'Mark idea done', () => { idea.done = !idea.done; persist(); renderIdeas(); }); doneButton.setAttribute('aria-pressed', String(idea.done)); footer.append(doneButton);
    footer.append(iconButton('trash', 'Delete idea', () => {
      if (!confirm('Delete this idea?')) return;
      state.ideas = state.ideas.filter(item => item.id !== idea.id); persist(); renderIdeas(); renderJournal(); toast('Idea removed.');
    })); card.append(footer); $('ideas-list').append(card);
  }
}
function renderJournal() {
  $('session-count').textContent = String(state.sessions.length);
  $('focus-total').textContent = formatDuration(state.sessions.reduce((total, session) => total + session.seconds, 0));
  $('captured-total').textContent = String(state.ideas.length);
  $('session-list').replaceChildren();
  if (!state.sessions.length) {
    const empty = element('div', 'empty-state'); empty.append(element('span', '', 'One thing at a time.'), element('h2', '', 'Your first chapter starts here.'), element('p', '', 'Finish a focus session to save your progress, reflections, and next step.'));
    const button = element('button', 'secondary-button', 'Head to your studio'); button.onclick = () => setView('studio'); empty.append(button); $('session-list').append(empty); return;
  }
  for (const session of state.sessions) {
    const row = element('article', 'session-row'); row.append(element('h2', '', session.title));
    const meta = element('div', 'session-meta'); meta.append(element('span', '', new Date(session.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })), element('span', '', formatDuration(session.seconds) + ' in focus')); row.append(meta);
    if (session.reflection) row.append(element('p', '', session.reflection));
    if (session.nextStep) { const next = element('p', 'session-next'); next.append(element('strong', '', 'NEXT SMALL STEP'), document.createTextNode(session.nextStep)); row.append(next); }
    $('session-list').append(row);
  }
}
function immerse(force) {
  const active = force ?? !document.body.classList.contains('immersed');
  document.body.classList.toggle('immersed', active);
  $('immerse-toggle').setAttribute('aria-pressed', String(active));
  $('immerse-toggle').querySelector('span').textContent = active ? 'Leave immersive view' : 'Immerse';
  // Keep obscured navigation out of keyboard and assistive-technology focus.
  document.querySelector('.sidebar').inert = active;
  document.querySelector('.topbar').inert = active;
  for (const node of document.querySelectorAll('#studio-view > :not(.landscape)')) node.inert = active;
  if (active) $('immerse-toggle').focus();
}
async function toggleSound() {
  try {
    if (soundOn) { await audio.suspend(); soundOn = false; }
    else {
      if (!audio) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        audio = new Audio();
        const buffer = audio.createBuffer(1, audio.sampleRate * 4, audio.sampleRate);
        const samples = buffer.getChannelData(0); let previous = 0;
        for (let i = 0; i < samples.length; i++) { previous = (previous + (Math.random() * 2 - 1) * .018) / 1.018; samples[i] = previous * 3; }
        const noise = audio.createBufferSource(); noise.buffer = buffer; noise.loop = true;
        const filter = audio.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 600;
        const gain = audio.createGain(); gain.gain.value = .35;
        noise.connect(filter); filter.connect(gain); gain.connect(audio.destination); noise.start(); audioNodes = [noise, filter, gain];
      }
      await audio.resume(); soundOn = true;
    }
    $('sound-toggle').setAttribute('aria-pressed', String(soundOn));
    $('sound-toggle').querySelector('span').textContent = soundOn ? 'Soft rain · on' : 'Ambient sound';
  } catch { toast('Ambient sound isn’t available in this browser.'); }
}
async function exportData() {
  if (window.focusDesktop) {
    const result = await window.focusDesktop.exportState(JSON.stringify({ ...state, exportedAt: new Date().toISOString() }));
    if (result.error) toast('Export failed. Your current studio remains open.');
    else if (!result.canceled) toast('Studio backup saved.');
    return;
  }
  const blob = new Blob([JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const link = element('a'); link.href = url; link.download = 'focus-studio-' + new Date().toISOString().slice(0, 10) + '.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Your studio export is ready.');
}
function updateClock() {
  const now = new Date();
  $('local-clock').textContent = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  $('today-date').textContent = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => setView(button.dataset.view));
document.querySelectorAll('svg').forEach(svg => svg.setAttribute('aria-hidden', 'true'));
document.querySelectorAll('[data-go]').forEach(button => button.onclick = () => setView(button.dataset.go));
document.querySelector('.brand').onclick = event => { event.preventDefault(); setView('studio'); };
document.querySelectorAll('[data-theme]').forEach(button => button.onclick = () => { state.scene = button.dataset.theme; applyPreferences(); persist(); });
document.querySelectorAll('[data-minutes]').forEach(button => button.onclick = () => { if (state.timer.phase !== 'idle') return; state.timer = freshTimer(Number(button.dataset.minutes)); persist(); renderTimer(); });
document.querySelectorAll('[data-close]').forEach(button => button.onclick = () => $(button.dataset.close).close());
$('start-focus').onclick = toggleTimer; $('reset-focus').onclick = resetTimer; $('finish-focus').onclick = openFinish; $('finish-form').onsubmit = finishSession;
$('focus-title').addEventListener('input', () => { state.title = $('focus-title').value; persist(); });
$('next-step').addEventListener('input', () => { state.nextStep = $('next-step').value; persist(); });
$('settings-open').onclick = openSettings; $('profile-open').onclick = openSettings;
$('settings-save').onclick = () => { state.owner = $('owner-name').value.trim(); state.work = $('work-mode').value; state.gentle = $('motion-setting').checked; applyPreferences(); persist(); $('settings-dialog').close(); toast('A little more you. Preferences saved.'); };
$('quick-capture-form').onsubmit = event => { event.preventDefault(); if (addIdea($('quick-capture').value)) { $('quick-capture').value = ''; $('capture-feedback').textContent = 'Caught. Back to your flow.'; toast('A little spark, safely captured.'); } };
$('capture-form').onsubmit = event => { event.preventDefault(); if (addIdea($('idea-text').value)) { $('idea-text').value = ''; $('capture-dialog').close(); toast('Idea saved to your inbox.'); } };
$('idea-new').onclick = () => openDialog('capture-dialog'); $('idea-search').oninput = renderIdeas;
$('immerse-toggle').onclick = () => immerse(); $('sound-toggle').onclick = toggleSound; $('export-data').onclick = exportData;
$('commands-open').onclick = $('shortcuts-open').onclick = () => openDialog('commands-dialog');
document.querySelectorAll('[data-command]').forEach(button => button.onclick = () => { $('commands-dialog').close(); runCommand(button.dataset.command); });
document.addEventListener('keydown', event => {
  const typing = event.target instanceof Element && (event.target.matches('input, textarea, select') || event.target.isContentEditable);
  const modal = !!document.querySelector('dialog[open]');
  if (event.key === 'Escape' && !modal && document.body.classList.contains('immersed')) { immerse(false); return; }
  if (event.repeat || typing || modal) return;
  const modifier = event.metaKey || event.ctrlKey;
  if (modifier && event.key.toLowerCase() === 'k') { event.preventDefault(); openDialog('commands-dialog'); }
  else if (modifier && event.key.toLowerCase() === 'j' && event.shiftKey) { event.preventDefault(); openDialog('capture-dialog'); }
  else if (modifier && event.key.toLowerCase() === 'n') { event.preventDefault(); openTask(); }
  else if (modifier && event.key === ',') { event.preventDefault(); openSettings(); }
  else if (!modifier && !event.altKey && event.code === 'Space' && currentView === 'studio') { event.preventDefault(); toggleTimer(); }
  else if (!modifier && !event.altKey && event.key.toLowerCase() === 'i' && currentView === 'studio') { event.preventDefault(); immerse(); }
  else if (event.key === '?') { event.preventDefault(); openDialog('commands-dialog'); }
});
window.addEventListener('hashchange', () => setView(location.hash.slice(1)));
window.addEventListener('pagehide', () => { persist(); if (audio) audio.suspend(); });
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY) {
    storageReadable = false;
    $('save-status').textContent = 'Another tab changed this studio — reload to save';
    toast('Your studio changed in another tab. Reload to save; export any unsaved work first.');
  }
});
window.addEventListener('pageshow', () => { if (audio?.state === 'suspended') { soundOn = false; $('sound-toggle').setAttribute('aria-pressed', 'false'); $('sound-toggle').querySelector('span').textContent = 'Ambient sound'; } });

$('focus-title').value = state.timer.phase === 'idle' ? state.title : state.timer.title;
$('next-step').value = state.nextStep;
state.timer = tickTimer(state.timer);
applyPreferences(); renderTimer(); renderIdeas(); renderJournal(); renderTasks(); updateClock(); setView(location.hash.slice(1) || 'tasks');
if (storageProblem) { $('save-status').textContent = 'Temporary — export to keep your work'; toast(storageProblem); }
setInterval(() => {
  const previousPhase = state.timer.phase; state.timer = tickTimer(state.timer);
  if (state.timer.phase !== previousPhase) persist();
  if (state.timer.phase !== 'idle') renderTimer();
  if (state.timer.phase === 'complete' && !completionPrompted && !document.querySelector('dialog[open]')) { completionPrompted = true; openFinish(); }
  updateClock();
  if (lastDay !== localDay()) { lastDay = localDay(); renderTasks(); }
}, 500);

function taskAction(label, callback, className = 'task-action') {
  const button = element('button', className, label); button.type = 'button'; button.onclick = callback; return button;
}
function readableDay(day) {
  return new Date(day + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function renderTasks() {
  const today = localDay();
  const summary = daySummary(state.tasks, today);
  window.focusDesktop?.pendingTasks(summary.remaining);
  $('task-count').textContent = String(state.tasks.filter(t => !t.done).length);
  $('today-remaining').textContent = String(summary.remaining);
  $('today-minutes').textContent = formatDuration(summary.minutes * 60);
  $('today-overdue').textContent = String(summary.overdue);
  $('plan-heading').textContent = summary.planned ? summary.completed ? `${summary.completed} of ${summary.planned} steps done. A little closer.` : `${summary.remaining} ${summary.remaining === 1 ? 'step' : 'steps'}. One at a time.` : 'Start with one small step.';
  $('plan-message').textContent = summary.priorities > 3 ? 'A full plate. Consider keeping three high priorities and moving the rest to another day.' : summary.remaining > 0 ? 'Choose a few meaningful priorities. Start with the next doable thing.' : summary.completed ? 'You’ve made room for your plan. Take a breath before adding more.' : 'Capture your work, then choose a few things for today.';
  const projects = [...new Set(state.tasks.map(t => t.project))].sort();
  const selectedProject = $('project-filter').value;
  $('project-filter').replaceChildren(new Option('All projects', ''));
  for (const project of projects) $('project-filter').add(new Option(project, project));
  $('project-filter').value = projects.includes(selectedProject) ? selectedProject : '';
  $('project-suggestions').replaceChildren(...projects.map(project => { const option = element('option'); option.value = project; return option; }));
  document.querySelectorAll('[data-task-filter]').forEach(button => { const selected = button.dataset.taskFilter === taskFilter; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected)); });
  const tasks = sortTasks(state.tasks.filter(task => taskMatches(task, { filter: taskFilter, project: $('project-filter').value, query: $('task-search').value, today })), today);
  $('task-list-title').textContent = { today: 'TODAY’S SMALL STEPS', upcoming: 'ROOM FOR ANOTHER DAY', all: 'EVERYTHING HAS A PLACE', completed: 'LOOK HOW FAR YOU’VE COME' }[taskFilter];
  $('task-list-count').textContent = `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`;
  $('task-list').replaceChildren();
  if (!tasks.length) {
    const empty = element('div', 'empty-state');
    const filtered = $('task-search').value || $('project-filter').value;
    empty.append(element('span', '', 'A little breathing room.'), element('h2', '', filtered ? 'No tasks match this view.' : taskFilter === 'completed' ? 'Your first win is waiting.' : taskFilter === 'today' ? 'Give today a clear next step.' : 'Nothing here just yet.'), element('p', '', filtered ? 'Try another search or project.' : 'Add a task, give it a project, and choose when to make room for it.'));
    empty.append(taskAction('Add a task', () => openTask(), 'secondary-button'));
    if (!filtered && taskFilter === 'today' && state.tasks.some(t => !t.done)) empty.append(taskAction('Choose from all tasks', () => { taskFilter = 'all'; renderTasks(); }, 'text-button empty-secondary'));
    $('task-list').append(empty);
  }
  for (const task of tasks) {
    const row = element('article', 'todo-card' + (task.done ? ' completed' : ''));
    const head = element('div', 'todo-head');
    const complete = taskAction(task.done ? '✓' : '', () => toggleTask(task), 'todo-check'); complete.setAttribute('aria-label', `${task.done ? 'Reopen' : 'Complete'} task: ${task.title}`); complete.setAttribute('aria-pressed', String(task.done));
    const content = element('div', 'todo-content');
    const title = taskAction(task.title, () => openTask(task), 'todo-title');
    const meta = element('div', 'todo-meta');
    meta.append(element('span', 'priority-label priority-' + task.priority, { high: 'High priority', normal: 'Normal priority', low: 'Low priority' }[task.priority]), element('span', 'project-chip', task.project), element('span', '', task.estimate + ' min'));
    if (task.dueDate) meta.append(element('span', isOverdue(task, today) ? 'overdue-label' : '', (isOverdue(task, today) ? 'Overdue · ' : 'Due ') + readableDay(task.dueDate)));
    if (task.plannedDate) meta.append(element('span', '', 'Planned ' + (task.plannedDate === today ? 'today' : readableDay(task.plannedDate))));
    content.append(title, meta);
    const actions = element('div', 'todo-actions');
    if (!task.done) { if (task.plannedDate !== today) actions.append(taskAction('Today', () => { task.plannedDate = today; persist(); renderTasks(); })); actions.append(taskAction('Focus ↗', () => focusTask(task), 'task-action focus-action')); }
    actions.append(iconButton('note', 'Edit task: ' + task.title, () => openTask(task)));
    head.append(complete, content, actions); row.append(head);
    if (task.notes || task.subtasks.length) {
      const details = element('details', 'task-details');
      details.append(element('summary', '', task.subtasks.length ? `${task.subtasks.filter(s => s.done).length}/${task.subtasks.length} subtasks · details` : 'Notes & details'));
      if (task.notes) details.append(element('p', 'task-notes', task.notes));
      for (const subtask of task.subtasks) { const label = element('label', 'subtask-row'); const box = element('input'); box.type = 'checkbox'; box.checked = subtask.done; box.onchange = () => { subtask.done = box.checked; persist(); renderTasks(); }; label.append(box, element('span', subtask.done ? 'subtask-done' : '', subtask.title)); details.append(label); }
      const sessions = state.sessions.filter(s => s.taskId === task.id); if (sessions.length) details.append(element('p', 'task-time', `${sessions.length} focus sessions · ${formatDuration(sessions.reduce((sum, s) => sum + s.seconds, 0))} worked`));
      row.append(details);
    }
    $('task-list').append(row);
  }
  const active = state.tasks.find(t => t.id === state.activeTaskId && !t.done) || summary.next;
  $('focus-task-name').textContent = active ? active.title : 'Choose a task. Make space for it.';
  $('focus-next-task').textContent = active ? 'Focus on this ↗' : 'Open today’s plan ↗';
  $('focus-next-task').onclick = () => active ? focusTask(active) : setView('tasks');
}
function toggleTask(task) {
  task.done = !task.done; task.completedAt = task.done ? new Date().toISOString() : null;
  if (task.done && state.activeTaskId === task.id) state.activeTaskId = null;
  persist(); renderTasks(); toast(task.done ? 'One less thing on your mind.' : 'Task reopened.');
}
function focusTask(task) {
  if (state.timer.phase !== 'idle') { toast('Finish or reset your current session before switching tasks.'); return; }
  state.activeTaskId = task.id; state.title = task.title;
  $('focus-title').value = task.title;
  const minutes = task.estimate <= 25 ? 25 : task.estimate <= 45 ? 45 : 60;
  state.timer = freshTimer(minutes); persist(); renderTimer(); renderTasks(); setView('studio'); $('start-focus').focus();
}
function appendSubtask(subtask = { id: crypto.randomUUID(), title: '', done: false }) {
  const row = element('div', 'subtask-edit'); row.dataset.id = subtask.id;
  const check = element('input'); check.type = 'checkbox'; check.checked = subtask.done; check.setAttribute('aria-label', 'Subtask complete');
  const title = element('input'); title.value = subtask.title; title.maxLength = 140; title.placeholder = 'A smaller step…'; title.setAttribute('aria-label', 'Subtask title');
  const remove = taskAction('×', () => row.remove(), 'close-button'); remove.setAttribute('aria-label', 'Remove subtask');
  row.append(check, title, remove); $('subtask-editor').append(row); return title;
}
function openTask(task = null, initialText = '') {
  if (document.querySelector('dialog[open]')) return;
  editingTaskId = task?.id || null;
  $('task-dialog-title').textContent = task ? 'Make the next step clearer.' : 'A little less in your head.';
  $('task-title').value = task?.title || initialText.slice(0, 140);
  $('task-project').value = task?.project || '';
  $('task-priority').value = task?.priority || 'normal';
  $('task-planned').value = task ? task.plannedDate : (taskFilter === 'today' ? localDay() : '');
  $('task-due').value = task?.dueDate || '';
  $('task-estimate').value = String(task?.estimate || 25);
  $('task-notes').value = task?.notes || (initialText.length > 140 ? initialText : '');
  $('subtask-editor').replaceChildren(); for (const subtask of task?.subtasks || []) appendSubtask(subtask);
  $('task-delete').hidden = !task; openDialog('task-dialog'); $('task-title').focus();
}
function saveTask(event) {
  event.preventDefault(); if (!$('task-title').value.trim()) { $('task-title').focus(); toast('Give your task a clear title.'); return; }
  const existing = state.tasks.find(t => t.id === editingTaskId);
  const task = normalizeTask({ ...existing, id: editingTaskId || crypto.randomUUID(), title: $('task-title').value,
    project: $('task-project').value, priority: $('task-priority').value,
    plannedDate: $('task-planned').value, dueDate: $('task-due').value, estimate: Number($('task-estimate').value), notes: $('task-notes').value,
    subtasks: [...$('subtask-editor').children].map(row => ({ id: row.dataset.id, title: row.querySelector('input:not([type="checkbox"])').value, done: row.querySelector('input[type="checkbox"]').checked })) });
  if (existing) state.tasks[state.tasks.indexOf(existing)] = task; else state.tasks.unshift(task);
  if (state.activeTaskId === task.id && state.timer.phase === 'idle') { state.title = task.title; $('focus-title').value = task.title; }
  persist(); renderTasks(); $('task-dialog').close(); toast(existing ? 'Task updated.' : 'Task captured. A little more headspace.');
}
async function importData() {
  if (!window.focusDesktop) { toast('Import is available in the desktop app.'); return; }
  if (state.timer.phase !== 'idle') { toast('Finish or reset your current session before importing a backup.'); return; }
  const result = await window.focusDesktop.importState();
  if (result.canceled) return;
  if (result.error) { toast('Import failed: ' + result.error); return; }
  try {
    state = parseState(result.raw); storageReadable = true; storageProblem = ''; completionPrompted = false;
    $('focus-title').value = state.timer.phase === 'idle' ? state.title : state.timer.title;
    $('next-step').value = state.nextStep; state.timer = tickTimer(state.timer);
    applyPreferences(); renderTimer(); renderIdeas(); renderJournal(); renderTasks();
    $('save-status').textContent = 'Saved on your Mac'; toast('Backup imported. Welcome back.');
  } catch { toast('This backup could not be read.'); }
}
function runCommand(command) {
  if (document.querySelector('dialog[open]')) return;
  ({ timer: toggleTimer, capture: () => openDialog('capture-dialog'), task: () => openTask(),
    immerse: () => { setView('studio'); immerse(); }, settings: openSettings, tasks: () => setView('tasks'),
    studio: () => setView('studio'), ideas: () => setView('ideas'), journal: () => setView('journal'),
    export: exportData, import: importData })[command]?.();
}
$('task-new').onclick = () => openTask(); $('task-form').onsubmit = saveTask;
$('subtask-add').onclick = () => appendSubtask().focus();
$('task-delete').onclick = () => {
  if (state.timer.phase !== 'idle' && state.timer.taskId === editingTaskId) { toast('Finish or reset the linked focus session before deleting this task.'); return; }
  if (!confirm('Delete this task and its subtasks? Your saved focus sessions will remain.')) return;
  state.tasks = state.tasks.filter(t => t.id !== editingTaskId); if (state.activeTaskId === editingTaskId) state.activeTaskId = null;
  persist(); renderTasks(); $('task-dialog').close(); toast('Task removed.');
};
document.querySelectorAll('[data-task-filter]').forEach(button => button.onclick = () => { taskFilter = button.dataset.taskFilter; renderTasks(); });
$('task-search').oninput = renderTasks; $('project-filter').onchange = renderTasks; $('import-data').onclick = importData;
window.focusDesktop?.onCommand(runCommand);
if (window.focusDesktop) document.body.classList.add('desktop-app');
