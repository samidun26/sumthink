import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// A reproducible, dependency-free Xcode project. The generated project is also
// committed so it can be opened and reviewed directly in Xcode.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectPath = path.join(root, 'FocusStudioWidgets.xcodeproj');
const id = name => createHash('sha1').update('focus-studio:' + name).digest('hex').slice(0, 24).toUpperCase();
const objects = {};
function object(name, isa, fields) { const key = id(name); objects[key] = { isa, ...fields }; return key; }
const sourceFiles = ['Shared.swift', 'HostApp.swift', 'Widgets.swift'].map(name => object('file:' + name, 'PBXFileReference', { lastKnownFileType: 'sourcecode.swift', path: 'Sources/' + name, sourceTree: '<group>' }));
const ancillary = ['Host-Info.plist', 'Extension-Info.plist', 'Host.entitlements', 'Extension.entitlements'].map(name => object('file:' + name, 'PBXFileReference', { lastKnownFileType: name.endsWith('.plist') ? 'text.plist.xml' : 'text.plist.entitlements', path: name, sourceTree: '<group>' }));
const icon = object('icon', 'PBXFileReference', { lastKnownFileType: 'image.icns', path: '../desktop/assets/app.icns', sourceTree: '<group>' });
const hostProduct = object('host:product', 'PBXFileReference', { explicitFileType: 'wrapper.application', includeInIndex: '0', path: 'Focus Studio Widgets.app', sourceTree: 'BUILT_PRODUCTS_DIR' });
const widgetProduct = object('widget:product', 'PBXFileReference', { explicitFileType: 'wrapper.app-extension', includeInIndex: '0', path: 'FocusStudioWidgetExtension.appex', sourceTree: 'BUILT_PRODUCTS_DIR' });
const products = object('products', 'PBXGroup', { children: [hostProduct, widgetProduct], name: 'Products', sourceTree: '<group>' });
const group = object('root:group', 'PBXGroup', { children: [...sourceFiles, ...ancillary, icon, products], sourceTree: '<group>' });
function configurations(name, settings) {
  const children = ['Debug', 'Release'].map(configuration => object(name + ':' + configuration, 'XCBuildConfiguration', { name: configuration, buildSettings: { ...settings, SWIFT_OPTIMIZATION_LEVEL: configuration === 'Release' ? '-O' : '-Onone' } }));
  return object(name + ':configs', 'XCConfigurationList', { buildConfigurations: children, defaultConfigurationIsVisible: '0', defaultConfigurationName: 'Release' });
}
const common = { SDKROOT: 'macosx', MACOSX_DEPLOYMENT_TARGET: '14.0', SWIFT_VERSION: '5.0', CLANG_ENABLE_MODULES: 'YES', CODE_SIGN_STYLE: 'Manual', CODE_SIGN_IDENTITY: '-', DEVELOPMENT_TEAM: '', ENABLE_HARDENED_RUNTIME: 'NO', ENABLE_APP_SANDBOX: 'YES', GENERATE_INFOPLIST_FILE: 'NO' };
function phases(name, files, resources = []) {
  const sources = object(name + ':sources', 'PBXSourcesBuildPhase', { buildActionMask: '2147483647', files: files.map(fileRef => object(name + ':source:' + fileRef, 'PBXBuildFile', { fileRef })), runOnlyForDeploymentPostprocessing: '0' });
  const frameworks = object(name + ':frameworks', 'PBXFrameworksBuildPhase', { buildActionMask: '2147483647', files: [], runOnlyForDeploymentPostprocessing: '0' });
  const resourcePhase = object(name + ':resources', 'PBXResourcesBuildPhase', { buildActionMask: '2147483647', files: resources.map(fileRef => object(name + ':resource:' + fileRef, 'PBXBuildFile', { fileRef })), runOnlyForDeploymentPostprocessing: '0' });
  return [sources, frameworks, resourcePhase];
}
const widget = object('widget:target', 'PBXNativeTarget', {
  name: 'FocusStudioWidgetExtension', productName: 'FocusStudioWidgetExtension', productReference: widgetProduct, productType: 'com.apple.product-type.app-extension',
  buildConfigurationList: configurations('widget', { ...common, PRODUCT_NAME: '$(TARGET_NAME)', PRODUCT_BUNDLE_IDENTIFIER: 'dev.focusstudio.widgets.extension', INFOPLIST_FILE: 'Extension-Info.plist', CODE_SIGN_ENTITLEMENTS: 'Extension.entitlements', APPLICATION_EXTENSION_API_ONLY: 'YES', SKIP_INSTALL: 'YES', LD_RUNPATH_SEARCH_PATHS: ['$(inherited)', '@executable_path/../Frameworks', '@executable_path/../../../../Frameworks'] }),
  buildPhases: phases('widget', [sourceFiles[0], sourceFiles[2]]), buildRules: [], dependencies: [],
});
const proxy = object('widget:proxy', 'PBXContainerItemProxy', { containerPortal: id('project'), proxyType: '1', remoteGlobalIDString: widget, remoteInfo: 'FocusStudioWidgetExtension' });
const dependency = object('widget:dependency', 'PBXTargetDependency', { target: widget, targetProxy: proxy });
const embedFile = object('widget:embedfile', 'PBXBuildFile', { fileRef: widgetProduct, settings: { ATTRIBUTES: ['CodeSignOnCopy', 'RemoveHeadersOnCopy'] } });
const embed = object('widget:embed', 'PBXCopyFilesBuildPhase', { buildActionMask: '2147483647', dstPath: '', dstSubfolderSpec: '13', files: [embedFile], name: 'Embed App Extensions', runOnlyForDeploymentPostprocessing: '0' });
const host = object('host:target', 'PBXNativeTarget', {
  name: 'FocusStudioWidgets', productName: 'Focus Studio Widgets', productReference: hostProduct, productType: 'com.apple.product-type.application',
  buildConfigurationList: configurations('host', { ...common, PRODUCT_NAME: 'Focus Studio Widgets', PRODUCT_BUNDLE_IDENTIFIER: 'dev.focusstudio.widgets', INFOPLIST_FILE: 'Host-Info.plist', CODE_SIGN_ENTITLEMENTS: 'Host.entitlements', LD_RUNPATH_SEARCH_PATHS: ['$(inherited)', '@executable_path/../Frameworks'] }),
  buildPhases: [...phases('host', [sourceFiles[0], sourceFiles[1]], [icon]), embed], buildRules: [], dependencies: [dependency],
});
const project = object('project', 'PBXProject', { attributes: { LastUpgradeCheck: '1600', TargetAttributes: { [host]: { CreatedOnToolsVersion: '16.0' }, [widget]: { CreatedOnToolsVersion: '16.0' } } }, buildConfigurationList: configurations('project', { ALWAYS_SEARCH_USER_PATHS: 'NO', SDKROOT: 'macosx', MACOSX_DEPLOYMENT_TARGET: '14.0', SWIFT_VERSION: '5.0' }), compatibilityVersion: 'Xcode 14.0', developmentRegion: 'en', hasScannedForEncodings: '0', knownRegions: ['en', 'Base'], mainGroup: group, productRefGroup: products, projectDirPath: '', projectRoot: '', targets: [host, widget] });
function serialize(value, depth = 0) {
  const indent = '\t'.repeat(depth);
  if (Array.isArray(value)) return '(\n' + value.map(item => '\t'.repeat(depth + 1) + serialize(item, depth + 1) + ',').join('\n') + '\n' + indent + ')';
  if (value && typeof value === 'object') return '{\n' + Object.entries(value).map(([key, item]) => '\t'.repeat(depth + 1) + JSON.stringify(key) + ' = ' + serialize(item, depth + 1) + ';').join('\n') + '\n' + indent + '}';
  return JSON.stringify(String(value));
}
await mkdir(path.join(projectPath, 'xcshareddata', 'xcschemes'), { recursive: true });
await writeFile(path.join(projectPath, 'project.pbxproj'), '// !$*UTF8*$!\n' + serialize({ archiveVersion: '1', classes: {}, objectVersion: '56', objects, rootObject: project }) + '\n');
await writeFile(path.join(projectPath, 'xcshareddata', 'xcschemes', 'FocusStudioWidgets.xcscheme'), `<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="1600" version="1.3">
  <BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES"><BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="${host}" BuildableName="Focus Studio Widgets.app" BlueprintName="FocusStudioWidgets" ReferencedContainer="container:FocusStudioWidgets.xcodeproj"/></BuildActionEntry></BuildActionEntries></BuildAction>
  <LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0"><BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="${host}" BuildableName="Focus Studio Widgets.app" BlueprintName="FocusStudioWidgets" ReferencedContainer="container:FocusStudioWidgets.xcodeproj"/></BuildableProductRunnable></LaunchAction>
  <ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" savedToolIdentifier="" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES"/>
  <AnalyzeAction buildConfiguration="Debug"/><ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>
</Scheme>
`);
console.log('Generated ' + projectPath);
