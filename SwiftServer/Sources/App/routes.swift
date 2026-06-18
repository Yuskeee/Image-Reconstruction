import Vapor

func routes(_ app: Application) throws {
    app.get("logs") { req async -> [String] in
        return await LogStore.shared.getAll()
    }

    app.webSocket("reconstruct", maxFrameSize: WebSocketMaxFrameSize(integerLiteral: 1 << 24)) { req, ws in
        ws.onText { ws, text in
            Task {
                do {
                    await LogStore.shared.add("Nova requisição WebSocket recebida na rota /reconstruct. Tamanho: \(text.count) caracteres")
                    let decoder = JSONDecoder()
                    decoder.dateDecodingStrategy = .iso8601
                    let input = try decoder.decode(ReconstructionRequest.self, from: Data(text.utf8))
                    
                    let startTime = Date()
                    let algorithm = input.algorithm.uppercased()
                    let signal = input.signal
                    
                    // Auto-detect matrix name based on signal length
                    let matrixName: String
                    if signal.count == 50816 {
                        matrixName = "H-1"
                        await LogStore.shared.add("Tamanho do sinal (50816) detectado. Selecionando matriz H-1 (60x60).")
                    } else if signal.count == 27904 {
                        matrixName = "H-2"
                        await LogStore.shared.add("Tamanho do sinal (27904) detectado. Selecionando matriz H-2 (30x30).")
                    } else {
                        let msg = "Tamanho de sinal inválido: \(signal.count). Esperado 50816 ou 27904."
                        await LogStore.shared.add("Erro: \(msg)")
                        let errorMsg = ReconstructionError(error: true, reason: msg)
                        let errData = try JSONEncoder().encode(errorMsg)
                        try await ws.send(String(data: errData, encoding: .utf8) ?? "")
                        try await ws.close()
                        return
                    }
                    
                    let matrix: ModelMatrix
                    do {
                        matrix = try await MatrixManager.shared.getMatrix(named: matrixName)
                    } catch MatrixError.notFound(let name) {
                        let msg = "Matrix \(name) not found on the server."
                        await LogStore.shared.add("Erro: \(msg)")
                        let errorMsg = ReconstructionError(error: true, reason: msg)
                        let errData = try JSONEncoder().encode(errorMsg)
                        try await ws.send(String(data: errData, encoding: .utf8) ?? "")
                        try await ws.close()
                        return
                    }
                    
                    await LogStore.shared.add("Iniciando algoritmo \(algorithm)...")
                    var iterations = 0
                    var finalError: Float = 0.0
                    var image: [Float] = []
                    let message = "Success"
                    
                    if algorithm == "CGNE" {
                        let result = CGNE.solve(g: signal, H: matrix)
                        image = result.image
                        iterations = result.iterations
                        finalError = result.finalError
                    } else if algorithm == "CGNR" {
                        let result = CGNR.solve(g: signal, H: matrix)
                        image = result.image
                        iterations = result.iterations
                        finalError = result.finalError
                    } else {
                        let msg = "Unknown algorithm: \(algorithm)"
                        await LogStore.shared.add("Erro: \(msg)")
                        let errorMsg = ReconstructionError(error: true, reason: msg)
                        let errData = try JSONEncoder().encode(errorMsg)
                        try await ws.send(String(data: errData, encoding: .utf8) ?? "")
                        try await ws.close()
                        return
                    }
                    
                    let endTime = Date()
                    await LogStore.shared.add("Algoritmo \(algorithm) finalizado em \(iterations) iterações com erro de \(finalError).")
                    
                    let responsePayload = ReconstructionResponse(
                        algorithm: algorithm,
                        startTime: startTime,
                        endTime: endTime,
                        imageSize: matrix.cols,
                        iterations: iterations,
                        image: image,
                        finalError: finalError,
                        message: message
                    )
                    
                    let encoder = JSONEncoder()
                    let formatter = ISO8601DateFormatter()
                    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                    encoder.dateEncodingStrategy = .custom { date, encoder in
                        var container = encoder.singleValueContainer()
                        try container.encode(formatter.string(from: date))
                    }
                    
                    let responseData = try encoder.encode(responsePayload)
                    try await ws.send(String(data: responseData, encoding: .utf8) ?? "")
                    
                    // Close connection after sending success payload
                    try await ws.close()
                    await LogStore.shared.add("Resultado enviado com sucesso e conexão WebSocket encerrada.")
                    
                } catch {
                    await LogStore.shared.add("Erro interno: \(error.localizedDescription)")
                    let errorMsg = ReconstructionError(error: true, reason: "Invalid JSON or Internal Error: \(error.localizedDescription)")
                    if let errData = try? JSONEncoder().encode(errorMsg) {
                        try? await ws.send(String(data: errData, encoding: .utf8) ?? "")
                    }
                    try? await ws.close()
                }
            }
        }
    }
}
