import { packager } from '@electron/packager';
import { cp, mkdir, mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { verifyMacBundle } from './mac-bundle.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const staging = await mkdtemp(path.join(tmpdir(), 'focus-studio-stage-'));
try {
  for (const item of ['main.cjs', 'preload.cjs', 'widget-preload.cjs', 'storage.cjs', 'renderer', 'assets']) await cp(path.join(root, item), path.join(staging, item), { recursive: true });
  await import('node:fs/promises').then(fs => fs.writeFile(path.join(staging, 'package.json'), JSON.stringify({ name: pkg.name, productName: pkg.productName, version: pkg.version, main: pkg.main, description: pkg.description })));
  const outputs = await packager({
    dir: staging, name: 'Focus Studio', platform: 'darwin', arch: 'arm64',
    electronVersion: pkg.devDependencies.electron, appBundleId: 'dev.focusstudio.desktop',
    appVersion: pkg.version, icon: path.join(root, 'assets', 'app.icns'),
    out: path.join(root, 'build'), overwrite: true, asar: true,
    // Local ad-hoc signatures have no Developer ID team. Do not inherit the
    // signer's hardened-runtime default: dyld rejects the bundled framework.
    osxSign: process.platform === 'darwin' ? { identity: '-', identityValidation: false, preAutoEntitlements: false, preEmbedProvisioningProfile: false, continueOnError: false, optionsForFile: () => ({ timestamp: 'none', hardenedRuntime: false }) } : false, osxNotarize: false,
    extraResource: [path.join(root, '..', 'docs'), path.join(root, '..', 'README.md')],
    extendInfo: { CFBundleURLTypes: [{ CFBundleURLName: 'Focus Studio', CFBundleURLSchemes: ['focusstudio'] }], NSHumanReadableCopyright: 'A personal workspace for intentional work.' },
    download: { cacheRoot: process.env.FOCUS_STUDIO_ELECTRON_CACHE || path.join(tmpdir(), 'focus-studio-electron-cache') },
  });
  const app = path.join(outputs[0], 'Focus Studio.app');
  await verifyMacBundle(app);
  await mkdir(path.join(root, 'release'), { recursive: true });
  const archive = path.join(root, 'release', `Focus-Studio-${pkg.version}-mac-arm64.zip`);
  await rm(archive, { force: true });
  const result = spawnSync('zip', ['-q', '-r', '-y', archive, 'Focus Studio.app'], { cwd: outputs[0], stdio: 'inherit' });
  if (result.status !== 0) throw new Error('Could not ZIP the application bundle.');
  const manifest = { app, archive, architecture: 'arm64', adHocSigned: process.platform === 'darwin', hardenedRuntime: process.platform === 'darwin' ? false : null, developerIDSigned: false, notarized: false };
  await import('node:fs/promises').then(fs => fs.writeFile(path.join(root, 'build', 'mac-build.json'), JSON.stringify(manifest, null, 2) + '\n'));
  console.log(JSON.stringify(manifest));
} finally { await rm(staging, { recursive: true, force: true }); }
