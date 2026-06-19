import numpy as np

matrixM = np.loadtxt('../Data/M.csv', delimiter=';', dtype=np.float32)
matrixN = np.loadtxt('../Data/N.csv', delimiter=';', dtype=np.float32)

matrixMN = matrixM@matrixN

matrixResponse = np.loadtxt('../Data/MN.csv', delimiter=';', dtype=np.float32) 

if np.allclose(matrixMN, matrixResponse):
    print("Passed.")
else:
    print("Failed.")

matrixa = np.loadtxt('../Data/a.csv', delimiter=';', dtype=np.float32)

matrixaM = matrixa@matrixM
matrixMa = matrixM@matrixa

matrixaMResponse = np.loadtxt('../Data/aM.csv', delimiter=';', dtype=np.float32)


if np.allclose(matrixaM, matrixaMResponse, atol=0.01):
    print("matrixa@matrixM passed.")

if np.allclose(matrixMa, matrixaMResponse, atol=0.01):
    print("matrixM@matrixa passed.")