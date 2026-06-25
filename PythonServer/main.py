from fastapi import FastAPI, WebSocket

from contextlib import asynccontextmanager
import numpy as np

from datetime import datetime, timezone
import time

from app.services.matrix_manager import matrix_manager
from app.services.cgne import cgne
from app.services.cgnr import cgnr

# arquivo que gera e gerencia o servidor
@asynccontextmanager
async def lifespan(app: FastAPI):
    # o que acontece antes do servidor iniciar
    matrix_manager.get("H-1")
    matrix_manager.get("H-2")

    yield

    # o que acontece depois do servidor encerrar...

app = FastAPI(lifespan=lifespan) #criação do servidor pp com um ciclo de vida customizado

# rota de confirmação do servidor no ar
@app.get("/health")
async def health():
    return {"status": "ok"}

# rota websocket para receber os dados do cliente e enviar a resposta
@app.websocket("/reconstruct")
async def websocket(websocket: WebSocket):
    await websocket.accept()

    data = await websocket.receive_json() # recebe a mensagem do cliente, deserializa e armazena em um dic

    algorithm = data["algorithm"] # pega o algoritmo escolhido pelo cliente
    signal = np.array(data["signal"], dtype=np.float32) # converte o sinal recebido em um array numpy

    if len(signal) == 50816:
        H = matrix_manager.get("H-1") # carrega a matriz H-1 do cache
        image_size = 60
    elif len(signal) == 27904:
        H = matrix_manager.get("H-2") # carrega a matriz H-2 do cache
        image_size = 30
    else:
        await websocket.send_json({"error": "Invalid signal length"})
        await websocket.close()
        return
    
    start_time = datetime.now(timezone.utc) # marca o tempo de início da execução do algoritmo
    t0 = time.perf_counter() # marca o tempo de início da execução do algoritmo em alta resolução

    if algorithm == "CGNE":
        f, iterations, final_error = cgne(H, signal) # executa o algoritmo CGNE
    elif algorithm == "CGNR":
        f, iterations, final_error = cgnr(H, signal) # executa o algoritmo CGNR

    t1 = time.perf_counter() # marca o tempo de término da execução do algoritmo em alta resolução
    end_time = datetime.now(timezone.utc) # marca o tempo de término da execução do algoritmo em UTC

    response = {
        "algorithm": algorithm,
        "startTime": start_time.isoformat(),
        "endTime": end_time.isoformat(),
        "imageSize": image_size,
        "iterations": iterations,
        "image": f.tolist(), # converte o array numpy em uma lista para enviar como JSON
        "finalError": float(final_error),
        "message": "Success"
    }

    await websocket.send_json(response) # serializa e envia a resposta para o cliente
    await websocket.close() # fecha a conexão websocket