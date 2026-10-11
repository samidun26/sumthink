import { STORAGE_KEY, SCENES, freshState, freshTimer, parseState, remainingSeconds, elapsedSeconds, startTimer, pauseTimer, tickTimer } from './core.mjs';

const $ = id => document.getElementById(id);
let state;
let storageProblem = '';
try { state = parseState(localStorage.getItem(STORAGE_KEY)); }
catch { state = freshState(); storageProblem = 'Saved data could not be read. A temporary studio is open; export any new work before leaving.'; }
let currentView = 'studio';
let toastTimer;
let audio;
let audioNodes = [];
let soundOn = false;
let storageReadable = !storageProblem;
let completionPrompted = false;

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 4200);
}
function persist() {
  if (!storageReadable) { $('save-status').textContent = 'Temporary — export to keep your work'; return; }
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
  currentView = ['studio', 'ideas', 'journal'].includes(view) ? view : 'studio';
  for (const name of ['studio', 'ideas', 'journal']) $(name + '-view').hidden = name !== currentView;
  document.querySelectorAll('[data-view]').forEach(button => {
    button.classList.toggle('active', button.dataset.view === currentView);
    if (button.dataset.view === currentView) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  $('page-label').textContent = { studio: 'Studio', ideas: 'Idea inbox', journal: 'Session journal' }[currentView];
  history.replaceState(null, '', '#' + currentView);
  if (currentView === 'ideas') renderIdeas();
  if (currentView === 'journal') renderJournal();
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
  persist(); renderTimer(); openDialog('finish-dialog');
}
function finishSession(event) {
  event.preventDefault();
  if (state.timer.phase === 'idle') return;
  state.nextStep = $('session-next').value.trim();
  state.sessions.unshift({ id: crypto.randomUUID(), title: state.timer.title || state.work,
    seconds: elapsedSeconds(state.timer), reflection: $('reflection').value.trim(), nextStep: state.nextStep, createdAt: new Date().toISOString() });
  state.timer = freshTimer(state.timer.duration / 60);
  completionPrompted = false;
  $('next-step').value = state.nextStep; $('focus-title').value = state.title;
  persist(); renderTimer(); renderJournal(); $('finish-dialog').close(); toast('Session saved. A little further along.');
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
      state.title = idea.text.slice(0, 140); $('focus-title').value = state.title; persist(); setView('studio'); $('start-focus').focus();
    }); footer.append(focusButton);
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
function exportData() {
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
document.querySelectorAll('[data-command]').forEach(button => button.onclick = () => { $('commands-dialog').close(); ({ timer: toggleTimer, capture: () => openDialog('capture-dialog'), immerse: () => { setView('studio'); immerse(); }, settings: openSettings, journal: () => setView('journal') })[button.dataset.command](); });
document.addEventListener('keydown', event => {
  const typing = event.target instanceof Element && (event.target.matches('input, textarea, select') || event.target.isContentEditable);
  const modal = !!document.querySelector('dialog[open]');
  if (event.key === 'Escape' && !modal && document.body.classList.contains('immersed')) { immerse(false); return; }
  if (event.repeat || typing || modal) return;
  const modifier = event.metaKey || event.ctrlKey;
  if (modifier && event.key.toLowerCase() === 'k') { event.preventDefault(); openDialog('commands-dialog'); }
  else if (modifier && event.key.toLowerCase() === 'j') { event.preventDefault(); openDialog('capture-dialog'); }
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
applyPreferences(); renderTimer(); renderIdeas(); renderJournal(); updateClock(); setView(location.hash.slice(1) || 'studio');
if (storageProblem) { $('save-status').textContent = 'Temporary — export to keep your work'; toast(storageProblem); }
setInterval(() => {
  const previousPhase = state.timer.phase; state.timer = tickTimer(state.timer);
  if (state.timer.phase !== previousPhase) persist();
  if (state.timer.phase !== 'idle') renderTimer();
  if (state.timer.phase === 'complete' && !completionPrompted && !document.querySelector('dialog[open]')) { completionPrompted = true; openFinish(); }
  updateClock();
}, 500);
