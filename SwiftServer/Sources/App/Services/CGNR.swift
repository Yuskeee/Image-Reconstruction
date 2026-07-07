import Foundation
import Accelerate

public class CGNR {
    
    public struct Result {
        public let image: [Double]
        public let iterations: Int
        public let finalError: Double
    }
    
    public static func solve(g: [Double], H: ModelMatrix, maxIterations: Int = 10, tolerance: Double = 1e-4) -> Result {
        let S = Int32(H.rows)
        let N = Int32(H.cols)
        
        let S_len = vDSP_Length(S)
        let N_len = vDSP_Length(N)
        
        var g_norm: Double = 0.0
        vDSP_svesqD(g, 1, &g_norm, S_len)
        g_norm = sqrt(g_norm)
        
        if g_norm < 1e-30 {
            return Result(image: [Double](repeating: 0.0, count: Int(N)), iterations: 0, finalError: 0.0)
        }
        
        var r = [Double](repeating: 0.0, count: Int(S))
        var inv_g_norm = 1.0 / g_norm
        vDSP_vsmulD(g, 1, &inv_g_norm, &r, 1, S_len)
        
        var f = [Double](repeating: 0.0, count: Int(N))
        
        let z = H.multiplyTranspose(vector: r)
        
        let absZ = z.map { abs($0) }
        var maxAbsZ: Double = 0.0
        vDSP_maxvD(absZ, 1, &maxAbsZ, N_len)
        let lam = maxAbsZ * 0.10
        
        var s = z
        var p = s
        
        var norm_s: Double = 0.0
        vDSP_dotprD(s, 1, s, 1, &norm_s, N_len)
        
        var r_dot_r: Double = 0.0
        vDSP_dotprD(r, 1, r, 1, &r_dot_r, S_len)
        var prev_r_norm = sqrt(r_dot_r)
        
        var currentError: Double = 0.0
        var iter = 0
        
        for i in 0..<maxIterations {
            iter = i + 1
            
            let q = H.multiply(vector: p)
            
            var q_dot_q: Double = 0.0
            vDSP_dotprD(q, 1, q, 1, &q_dot_q, S_len)
            
            var p_dot_p: Double = 0.0
            vDSP_dotprD(p, 1, p, 1, &p_dot_p, N_len)
            
            let q_norm = q_dot_q + lam * p_dot_p
            var alpha = norm_s / q_norm
            
            vDSP_vsmaD(p, 1, &alpha, f, 1, &f, 1, N_len)
            
            var negAlpha = -alpha
            vDSP_vsmaD(q, 1, &negAlpha, r, 1, &r, 1, S_len)
            
            var new_r_dot_r: Double = 0.0
            vDSP_dotprD(r, 1, r, 1, &new_r_dot_r, S_len)
            
            let current_r_norm = sqrt(new_r_dot_r)
            currentError = abs(current_r_norm - prev_r_norm)
            
            if currentError < tolerance {
                break
            }
            prev_r_norm = current_r_norm
            
            let HTr = H.multiplyTranspose(vector: r)
            var negLam = -lam
            vDSP_vsmaD(f, 1, &negLam, HTr, 1, &s, 1, N_len)
            
            var new_norm_s: Double = 0.0
            vDSP_dotprD(s, 1, s, 1, &new_norm_s, N_len)
            
            let beta = new_norm_s / norm_s
            var betaVar = beta
            vDSP_vsmaD(p, 1, &betaVar, s, 1, &p, 1, N_len)
            
            norm_s = new_norm_s
        }
        
        vDSP_vsmulD(f, 1, &g_norm, &f, 1, N_len)
        
        return Result(image: f, iterations: iter, finalError: currentError)
    }
}
