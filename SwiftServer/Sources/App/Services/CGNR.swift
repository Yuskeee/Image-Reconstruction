import Foundation
import Accelerate

public class CGNR {
    
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
        var z = [Float](repeating: 0.0, count: Int(N))
        
        // z_0 = H^T * r_0
        cblas_sgemv(CblasRowMajor, CblasTrans, S, N, 1.0, H.data, N, r, 1, 0.0, &z, 1)
        
        var p = z
        var w = [Float](repeating: 0.0, count: Int(S))
        
        var r_dot_r: Float = 0.0
        vDSP_dotpr(r, 1, r, 1, &r_dot_r, S_len)
        var prev_r_norm = sqrt(r_dot_r)
        
        var z_dot_z: Float = 0.0
        vDSP_dotpr(z, 1, z, 1, &z_dot_z, N_len)
        
        var currentError: Float = 0.0
        var iter = 0
        
        for i in 0..<maxIterations {
            iter = i + 1
            
            // w_i = H * p_i
            cblas_sgemv(CblasRowMajor, CblasNoTrans, S, N, 1.0, H.data, N, p, 1, 0.0, &w, 1)
            
            var w_dot_w: Float = 0.0
            vDSP_dotpr(w, 1, w, 1, &w_dot_w, S_len)
            
            var alpha = z_dot_z / w_dot_w
            
            // f_{i+1} = f_i + alpha * p_i
            vDSP_vsma(p, 1, &alpha, f, 1, &f, 1, N_len)
            
            // r_{i+1} = r_i - alpha * w_i
            var negAlpha = -alpha
            vDSP_vsma(w, 1, &negAlpha, r, 1, &r, 1, S_len)
            
            // Error based on r
            var new_r_dot_r: Float = 0.0
            vDSP_dotpr(r, 1, r, 1, &new_r_dot_r, S_len)
            
            let current_r_norm = sqrt(new_r_dot_r)
            currentError = abs(current_r_norm - prev_r_norm)
            
            if currentError < tolerance {
                break
            }
            prev_r_norm = current_r_norm
            
            // z_{i+1} = H^T * r_{i+1}
            cblas_sgemv(CblasRowMajor, CblasTrans, S, N, 1.0, H.data, N, r, 1, 0.0, &z, 1)
            
            var new_z_dot_z: Float = 0.0
            vDSP_dotpr(z, 1, z, 1, &new_z_dot_z, N_len)
            
            let beta = new_z_dot_z / z_dot_z
            
            // p_{i+1} = z_{i+1} + beta * p_i
            // p_new = p_old * beta + z_new
            var betaVar = beta
            vDSP_vsma(p, 1, &betaVar, z, 1, &p, 1, N_len)
            
            z_dot_z = new_z_dot_z
        }
        
        return Result(image: f, iterations: iter, finalError: currentError)
    }
}
