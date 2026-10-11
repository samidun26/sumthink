import SwiftUI
import WidgetKit
import AppKit

@main
struct FocusStudioWidgetsApp: App {
    var body: some Scene {
        WindowGroup("Focus Studio Widgets") { SetupView() }
            .defaultSize(width: 520, height: 440)
    }
}

struct SetupView: View {
    @State private var snapshot: Snapshot?
    @State private var refreshKey = ""
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Label("Focus Studio Widgets", systemImage: "sun.max.fill")
                .font(.title).foregroundStyle(Color(red: 0.25, green: 0.38, blue: 0.27))
            Text("A little clarity, right on your desktop.").font(.title3)
            Text("1. Open Focus Studio once to publish your local snapshot.\n2. Right-click the desktop and choose Edit Widgets.\n3. Search for Focus Studio Widgets, then add Today, Focus, or Week.")
                .font(.body).lineSpacing(7)
            if let value = snapshot {
                Text("\(value.today.remaining) tasks left today · \(value.week.minutes) focus minutes this week")
                    .font(.headline).foregroundStyle(.secondary)
                if let date = Snapshot.date(value.generatedAt) {
                    Text("Snapshot updated \(date.formatted(date: .abbreviated, time: .shortened))").font(.caption).foregroundStyle(.secondary)
                }
            } else {
                Text("No readable snapshot yet. Open the updated Focus Studio app, then refresh.")
                    .foregroundStyle(.secondary)
            }
            HStack {
                Button("Open Focus Studio") { NSWorkspace.shared.open(URL(string: "focusstudio://tasks")!) }
                Button("Refresh widgets") { snapshot = Snapshot.load(); WidgetCenter.shared.reloadAllTimelines() }
            }
            Text("Widgets read a local summary. They refresh on macOS's schedule; they do not change your tasks. You can close this window after setup.")
                .font(.caption).foregroundStyle(.secondary)
        }
        .padding(30)
        .frame(minWidth: 500, minHeight: 420)
        .task {
            while !Task.isCancelled {
                let value = Snapshot.load()
                snapshot = value
                let nextKey = value?.reloadKey ?? ""
                if refreshKey != nextKey { refreshKey = nextKey; WidgetCenter.shared.reloadAllTimelines() }
                do { try await Task.sleep(nanoseconds: 10_000_000_000) } catch { break }
            }
        }
    }
}
