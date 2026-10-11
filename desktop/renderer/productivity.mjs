import { addDays, daySummary, isToday, localDay, sortTasks } from './tasks.mjs';
import { remainingSeconds } from './core.mjs';

export function weekSummary(state, today = localDay()) {
  const days = Array.from({ length: 7 }, (_, index) => ({ day: addDays(today, index - 6), seconds: 0, completed: 0, sessions: 0 }));
  for (const session of state.sessions) {
    const entry = days.find(item => item.day === localDay(new Date(session.createdAt)));
    if (entry) { entry.seconds += session.seconds; entry.sessions++; }
  }
  for (const task of state.tasks) {
    if (!task.done || !task.completedAt) continue;
    const entry = days.find(item => item.day === localDay(new Date(task.completedAt)));
    if (entry) entry.completed++;
  }
  return { days, seconds: days.reduce((sum, day) => sum + day.seconds, 0), completed: days.reduce((sum, day) => sum + day.completed, 0), sessions: days.reduce((sum, day) => sum + day.sessions, 0) };
}
export function widgetSnapshot(state, now = new Date()) {
  const day = localDay(now);
  const summary = daySummary(state.tasks, day);
  const week = weekSummary(state, day);
  return { version: 1, generatedAt: now.toISOString(), day,
    today: { remaining: summary.remaining, completed: summary.completed, minutes: summary.minutes, overdue: summary.overdue,
      tasks: sortTasks(state.tasks.filter(task => !task.done && isToday(task, day)), day).slice(0, 3).map(task => ({ id: task.id, title: task.title, project: task.project, estimate: task.estimate, priority: task.priority })) },
    timer: { phase: state.timer.phase, remaining: remainingSeconds(state.timer, now.getTime()), duration: state.timer.duration,
      endAt: state.timer.phase === 'running' ? new Date(state.timer.endAt).toISOString() : null, title: state.timer.title || state.title || 'Make room for one thing' },
    week: { minutes: Math.floor(week.seconds / 60), completed: week.completed, sessions: week.sessions } };
}
