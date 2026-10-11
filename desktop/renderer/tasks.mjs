export const PRIORITIES = ['high', 'normal', 'low'];
export const REPEATS = ['none', 'daily', 'weekdays', 'weekly'];
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function validDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function normalizeTask(task) {
  if (!task || typeof task.id !== 'string' || !task.id || typeof task.title !== 'string' || !task.title.trim()) return null;
  return {
    id: task.id.slice(0, 100), title: task.title.trim().slice(0, 140),
    notes: typeof task.notes === 'string' ? task.notes.slice(0, 4000) : '',
    project: typeof task.project === 'string' && task.project.trim() ? task.project.trim().slice(0, 60) : 'General',
    priority: PRIORITIES.includes(task.priority) ? task.priority : 'normal',
    dueDate: validDay(task.dueDate) ? task.dueDate : '',
    plannedDate: validDay(task.plannedDate) ? task.plannedDate : '',
    estimate: [15, 25, 45, 60, 90].includes(task.estimate) ? task.estimate : 25,
    repeat: REPEATS.includes(task.repeat) ? task.repeat : 'none',
    nextOccurrenceId: typeof task.nextOccurrenceId === 'string' ? task.nextOccurrenceId.slice(0, 100) : null,
    done: task.done === true,
    createdAt: typeof task.createdAt === 'string' && Number.isFinite(Date.parse(task.createdAt)) ? task.createdAt : new Date().toISOString(),
    completedAt: task.done && typeof task.completedAt === 'string' && Number.isFinite(Date.parse(task.completedAt)) ? task.completedAt : null,
    subtasks: (Array.isArray(task.subtasks) ? task.subtasks : []).filter(s => typeof s?.id === 'string' && typeof s.title === 'string' && s.title.trim()).slice(0, 100).map(s => ({ id: s.id.slice(0, 100), title: s.title.trim().slice(0, 140), done: s.done === true })),
  };
}
export function addDays(day, count) {
  if (!validDay(day)) throw new Error('Invalid calendar day');
  const date = new Date(day + 'T12:00:00');
  date.setDate(date.getDate() + count);
  return localDay(date);
}
export function nextRecurringDay(day, repeat) {
  let next = addDays(day, repeat === 'weekly' ? 7 : 1);
  if (repeat === 'weekdays') {
    while ([0, 6].includes(new Date(next + 'T12:00:00').getDay())) next = addDays(next, 1);
  }
  return next;
}
export function setTaskDone(tasks, id, done, now = new Date(), createId = () => crypto.randomUUID()) {
  const task = tasks.find(item => item.id === id);
  if (!task || task.done === done) return { tasks, generated: null };
  const updated = { ...task, done, completedAt: done ? now.toISOString() : null };
  let generated = null;
  if (done && task.repeat !== 'none' && !task.nextOccurrenceId) {
    const today = localDay(now);
    generated = normalizeTask({ ...task, id: createId(), done: false, completedAt: null, nextOccurrenceId: null,
      createdAt: now.toISOString(), plannedDate: nextRecurringDay(task.plannedDate > today ? task.plannedDate : today, task.repeat),
      dueDate: task.dueDate ? nextRecurringDay(task.dueDate > today ? task.dueDate : today, task.repeat) : '',
      subtasks: task.subtasks.map(subtask => ({ ...subtask, id: createId(), done: false })) });
    updated.nextOccurrenceId = generated.id;
  }
  const result = tasks.map(item => item.id === id ? updated : item);
  return { tasks: generated ? [generated, ...result] : result, generated };
}
export function isToday(task, today = localDay()) {
  if (task.done) return task.plannedDate === today || task.dueDate === today || (!!task.completedAt && localDay(new Date(task.completedAt)) === today);
  return task.plannedDate === today || (!!task.dueDate && task.dueDate <= today);
}
export function isOverdue(task, today = localDay()) {
  return !task.done && !!task.dueDate && task.dueDate < today;
}
export function taskMatches(task, { filter = 'today', project = '', query = '', today = localDay() } = {}) {
  if (project && task.project !== project) return false;
  if (query && ![task.title, task.notes, task.project, ...task.subtasks.map(s => s.title)].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase())) return false;
  if (filter === 'completed') return task.done;
  if (task.done) return false;
  if (filter === 'today') return isToday(task, today);
  if (filter === 'upcoming') return (task.plannedDate > today || task.dueDate > today) && !isToday(task, today);
  return true;
}
export function sortTasks(tasks, today = localDay()) {
  return [...tasks].sort((a, b) => Number(isOverdue(b, today)) - Number(isOverdue(a, today))
    || PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority)
    || (a.dueDate || a.plannedDate || '9999').localeCompare(b.dueDate || b.plannedDate || '9999')
    || a.createdAt.localeCompare(b.createdAt));
}
export function daySummary(tasks, today = localDay()) {
  const planned = tasks.filter(t => isToday(t, today));
  const open = planned.filter(t => !t.done);
  return { planned: planned.length, remaining: open.length, completed: planned.filter(t => t.done).length,
    overdue: tasks.filter(t => isOverdue(t, today)).length,
    minutes: open.reduce((sum, task) => sum + task.estimate, 0),
    priorities: open.filter(t => t.priority === 'high').length,
    next: sortTasks(open, today)[0] || null };
}
