import { access, mkdir, mkdtemp, readFile, rename, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { verifyMacBundle } from './mac-bundle.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed${result.error ? ': ' + result.error.message : ''}.`);
}
let staging;
try {
  if (process.platform !== 'darwin' || process.arch !== 'arm64') throw new Error('Run install:mac on your Apple silicon Mac.');
  console.log('Building and verifying the local app. Tasks, journal, and settings will be preserved.');
  run(process.execPath, [path.join(root, 'scripts', 'package-mac.mjs')]);
  const { app } = JSON.parse(await readFile(path.join(root, 'build', 'mac-build.json'), 'utf8'));
  const applications = path.join(homedir(), 'Applications');
  const target = path.join(applications, 'Focus Studio.app');
  await mkdir(applications, { recursive: true });
  staging = await mkdtemp(path.join(applications, '.focus-studio-install-'));
  const stagedApp = path.join(staging, 'Focus Studio.app');
  run('/usr/bin/ditto', [app, stagedApp]);
  await verifyMacBundle(stagedApp);
  run('/usr/bin/osascript', ['-e', 'if application "Focus Studio" is running then tell application "Focus Studio" to quit']);
  let backup;
  try {
    await access(target, constants.F_OK);
    backup = path.join(applications, `Focus Studio-${Date.now()}.backup`);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (backup) await rename(target, backup);
  try { await rename(stagedApp, target); }
  catch (error) { if (backup) await rename(backup, target); throw error; }
  console.log(`Installed: ${target}`);
  if (backup) console.log(`Previous app retained: ${backup}`);
  run('/usr/bin/open', [target]);
  console.log('Launch requested. Once the app opens, you can close Terminal.');
} catch (error) {
  console.error('Installation stopped: ' + error.message);
  process.exitCode = 1;
} finally {
  if (staging) await rm(staging, { recursive: true, force: true });
}
