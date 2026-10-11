# 0002 — Standalone macOS application with a local task workflow

Date: 2026-10-11 (Asia/Jakarta)
Status: accepted; supersedes 0001 as the primary product direction.

## Context

The owner clarified that they want a macOS app and to-do/productivity features, confirmed Apple silicon, and wants help with deadlines, prioritization, focus, and organizing projects. Their specific role remains unknown.

## Options

SwiftUI would provide native-rendered UI but requires a Mac/Xcode to build and validate. An Electron desktop shell preserves the already-created immersive interface and can be cross-packaged for Apple silicon while adding native menus, Dock/tray integrations, notifications, and file storage.

## Decision

Build a standalone Electron app with a bundled local renderer, versioned JSON file storage, Today/Upcoming/project workflows, and linked focus sessions. Keep the original web prototype under dist/ and isolate desktop source under desktop/.

## Consequences

The app works without the hosted Site or an external server and has no runtime network calls. It is an Electron desktop app, not SwiftUI-native-rendered UI. The bundle is larger than a comparable SwiftUI app.

The Linux-produced arm64 preview is not Developer ID signed or notarized. Native Mac testing and distribution signing remain release requirements. Local Mac packaging uses an ad-hoc signature.

## Verification

Nine model/storage cases plus the actual Electron journey: task/subtask operations, project/search, linked focus, persistence across relaunch, menu command routing, native-dialog IPC, import/export, v1 migration, invalid-import preservation, renderer isolation, resource allowlist, and offline boundary.
