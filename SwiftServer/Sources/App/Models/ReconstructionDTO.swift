import Vapor

struct ReconstructionRequest: Content {
    let algorithm: String // "CGNE" ou "CGNR"
    let signal: [Float] // Vector g
}

struct ReconstructionResponse: Content {
    let algorithm: String
    let startTime: Date
    let endTime: Date
    let imageSize: Int
    let iterations: Int
    let image: [Float] // Vector f
    let finalError: Float
    let sharpness: Float // variância do Laplaciano — métrica de nitidez
    let message: String
}

struct ReconstructionError: Content {
    let error: Bool
    let reason: String
}
