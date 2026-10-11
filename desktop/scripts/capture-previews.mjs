import { _electron as electron } from 'playwright-core';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { localDay } from '../renderer/tasks.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, '..', 'docs', 'screenshots');
const data = await mkdtemp(path.join(tmpdir(), 'focus-preview-'));
const errors = [];
let app;
try {
  await mkdir(output, { recursive: true });
  app = await electron.launch({
    args: [...(process.platform === 'linux' ? ['--no-sandbox'] : []), root],
    env: { ...process.env, FOCUS_STUDIO_TEST_DATA: data, XDG_CACHE_HOME: path.join(data, 'cache') },
    timeout: 30000,
  });
  const page = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1320, 1050));
  page.on('pageerror', error => errors.push(error.message));
  await page.locator('#tasks-view').waitFor({ state: 'visible' });
  const today = localDay();
  const nextDay = days => { const date = new Date(); date.setDate(date.getDate() + days); return localDay(date); };
  const capture = async name => {
    await page.locator('#toast.visible').waitFor({ state: 'hidden' });
    await page.screenshot({ path: path.join(output, name + '.png'), animations: 'disabled' });
    console.log('Captured ' + name + '.png');
  };
  async function task({ title, project, priority = 'normal', planned = today, due = '', estimate = '25', notes = '', subtasks = [] }, preview = false) {
    await page.locator('#task-new').click();
    await page.locator('#task-title').fill(title);
    await page.locator('#task-project').fill(project);
    await page.locator('#task-priority').selectOption(priority);
    await page.locator('#task-planned').fill(planned);
    await page.locator('#task-due').fill(due);
    await page.locator('#task-estimate').selectOption(estimate);
    await page.locator('#task-notes').fill(notes);
    for (const text of subtasks) {
      await page.locator('#subtask-add').click();
      await page.locator('#subtask-editor input:not([type="checkbox"])').last().fill(text);
    }
    if (preview) await capture('task-editor');
    await page.locator('#task-form button[type="submit"]').click();
  }
  await task({ title: 'Prepare project proposal', project: 'Client work', priority: 'high', due: nextDay(1), estimate: '45', notes: 'Done means a clear outline and a useful next step.', subtasks: ['Gather context', 'Draft outline', 'Send for review'] }, true);
  await task({ title: 'Review feedback', project: 'Client work', due: nextDay(-1), subtasks: ['Read comments', 'Choose the next revision'] });
  await task({ title: 'Clear the inbox', project: 'Admin', estimate: '15' });
  await task({ title: 'Plan next week', project: 'Personal', planned: nextDay(2), estimate: '25' });
  const proposal = page.locator('.todo-card').filter({ hasText: 'Prepare project proposal' });
  await proposal.locator('summary').click();
  await proposal.getByLabel('Gather context', { exact: true }).check();
  await capture('today');
  await proposal.getByRole('button', { name: 'Focus ↗', exact: true }).click();
  await page.locator('#studio-view').waitFor({ state: 'visible' });
  await page.locator('#next-step').fill('Draft the three main sections, then send the outline for review.');
  await page.locator('#start-focus').click();
  await capture('focus-session');
  await page.locator('#immerse-toggle').click();
  await capture('immersive');
  await page.keyboard.press('Escape');
  await page.locator('#finish-focus').click();
  await page.locator('#reflection').fill('The outline is ready. Next session: expand the main sections.');
  await page.locator('#session-next').fill('Send the outline for review.');
  await capture('reflection');
  await page.locator('#finish-form button[type="submit"]').click();
  await page.locator('[data-view="ideas"]').click();
  for (const text of ['Try a weekly planning ritual: choose three priorities before opening the inbox.', 'Turn repeated project steps into a reusable checklist.']) {
    await page.locator('#idea-new').click();
    await page.locator('#idea-text').fill(text);
    await page.locator('#capture-form button[type="submit"]').click();
  }
  await capture('idea-inbox');
  await page.locator('[data-view="journal"]').click();
  await page.locator('.session-row').waitFor({ state: 'visible' });
  await capture('journal');
  await page.locator('#settings-open').click();
  await capture('preferences');
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Eight actual Electron UI captures saved; no JavaScript errors. Sample data stays in the temporary profile.');
} finally {
  if (app) await app.close().catch(() => {});
  await rm(data, { recursive: true, force: true });
}
