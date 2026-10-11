import { _electron as electron } from 'playwright-core';
import { expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { freshState } from '../renderer/core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = await mkdtemp(path.join(tmpdir(), 'focus-widget-test-'));
const errors = [];
let app;
const env = { ...process.env, FOCUS_STUDIO_TEST_DATA: data, XDG_CACHE_HOME: path.join(data, 'cache') };
const stored = async () => JSON.parse(await readFile(path.join(data, 'studio.json'), 'utf8'));
const snapshot = async () => JSON.parse(await readFile(path.join(data, 'widget-snapshot.json'), 'utf8'));
async function launch() {
  app = await electron.launch({ args: [...(process.platform === 'linux' ? ['--no-sandbox'] : []), root], env, timeout: 30000 });
  const page = await app.firstWindow(); page.on('pageerror', error => errors.push(error.message));
  await expect(page.locator('#tasks-view')).toBeVisible(); return page;
}
async function companion(page) {
  const opened = app.waitForEvent('window');
  await page.locator('#companion-open').click();
  const widget = await opened; widget.on('pageerror', error => errors.push(error.message));
  await expect(widget.locator('#widget-capture')).toBeVisible(); return widget;
}
try {
  let page = await launch();
  await page.locator('#quick-task').fill('Review the inbox');
  await page.locator('#quick-task-form button[type="submit"]').click();
  await expect(page.locator('#quick-task')).toHaveValue('');
  await page.getByRole('button', { name: 'Edit task: Review the inbox', exact: true }).click();
  await page.locator('#task-repeat').selectOption('weekdays');
  await page.locator('#task-notes').fill('Private notes never enter the widgets');
  await page.locator('#task-form button[type="submit"]').click();
  let widget = await companion(page);
  await expect(widget.locator('#remaining')).toHaveText('1');
  assert.deepEqual(await widget.evaluate(() => [typeof window.require, typeof window.focusDesktop, typeof window.focusWidgets.snapshot]), ['undefined', 'undefined', 'function']);
  const pinned = () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('widget.html')).isAlwaysOnTop());
  assert.equal(await pinned(), true);
  await widget.locator('#widget-pin').click(); await expect.poll(pinned).toBe(false);
  await widget.locator('#widget-pin').click(); await expect.poll(pinned).toBe(true);
  await widget.getByRole('button', { name: 'Complete task: Review the inbox', exact: true }).click();
  await expect(widget.locator('#remaining')).toHaveText('0');
  await expect.poll(async () => (await stored()).tasks.length).toBe(2);
  await expect(widget.locator('#widget-week-tasks')).toHaveText('1');
  await expect.poll(async () => (await snapshot()).today.tasks.length).toBe(0);
  assert(!JSON.stringify(await snapshot()).includes('Private notes'));
  await page.locator('[data-task-filter="completed"]').click();
  await page.getByRole('button', { name: 'Reopen task: Review the inbox', exact: true }).click();
  await expect(widget.locator('#remaining')).toHaveText('1');
  await widget.getByRole('button', { name: 'Complete task: Review the inbox', exact: true }).click();
  await expect.poll(async () => (await stored()).tasks.filter(t => !t.done).length).toBe(1);
  assert.equal((await stored()).tasks.length, 2);
  await widget.locator('[data-action="tasks"]').click();
  await page.locator('#task-new').click();
  await widget.locator('#widget-title').fill('Keep this capture while editing');
  await widget.locator('#widget-capture button').click();
  await expect(widget.locator('#widget-feedback')).toHaveText('Finish the open dialog in Focus Studio first.');
  await expect(widget.locator('#widget-title')).toHaveValue('Keep this capture while editing');
  await page.locator('#task-dialog [data-close]').click();
  await widget.locator('#widget-title').fill('<script>plain text</script>');
  await widget.locator('#widget-capture button').click();
  await expect(widget.locator('#widget-tasks .title')).toContainText('<script>plain text</script>');
  assert.equal(await widget.locator('#widget-tasks script').count(), 0);
  await widget.getByRole('button', { name: 'Focus on task: <script>plain text</script>', exact: true }).click();
  await expect(page.locator('#focus-title')).toHaveValue('<script>plain text</script>');
  await widget.locator('#widget-timer-toggle').click();
  await expect(widget.locator('#widget-timer-toggle')).toHaveText('Pause');
  await expect.poll(async () => (await snapshot()).timer.phase).toBe('running');
  await widget.locator('#widget-timer-toggle').click();
  await expect(widget.locator('#widget-timer-toggle')).toHaveText('Resume');
  const paused = await widget.locator('#widget-timer').innerText();
  await widget.waitForTimeout(1200); assert.equal(await widget.locator('#widget-timer').innerText(), paused);
  // Primary renderer cannot impersonate the companion's privileged sender.
  const before = (await stored()).tasks.length;
  await app.evaluate(({ ipcMain, BrowserWindow }) => {
    const primary = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('index.html'));
    ipcMain.emit('widget:action', { sender: primary.webContents, senderFrame: primary.webContents.mainFrame }, { type: 'add', title: 'Rejected sender' });
  });
  await page.waitForTimeout(100); assert.equal((await stored()).tasks.length, before);
  await app.evaluate(({ app }) => app.emit('open-url', { preventDefault() {} }, 'focusstudio://journal'));
  await expect(page.locator('#journal-view')).toBeVisible();
  await app.evaluate(({ app }) => app.emit('open-url', { preventDefault() {} }, 'focusstudio://tasks?inject=1'));
  await expect(page.locator('#journal-view')).toBeVisible();
  await app.evaluate(({ app, BrowserWindow }) => new Promise(resolve => {
    const primary = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('index.html'));
    primary.webContents.once('did-finish-load', () => resolve());
    primary.webContents.reload();
    app.emit('open-url', { preventDefault() {} }, 'focusstudio://journal');
  }));
  await expect(page.locator('#journal-view')).toBeVisible();
  await widget.locator('#widget-close').click().catch(error => { if (!widget.isClosed()) throw error; });
  await expect.poll(() => app.windows().length).toBe(1);
  await app.close(); app = undefined;
  // Restore a completed timer; the widget button must open reflection in main.
  const restored = await stored(); restored.timer = { ...freshState().timer, phase: 'complete', remaining: 0, title: 'A completed session' };
  await writeFile(path.join(data, 'studio.json'), JSON.stringify(restored));
  page = await launch(); widget = await companion(page);
  await expect(widget.locator('#widget-timer-toggle')).toHaveText('Reflect & finish');
  await widget.locator('#widget-timer-toggle').click();
  await expect(page.locator('#finish-dialog')).toBeVisible();
  await page.locator('#reflection').fill('A useful next step.');
  await page.locator('#finish-form button[type="submit"]').click();
  await widget.locator('[data-action="journal"]').click();
  await expect(page.locator('#week-focus')).toHaveText('25 min');
  await expect(widget.locator('#widget-week-minutes')).toHaveText('25');
  await expect(page.locator('#week-days .week-day')).toHaveCount(7);
  assert.deepEqual(errors, []);
  console.log('PASS: quick capture, recurring completion/reopen/relaunch, floating widgets, isolated bridge, pinning, task capture/focus, timer pause, reflection, weekly review, saved snapshot, sender validation and deep-link allowlist. No JavaScript errors.');
} finally { if (app) await app.close().catch(() => {}); await rm(data, { recursive: true, force: true }); }
