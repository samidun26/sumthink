import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { verifyMacBundle, assertLocalSignature } from '../scripts/mac-bundle.mjs';

test('local signature check rejects the Team ID failure configuration', () => {
  assertLocalSignature('flags=0x2(adhoc)\nSignature=adhoc\nTeamIdentifier=not set\n');
  assert.throws(() => assertLocalSignature('flags=0x10002(adhoc,runtime)\nSignature=adhoc\nTeamIdentifier=not set\n'), /Team ID/);
  assert.throws(() => assertLocalSignature('flags=0x10000(runtime)\nAuthority=Developer ID Application'), /ad-hoc/);
});

test('bundle check follows valid framework links and rejects an incomplete copy', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'focus-bundle-'));
  try {
    const contents = path.join(root, 'Contents');
    const framework = path.join(contents, 'Frameworks', 'Electron Framework.framework');
    await mkdir(path.join(contents, 'MacOS'), { recursive: true });
    await mkdir(path.join(contents, 'Resources'));
    await mkdir(path.join(framework, 'Versions', 'A'), { recursive: true });
    await writeFile(path.join(contents, 'MacOS', 'Focus Studio'), 'fixture', { mode: 0o755 });
    await writeFile(path.join(contents, 'Info.plist'), 'fixture');
    await writeFile(path.join(contents, 'Resources', 'app.asar'), 'fixture');
    const binary = path.join(framework, 'Versions', 'A', 'Electron Framework');
    await writeFile(binary, 'fixture', { mode: 0o755 });
    await symlink('A', path.join(framework, 'Versions', 'Current'));
    await symlink('Versions/Current/Electron Framework', path.join(framework, 'Electron Framework'));
    await verifyMacBundle(root, { native: false });
    await rm(binary);
    await assert.rejects(verifyMacBundle(root, { native: false }), /broken link/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('bundle check rejects links to code outside the installed app', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'focus-external-bundle-'));
  try {
    const app = path.join(root, 'Focus Studio.app');
    await mkdir(path.join(app, 'Contents', 'MacOS'), { recursive: true });
    await writeFile(path.join(root, 'external'), 'fixture', { mode: 0o755 });
    await symlink(path.join(root, 'external'), path.join(app, 'Contents', 'MacOS', 'Focus Studio'));
    await assert.rejects(verifyMacBundle(app, { native: false }), /outside itself/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
