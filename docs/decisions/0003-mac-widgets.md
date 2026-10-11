# Decision 0003: Two Mac widget formats

Date: 2026-10-11 (Asia/Jakarta).
Status: Implemented; native device validation pending.

## Context

The owner requested helpful widgets and explicitly chose both a floating window and native desktop/Notification Center widgets. They use Apple silicon and confirmed full Xcode is installed. Focus Studio is an offline Electron app with local userData and an existing successful 0.2.1 Mac launch.

## Decision

Use a separate, isolated Electron window for live floating controls. Keep the main renderer responsible for task/session changes, with main-process validation before forwarding narrow companion actions.

Use a native SwiftUI companion and embedded WidgetKit extension for OS galleries. Build using the committed Xcode project or dependency-free generator. Keep this native package separate from the Electron app so users can install the floating feature without Xcode.

Publish a minimal, read-only JSON projection to the existing local data folder. Grant the sandboxed native targets access only to that file using a home-relative temporary read exception. This avoids an App Group/provisioning dependency for the initial local workflow. App Store distribution would need a reviewed sharing/signing approach. Ad-hoc build and gallery acceptance must be validated on the intended Mac.

## Consequences

Native widgets have OS-controlled refresh timing and display saved timestamps. A deadline timer can count down without repeated timeline requests. They open app views and do not edit tasks. The floating companion can update each second and control the same tasks/timer, and must run with Focus Studio.

The snapshot exposes three task titles/projects, timer title, and totals, but excludes notes, ideas, reflections, subtasks, and full history. No network service or model runtime is introduced. The Mac installer preserves previous companion copies and verifies staged signatures before replacement.

## Verification

Model and real Electron companion checks pass on Linux; the OpenStep project/plists/scheme pass structural checks. Xcode compilation, narrow sandbox read, registration, native layout, and click-through remain device checks. See [validation](../validation.md) and [widget setup](../widgets.md).
