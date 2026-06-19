import Foundation

actor ReconstructionQueue {
    static let shared = ReconstructionQueue()
    
    private var currentActive = 0
    private var queue: [CheckedContinuation<Void, Never>] = []
    
    private init() {}
    
    /// Aguarda permissão para processar.
    func enqueue() async {
        let maxWorkers = await SystemMonitor.shared.getCurrentAllowedWorkers()
        
        if currentActive < maxWorkers {
            currentActive += 1
            return
        }
        
        await withCheckedContinuation { continuation in
            queue.append(continuation)
        }
    }
    
    /// Informa que um processamento terminou. Libera o próximo da fila se houver vaga.
    func dequeue() async {
        currentActive -= 1
        
        let maxWorkers = await SystemMonitor.shared.getCurrentAllowedWorkers()
        
        if currentActive < maxWorkers, !queue.isEmpty {
            currentActive += 1
            let next = queue.removeFirst()
            next.resume()
        }
    }
}
