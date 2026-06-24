import numpy as np

def cgne(H, g, max_iter=10, tol=1e-4):
    """
    Conjugate Gradient for Normal Equations (CGNE) algorithm to solve the linear system Hx = g.
    
    Parameters:
    H : numpy.ndarray
        The matrix representing the linear system.
    g : numpy.ndarray
        The right-hand side vector.
    max_iter : int, optional
        Maximum number of iterations (default is 10).
    tol : float, optional
        Tolerance for convergence (default is 1e-4).
    
    Returns:
    x : numpy.ndarray
        The solution vector.
    """
    
    # Initialize variables
    f = np.zeros(H.shape[1], dtype=np.float32)  # Initial guess for the solution
    r = g.copy()                                  # Initial residual: g - H*f0 = g (f0 = 0)
    p = H.T @ r                                   # Initial search direction: p0 = H^T * r0
    r_dot_r = np.dot(r, r)                        # r · r
    prev_r_norm = np.sqrt(r_dot_r)                # ||r||

    final_error = 0.0
    iterations = 0

    for i in range(max_iter):
        iterations = i + 1

        alpha = r_dot_r / np.dot(p, p)  # alpha = r·r / p·p

        f = f + alpha * p                # f_{i+1} = f_i + alpha * p_i
        Hp = H @ p                       # Hp = H * p
        r = r - alpha * Hp               # r_{i+1} = r_i - alpha * H * p_i

        new_r_dot_r = np.dot(r, r)       # new r · r
        current_r_norm = np.sqrt(new_r_dot_r)  # ||r_{i+1}||
        final_error = abs(current_r_norm - prev_r_norm)  # error = | ||r_{i+1}|| - ||r_i|| |

        if final_error < tol:            # stopping criterion
            break

        beta = new_r_dot_r / r_dot_r    # beta = new_r·r / r·r
        HTr = H.T @ r                   # HTr = H^T * r_{i+1}
        p = HTr + beta * p              # p_{i+1} = H^T * r_{i+1} + beta * p_i

        r_dot_r = new_r_dot_r           # update r·r
        prev_r_norm = current_r_norm    # update ||r||

    return f, iterations, final_error