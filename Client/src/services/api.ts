export interface ReconstructRequest {
  algorithm: 'CGNE' | 'CGNR';
  signal: number[];
}

export const requestReconstruction = (data: ReconstructRequest, url: string = "ws://127.0.0.1:8080/reconstruct"): Promise<any> => {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      ws.send(JSON.stringify(data));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.error) {
          reject(new Error(payload.reason || "Erro desconhecido"));
        } else {
          resolve(payload);
        }
      } catch (err) {
        reject(err);
      }
    };

    ws.onerror = (error) => {
      reject(error);
    };

    ws.onclose = (event) => {
      // Se fechou de forma não esperada sem resolver a promessa (não é comum, mas por segurança)
      if (!event.wasClean) {
        console.warn('Conexão fechada de forma inesperada');
      }
    };
  });
};
