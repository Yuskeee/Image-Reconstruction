import Vapor
import Foundation

struct CustomLogMiddleware: AsyncMiddleware {
    func respond(to request: Request, chainingTo next: AsyncResponder) async throws -> Response {
        let method = request.method.string
        let path = request.url.path
        await LogStore.shared.add("Requisição HTTP recebida: \(method) \(path)")
        
        do {
            let response = try await next.respond(to: request)
            // Não logar requisições para /logs para evitar poluir o próprio endpoint de logs com ele mesmo
            if path != "/logs" {
                await LogStore.shared.add("Resposta para \(method) \(path) finalizada com status \(response.status.code)")
            }
            return response
        } catch {
            await LogStore.shared.add("Erro ao processar \(method) \(path): \(error.localizedDescription)")
            throw error
        }
    }
}

// configures your application
public func configure(_ app: Application) throws {
    // Configure JSON to use ISO8601 standard for Dates
    let encoder = JSONEncoder()
    encoder.dateEncodingStrategy = .iso8601
    
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    
    ContentConfiguration.global.use(encoder: encoder, for: .json)
    ContentConfiguration.global.use(decoder: decoder, for: .json)

    // Intercept all requests for our LogStore
    app.middleware.use(CustomLogMiddleware())

    // register routes
    try routes(app)

    // Pre-carregar as matrizes na memória
    Task {
        do {
            await LogStore.shared.add("Iniciando pre-loading das matrizes em background...")
            await SystemMonitor.shared.startMonitoring()
            _ = try await MatrixManager.shared.getMatrix(named: "H-1")
            _ = try await MatrixManager.shared.getMatrix(named: "H-2")
            await LogStore.shared.add("Pre-loading concluído. Ambas as matrizes estão na memória.")
        } catch {
            await LogStore.shared.add("Falha ao pre-carregar matrizes: \(error.localizedDescription)")
        }
    }
}
