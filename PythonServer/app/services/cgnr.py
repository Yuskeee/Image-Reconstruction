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

    g_norm = np.linalg.norm(g)
    if g_norm < 1e-30:
        return np.zeros(H.shape[1], dtype=np.float64), 0, 0.0

    r = g / g_norm
    f = np.zeros(H.shape[1], dtype=np.float64)
    z = H.T @ r
    
    lam = np.max(np.abs(z)) * 0.10
    
    s = z - lam * f
    p = s.copy()
    norm_s = np.dot(s, s)
    prev_r_norm = np.linalg.norm(r)

    final_error = 0.0
    iterations = 0

    for i in range(max_iter):
        iterations = i + 1

        q = H @ p
        q_norm = np.dot(q, q) + lam * np.dot(p, p)
        alpha = norm_s / q_norm

        f = f + alpha * p
        r = r - alpha * q

        current_r_norm = np.linalg.norm(r)
        final_error = abs(current_r_norm - prev_r_norm)

        if final_error < tol:
            break

        prev_r_norm = current_r_norm

        s = H.T @ r - lam * f
        new_norm_s = np.dot(s, s)
        beta = new_norm_s / norm_s

        p = s + beta * p
        norm_s = new_norm_s

    return f * g_norm, iterations, final_error
