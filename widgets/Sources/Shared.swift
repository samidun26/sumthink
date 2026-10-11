import Foundation
import Darwin

struct Snapshot: Codable {
    struct Today: Codable {
        var remaining: Int
        var completed: Int
        var minutes: Int
        var overdue: Int
        var tasks: [TaskItem]
    }
    struct TaskItem: Codable, Identifiable {
        var id: String
        var title: String
        var project: String
        var estimate: Int
        var priority: String
    }
    struct FocusTimer: Codable {
        var phase: String
        var remaining: Int
        var duration: Int
        var endAt: String?
        var title: String
        var endDate: Date? { endAt.flatMap(Snapshot.date) }
    }
    struct Week: Codable {
        var minutes: Int
        var completed: Int
        var sessions: Int
    }
    var version: Int
    var generatedAt: String
    var day: String
    var today: Today
    var timer: FocusTimer
    var week: Week

    static var fileURL: URL {
        // NSHomeDirectory() points at the app sandbox container. getpwuid
        // provides the real user home; the entitlement grants only this file.
        let home = getpwuid(getuid()).map { String(cString: $0.pointee.pw_dir) } ?? NSHomeDirectory()
        return URL(fileURLWithPath: home).appendingPathComponent("Library/Application Support/Focus Studio/widget-snapshot.json")
    }
    static func load() -> Snapshot? {
        guard let attributes = try? FileManager.default.attributesOfItem(atPath: fileURL.path),
              let size = attributes[.size] as? NSNumber, size.intValue <= 128 * 1024,
              let data = try? Data(contentsOf: fileURL), data.count <= 128 * 1024,
              let value = try? JSONDecoder().decode(Snapshot.self, from: data), value.version == 1 else { return nil }
        return value
    }
    static func date(_ string: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: string) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: string)
    }
    var isCurrentDay: Bool {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return day == formatter.string(from: Date())
    }
    var savedCaption: String {
        guard let date = Snapshot.date(generatedAt) else { return "Open Focus Studio first." }
        return "Saved " + date.formatted(date: isCurrentDay ? .omitted : .abbreviated, time: .shortened)
    }
    var reloadKey: String {
        "\(day)|\(today.remaining)|\(today.completed)|\(today.minutes)|\(today.overdue)|\(today.tasks.map { $0.id + $0.title + $0.project + String($0.estimate) + $0.priority }.joined())|\(timer.phase)|\(timer.endAt ?? "")|\(timer.title)|\(timer.duration)|\(timer.phase == "running" ? 0 : timer.remaining)|\(week.minutes)|\(week.completed)|\(week.sessions)"
    }
    var finishedTimer: Snapshot {
        var copy = self
        copy.timer.phase = "complete"
        copy.timer.remaining = 0
        copy.timer.endAt = nil
        return copy
    }
    static let empty = Snapshot(version: 1, generatedAt: "", day: "",
        today: Today(remaining: 0, completed: 0, minutes: 0, overdue: 0, tasks: []),
        timer: FocusTimer(phase: "idle", remaining: 1500, duration: 1500, endAt: nil, title: "Make room for one thing."),
        week: Week(minutes: 0, completed: 0, sessions: 0))
}
