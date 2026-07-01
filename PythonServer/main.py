from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse

from contextlib import asynccontextmanager
import numpy as np
import asyncio
from concurrent.futures import ThreadPoolExecutor
from app.services.queue_monitor import monitor, queue

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
    asyncio.create_task(monitor.poll_loop())

    yield

    # o que acontece depois do servidor encerrar...

app = FastAPI(lifespan=lifespan) #criação do servidor pp com um ciclo de vida customizado
executor = ThreadPoolExecutor(max_workers=20)

# rota de confirmação do servidor no ar
@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/monitor/metrics")
async def get_metrics():
    return monitor.history

HTML_DASHBOARD = """
<!DOCTYPE html>
<html>
<head>
    <title>Server Monitor (Python)</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { background-color: #121214; color: #fff; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; }
        .chart-container { width: 80%; height: 400px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>System Monitor (Python)</h1>
    <div class="chart-container">
        <canvas id="cpuChart"></canvas>
    </div>
    <div class="chart-container">
        <canvas id="memChart"></canvas>
    </div>
    <script>
        const ctxCpu = document.getElementById('cpuChart').getContext('2d');
        const cpuChart = new Chart(ctxCpu, {
            type: 'line',
            data: { labels: [], datasets: [
                { label: 'CPU %', data: [], borderColor: '#f87171', backgroundColor: '#f8717155', fill: true },
                { label: 'Max Workers (20 = 100%)', data: [], borderColor: '#60a5fa', backgroundColor: 'transparent', borderDash: [5, 5] }
            ]},
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
        });

        const ctxMem = document.getElementById('memChart').getContext('2d');
        const memChart = new Chart(ctxMem, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Memory %', data: [], borderColor: '#34d399', backgroundColor: '#34d39955', fill: true }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
        });

        async function fetchMetrics() {
            const res = await fetch('/monitor/metrics');
            const data = await res.json();
            
            const labels = data.map(d => new Date(d.timestamp).toLocaleTimeString());
            const cpu = data.map(d => d.cpuPercent);
            const mem = data.map(d => d.memoryPercent);
            const maxWorkers = data.map(d => d.maxWorkersAllowed * 5);
            
            cpuChart.data.labels = labels;
            cpuChart.data.datasets[0].data = cpu;
            cpuChart.data.datasets[1].data = maxWorkers;
            cpuChart.update();

            memChart.data.labels = labels;
            memChart.data.datasets[0].data = mem;
            memChart.update();
        }

        setInterval(fetchMetrics, 1000);
    </script>
</body>
</html>
"""

@app.get("/monitor", response_class=HTMLResponse)
async def get_monitor():
    return HTML_DASHBOARD

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

    await queue.enqueue()
    try:
        loop = asyncio.get_running_loop()
        if algorithm == "CGNE":
            f, iterations, final_error = await loop.run_in_executor(executor, cgne, H, signal) # executa o algoritmo CGNE
        elif algorithm == "CGNR":
            f, iterations, final_error = await loop.run_in_executor(executor, cgnr, H, signal) # executa o algoritmo CGNR
    finally:
        queue.dequeue()

    transposed_f = f.reshape((image_size, image_size)).T.flatten()

    t1 = time.perf_counter() # marca o tempo de término da execução do algoritmo em alta resolução
    end_time = datetime.now(timezone.utc) # marca o tempo de término da execução do algoritmo em UTC

    response = {
        "algorithm": algorithm,
        "startTime": start_time.isoformat(),
        "endTime": end_time.isoformat(),
        "imageSize": image_size,
        "iterations": iterations,
        "image": transposed_f.tolist(), # converte o array numpy transposto em uma lista
        "finalError": float(final_error),
        "message": "Success"
    }

    await websocket.send_json(response) # serializa e envia a resposta para o cliente
    await websocket.close() # fecha a conexão websocket