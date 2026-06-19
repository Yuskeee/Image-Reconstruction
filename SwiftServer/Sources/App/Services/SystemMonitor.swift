import Foundation
import Vapor

struct SystemMetrics: Content, Sendable {
    let timestamp: Date
    let cpuPercent: Double
    let memoryPercent: Double
    let maxWorkersAllowed: Int
}

actor SystemMonitor {
    static let shared = SystemMonitor()
    
    private var history: [SystemMetrics] = []
    
    // Limits
    private let cpuThreshold = 80.0
    private let memoryThreshold = 80.0
    private let absoluteMaxWorkers = 4
    private let fallbackMinWorkers = 1
    
    // Mach state for CPU
    private var previousInfo = host_cpu_load_info()
    
    private init() {}
    
    func startMonitoring() {
        // Inicializa o previousInfo
        _ = getCPUUsage()
        
        Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 1_000_000_000) // 1 segundo
                await self.poll()
            }
        }
    }
    
    private func poll() {
        let cpu = getCPUUsage()
        let mem = getMemoryUsage()
        
        let cpuPercent = cpu * 100.0
        let memPercent = mem * 100.0
        
        // Determine allowed workers
        var allowed = absoluteMaxWorkers
        if cpuPercent > cpuThreshold || memPercent > memoryThreshold {
            allowed = fallbackMinWorkers
        }
        
        let metric = SystemMetrics(
            timestamp: Date(),
            cpuPercent: cpuPercent,
            memoryPercent: memPercent,
            maxWorkersAllowed: allowed
        )
        
        history.append(metric)
        
        // Mantém os últimos 60 segundos
        if history.count > 60 {
            history.removeFirst()
        }
    }
    
    func getMetricsHistory() -> [SystemMetrics] {
        return history
    }
    
    func getCurrentAllowedWorkers() -> Int {
        return history.last?.maxWorkersAllowed ?? absoluteMaxWorkers
    }
    
    private func getCPUUsage() -> Double {
        var size = mach_msg_type_number_t(MemoryLayout<host_cpu_load_info_data_t>.size / MemoryLayout<integer_t>.size)
        var info = host_cpu_load_info()
        
        let result = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(size)) {
                host_statistics(mach_host_self(), HOST_CPU_LOAD_INFO, $0, &size)
            }
        }
        
        if result != KERN_SUCCESS { return 0.0 }
        
        let userDiff = Double(info.cpu_ticks.0 - previousInfo.cpu_ticks.0)
        let sysDiff  = Double(info.cpu_ticks.1 - previousInfo.cpu_ticks.1)
        let idleDiff = Double(info.cpu_ticks.2 - previousInfo.cpu_ticks.2)
        let niceDiff = Double(info.cpu_ticks.3 - previousInfo.cpu_ticks.3)
        
        let totalTicks = userDiff + sysDiff + idleDiff + niceDiff
        previousInfo = info
        
        if totalTicks == 0 { return 0.0 }
        
        // CPU em uso é tudo menos idle
        return (userDiff + sysDiff + niceDiff) / totalTicks
    }
    
    private func getMemoryUsage() -> Double {
        var size64 = mach_msg_type_number_t(MemoryLayout<vm_statistics64_data_t>.size / MemoryLayout<integer_t>.size)
        var info64 = vm_statistics64()
        
        let result64 = withUnsafeMutablePointer(to: &info64) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(size64)) {
                host_statistics64(mach_host_self(), HOST_VM_INFO64, $0, &size64)
            }
        }
        
        if result64 != KERN_SUCCESS { return 0.0 }
        
        var pageSize: vm_size_t = 0
        host_page_size(mach_host_self(), &pageSize)
        
        let active = UInt64(info64.active_count)
        let wire = UInt64(info64.wire_count)
        let spec = UInt64(info64.speculative_count)
        
        let usedBytes = (active + wire + spec) * UInt64(pageSize)
        let total = ProcessInfo.processInfo.physicalMemory
        
        return Double(usedBytes) / Double(total)
    }
}
