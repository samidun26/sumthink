import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, freshTimer, startTimer, pauseTimer, tickTimer, remainingSeconds, elapsedSeconds, parseState } from '../dist/core.mjs';

test('deadline survives reload and includes time while a tab is inactive', () => {
  const state = freshState();
  state.timer = startTimer(freshTimer(), 100000);
  const restored = parseState(JSON.stringify(state));
  assert.equal(remainingSeconds(restored.timer, 400000), 1200);
  assert.equal(elapsedSeconds(restored.timer, 400000), 300);
  assert.equal(tickTimer(restored.timer, 1600000).phase, 'complete');
  assert.equal(remainingSeconds(restored.timer, 9999999), 0);
});
test('paused time does not count toward focus, and resuming sets a new deadline', () => {
  const started = startTimer(freshTimer(45), 100000);
  const paused = pauseTimer(started, 160000);
  assert.equal(paused.remaining, 2640);
  assert.equal(elapsedSeconds(paused, 10000000), 60);
  const resumed = startTimer(paused, 10000000);
  assert.equal(remainingSeconds(resumed, 10030000), 2610);
  assert.equal(elapsedSeconds(resumed, 10030000), 90);
});
test('expiration remains complete and cannot restart until a new timer is made', () => {
  const timer = tickTimer(startTimer(freshTimer(60), 1000), 3601000);
  assert.equal(timer.phase, 'complete');
  assert.deepEqual(startTimer(timer, 3602000), timer);
  assert.equal(elapsedSeconds(timer), 3600);
});
test('invalid saved records and settings are sanitized; unsupported data is rejected', () => {
  const state = freshState();
  state.scene = '__proto__'; state.work = 'unexpected';
  state.timer = { ...state.timer, phase: 'running', endAt: null };
  state.ideas = [{ id: 'bad', text: 'bad', createdAt: 'not-a-date' }, { id: 'good', text: '<script>alert(1)</script>', createdAt: '2026-10-11T01:00:00Z' }];
  const restored = parseState(JSON.stringify(state));
  assert.equal(restored.scene, 'dusk'); assert.equal(restored.work, 'Creative work');
  assert.equal(restored.timer.phase, 'idle'); assert.equal(restored.ideas.length, 1);
  assert.equal(restored.ideas[0].text, '<script>alert(1)</script>');
  assert.throws(() => parseState('{broken'));
  assert.throws(() => parseState('{"version":2}'));
});
