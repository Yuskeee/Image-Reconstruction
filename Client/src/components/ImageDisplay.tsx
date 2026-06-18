import React, { useMemo, useEffect, useRef } from 'react';

interface ImageDisplayProps {
  data: number[];
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const gridSize = useMemo(() => {
    return Math.ceil(Math.sqrt(data.length));
  }, [data.length]);
  
  const heightSize = useMemo(() => {
    return Math.ceil(data.length / gridSize);
  }, [data.length, gridSize]);

  // Encontrar min e max para normalizar a cor
  const [min, max] = useMemo(() => {
    let minVal = Infinity;
    let maxVal = -Infinity;
    for(let i = 0; i < data.length; i++){
      if (data[i] < minVal) minVal = data[i];
      if (data[i] > maxVal) maxVal = data[i];
    }
    if (minVal === maxVal) minVal = 0;
    return [minVal, maxVal];
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpa a tela
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const range = max - min;

    // Desenha cada pixel na resolução nativa do gridSize
    for (let i = 0; i < data.length; i++) {
      const val = data[i];
      const normalized = range === 0 ? 0.5 : (val - min) / range;
      const hue = (1.0 - normalized) * 240; 
      
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      
      const x = i % gridSize;
      const y = Math.floor(i / gridSize);
      
      ctx.fillRect(x, y, 1, 1);
    }
  }, [data, gridSize, heightSize, min, max]);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded overflow-hidden p-1 flex items-center justify-center shrink-0">
      <canvas
        ref={canvasRef}
        width={gridSize}
        height={heightSize}
        title={`Min: ${min.toExponential(2)} | Max: ${max.toExponential(2)}`}
        className="w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 object-contain cursor-crosshair"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};

export default ImageDisplay;
