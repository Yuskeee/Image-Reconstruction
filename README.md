# Signal Reconstruction System

Sistema completo para reconstrução de imagens através de processamento de sinais, utilizando uma arquitetura assíncrona baseada em WebSockets.

O projeto é dividido em duas frentes:
- **Frontend (Client)**: Uma aplicação SPA moderna em React/Vite responsável por enviar vetores de sinal e exibir dados analíticos e imagens em mapas de calor.
- **Backend (SwiftServer)**: Um servidor Swift de altíssima performance configurado para Apple Accelerate para resolver sistemas lineares pesados usando os algoritmos CGNE e CGNR.

## Como Executar o Projeto

Para visualizar a aplicação corretamente, é necessário rodar ambas as instâncias (servidor Swift e cliente React) localmente no seu terminal.

### 0. Baixando Arquivos Pesados (Git LFS)
As matrizes matemáticas e os vetores de sinal (`.csv`) pesam centenas de megabytes e são versionados usando o **Git LFS**. Antes de mais nada, é obrigatório baixar o conteúdo real desses arquivos para não quebrar a aplicação.

1. Na raiz do projeto, instale os ganchos do LFS (se já não tiver) e baixe os arquivos pesados:
   ```bash
   git lfs install
   git lfs pull
   ```
*(Caso esse passo seja ignorado, o git fará o download apenas dos ponteiros de texto minúsculos, o que fará o Servidor e o React travarem com falhas de JSON "Not a Number").*

### 1. Rodando o Servidor Swift (Backend)
O backend recebe as matrizes numéricas e as processa. É importante iniciá-lo primeiro.

1. Abra um terminal.
2. Navegue até a pasta do servidor:
   ```bash
   cd SwiftServer
   ```
3. Inicialize os submódulos do Git (necessário na primeira vez para carregar dependências locais):
   ```bash
   git submodule update --init --recursive
   ```
4. Compile e execute o servidor:
   ```bash
   swift run
   ```
5. O servidor iniciará na porta `8080` (escutando conexões em `ws://127.0.0.1:8080/reconstruct`). Mantenha esta aba do terminal aberta.

### 2. Rodando o Frontend React (Client)
A interface de usuário que vai disparar os cálculos para o backend e renderizar o resultado.

1. Abra uma **nova aba** (ou nova janela) no terminal.
2. Navegue até a pasta do cliente:
   ```bash
   cd Client
   ```
3. (Apenas na primeira vez) Instale as dependências:
   ```bash
   npm install
   ```
4. Inicie o servidor de desenvolvimento Vite:
   ```bash
   npm run dev
   ```
5. O terminal exibirá um link local (geralmente `http://localhost:5173`). Segure `Cmd` (ou `Ctrl`) e clique no link para abrir a aplicação no seu navegador padrão.

---

### Como Usar a Interface
Após abrir a aplicação no navegador:
1. Você verá um painel contendo a lista de arquivos `.csv` padrão disponíveis na pasta `/public`.
2. Clique em **Start Sequence**.
3. A aplicação fará a injeção aleatória de sinais para o Backend e exibirá os relatórios contendo o **Tempo de Resposta**, **Erro Final** e o **Output Renderizado** da reconstrução da imagem simultaneamente para o `CGNE` e o `CGNR`.
4. Para parar o loop de disparo, clique em **Stop Sequence**.
