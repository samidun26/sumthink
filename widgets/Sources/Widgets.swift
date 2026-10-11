import SwiftUI
import WidgetKit

struct StudioEntry: TimelineEntry {
    var date: Date
    var snapshot: Snapshot
    var available: Bool
}
struct StudioProvider: TimelineProvider {
    func placeholder(in context: Context) -> StudioEntry { StudioEntry(date: Date(), snapshot: .empty, available: false) }
    func getSnapshot(in context: Context, completion: @escaping (StudioEntry) -> Void) {
        let value = Snapshot.load()
        completion(StudioEntry(date: Date(), snapshot: value ?? .empty, available: value != nil))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<StudioEntry>) -> Void) {
        let now = Date()
        let value = Snapshot.load()
        var snapshot = value ?? .empty
        if snapshot.timer.phase == "running", let end = snapshot.timer.endDate, end <= now { snapshot = snapshot.finishedTimer }
        var entries = [StudioEntry(date: now, snapshot: snapshot, available: value != nil)]
        if snapshot.timer.phase == "running", let end = snapshot.timer.endDate, end > now {
            entries.append(StudioEntry(date: end, snapshot: snapshot.finishedTimer, available: true))
        }
        completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(15 * 60))))
    }
}

private let ink = Color(red: 0.22, green: 0.33, blue: 0.24)
private let mist = Color(red: 0.87, green: 0.91, blue: 0.82)
private let cream = Color(red: 0.97, green: 0.93, blue: 0.83)

struct WidgetHeading: View {
    var title: String
    var body: some View {
        HStack { Image(systemName: "sun.max"); Text(title).font(.caption2.weight(.semibold)); Spacer(); Image(systemName: "arrow.up.right") }
            .foregroundStyle(ink.opacity(0.7))
    }
}
struct TodayView: View {
    @Environment(\.widgetFamily) private var family
    var entry: StudioEntry
    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            WidgetHeading(title: "TODAY, WITH INTENTION")
            if !entry.available {
                Text("Make room for one thing.").font(.title3)
                Text("Open Focus Studio to load your plan.").font(.caption).foregroundStyle(.secondary)
            } else if family == .systemSmall {
                Text("\(entry.snapshot.today.remaining)").font(.system(size: 38, weight: .light, design: .rounded))
                Text("small steps left").font(.caption)
                Text(entry.snapshot.today.tasks.first?.title ?? "A little breathing room.")
                    .font(.caption).lineLimit(2).privacySensitive()
            } else {
                HStack {
                    Text("\(entry.snapshot.today.remaining) small steps.").font(.title3)
                    Spacer()
                    Text("\(entry.snapshot.today.minutes) min").font(.caption).foregroundStyle(.secondary)
                }
                ForEach(entry.snapshot.today.tasks.prefix(3)) { task in
                    HStack(spacing: 7) {
                        Image(systemName: "circle").foregroundStyle(ink.opacity(0.5))
                        Text(task.title).lineLimit(1).privacySensitive()
                        Spacer(minLength: 4)
                        Text(task.project).lineLimit(1).foregroundStyle(.secondary).privacySensitive()
                    }.font(.caption)
                }
                if entry.snapshot.today.tasks.isEmpty { Text("A little breathing room.").font(.caption).foregroundStyle(.secondary) }
                if entry.snapshot.today.overdue > 0 { Text("\(entry.snapshot.today.overdue) overdue").font(.caption2).foregroundStyle(.secondary) }
            }
            Spacer(minLength: 0)
            if entry.available { Text(entry.snapshot.savedCaption).font(.system(size: 9)).foregroundStyle(.secondary) }
        }
        .foregroundStyle(ink)
        .containerBackground(for: .widget) { LinearGradient(colors: [mist, cream], startPoint: .topLeading, endPoint: .bottomTrailing) }
        .widgetURL(URL(string: "focusstudio://tasks"))
    }
}
struct FocusView: View {
    var entry: StudioEntry
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            WidgetHeading(title: "ONE THING AT A TIME")
            Text(entry.available ? entry.snapshot.timer.title : "Make room for focus.")
                .font(.caption).lineLimit(2).privacySensitive()
            if entry.snapshot.timer.phase == "running", let end = entry.snapshot.timer.endDate, end > entry.date {
                Text(timerInterval: entry.date...end, countsDown: true, showsHours: false)
                    .font(.system(size: 36, weight: .light, design: .rounded)).monospacedDigit()
            } else if entry.snapshot.timer.phase == "complete" {
                Text("Time to reflect.").font(.title3)
            } else {
                Text(String(format: "%02d:%02d", entry.snapshot.timer.remaining / 60, entry.snapshot.timer.remaining % 60))
                    .font(.system(size: 36, weight: .light, design: .rounded)).monospacedDigit()
            }
            Text(entry.available ? (entry.snapshot.timer.phase == "running" ? "Stay with this one thing." : "Open Studio to begin or reflect.") : "Open Focus Studio first.")
                .font(.caption2).foregroundStyle(.secondary)
            Spacer(minLength: 0)
            if entry.available { Text(entry.snapshot.savedCaption).font(.system(size: 9)).foregroundStyle(.secondary) }
        }
        .foregroundStyle(ink)
        .containerBackground(for: .widget) { LinearGradient(colors: [cream, mist], startPoint: .top, endPoint: .bottomTrailing) }
        .widgetURL(URL(string: "focusstudio://studio"))
    }
}
struct WeekView: View {
    var entry: StudioEntry
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            WidgetHeading(title: "SMALL STEPS ADD UP")
            HStack(alignment: .top, spacing: 24) {
                VStack(alignment: .leading) {
                    Text("\(entry.snapshot.week.minutes)").font(.system(size: 34, weight: .light, design: .rounded))
                    Text("focus minutes").font(.caption2)
                }
                VStack(alignment: .leading) {
                    Text("\(entry.snapshot.week.completed)").font(.system(size: 34, weight: .light, design: .rounded))
                    Text("tasks completed").font(.caption2)
                }
            }
            Text(entry.available ? "Your last seven local calendar days." : "Open Focus Studio to load your progress.")
                .font(.caption2).foregroundStyle(.secondary)
            Spacer(minLength: 0)
            if entry.available { Text(entry.snapshot.savedCaption).font(.system(size: 9)).foregroundStyle(.secondary) }
        }
        .foregroundStyle(ink)
        .containerBackground(for: .widget) { LinearGradient(colors: [mist.opacity(0.7), cream], startPoint: .topLeading, endPoint: .bottomTrailing) }
        .widgetURL(URL(string: "focusstudio://journal"))
    }
}
struct TodayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "FocusStudioToday", provider: StudioProvider()) { TodayView(entry: $0) }
            .configurationDisplayName("Today").description("Your next tasks and daily workload.")
            .supportedFamilies([.systemSmall, .systemMedium])
    }
}
struct FocusWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "FocusStudioFocus", provider: StudioProvider()) { FocusView(entry: $0) }
            .configurationDisplayName("Focus").description("One task and your focus countdown.")
            .supportedFamilies([.systemSmall])
    }
}
struct WeekWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "FocusStudioWeek", provider: StudioProvider()) { WeekView(entry: $0) }
            .configurationDisplayName("Week").description("Focus minutes and completed tasks over seven days.")
            .supportedFamilies([.systemMedium])
    }
}
@main
struct FocusStudioWidgetBundle: WidgetBundle {
    var body: some Widget { TodayWidget(); FocusWidget(); WeekWidget() }
}
