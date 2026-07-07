import numpy as np
import scipy.sparse as sp

# arquivo que gera e gerencia as matrizes
class MatrixManager:
    def __init__(self):
        self._cache = {}
        self._data_path = "../Data/"

    # carrega uma matriz no cache
    def load(self, name: str):
        path = f"{self._data_path}{name}.csv"
        
        with open(path, 'r') as f:
            shape_line = f.readline().strip()
            rows_total, cols_total = map(int, shape_line.split(','))
            
            # Read the rest as row, col, val
            data = np.loadtxt(f, delimiter=',', dtype=np.float64)
            
        rows = data[:, 0].astype(np.int32)
        cols = data[:, 1].astype(np.int32)
        vals = data[:, 2]
        
        self._cache[name] = sp.csr_matrix((vals, (rows, cols)), shape=(rows_total, cols_total))
        return self._cache[name]
    
    # checa se a matriz está no cache, caso não esteja, carrega a matriz
    def get(self, name: str):
        if name in self._cache:
            return self._cache[name]
    
        return self.load(name)
    
matrix_manager = MatrixManager()