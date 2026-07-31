import React, { useEffect, useRef, useState } from 'react';
import { 
  Compass, 
  RotateCcw, 
  Sun, 
  CloudRain, 
  ChevronsUp, 
  ChevronsDown
} from 'lucide-react';
import { synth } from '../utils/synth';

type SculptTool = 'raise' | 'lower' | 'flatten' | 'water';

interface GeoSandboxProps {
  onBack: () => void;
}

export const GeoSandbox: React.FC<GeoSandboxProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  
  // Dimensions of the simulation grid
  const cols = 60;
  const rows = 40;

  // Render buffer resolution
  const bufW = 300;
  const bufH = 200;

  // Grid arrays
  const terrain = useRef(new Float32Array(cols * rows));
  const water = useRef(new Float32Array(cols * rows));
  const waterBuffer = useRef(new Float32Array(cols * rows));

  // Tool states
  const [tool, setTool] = useState<SculptTool>('raise');
  const [brushSize, setBrushSize] = useState(6);
  const [showContours, setShowContours] = useState(true);
  const [flowSpeed, setFlowSpeed] = useState(1); // multiplier
  const isMouseDown = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Init heightmap with natural rolling hills
  const initTerrain = () => {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        // Layered sine waves for terrain diversity (zoomed out scale)
        const h = 0.35 + 
                  0.18 * Math.sin(x * 0.14) * Math.cos(y * 0.20) +
                  0.12 * Math.sin(x * 0.35 + y * 0.20) +
                  0.05 * Math.cos(x * 0.55 - y * 0.45);
        
        terrain.current[idx] = Math.max(0.01, Math.min(0.99, h));
        water.current[idx] = 0;
      }
    }
  };

  useEffect(() => {
    synth.playPop();
    initTerrain();
  }, []);

  const resetSandbox = () => {
    synth.playPop();
    initTerrain();
  };

  const evaporateAllWater = () => {
    synth.playPop();
    water.current.fill(0);
  };

  // Perform sculpting on grid based on mouse positions
  const applySculpt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    // Convert mouse to Grid coordinates
    const gridX = (clickX / canvas.width) * (cols - 1);
    const gridY = (clickY / canvas.height) * (rows - 1);

    const radius = brushSize;
    const speed = tool === 'water' ? 0.08 : 0.025;

    // Occasional sound throttler
    if (Math.random() > 0.94) {
      if (tool === 'water') synth.playPop();
      else synth.playSparkle();
    }

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const dist = Math.hypot(x - gridX, y - gridY);
        if (dist < radius) {
          const idx = y * cols + x;
          const strength = (1.0 - dist / radius) * speed;

          if (tool === 'raise') {
            terrain.current[idx] = Math.min(1.0, terrain.current[idx] + strength);
          } else if (tool === 'lower') {
            terrain.current[idx] = Math.max(0.01, terrain.current[idx] - strength);
          } else if (tool === 'water') {
            water.current[idx] = Math.min(2.0, water.current[idx] + strength * 2.0);
          } else if (tool === 'flatten') {
            // Average height of surrounding cell grid
            let sum = 0;
            let count = 0;
            for (let ny = Math.max(0, y-1); ny <= Math.min(rows-1, y+1); ny++) {
              for (let nx = Math.max(0, x-1); nx <= Math.min(cols-1, x+1); nx++) {
                sum += terrain.current[ny * cols + nx];
                count++;
              }
            }
            const avg = sum / count;
            terrain.current[idx] = terrain.current[idx] * 0.82 + avg * 0.18;
          }
        }
      }
    }
  };

  const handleStart = (clientX: number, clientY: number) => {
    isMouseDown.current = true;
    lastMousePos.current = { x: clientX, y: clientY };
    applySculpt(clientX, clientY);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (isMouseDown.current) {
      lastMousePos.current = { x: clientX, y: clientY };
      applySculpt(clientX, clientY);
    }
  };

  const handleEnd = () => {
    isMouseDown.current = false;
  };

  // Main canvas animation and water flow simulation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create an offline buffer canvas to render lower resolution (bilinear scaled up)
    const bufCanvas = document.createElement('canvas');
    bufCanvas.width = bufW;
    bufCanvas.height = bufH;
    const bufCtx = bufCanvas.getContext('2d');
    if (!bufCtx) return;

    const resize = () => {
      canvas.width = canvas.clientWidth || window.innerWidth;
      canvas.height = canvas.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      // 1. WATER FLOW PHYSICS SIMULATION (Cellular Automata)
      // Repeat based on flowSpeed slider to speed up simulation
      const steps = Math.floor(flowSpeed);
      for (let s = 0; s < steps; s++) {
        simulateWaterFlow();
      }

      // 2. RENDER TOPOGRAPHY TO PIXEL BUFFER
      const imgData = bufCtx.createImageData(bufW, bufH);
      const data = imgData.data;

      for (let py = 0; py < bufH; py++) {
        for (let px = 0; px < bufW; px++) {
          const pixelIdx = (py * bufW + px) * 4;

          // Convert pixel to grid coordinates
          const gx = (px / bufW) * (cols - 1);
          const gy = (py / bufH) * (rows - 1);

          // Bilinear Interpolation
          const x1 = Math.floor(gx);
          const y1 = Math.floor(gy);
          const x2 = Math.min(cols - 1, x1 + 1);
          const y2 = Math.min(rows - 1, y1 + 1);

          const tx = gx - x1;
          const ty = gy - y1;

          // Height interpolation
          const h00 = terrain.current[y1 * cols + x1];
          const h10 = terrain.current[y1 * cols + x2];
          const h01 = terrain.current[y2 * cols + x1];
          const h11 = terrain.current[y2 * cols + x2];

          const h = h00 * (1 - tx) * (1 - ty) +
                    h10 * tx * (1 - ty) +
                    h01 * (1 - tx) * ty +
                    h11 * tx * ty;

          // Water interpolation
          const w00 = water.current[y1 * cols + x1];
          const w10 = water.current[y1 * cols + x2];
          const w01 = water.current[y2 * cols + x1];
          const w11 = water.current[y2 * cols + x2];

          const w = w00 * (1 - tx) * (1 - ty) +
                    w10 * tx * (1 - ty) +
                    w01 * (1 - tx) * ty +
                    w11 * tx * ty;

          // Color mapping depending on elevation (H)
          let r = 0, g = 0, b = 0;

          if (h < 0.15) {
            // Deep Ocean Bed
            r = 30; g = 41; b = 59;
          } else if (h < 0.32) {
            // Shallow Bed
            r = 14; g = 165; b = 233;
          } else if (h < 0.38) {
            // Sandy coast
            r = 253; g = 224; b = 71;
          } else if (h < 0.58) {
            // Plains Green
            r = 74; g = 222; b = 128;
          } else if (h < 0.74) {
            // Dark Forest Green
            r = 22; g = 163; b = 74;
          } else if (h < 0.88) {
            // Slope Clay Rock
            r = 146; g = 64; b = 14;
          } else {
            // Snow Peaks
            r = 241; g = 245; b = 249;
          }

          // Render water overlay if depth exists
          if (w > 0.005) {
            // Blend cyan water color with transparency depending on depth
            const waterR = 14;
            const waterG = 165;
            const waterB = 233;
            const alpha = Math.min(0.85, 0.45 + w * 2.5);

            r = Math.floor(waterR * alpha + r * (1 - alpha));
            g = Math.floor(waterG * alpha + g * (1 - alpha));
            b = Math.floor(waterB * alpha + b * (1 - alpha));
          }

          // Contour Line shader check (darken pixel close to multiples of 0.1)
          if (showContours && h > 0.38) {
            const step = 0.1;
            const dist = Math.abs(h % step);
            // Dynamic width scaling so lines look clean
            if (dist < 0.0075) {
              r = Math.floor(r * 0.65);
              g = Math.floor(g * 0.65);
              b = Math.floor(b * 0.65);
            }
          }

          data[pixelIdx] = r;
          data[pixelIdx + 1] = g;
          data[pixelIdx + 2] = b;
          data[pixelIdx + 3] = 255;
        }
      }

      bufCtx.putImageData(imgData, 0, 0);

      // 3. SCALE UP TO FULLSCREEN CANVAS
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(bufCanvas, 0, 0, canvas.width, canvas.height);

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [flowSpeed, showContours]);

  // Cellular Automata Fluid Logic
  const simulateWaterFlow = () => {
    // Clone water into buffer
    waterBuffer.current.set(water.current);

    // Evaporation decay rate
    const evapRate = 0.00035;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        const wDepth = water.current[idx];

        // Slowly evaporate standing water
        if (wDepth > 0) {
          waterBuffer.current[idx] = Math.max(0, waterBuffer.current[idx] - evapRate);
        }

        if (wDepth <= 0.002) continue;

        const myTerrain = terrain.current[idx];
        const myTotal = myTerrain + wDepth;

        // Flow to neighbors (up, down, left, right)
        let lowestTotal = myTotal;
        let lowestIdx = -1;

        // Up
        if (y > 0) {
          const nIdx = (y - 1) * cols + x;
          const total = terrain.current[nIdx] + water.current[nIdx];
          if (total < lowestTotal) { lowestTotal = total; lowestIdx = nIdx; }
        }
        // Down
        if (y < rows - 1) {
          const nIdx = (y + 1) * cols + x;
          const total = terrain.current[nIdx] + water.current[nIdx];
          if (total < lowestTotal) { lowestTotal = total; lowestIdx = nIdx; }
        }
        // Left
        if (x > 0) {
          const nIdx = y * cols + (x - 1);
          const total = terrain.current[nIdx] + water.current[nIdx];
          if (total < lowestTotal) { lowestTotal = total; lowestIdx = nIdx; }
        }
        // Right
        if (x < cols - 1) {
          const nIdx = y * cols + (x + 1);
          const total = terrain.current[nIdx] + water.current[nIdx];
          if (total < lowestTotal) { lowestTotal = total; lowestIdx = nIdx; }
        }

        // Flow to the lowest neighbor
        if (lowestIdx !== -1) {
          const diff = myTotal - lowestTotal;
          if (diff > 0.002) {
            // Proportional amount to move
            const flow = Math.min(wDepth, diff * 0.22);
            waterBuffer.current[idx] -= flow;
            waterBuffer.current[lowestIdx] += flow;
          }
        }
      }
    }

    // Apply buffer back
    water.current.set(waterBuffer.current);
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden select-none bg-slate-950 kids-grid flex flex-col items-center justify-center p-4 md:p-8">
      
      {/* Wooden Sandbox Frame Table */}
      <div className="relative w-full max-w-5xl aspect-[3/2] border-[16px] md:border-[24px] border-amber-950 bg-amber-900 rounded-[2.5rem] shadow-2xl overflow-hidden ring-4 ring-amber-950/20">
        <canvas
          ref={canvasRef}
          onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
          onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={(e) => {
            if (e.touches && e.touches[0]) {
              handleStart(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
          onTouchMove={(e) => {
            if (e.touches && e.touches[0]) {
              handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
          onTouchEnd={handleEnd}
          className="w-full h-full block cursor-pointer"
        />
      </div>

      {/* Return to Dashboard */}
      <div className="absolute top-6 left-6 z-10 flex gap-2">
        <button
          onClick={() => {
            synth.playPop();
            onBack();
          }}
          className="bg-white/95 hover:bg-white text-slate-800 font-bold px-6 py-3 rounded-full border-4 border-slate-200 hover:border-pink-300 shadow-md transition"
        >
          &larr; Exit
        </button>

        <button
          onClick={resetSandbox}
          className="bg-white/95 hover:bg-white text-slate-600 font-bold p-3 rounded-full border-4 border-slate-200 hover:border-pink-300 shadow-md transition"
          title="Reset Terrain"
        >
          <RotateCcw size={20} />
        </button>

        <button
          onClick={evaporateAllWater}
          className="bg-white/95 hover:bg-white text-amber-500 font-bold p-3 rounded-full border-4 border-slate-200 hover:border-amber-300 shadow-md transition"
          title="Evaporate Water"
        >
          <Sun size={20} />
        </button>
      </div>

      {/* Brush tools panel (Top Center-Right) */}
      <div className="absolute top-6 right-6 z-10 flex flex-col md:flex-row items-center gap-3 bg-white/90 backdrop-blur-md px-6 py-3 rounded-3xl border-4 border-emerald-100 shadow-md">
        
        {/* Tool Selector */}
        <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-bold text-slate-600">
          <button
            onClick={() => { synth.playPop(); setTool('raise'); }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${tool === 'raise' ? 'bg-emerald-500 text-white shadow' : 'hover:bg-slate-200'}`}
          >
            <ChevronsUp size={14} /> Raise Hill
          </button>
          <button
            onClick={() => { synth.playPop(); setTool('lower'); }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${tool === 'lower' ? 'bg-emerald-500 text-white shadow' : 'hover:bg-slate-200'}`}
          >
            <ChevronsDown size={14} /> Dig Valley
          </button>
          <button
            onClick={() => { synth.playPop(); setTool('flatten'); }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${tool === 'flatten' ? 'bg-emerald-500 text-white shadow' : 'hover:bg-slate-200'}`}
          >
            <Compass size={14} /> Flatten
          </button>
          <button
            onClick={() => { synth.playPop(); setTool('water'); }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${tool === 'water' ? 'bg-emerald-500 text-white shadow' : 'hover:bg-slate-200'}`}
          >
            <CloudRain size={14} /> Rain/Water
          </button>
        </div>

        {/* Brush Size Slider */}
        <div className="flex items-center gap-2 pl-3 border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase w-14">Size: {brushSize}</span>
          <input
            type="range"
            min="2"
            max="15"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-24 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      </div>

      {/* Contour Display & Speed Toggles (Bottom Panel) */}
      <div className="absolute bottom-6 left-6 right-6 z-10 bg-white/90 backdrop-blur-md p-5 rounded-3xl border-4 border-slate-100 shadow-xl max-w-2xl mx-auto flex flex-col md:flex-row items-center gap-6 justify-between">
        
        {/* Toggle contours */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase leading-none">Display Lines</span>
            <span className="text-sm font-extrabold text-slate-700 leading-normal">{showContours ? '🗺️ Contours On' : '⚪ Contours Off'}</span>
          </div>
          <button
            onClick={() => { synth.playPop(); setShowContours(!showContours); }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showContours ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showContours ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Water Flow Speed */}
        <div className="flex-1 w-full md:w-auto flex items-center gap-3 pl-0 md:pl-6 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0">
          <div className="flex flex-col text-left w-20">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase leading-none">Flow Speed</span>
            <span className="text-sm font-extrabold text-slate-700 leading-normal">{flowSpeed}x</span>
          </div>
          <input
            type="range"
            min="1"
            max="4"
            step="1"
            value={flowSpeed}
            onChange={(e) => setFlowSpeed(parseInt(e.target.value))}
            className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      </div>

      {/* Floating center instruction bubble */}
      <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-white/20 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 pointer-events-none select-none text-center">
        <p className="text-white text-xs md:text-sm font-semibold drop-shadow-sm">
          ⛰️ Drag across screen to sculpt mountains, carve rivers, and pour water!
        </p>
      </div>
    </div>
  );
};
