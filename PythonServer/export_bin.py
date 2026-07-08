import numpy as np
import scipy.sparse as sp
import struct
import os

data_path = "../Data/"

def export_to_bin(name):
    csv_path = f"{data_path}{name}.csv"
    bin_path = f"{data_path}{name}.bin"
    
    print(f"Reading {csv_path}...")
    with open(csv_path, 'r') as f:
        shape_line = f.readline().strip()
        rows_total, cols_total = map(int, shape_line.split(','))
        data = np.loadtxt(f, delimiter=',', dtype=np.float64)
        
    print("Building CSR matrix...")
    rows = data[:, 0].astype(np.int32)
    cols = data[:, 1].astype(np.int32)
    vals = data[:, 2]
    
    matrix = sp.csr_matrix((vals, (rows, cols)), shape=(rows_total, cols_total))
    
    nnz = matrix.nnz
    
    print(f"Writing to {bin_path}...")
    with open(bin_path, 'wb') as f:
        # Write header
        f.write(struct.pack('<q', rows_total)) # Int64
        f.write(struct.pack('<q', cols_total)) # Int64
        f.write(struct.pack('<q', nnz))        # Int64
        
        # Write arrays directly using numpy tofile (which dumps raw bytes)
        # Ensure little-endian format
        matrix.data.astype('<f8').tofile(f)      # values: Double (8 bytes)
        matrix.indices.astype('<i4').tofile(f)   # colIndices: Int32 (4 bytes)
        matrix.indptr.astype('<i4').tofile(f)    # rowPointers: Int32 (4 bytes)
        
    print(f"Exported {name}.bin successfully!")

if __name__ == "__main__":
    if os.path.exists(f"{data_path}H-1.csv"):
        export_to_bin("H-1")
    if os.path.exists(f"{data_path}H-2.csv"):
        export_to_bin("H-2")
