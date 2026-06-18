import Foundation
import Accelerate

public class CGNE {
    
    public struct Result {
        public let image: [Float]
        public let iterations: Int
        public let finalError: Float
    }
    
    public static func solve(g: [Float], H: ModelMatrix, maxIterations: Int = 10, tolerance: Float = 1e-4) -> Result {
        let S = Int32(H.rows)
        let N = Int32(H.cols)
        
        let S_len = vDSP_Length(S)
        let N_len = vDSP_Length(N)
        
        var f = [Float](repeating: 0.0, count: Int(N))
        var r = g
        var p = [Float](repeating: 0.0, count: Int(N))
        
        // p_0 = H^T * r_0
        cblas_sgemv(CblasRowMajor, CblasTrans, S, N, 1.0, H.data, N, r, 1, 0.0, &p, 1)
        
        var r_dot_r: Float = 0.0
        vDSP_dotpr(r, 1, r, 1, &r_dot_r, S_len)
        var prev_r_norm = sqrt(r_dot_r)
        
        var Hp = [Float](repeating: 0.0, count: Int(S))
        var HTr = [Float](repeating: 0.0, count: Int(N))
        
        var currentError: Float = 0.0
        var iter = 0
        
        for i in 0..<maxIterations {
            iter = i + 1
            
            var p_dot_p: Float = 0.0
            vDSP_dotpr(p, 1, p, 1, &p_dot_p, N_len)
            
            var alpha = r_dot_r / p_dot_p
            
            // f_{i+1} = f_i + alpha * p_i
            vDSP_vsma(p, 1, &alpha, f, 1, &f, 1, N_len)
            
            // Hp = H * p
            cblas_sgemv(CblasRowMajor, CblasNoTrans, S, N, 1.0, H.data, N, p, 1, 0.0, &Hp, 1)
            
            // r_{i+1} = r_i - alpha * Hp
            var negAlpha = -alpha
            vDSP_vsma(Hp, 1, &negAlpha, r, 1, &r, 1, S_len)
            
            // new_r_dot_r
            var new_r_dot_r: Float = 0.0
            vDSP_dotpr(r, 1, r, 1, &new_r_dot_r, S_len)
            
            let current_r_norm = sqrt(new_r_dot_r)
            currentError = abs(current_r_norm - prev_r_norm)
            
            if currentError < tolerance {
                break
            }
            
            let beta = new_r_dot_r / r_dot_r
            
            // HTr = H^T * r_{i+1}
            cblas_sgemv(CblasRowMajor, CblasTrans, S, N, 1.0, H.data, N, r, 1, 0.0, &HTr, 1)
            
            // p_{i+1} = HTr + beta * p_i
            // using vsma: p_new = p_old * beta + HTr
            var betaVar = beta
            vDSP_vsma(p, 1, &betaVar, HTr, 1, &p, 1, N_len)
            
            r_dot_r = new_r_dot_r
            prev_r_norm = current_r_norm
        }
        
        return Result(image: f, iterations: iter, finalError: currentError)
    }
}
