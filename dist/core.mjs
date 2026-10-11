export const STORAGE_KEY = 'focus-studio:v1';
export const SCENES = {
  dusk: { name: 'GOLDEN HOUR', caption: 'Somewhere between a deep breath and a fresh start.' },
  night: { name: 'AFTER HOURS', caption: 'The world is quiet. Your ideas are wide awake.' },
  forest: { name: 'SLOW MORNING', caption: 'A fresh perspective. A little room to grow.' },
};

export function freshState() {
  return { version: 1, owner: '', work: 'Creative work', scene: 'dusk', gentle: false,
    title: '', nextStep: '', ideas: [], sessions: [], timer: freshTimer() };
}
export function freshTimer(minutes = 25) {
  const duration = [25, 45, 60].includes(minutes) ? minutes * 60 : 1500;
  return { duration, remaining: duration, endAt: null, phase: 'idle', title: '' };
}
export function remainingSeconds(timer, now = Date.now()) {
  return timer.phase === 'running' ? Math.max(0, Math.min(timer.duration, Math.ceil((timer.endAt - now) / 1000))) : timer.remaining;
}
export function startTimer(timer, now = Date.now()) {
  if (timer.phase === 'complete') return timer;
  return { ...timer, endAt: now + timer.remaining * 1000, phase: 'running' };
}
export function pauseTimer(timer, now = Date.now()) {
  const remaining = remainingSeconds(timer, now);
  return { ...timer, remaining, endAt: null, phase: remaining === 0 ? 'complete' : 'paused' };
}
export function tickTimer(timer, now = Date.now()) {
  if (timer.phase === 'running' && remainingSeconds(timer, now) === 0) return { ...timer, remaining: 0, endAt: null, phase: 'complete' };
  return timer;
}
export function elapsedSeconds(timer, now = Date.now()) {
  return timer.duration - remainingSeconds(timer, now);
}
function safeText(value, limit) { return typeof value === 'string' ? value.slice(0, limit) : ''; }
function validDate(value) { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }
export function parseState(raw) {
  if (!raw) return freshState();
  const value = JSON.parse(raw);
  if (value?.version !== 1) throw new Error('Unsupported studio data version');
  const state = freshState();
  state.owner = safeText(value.owner, 40);
  state.work = ['Creative work', 'Writing & research', 'Design', 'Development', 'Planning & strategy', 'Learning'].includes(value.work) ? value.work : state.work;
  state.scene = Object.hasOwn(SCENES, value.scene) ? value.scene : 'dusk';
  state.gentle = value.gentle === true;
  state.title = safeText(value.title, 140);
  state.nextStep = safeText(value.nextStep, 1000);
  state.ideas = (Array.isArray(value.ideas) ? value.ideas : []).filter(item => typeof item?.id === 'string' && typeof item.text === 'string' && validDate(item.createdAt)).map(item => ({ id: item.id, text: safeText(item.text, 1000), createdAt: item.createdAt, done: item.done === true }));
  state.sessions = (Array.isArray(value.sessions) ? value.sessions : []).filter(item => typeof item?.id === 'string' && validDate(item.createdAt) && Number.isFinite(item.seconds) && item.seconds >= 0).map(item => ({ id: item.id, title: safeText(item.title, 140), reflection: safeText(item.reflection, 1000), nextStep: safeText(item.nextStep, 1000), seconds: Math.min(item.seconds, 3600), createdAt: item.createdAt }));
  const t = value.timer;
  if (t && [1500, 2700, 3600].includes(t.duration) && ['idle', 'running', 'paused', 'complete'].includes(t.phase) && Number.isInteger(t.remaining) && t.remaining >= 0 && t.remaining <= t.duration && (t.phase !== 'running' || (Number.isFinite(t.endAt) && t.endAt > 0))) {
    state.timer = { duration: t.duration, remaining: t.phase === 'complete' ? 0 : t.remaining, phase: t.phase, endAt: t.phase === 'running' ? t.endAt : null, title: safeText(t.title, 140) };
  }
  return state;
}
