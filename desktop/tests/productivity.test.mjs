import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, parseState, startTimer } from '../renderer/core.mjs';
import { normalizeTask, nextRecurringDay, setTaskDone } from '../renderer/tasks.mjs';
import { weekSummary, widgetSnapshot } from '../renderer/productivity.mjs';

process.env.TZ = 'Asia/Jakarta';
const now = new Date('2026-10-11T10:00:00Z');
const task = values => normalizeTask({ id: 'work', title: 'Review priorities', ...values });
test('recurrence crosses leap days and weekends using local calendar dates', () => {
  assert.equal(nextRecurringDay('2028-02-28', 'daily'), '2028-02-29');
  assert.equal(nextRecurringDay('2028-02-29', 'daily'), '2028-03-01');
  assert.equal(nextRecurringDay('2026-10-09', 'weekdays'), '2026-10-12');
  assert.equal(nextRecurringDay('2026-12-29', 'weekly'), '2027-01-05');
});
test('completion creates one next occurrence, clears subtasks, and skips missed days', () => {
  const source = task({ repeat: 'weekdays', plannedDate: '2026-10-01', dueDate: '2026-10-02', notes: 'Private context', subtasks: [{ id: 'step', title: 'Gather context', done: true }] });
  let sequence = 0;
  const result = setTaskDone([source], source.id, true, now, () => 'new-' + ++sequence);
  assert.equal(result.generated.plannedDate, '2026-10-12');
  assert.equal(result.generated.dueDate, '2026-10-12');
  assert.equal(result.generated.notes, source.notes);
  assert.equal(result.generated.subtasks[0].done, false);
  assert.notEqual(result.generated.subtasks[0].id, 'step');
  assert.equal(source.done, false); // No mutation of the source object.
  const reopened = setTaskDone(result.tasks, source.id, false, now);
  const restored = parseState(JSON.stringify({ ...freshState(), tasks: reopened.tasks }));
  const completedAgain = setTaskDone(restored.tasks, source.id, true, now);
  assert.equal(completedAgain.tasks.length, 2); assert.equal(completedAgain.generated, null);
  assert.equal(completedAgain.tasks.find(t => t.id === source.id).nextOccurrenceId, result.generated.id);
  assert.equal(setTaskDone(completedAgain.tasks, source.id, true, now).generated, null);
});
test('existing backups default to nonrecurring tasks and retain new fields on export', () => {
  const legacy = task({ repeat: undefined }); assert.equal(legacy.repeat, 'none');
  const result = setTaskDone([legacy], legacy.id, true, now); assert.equal(result.tasks.length, 1);
  const future = task({ repeat: 'weekly', plannedDate: '2026-10-20' });
  assert.equal(setTaskDone([future], future.id, true, now).generated.plannedDate, '2026-10-27');
});
test('weekly review uses actual local completions/session time, excludes old and future records', () => {
  const state = freshState();
  state.tasks = [task({ done: true, completedAt: '2026-10-04T18:00:00Z' }), task({ id: 'old', done: true, completedAt: '2026-10-04T10:00:00Z' }), task({ id: 'future', done: true, completedAt: '2026-10-11T18:00:00Z' })];
  state.sessions = [{ createdAt: '2026-10-04T18:00:00Z', seconds: 90 }, { createdAt: '2026-10-11T10:00:00Z', seconds: 45 }, { createdAt: '2026-10-11T18:00:00Z', seconds: 3600 }];
  const week = weekSummary(state, '2026-10-11');
  assert.equal(week.days[0].day, '2026-10-05'); assert.equal(week.days[6].day, '2026-10-11');
  assert.equal(week.seconds, 135); assert.equal(week.sessions, 2); assert.equal(week.completed, 1);
});
test('widget snapshot excludes notes, subtasks, ideas, reflections and full history', () => {
  const state = freshState();
  state.tasks = Array.from({ length: 5 }, (_, index) => task({ id: '' + index, title: '<script>plain text</script>', plannedDate: '2026-10-11', notes: 'secret notes', subtasks: [{ id: 'private', title: 'secret step' }] }));
  state.ideas = [{ text: 'secret idea' }];
  state.sessions = [{ createdAt: now.toISOString(), seconds: 125, reflection: 'secret reflection' }];
  state.timer = startTimer({ ...state.timer, title: 'One thing' }, now.getTime() - 1000);
  const snapshot = widgetSnapshot(state, now);
  assert.equal(snapshot.today.remaining, 5); assert.equal(snapshot.today.tasks.length, 3);
  assert.equal(snapshot.timer.remaining, 1499); assert.equal(snapshot.week.minutes, 2);
  assert.equal(snapshot.day, '2026-10-11');
  assert(!JSON.stringify(snapshot).includes('secret'));
  assert.equal(snapshot.today.tasks[0].title, '<script>plain text</script>');
});
