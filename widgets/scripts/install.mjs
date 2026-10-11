import { access, mkdir, mkdtemp, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed${result.error ? ': ' + result.error.message : ''}. See docs/widgets.md.`);
}
async function verify(app) {
  const executable = path.join(app, 'Contents', 'MacOS', 'Focus Studio Widgets');
  const extension = path.join(app, 'Contents', 'PlugIns', 'FocusStudioWidgetExtension.appex');
  if (!(await stat(executable)).isFile()) throw new Error('Companion executable is missing.');
  if (!(await stat(path.join(extension, 'Contents', 'MacOS', 'FocusStudioWidgetExtension'))).isFile()) throw new Error('Widget extension is missing.');
  run('/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=2', app]);
  return extension;
}
let staging;
try {
  if (process.platform !== 'darwin' || process.arch !== 'arm64') throw new Error('Run install:widgets on your Apple silicon Mac with macOS 14+ and full Xcode.');
  run('/usr/bin/xcodebuild', ['-version']);
  run(process.execPath, [path.join(root, 'scripts', 'project.mjs')]);
  console.log('Building the local WidgetKit companion with ad-hoc signing (no Developer ID membership needed for this build).');
  run('/usr/bin/xcodebuild', ['-project', 'FocusStudioWidgets.xcodeproj', '-scheme', 'FocusStudioWidgets', '-configuration', 'Release', '-derivedDataPath', path.join(root, 'build'), '-arch', 'arm64', 'CODE_SIGN_IDENTITY=-', 'CODE_SIGN_STYLE=Manual', 'DEVELOPMENT_TEAM=', 'CODE_SIGNING_ALLOWED=YES', 'build']);
  const source = path.join(root, 'build', 'Build', 'Products', 'Release', 'Focus Studio Widgets.app');
  await verify(source);
  const applications = path.join(homedir(), 'Applications');
  await mkdir(applications, { recursive: true });
  const target = path.join(applications, 'Focus Studio Widgets.app');
  staging = await mkdtemp(path.join(applications, '.focus-widgets-install-'));
  const stagedApp = path.join(staging, 'Focus Studio Widgets.app');
  run('/usr/bin/ditto', [source, stagedApp]);
  await verify(stagedApp);
  run('/usr/bin/osascript', ['-e', 'if application "Focus Studio Widgets" is running then tell application "Focus Studio Widgets" to quit']);
  let backup;
  try { await access(target); backup = path.join(applications, `Focus Studio Widgets-${Date.now()}.backup`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (backup) await rename(target, backup);
  try { await rename(stagedApp, target); } catch (error) { if (backup) await rename(backup, target); throw error; }
  const extension = await verify(target);
  run('/usr/bin/pluginkit', ['-a', extension]);
  run('/usr/bin/open', [target]);
  console.log(`Installed: ${target}`);
  if (backup) console.log(`Previous companion retained: ${backup}`);
  console.log('Open Focus Studio once, then right-click the desktop → Edit Widgets → search Focus Studio Widgets. Add Today, Focus, or Week.');
} catch (error) {
  console.error('Widget installation stopped: ' + error.message);
  process.exitCode = 1;
} finally { if (staging) await rm(staging, { recursive: true, force: true }); }
