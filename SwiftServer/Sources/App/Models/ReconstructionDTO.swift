import Vapor

struct ReconstructionRequest: Content {
    let algorithm: String // "CGNE" ou "CGNR"
    let signal: [Double] // Vector g
}

struct ReconstructionResponse: Content {
    let algorithm: String
    let startTime: Date
    let endTime: Date
    let imageSize: Int
    let iterations: Int
    let image: [Double] // Vector f
    let finalError: Double
    let message: String
}

struct ReconstructionError: Content {
    let error: Bool
    let reason: String
}
