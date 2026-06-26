import Accelerate

// Métrica cega de nitidez (No-Reference) baseada na variância do Laplaciano.
// Quanto maior o valor retornado, mais nítida é a imagem reconstruída.
func laplacianVariance(_ f: [Float]) -> Float {
    let size = Int(sqrt(Double(f.count)))

    // normaliza para [0, 255] para que o filtro opere em escala padrão
    var minVal: Float = 0
    var maxVal: Float = 0
    vDSP_minv(f, 1, &minVal, vDSP_Length(f.count))
    vDSP_maxv(f, 1, &maxVal, vDSP_Length(f.count))

    let range = maxVal - minVal
    guard range > 0 else { return 0.0 } // imagem constante não tem nitidez mensurável

    var normalized = [Float](repeating: 0, count: f.count)
    var shift = -minVal
    var scale = 255.0 / range
    vDSP_vsadd(f, 1, &shift, &normalized, 1, vDSP_Length(f.count))
    vDSP_vsmul(normalized, 1, &scale, &normalized, 1, vDSP_Length(f.count))

    // aplica o filtro Laplaciano discreto — kernel: vizinhos N/S/L/O - 4×centro
    var filtered = [Float]()
    filtered.reserveCapacity((size - 2) * (size - 2))

    for row in 1..<(size - 1) {
        for col in 1..<(size - 1) {
            let center = normalized[row * size + col]
            let top    = normalized[(row - 1) * size + col]
            let bottom = normalized[(row + 1) * size + col]
            let left   = normalized[row * size + (col - 1)]
            let right  = normalized[row * size + (col + 1)]
            filtered.append(top + bottom + left + right - 4 * center)
        }
    }

    // variância = E[X²] - E[X]²
    var mean: Float = 0
    var meanSquare: Float = 0
    vDSP_meanv(filtered, 1, &mean, vDSP_Length(filtered.count))
    vDSP_measqv(filtered, 1, &meanSquare, vDSP_Length(filtered.count))
    return meanSquare - mean * mean
}
