import numpy as np
from scipy.ndimage import laplace

def laplacian_variance(f_final: np.ndarray) -> float:
    """
    Métrica cega de nitidez (No-Reference) baseada na variância do Laplaciano.
    Quanto maior o valor retornado, mais nítida é a imagem reconstruída.
    """

    # descobre o lado da imagem quadrada a partir do comprimento do vetor
    size = int(np.sqrt(len(f_final)))

    # reorganiza o vetor 1D em matriz 2D (size x size)
    image = f_final.reshape(size, size)

    # normaliza para [0, 255] para que o filtro opere em escala padrão
    min_val = image.min()
    max_val = image.max()
    if max_val - min_val == 0:
        return 0.0  # imagem constante não tem nitidez mensurável
    image_norm = (image - min_val) / (max_val - min_val) * 255.0

    # aplica o filtro Laplaciano discreto — realça bordas e variações abruptas
    filtered = laplace(image_norm)

    # a variância do array filtrado é a métrica de nitidez
    return float(np.var(filtered))
