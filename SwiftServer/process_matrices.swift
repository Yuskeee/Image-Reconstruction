import Foundation
import Accelerate

// MARK: - Funções Auxiliares

func readCSV(atPath path: String) -> [[Float]] {
    guard let content = try? String(contentsOfFile: path, encoding: .utf8) else {
        print("Erro ao ler o arquivo: \(path)")
        return []
    }
    
    let rows = content.trimmingCharacters(in: .whitespacesAndNewlines).components(separatedBy: "\n")
    return rows.map { row in
        row.components(separatedBy: ";")
           .compactMap { Float($0.replacingOccurrences(of: ",", with: ".")) }
    }
}

func printMatrix(_ matrix: [Float], rows: Int, cols: Int, label: String) {
    print("\(label):")
    for r in 0..<rows {
        let start = r * cols
        let end = start + cols
        let row = matrix[start..<end].map { String(format: "%.2f", $0) }.joined(separator: " ")
        print("[ \(row) ]")
    }
    print()
}

// MARK: - Carregamento de Dados

let baseDir = "dados"
let mData = readCSV(atPath: "\(baseDir)/M.csv")
let nData = readCSV(atPath: "\(baseDir)/N.csv")
let aData = readCSV(atPath: "\(baseDir)/a.csv")

// Dimensões
let mRows = Int32(mData.count)
let mCols = Int32(mData.first?.count ?? 0)
let nRows = Int32(nData.count)
let nCols = Int32(nData.first?.count ?? 0)

// Dimensões de a
let aRows = Int32(aData.count)
let aCols = Int32(aData.first?.count ?? 0)

// Achatar as matrizes para arrays lineares
let M = mData.flatMap { $0 }
let N = nData.flatMap { $0 }
let a = aData.flatMap { $0 }

print("Dimensões de M: \(mRows)x\(mCols)")
print("Dimensões de N: \(nRows)x\(nCols)")
print("Dimensões de a: \(aRows)x\(aCols)")
print()

// MARK: - Operação 1: M * N

print("--- Operação: M * N ---")
if mCols == nRows {
    var resultMN = [Float](repeating: 0.0, count: Int(mRows * nCols))
    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, mRows, nCols, mCols, 1.0, M, mCols, N, nCols, 0.0, &resultMN, nCols)
    printMatrix(resultMN, rows: Int(mRows), cols: Int(nCols), label: "Resultado de M * N")
} else {
    print("ERRO: Dimensões incompatíveis para M * N: (\(mRows)x\(mCols)) e (\(nRows)x\(nCols))")
}

// MARK: - Operação 2: a * M

print("--- Operação: a * M ---")
if aCols == mRows {
    var result_aM = [Float](repeating: 0.0, count: Int(aRows * mCols))
    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, aRows, mCols, aCols, 1.0, a, aCols, M, mCols, 0.0, &result_aM, mCols)
    printMatrix(result_aM, rows: Int(aRows), cols: Int(mCols), label: "Resultado de a * M")
} else {
    print("ERRO: Dimensões incompatíveis para a * M: (\(aRows)x\(aCols)) e (\(mRows)x\(mCols))")
}

// MARK: - Operação 3: M * a

print("--- Operação: M * a ---")
if mCols == aRows {
    var result_Ma = [Float](repeating: 0.0, count: Int(mRows * aCols))
    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, mRows, aCols, mCols, 1.0, M, mCols, a, aCols, 0.0, &result_Ma, aCols)
    printMatrix(result_Ma, rows: Int(mRows), cols: Int(aCols), label: "Resultado de M * a")
} else {
    print("ERRO: Dimensões incompatíveis para M * a: (\(mRows)x\(mCols)) e (\(aRows)x\(aCols))")
}
