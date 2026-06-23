import numpy as np

class MatrixManager:
    def __init__(self):
        self._cache = {}
        self._data_path = "../Data/"

    # carrega uma matriz no cache
    def load(self, name: str):
        path = f"{self._data_path}{name}.csv"

        self._cache[name] = np.loadtxt(path, delimiter=';', dtype=np.float32)
        return self._cache[name]
    
    # checa se a matriz está no cache, caso não esteja, carrega a matriz
    def get(self, name: str):
        if name in self._cache:
            return self._cache[name]
    
        return self.load(name)
    
matrix_manager = MatrixManager()