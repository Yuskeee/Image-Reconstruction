import asyncio
import json
import websockets

async def test_reconstruct():
    uri = "ws://127.0.0.1:8000/reconstruct"

    # sinal de teste com 27.904 zeros → usa H-2 (imagem 30×30)
    signal = [0.0] * 27904

    payload = {
        "algorithm": "CGNE",
        "signal": signal
    }

    async with websockets.connect(uri) as ws: # abre conexão e fecha automaticamente ao sair do bloco
        await ws.send(json.dumps(payload)) # envia o JSON serializado
        response_raw = await ws.recv()     # aguarda a resposta do servidor

    response = json.loads(response_raw) # desserializa o JSON recebido

    # imprime os campos sem a lista de pixels (muito grande)
    print("algorithm  :", response["algorithm"])
    print("imageSize  :", response["imageSize"])
    print("iterations :", response["iterations"])
    print("finalError :", response["finalError"])
    print("startTime  :", response["startTime"])
    print("endTime    :", response["endTime"])
    print("message    :", response["message"])
    print("image len  :", len(response["image"]))

asyncio.run(test_reconstruct()) # executa a função assíncrona no event loop
