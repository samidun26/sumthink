# 0001 — Build a browser-local focus workspace

Date: 2026-10-11 (Asia/Jakarta)
Status: superseded as the primary product direction by [0002](0002-macos-desktop.md). Retained for the original web prototype.

## Context

The owner selected an eye-catching web app for Mac and Markdown docs. Their detailed work persona remains unknown. The first version needs a complete useful journey and room to adapt.

## Options

Native Mac development fits system integration but differs from the selected format. A web server/framework fits shared records or inference, neither defined yet. A static app supports local focus/capture/reflection without backend state or runtime dependencies.

## Decision

Use a buildless static app, versioned browser storage, SVG/CSS scenes, and Web Audio. Document the implementation alongside its source.

## Consequences

Simple source/deployment and local persistence without API credentials. No cross-device sync, background notifications, system-wide shortcuts, or model inference. Sol 6.1 is a development preference, not an AI runtime integration.

## Verification

Timer/state checks and a desktop/mobile browser journey. Mac Safari and VoiceOver still need device validation.
