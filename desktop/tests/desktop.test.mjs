import { _electron as electron } from 'playwright-core';
import { expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { localDay } from '../renderer/tasks.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = await mkdtemp(path.join(tmpdir(), 'focus-desktop-test-'));
const env = { ...process.env, FOCUS_STUDIO_TEST_DATA: data, XDG_CACHE_HOME: path.join(data, 'cache') };
const errors = [];
let app;
async function launch() {
  app = await electron.launch({ args: [...(process.platform === 'linux' ? ['--no-sandbox'] : []), process.env.FOCUS_STUDIO_TEST_ENTRY || root], env, timeout: 30000 });
  const page = await app.firstWindow(); page.on('pageerror', error => errors.push(error.message));
  await expect(page.locator('#tasks-view')).toBeVisible();
  await expect(page.locator('#task-new')).toBeVisible();
  return page;
}
async function stored() { return JSON.parse(await readFile(path.join(data, 'studio.json'), 'utf8')); }
try {
  let page = await launch();
  assert.equal(await page.evaluate('typeof window.require'), 'undefined');
  assert.equal(await page.evaluate('typeof window.focusDesktop.saveState'), 'function');
  await page.locator('#task-new').click();
  await page.locator('#task-title').fill('Prepare project proposal');
  await page.locator('#task-project').fill('Client work');
  await page.locator('#task-priority').selectOption('high');
  await page.locator('#task-estimate').selectOption('45');
  await page.locator('#task-notes').fill('Done means a clear outline and one useful next step.');
  await page.locator('#subtask-add').click();
  await page.locator('#subtask-editor input:not([type="checkbox"])').fill('Gather context');
  await page.locator('#subtask-add').click();
  await page.locator('#subtask-editor input:not([type="checkbox"])').last().fill('Draft outline');
  await page.locator('#task-form button[type="submit"]').click();
  await expect(page.locator('.todo-card')).toHaveCount(1);
  await expect(page.locator('#today-minutes')).toHaveText('45 min');
  await expect.poll(async () => (await stored()).tasks.length).toBe(1);

  await page.locator('#task-new').click();
  await page.locator('#task-title').fill('Review feedback');
  await page.locator('#task-project').fill('Client work');
  await page.locator('#task-due').fill('2000-01-01');
  await page.locator('#task-form button[type="submit"]').click();
  await expect(page.locator('#today-overdue')).toHaveText('1');
  await page.locator('#task-new').click();
  await page.locator('#task-title').fill('Plan next week');
  await page.locator('#task-project').fill('Personal');
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
  await page.locator('#task-planned').fill(localDay(tomorrow));
  await page.locator('#task-form button[type="submit"]').click();
  await expect(page.locator('.todo-card')).toHaveCount(2);
  await page.locator('[data-task-filter="upcoming"]').click();
  await expect(page.locator('.todo-card')).toHaveCount(1);
  await expect(page.locator('.todo-card')).toContainText('Plan next week');
  await page.locator('[data-task-filter="all"]').click();
  await page.locator('#project-filter').selectOption('Client work');
  await expect(page.locator('.todo-card')).toHaveCount(2);
  await page.locator('#task-search').fill('Gather');
  await expect(page.locator('.todo-card')).toHaveCount(1);
  await page.locator('#task-search').fill('');
  await page.locator('#project-filter').selectOption('');
  await page.locator('[data-task-filter="today"]').click();
  const proposal = page.locator('.todo-card').filter({ hasText: 'Prepare project proposal' });
  await proposal.locator('summary').click();
  await proposal.getByLabel('Gather context', { exact: true }).check();
  await expect.poll(async () => (await stored()).tasks.find(t => t.title === 'Prepare project proposal').subtasks[0].done).toBe(true);
  await mkdir(path.join(root, '..', 'docs', 'screenshots'), { recursive: true });
  await page.screenshot({ path: path.join(root, '..', 'docs', 'screenshots', 'macos-tasks-preview.png'), fullPage: true });

  await proposal.getByRole('button', { name: 'Focus ↗', exact: true }).click();
  await expect(page.locator('#studio-view')).toBeVisible();
  await expect(page.locator('#focus-title')).toHaveValue('Prepare project proposal');
  await page.locator('#start-focus').click();
  await page.waitForTimeout(1100);
  await page.locator('#start-focus').click();
  const paused = await page.locator('#timer').innerText();
  await page.waitForTimeout(700); assert.equal(await page.locator('#timer').innerText(), paused);
  await page.locator('#start-focus').click();
  await page.locator('#finish-focus').click();
  await page.locator('#reflection').fill('An outline is ready.');
  await page.locator('#session-next').fill('Send it for review.');
  await page.locator('#complete-focus-task').check();
  await page.locator('#finish-form button[type="submit"]').click();
  await page.locator('[data-view="tasks"]').click();
  await expect(page.locator('.todo-card')).toHaveCount(1);
  await page.locator('[data-task-filter="completed"]').click();
  await expect(page.locator('.todo-card')).toHaveCount(1);
  await expect.poll(async () => (await stored()).sessions[0].taskId).toBe((await stored()).tasks.find(t => t.title === 'Prepare project proposal').id);
  await page.locator('[data-view="journal"]').click();
  await expect(page.locator('.session-row')).toContainText('An outline is ready.');

  // Native command wiring works independently of renderer keyboard handling.
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.send('studio:command', 'task'));
  await expect(page.locator('#task-dialog')).toBeVisible();
  await page.locator('#task-title').fill('A task from the native menu');
  await page.locator('#task-form button[type="submit"]').click();
  await expect.poll(async () => (await stored()).tasks.length).toBe(4);
  await app.close();
  page = await launch();
  await page.locator('[data-task-filter="all"]').click();
  await expect(page.locator('.todo-card')).toHaveCount(3);

  // Native dialogs are stubbed, while real IPC, validation and filesystem I/O run.
  const exportFile = path.join(data, 'export.json');
  await app.evaluate(({ dialog }, file) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: file }); }, exportFile);
  await page.locator('[data-view="journal"]').click();
  await page.locator('#export-data').click();
  await expect.poll(async () => JSON.parse(await readFile(exportFile, 'utf8')).tasks.length).toBe(4);
  const importedFile = path.join(data, 'web-backup.json');
  await writeFile(importedFile, JSON.stringify({ version: 1, owner: 'Imported', ideas: [{ id: 'old', text: 'From the web app', createdAt: new Date().toISOString() }] }));
  await app.evaluate(({ dialog }, file) => { dialog.showMessageBox = async () => ({ response: 1 }); dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] }); }, importedFile);
  await page.locator('[data-view="tasks"]').click();
  await page.locator('#import-data').click();
  await expect(page.locator('#greeting')).toHaveText('Find your flow, Imported.');
  await expect.poll(async () => (await stored()).ideas[0].text).toBe('From the web app');
  await writeFile(importedFile, '{"version":99}');
  await page.locator('#import-data').click();
  await expect(page.locator('#toast')).toContainText('Import failed');
  assert.equal((await stored()).owner, 'Imported');

  // Only allowlisted app resources can be loaded through the custom protocol.
  const status = await app.evaluate(async ({ net }) => (await net.fetch('focus://app/main.cjs')).status);
  assert.equal(status, 404);
  const network = await page.evaluate(async () => { try { await fetch('https://example.com'); return 'allowed'; } catch { return 'blocked'; } });
  assert.equal(network, 'blocked');
  assert.deepEqual(errors, []);
  console.log('PASS: real Electron task/project/subtask journey, linked focus/completion, menu commands, relaunch persistence, native backup IPC/import/export, v1 migration, invalid-import protection, protocol allowlist, renderer isolation, and offline boundary. No JavaScript errors.');
} finally {
  if (app) await app.close().catch(() => {});
  await rm(data, { recursive: true, force: true });
}
