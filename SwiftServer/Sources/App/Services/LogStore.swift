import Foundation

public actor LogStore {
    public static let shared = LogStore()
    
    private var logs: [String] = []
    
    private init() {}
    
    public func add(_ message: String) {
        let formatter = ISO8601DateFormatter()
        let timestamp = formatter.string(from: Date())
        let logLine = "[\(timestamp)] \(message)"
        logs.append(logLine)
        print(logLine)
        
        if logs.count > 1000 {
            logs.removeFirst(logs.count - 1000)
        }
    }
    
    public func getAll() -> [String] {
        return logs
    }
}
