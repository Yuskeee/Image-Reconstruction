import Foundation

public struct ModelMatrix {
    public let data: [Float]
    public let rows: Int
    public let cols: Int
}

public actor MatrixManager {
    public static let shared = MatrixManager()
    
    private var matrices: [String: ModelMatrix] = [:]
    
    private init() {}
    
    public func getMatrix(named name: String) async throws -> ModelMatrix {
        if let matrix = matrices[name] {
            return matrix
        }
        
        let path = "Dados/\(name).csv"
        guard let filePointer = fopen(path, "r") else {
            throw MatrixError.notFound(name)
        }
        defer { fclose(filePointer) }
        
        await LogStore.shared.add("Carregando matriz \(name) do disco (isso pode levar alguns instantes)...")
        
        var matrixData: [Float] = []
        // Generous reserve to avoid reallocations
        matrixData.reserveCapacity(2000000) 
        var cols = 0
        var rowsCount = 0
        
        var lineByteArray: UnsafeMutablePointer<CChar>? = nil
        var lineCap: Int = 0
        defer { free(lineByteArray) }
        
        var isCommaSeparated = false
        var firstLine = true
        
        while getline(&lineByteArray, &lineCap, filePointer) > 0 {
            if let lineStr = String(cString: lineByteArray!, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines), !lineStr.isEmpty {
                
                if firstLine {
                    isCommaSeparated = lineStr.contains(",") && !lineStr.contains(";")
                    firstLine = false
                }
                
                let separator: Character = isCommaSeparated ? "," : ";"
                let parts = lineStr.split(separator: separator)
                
                let values = parts.compactMap { part -> Float? in
                    let str = isCommaSeparated ? String(part) : String(part).replacingOccurrences(of: ",", with: ".")
                    return Float(str)
                }
                
                if cols == 0 {
                    cols = values.count
                }
                matrixData.append(contentsOf: values)
                rowsCount += 1
            }
        }
        
        let matrix = ModelMatrix(data: matrixData, rows: rowsCount, cols: cols)
        matrices[name] = matrix
        await LogStore.shared.add("Matriz \(name) carregada com sucesso. Dimensões: \(rowsCount)x\(cols).")
        return matrix
    }
}

enum MatrixError: Error, CustomStringConvertible {
    case notFound(String)
    
    var description: String {
        switch self {
        case .notFound(let name):
            return "Matrix file \(name).csv not found in Dados/ directory."
        }
    }
}
