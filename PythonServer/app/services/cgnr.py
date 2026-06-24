import numpy as np

def cgnr(H, g, max_iter=10, tol=1e-4):
    """
    Conjugate Gradient for Normal Residual (CGNR) algorithm to solve the linear system Hx = g.

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
    Tuple of (f, iterations, final_error)
    """

    # Initialize variables
    f = np.zeros(H.shape[1], dtype=np.float32)  # Initial guess for the solution
    r = g.copy()                                  # Initial residual: g - H*f0 = g (f0 = 0)
    z = H.T @ r                                   # z0 = H^T * r0
    p = z.copy()                                  # Initial search direction: p0 = z0
    prev_r_norm = np.sqrt(np.dot(r, r))           # ||r0||
    z_dot_z = np.dot(z, z)                        # z · z

    final_error = 0.0
    iterations = 0

    for i in range(max_iter):
        iterations = i + 1

        w = H @ p                                        # w_i = H * p_i
        alpha = z_dot_z / np.dot(w, w)                  # alpha = z·z / w·w

        f = f + alpha * p                                # f_{i+1} = f_i + alpha * p_i
        r = r - alpha * w                                # r_{i+1} = r_i - alpha * w_i

        current_r_norm = np.sqrt(np.dot(r, r))           # ||r_{i+1}||
        final_error = abs(current_r_norm - prev_r_norm)  # error = | ||r_{i+1}|| - ||r_i|| |

        if final_error < tol:                            # stopping criterion
            break

        prev_r_norm = current_r_norm                     # update ||r||

        z = H.T @ r                                      # z_{i+1} = H^T * r_{i+1}
        new_z_dot_z = np.dot(z, z)                       # new z · z
        beta = new_z_dot_z / z_dot_z                     # beta = new_z·z / z·z

        p = z + beta * p                                 # p_{i+1} = z_{i+1} + beta * p_i
        z_dot_z = new_z_dot_z                            # update z · z

    return f, iterations, final_error
