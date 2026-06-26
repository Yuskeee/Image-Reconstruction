// Métrica cega de nitidez (No-Reference) baseada na variância do Laplaciano.
// Quanto maior o valor retornado, mais nítida é a imagem reconstruída.
export function laplacianVariance(image: number[], size: number): number {
  // normaliza para [0, 255] para que o filtro opere em escala padrão
  let min = Infinity, max = -Infinity;
  for (const v of image) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min;
  if (range === 0) return 0; // imagem constante não tem nitidez mensurável

  const normalized = image.map(v => ((v - min) / range) * 255);

  // aplica o filtro Laplaciano discreto — ignora pixels da borda
  const filtered: number[] = [];
  for (let row = 1; row < size - 1; row++) {
    for (let col = 1; col < size - 1; col++) {
      const center = normalized[row * size + col];
      const top    = normalized[(row - 1) * size + col];
      const bottom = normalized[(row + 1) * size + col];
      const left   = normalized[row * size + (col - 1)];
      const right  = normalized[row * size + (col + 1)];
      filtered.push(top + bottom + left + right - 4 * center);
    }
  }

  // variância = E[X²] - E[X]²
  const n = filtered.length;
  const mean       = filtered.reduce((a, b) => a + b, 0) / n;
  const meanSquare = filtered.reduce((a, b) => a + b * b, 0) / n;
  return meanSquare - mean * mean;
}
