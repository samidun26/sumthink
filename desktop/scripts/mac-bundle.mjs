import { access, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { constants } from 'node:fs';
import { spawnSync } from 'node:child_process';

export function assertLocalSignature(details) {
  // An ad-hoc signature has no Developer ID team. Hardened-runtime library
  // validation can reject Electron before any application JavaScript runs.
  const flags = details.match(/\bflags=0x([0-9a-f]+)/i);
  if (!/Signature=adhoc\b/.test(details)) throw new Error('Expected a local ad-hoc signature.');
  if (!flags || (Number.parseInt(flags[1], 16) & 0x10000)) {
    throw new Error('Local ad-hoc build has hardened runtime enabled; Electron may fail its Team ID check. Rebuild with the updated packaging script.');
  }
}

export async function verifyMacBundle(appPath, { native = process.platform === 'darwin' } = {}) {
  const root = await realpath(appPath);
  const executable = path.join(root, 'Contents', 'MacOS', 'Focus Studio');
  const framework = path.join(root, 'Contents', 'Frameworks', 'Electron Framework.framework', 'Electron Framework');
  for (const file of [executable, framework]) {
    let resolved;
    try { resolved = await realpath(file); }
    catch { throw new Error(`Bundle is incomplete or has a broken link: ${file}`); }
    if (!resolved.startsWith(root + path.sep)) throw new Error(`Bundle links outside itself: ${file}`);
    await access(resolved, constants.X_OK);
  }
  await access(path.join(root, 'Contents', 'Resources', 'app.asar'));
  await readFile(path.join(root, 'Contents', 'Info.plist'));
  if (native) {
    const checked = spawnSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=2', root], { encoding: 'utf8' });
    if (checked.status !== 0) throw new Error(`Bundle signature verification failed:\n${checked.stderr || checked.stdout || checked.error?.message}`);
    const displayed = spawnSync('/usr/bin/codesign', ['--display', '--verbose=4', root], { encoding: 'utf8' });
    if (displayed.status !== 0) throw new Error(`Could not inspect the app signature: ${displayed.stderr || displayed.error?.message}`);
    assertLocalSignature(displayed.stdout + displayed.stderr);
  }
}
