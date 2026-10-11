import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, freshTimer, parseState, startTimer, pauseTimer, tickTimer, elapsedSeconds } from '../renderer/core.mjs';
import { normalizeTask, validDay, taskMatches, sortTasks, daySummary, localDay } from '../renderer/tasks.mjs';

const make = values => normalizeTask({ id: 'task', title: 'A real next step', ...values });
test('web v1 export migrates without losing ideas, sessions, or preferences', () => {
  const old = { ...freshState(), version: 1, owner: 'Test', ideas: [{ id: 'idea', text: 'A thought', createdAt: '2026-10-11T01:00:00Z' }], tasks: undefined };
  const migrated = parseState(JSON.stringify(old));
  assert.equal(migrated.version, 2); assert.equal(migrated.owner, 'Test');
  assert.equal(migrated.ideas[0].text, 'A thought'); assert.deepEqual(migrated.tasks, []);
  assert.throws(() => parseState('{"version":99}'));
});
test('deadlines are calendar dates, and today uses the local timezone', () => {
  assert.equal(validDay('2026-02-30'), false); assert.equal(validDay('2028-02-29'), true);
  process.env.TZ = 'Asia/Jakarta';
  assert.equal(localDay(new Date('2026-10-10T18:00:00Z')), '2026-10-11');
  const task = make({ dueDate: '2026-02-30', plannedDate: 'invalid', priority: 'broken', estimate: -1 });
  assert.equal(task.dueDate, ''); assert.equal(task.plannedDate, ''); assert.equal(task.priority, 'normal'); assert.equal(task.estimate, 25);
});
test('today includes overdue work, upcoming excludes it, and finished tasks leave open lists', () => {
  const overdue = make({ dueDate: '2026-10-10', plannedDate: '2026-10-15' });
  const future = make({ dueDate: '2026-10-12' });
  assert(taskMatches(overdue, { filter: 'today', today: '2026-10-11' }));
  assert(!taskMatches(overdue, { filter: 'upcoming', today: '2026-10-11' }));
  assert(taskMatches(future, { filter: 'upcoming', today: '2026-10-11' }));
  assert(!taskMatches({ ...overdue, done: true }, { filter: 'all' }));
  assert(taskMatches({ ...overdue, done: true }, { filter: 'completed' }));
});
test('daily workload excludes completed effort and old completed deadlines', () => {
  const tasks = [make({ id: 'one', plannedDate: '2026-10-11', estimate: 45, priority: 'high' }),
    make({ id: 'two', dueDate: '2026-10-09', estimate: 60 }),
    make({ id: 'three', plannedDate: '2026-10-11', done: true, estimate: 90 }),
    make({ id: 'old', dueDate: '2026-10-08', done: true, completedAt: '2026-10-08T01:00:00Z' })];
  const summary = daySummary(tasks, '2026-10-11');
  assert.equal(summary.minutes, 105); assert.equal(summary.remaining, 2); assert.equal(summary.completed, 1);
  assert.equal(summary.overdue, 1); assert.equal(summary.next.id, 'two');
  assert.equal(sortTasks(tasks.filter(t => !t.done), '2026-10-11')[0].id, 'two');
});
test('task/project/subtask search and schema filtering preserve useful records', () => {
  const task = make({ project: 'Client', subtasks: [{ id: 'sub', title: 'Research', done: true }], notes: 'A link', title: '<script>text</script>' });
  assert(taskMatches(task, { filter: 'all', project: 'Client', query: 'research' }));
  assert(!taskMatches(task, { filter: 'all', project: 'Personal' }));
  const state = freshState(); state.tasks = [task, task, { id: 'bad', title: ' ' }]; state.activeTaskId = task.id;
  const parsed = parseState(JSON.stringify(state)); assert.equal(parsed.tasks.length, 1);
  assert.equal(parsed.activeTaskId, task.id); assert.equal(parsed.tasks[0].subtasks[0].done, true);
});
test('linked focus recovers deadlines, excludes pauses, and retains task identity', () => {
  const timer = { ...freshTimer(), taskId: 'one', title: 'A task' };
  const started = startTimer(timer, 100000);
  const paused = pauseTimer(started, 160000);
  assert.equal(elapsedSeconds(paused, 10000000), 60);
  const resumed = startTimer(paused, 10000000);
  const state = freshState(); state.timer = resumed;
  const restored = parseState(JSON.stringify(state)); assert.equal(restored.timer.taskId, 'one');
  assert.equal(tickTimer(restored.timer, 20000000).phase, 'complete');
});
