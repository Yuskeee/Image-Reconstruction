from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.services.matrix_manager import matrix_manager

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