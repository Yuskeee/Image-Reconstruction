import Foundation

public struct ModelMatrix {
    public let values: [Double]
    public let colIndices: [Int32]
    public let rowPointers: [Int32]
    public let rows: Int
    public let cols: Int
    
    public func multiply(vector x: [Double]) -> [Double] {
        var y = [Double](repeating: 0.0, count: rows)
        
        values.withUnsafeBufferPointer { vPtr in
            colIndices.withUnsafeBufferPointer { cPtr in
                rowPointers.withUnsafeBufferPointer { rPtr in
                    x.withUnsafeBufferPointer { xPtr in
                        y.withUnsafeMutableBufferPointer { yPtr in
                            for i in 0..<rows {
                                let start = Int(rPtr[i])
                                let end = Int(rPtr[i + 1])
                                var sum = 0.0
                                for j in start..<end {
                                    sum += vPtr[j] * xPtr[Int(cPtr[j])]
                                }
                                yPtr[i] = sum
                            }
                        }
                    }
                }
            }
        }
        return y
    }
    
    public func multiplyTranspose(vector x: [Double]) -> [Double] {
        var y = [Double](repeating: 0.0, count: cols)
        
        values.withUnsafeBufferPointer { vPtr in
            colIndices.withUnsafeBufferPointer { cPtr in
                rowPointers.withUnsafeBufferPointer { rPtr in
                    x.withUnsafeBufferPointer { xPtr in
                        y.withUnsafeMutableBufferPointer { yPtr in
                            for i in 0..<rows {
                                let start = Int(rPtr[i])
                                let end = Int(rPtr[i + 1])
                                let xi = xPtr[i]
                                for j in start..<end {
                                    yPtr[Int(cPtr[j])] += vPtr[j] * xi
                                }
                            }
                        }
                    }
                }
            }
        }
        return y
    }
}

public actor MatrixManager {
    public static let shared = MatrixManager()
    
    private var matrices: [String: ModelMatrix] = [:]
    
    private init() {}
    
    public func getMatrix(named name: String) async throws -> ModelMatrix {
        if let matrix = matrices[name] {
            return matrix
        }
        
        let binPath = "../Data/\(name).bin"
        if FileManager.default.fileExists(atPath: binPath) {
            await LogStore.shared.add("Carregando matriz esparsa \(name) do arquivo binário super-rápido...")
            
            let data = try Data(contentsOf: URL(fileURLWithPath: binPath), options: .mappedIfSafe)
            var offset = 0
            
            let rowsTotal = Int(data.subdata(in: offset..<offset+8).withUnsafeBytes { $0.load(as: Int64.self) })
            offset += 8
            let colsTotal = Int(data.subdata(in: offset..<offset+8).withUnsafeBytes { $0.load(as: Int64.self) })
            offset += 8
            let nnz = Int(data.subdata(in: offset..<offset+8).withUnsafeBytes { $0.load(as: Int64.self) })
            offset += 8
            
            let values = [Double](unsafeUninitializedCapacity: nnz) { buffer, initializedCount in
                let size = nnz * MemoryLayout<Double>.stride
                data.withUnsafeBytes { ptr in
                    memcpy(buffer.baseAddress!, ptr.baseAddress! + offset, size)
                }
                initializedCount = nnz
            }
            offset += nnz * MemoryLayout<Double>.stride
            
            let colIndices = [Int32](unsafeUninitializedCapacity: nnz) { buffer, initializedCount in
                let size = nnz * MemoryLayout<Int32>.stride
                data.withUnsafeBytes { ptr in
                    memcpy(buffer.baseAddress!, ptr.baseAddress! + offset, size)
                }
                initializedCount = nnz
            }
            offset += nnz * MemoryLayout<Int32>.stride
            
            let rowPointersCount = rowsTotal + 1
            let rowPointers = [Int32](unsafeUninitializedCapacity: rowPointersCount) { buffer, initializedCount in
                let size = rowPointersCount * MemoryLayout<Int32>.stride
                data.withUnsafeBytes { ptr in
                    memcpy(buffer.baseAddress!, ptr.baseAddress! + offset, size)
                }
                initializedCount = rowPointersCount
            }
            
            let matrix = ModelMatrix(values: values, colIndices: colIndices, rowPointers: rowPointers, rows: rowsTotal, cols: colsTotal)
            matrices[name] = matrix
            await LogStore.shared.add("Matriz \(name) carregada com sucesso do binário em ms.")
            return matrix
        }
        
        let path = "../Data/\(name).csv"
        guard let filePointer = fopen(path, "r") else {
            throw MatrixError.notFound(name)
        }
        defer { fclose(filePointer) }
        
        await LogStore.shared.add("Carregando matriz esparsa \(name) do disco (isso pode levar alguns instantes)...")
        
        var values = [Double]()
        var colIndices = [Int32]()
        var rowPointers = [Int32]()
        
        values.reserveCapacity(27640822) // Max non-zeros we expect
        colIndices.reserveCapacity(27640822)
        rowPointers.reserveCapacity(50817)
        
        var rowsTotal = 0
        var colsTotal = 0
        var currentRow = -1
        
        var lineByteArray: UnsafeMutablePointer<CChar>? = nil
        var lineCap: Int = 0
        defer { free(lineByteArray) }
        
        var isFirstLine = true
        
        while getline(&lineByteArray, &lineCap, filePointer) > 0 {
            if let lineStr = String(cString: lineByteArray!, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines), !lineStr.isEmpty {
                if isFirstLine {
                    let parts = lineStr.split(separator: ",")
                    rowsTotal = Int(parts[0])!
                    colsTotal = Int(parts[1])!
                    rowPointers.append(0)
                    currentRow = 0
                    isFirstLine = false
                    continue
                }
                
                let parts = lineStr.split(separator: ",")
                if parts.count >= 3 {
                    let r = Int(parts[0])!
                    let c = Int32(parts[1])!
                    let v = Double(parts[2])!
                    
                    while currentRow < r {
                        rowPointers.append(Int32(values.count))
                        currentRow += 1
                    }
                    values.append(v)
                    colIndices.append(c)
                }
            }
        }
        
        while currentRow < rowsTotal {
            rowPointers.append(Int32(values.count))
            currentRow += 1
        }
        
        let matrix = ModelMatrix(values: values, colIndices: colIndices, rowPointers: rowPointers, rows: rowsTotal, cols: colsTotal)
        matrices[name] = matrix
        await LogStore.shared.add("Matriz \(name) carregada com sucesso do CSV. Dimensões: \(rowsTotal)x\(colsTotal) (\(values.count) elementos não-zero).")
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
