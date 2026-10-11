# Source and packaging

Source code, tests, assets, and development documentation are maintained at https://github.com/samidun26/sumthink.

## Desktop release flow

1. On an Apple silicon Mac running macOS 13+, install Node 24 or later.
2. In desktop/, run npm ci, npm test, and npm run test:desktop.
3. Run npm run package:mac to create the app under desktop/build/ and a ZIP under desktop/release/.
4. Test launch, local persistence, import/export, menus, the menu-bar timer, Dock badge, notifications, sleep/wake, and accessibility on macOS.
5. For public distribution, complete Developer ID signing and notarization on a Mac. The current local packaging script applies an ad-hoc development signature when run on macOS; it does not provide Developer ID signing or notarization.

See [the macOS guide](macos-app.md) for setup and current preview limitations, and [validation](validation.md) for completed checks.

## Repository contents

The repository includes the standalone desktop app and the earlier browser prototype under dist/. The desktop app bundles its interface and works offline, independently of web hosting.

Installed dependencies, generated app bundles/ZIPs, local environment files, and hosting metadata are excluded from Git. Build outputs are generated locally; they are not downloadable from this source repository unless a separate release is published.

No GitHub Actions workflows or paid services are enabled by this source upload.
