export function generateDataURL(data: number[]): string {
  const gridSize = Math.ceil(Math.sqrt(data.length));
  const heightSize = Math.ceil(data.length / gridSize);
  
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = gridSize;
  canvas.height = heightSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  const imageData = ctx.createImageData(gridSize, heightSize);
  const range = max - min;
  
  for (let i = 0; i < data.length; i++) {
    const val = data[i];
    const normalized = range === 0 ? 0.5 : (val - min) / range;
    const gray = Math.floor(normalized * 255);
    
    const idx = i * 4;
    imageData.data[idx] = gray;     // R
    imageData.data[idx + 1] = gray; // G
    imageData.data[idx + 2] = gray; // B
    imageData.data[idx + 3] = 255;  // Alpha
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}
