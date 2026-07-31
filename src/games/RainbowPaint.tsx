import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Undo2, 
  Redo2, 
  Trash2, 
  Download, 
  Grid, 
  Paintbrush, 
  Palette,
  Sliders,
  ChevronDown
} from 'lucide-react';
import { synth } from '../utils/synth';

// Brushes
type BrushStyle = 'rainbow' | 'neon' | 'glitter' | 'watercolor' | 'chalk' | 'crayon' | 'magic-sparkles';
type SymmetryMode = 'none' | 'horizontal' | 'vertical' | 'four-way' | 'kaleidoscope';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  type: 'sparkle' | 'glitter' | 'water';
}

const presetColors = [
  '#ff4757', // Coral Red
  '#ffa502', // Orange
  '#eccc68', // Yellow
  '#2ed573', // Green
  '#1e90ff', // Blue
  '#747d8c', // Slate
  '#ff6b81', // Pink
  '#9b59b6', // Purple
  '#ffffff', // White
  '#111111', // Dark Gray
];

interface RainbowPaintProps {
  onBack: () => void;
}

export const RainbowPaint: React.FC<RainbowPaintProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const rainbowHue = useRef(0);
  const particles = useRef<Particle[]>([]);
  const animationFrameId = useRef<number | null>(null);

  // Undo/Redo Stacks
  const history = useRef<ImageData[]>([]);
  const historyIndex = useRef(-1);

  // Settings states
  const [brush, setBrush] = useState<BrushStyle>('rainbow');
  const [brushSize, setBrushSize] = useState(15);
  const [opacity, setOpacity] = useState(1.0);
  const [glowIntensity, setGlowIntensity] = useState(10);
  const [color, setColor] = useState('#ff4757');
  const [symmetry, setSymmetry] = useState<SymmetryMode>('none');
  const [openSettings, setOpenSettings] = useState(false);

  useEffect(() => {
    synth.playPop();
  }, []);

  // Save canvas state for Undo
  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Clear redo history
    if (historyIndex.current < history.current.length - 1) {
      history.current = history.current.slice(0, historyIndex.current + 1);
    }
    
    // Push new state (cap at 15 history steps to save memory)
    history.current.push(imgData);
    if (history.current.length > 15) {
      history.current.shift();
    }
    historyIndex.current = history.current.length - 1;
  };

  const handleUndo = () => {
    if (historyIndex.current > 0) {
      synth.playPop();
      historyIndex.current--;
      restoreState(history.current[historyIndex.current]);
    }
  };

  const handleRedo = () => {
    if (historyIndex.current < history.current.length - 1) {
      synth.playPop();
      historyIndex.current++;
      restoreState(history.current[historyIndex.current]);
    }
  };

  const restoreState = (imgData: ImageData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(imgData, 0, 0);
  };

  const clearCanvas = () => {
    synth.playPop();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    saveState();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const generateRandomPalette = () => {
    synth.playPop();
    const randomColor = `hsl(${Math.floor(Math.random() * 360)}, 100%, 55%)`;
    setColor(randomColor);
  };

  const saveAsImage = () => {
    synth.playPop();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Trigger download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `KidsPlayground_Artwork_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Set up drawing canvas and animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const resize = () => {
      // Keep existing art on resize if possible
      const tempImg = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Fill canvas background initially with white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(tempImg, 0, 0);

      if (history.current.length === 0) {
        // Save initial blank state
        const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        history.current = [initialData];
        historyIndex.current = 0;
      }
    };

    resize();
    window.addEventListener('resize', resize);

    // Particle rendering loop
    const render = () => {
      // Draw trailing sparkles
      const pArr = particles.current;
      if (pArr.length > 0) {
        for (let i = pArr.length - 1; i >= 0; i--) {
          const p = pArr[i];
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= p.decay;

          if (p.alpha <= 0) {
            pArr.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;

          if (p.type === 'sparkle') {
            // Draw a cute small sparkle cross star
            ctx.beginPath();
            ctx.moveTo(p.x, p.y - p.size);
            ctx.lineTo(p.x + p.size * 0.3, p.y - p.size * 0.3);
            ctx.lineTo(p.x + p.size, p.y);
            ctx.lineTo(p.x + p.size * 0.3, p.y + p.size * 0.3);
            ctx.lineTo(p.x, p.y + p.size);
            ctx.lineTo(p.x - p.size * 0.3, p.y + p.size * 0.3);
            ctx.lineTo(p.x - p.size, p.y);
            ctx.lineTo(p.x - p.size * 0.3, p.y - p.size * 0.3);
            ctx.closePath();
            ctx.fill();
          } else {
            // Glitter dots
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      // Rotate rainbow hue
      rainbowHue.current = (rainbowHue.current + 2) % 360;

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  // Drawing physics and brush strokes
  const drawBrushStroke = (
    ctx: CanvasRenderingContext2D, 
    x1: number, y1: number, 
    x2: number, y2: number,
    drawColor: string,
    speed: number
  ) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Dynamic line thickness based on speed (slower = thicker)
    const speedFactor = Math.max(0.4, 1.2 - (speed / 30));
    const dynamicSize = brushSize * speedFactor;

    // Apply global values
    ctx.globalAlpha = opacity;

    if (brush === 'neon') {
      ctx.shadowBlur = glowIntensity;
      ctx.shadowColor = drawColor;
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = dynamicSize;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    } 
    else if (brush === 'rainbow') {
      const rainbowStr = `hsl(${rainbowHue.current}, 100%, 55%)`;
      ctx.strokeStyle = rainbowStr;
      ctx.lineWidth = dynamicSize;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    } 
    else if (brush === 'watercolor') {
      // Watercolor bleeds. Draw overlapping large fuzzy circle paths
      ctx.globalAlpha = 0.04;
      const grad = ctx.createRadialGradient(x2, y2, 2, x2, y2, brushSize * 1.5);
      grad.addColorStop(0, drawColor);
      grad.addColorStop(0.5, drawColor);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x2, y2, brushSize * 1.5, 0, Math.PI * 2);
      ctx.fill();
    } 
    else if (brush === 'chalk') {
      // Draw multiple tiny chalk spots along the path segment
      ctx.fillStyle = drawColor;
      const length = Math.hypot(x2 - x1, y2 - y1);
      const steps = Math.floor(length / 2) + 2;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const cx = x1 + (x2 - x1) * t;
        const cy = y1 + (y2 - y1) * t;

        // Draw multiple dust specs around center
        const density = Math.floor(brushSize * 0.4);
        for (let d = 0; d < density; d++) {
          const r = Math.random() * (brushSize / 2);
          const theta = Math.random() * Math.PI * 2;
          const px = cx + Math.cos(theta) * r;
          const py = cy + Math.sin(theta) * r;
          const size = Math.random() * 1.5 + 0.5;

          ctx.globalAlpha = (1 - r / (brushSize / 2)) * 0.4 * opacity;
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } 
    else if (brush === 'crayon') {
      // Drawing multiple overlapping wavy sketchy crayon strokes
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = 1.5;
      
      const length = Math.hypot(x2 - x1, y2 - y1);
      const steps = Math.floor(length / 4) + 1;

      // Draw 4 parallel sketch lines close to each other
      for (let lineIndex = 0; lineIndex < 4; lineIndex++) {
        const offset = (lineIndex - 1.5) * (brushSize * 0.25);
        ctx.globalAlpha = (Math.random() * 0.4 + 0.4) * opacity;
        
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const cx = x1 + (x2 - x1) * t;
          const cy = y1 + (y2 - y1) * t;
          
          // Noise perpendicular to segment
          const angle = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
          const noise = (Math.random() - 0.5) * (brushSize * 0.15) + offset;
          const nx = cx + Math.cos(angle) * noise;
          const ny = cy + Math.sin(angle) * noise;

          if (i === 0) ctx.moveTo(nx, ny);
          else ctx.lineTo(nx, ny);
        }
        ctx.stroke();
      }
    } 
    else if (brush === 'glitter') {
      // Draw simple solid thin baseline stroke
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = dynamicSize * 0.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Emit glitter particles
      const pCount = Math.floor(speed * 0.4) + 2;
      for (let i = 0; i < pCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 2 + 0.5;
        particles.current.push({
          x: x2,
          y: y2,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity + 0.2, // gravity drop
          color: drawColor,
          size: Math.random() * 3 + 2,
          alpha: 1.0,
          decay: Math.random() * 0.03 + 0.02,
          type: 'glitter',
        });
      }
    } 
    else if (brush === 'magic-sparkles') {
      // Magic Sparkle brush emits glowing star particles.
      // Make a beautiful trail and play sparkle sounds
      const pCount = Math.floor(speed * 0.35) + 1;
      for (let i = 0; i < pCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 2 + 1;
        particles.current.push({
          x: x2,
          y: y2,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity - 0.5,
          color: `hsl(${Math.random() * 360}, 100%, 65%)`,
          size: Math.random() * 6 + 6,
          alpha: 1.0,
          decay: Math.random() * 0.015 + 0.01,
          type: 'sparkle',
        });
      }

      // Occasional synth sparkle chime
      if (Math.random() > 0.85) {
        synth.playSparkle();
      }
    }

    ctx.restore();
  };

  // Perform drawing considering active Symmetry mode
  const executeDrawing = (
    ctx: CanvasRenderingContext2D, 
    x1: number, y1: number, 
    x2: number, y2: number
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = canvas.width;
    const h = canvas.height;
    const speed = Math.hypot(x2 - x1, y2 - y1);
    
    // Choose active brush color (neon/watercolor uses selected color, rainbow is self-contained)
    const drawColor = brush === 'rainbow' ? `hsl(${rainbowHue.current}, 100%, 55%)` : color;

    if (symmetry === 'none') {
      drawBrushStroke(ctx, x1, y1, x2, y2, drawColor, speed);
    } 
    else if (symmetry === 'horizontal') {
      // Real and Mirrored horizontally
      drawBrushStroke(ctx, x1, y1, x2, y2, drawColor, speed);
      drawBrushStroke(ctx, w - x1, y1, w - x2, y2, drawColor, speed);
    } 
    else if (symmetry === 'vertical') {
      // Real and Mirrored vertically
      drawBrushStroke(ctx, x1, y1, x2, y2, drawColor, speed);
      drawBrushStroke(ctx, x1, h - y1, x2, h - y2, drawColor, speed);
    } 
    else if (symmetry === 'four-way') {
      // Real, H-mirror, V-mirror, and both
      drawBrushStroke(ctx, x1, y1, x2, y2, drawColor, speed);
      drawBrushStroke(ctx, w - x1, y1, w - x2, y2, drawColor, speed);
      drawBrushStroke(ctx, x1, h - y1, x2, h - y2, drawColor, speed);
      drawBrushStroke(ctx, w - x1, h - y1, w - x2, h - y2, drawColor, speed);
    } 
    else if (symmetry === 'kaleidoscope') {
      // 8-segment radial symmetry
      const cx = w / 2;
      const cy = h / 2;

      const segments = 8;
      for (let i = 0; i < segments; i++) {
        const angleOffset = (i * Math.PI * 2) / segments;

        // Transform starting point (x1, y1)
        const dx1 = x1 - cx;
        const dy1 = y1 - cy;
        const r1 = Math.hypot(dx1, dy1);
        const a1 = Math.atan2(dy1, dx1) + angleOffset;
        const sx1 = cx + Math.cos(a1) * r1;
        const sy1 = cy + Math.sin(a1) * r1;

        // Transform ending point (x2, y2)
        const dx2 = x2 - cx;
        const dy2 = y2 - cy;
        const r2 = Math.hypot(dx2, dy2);
        const a2 = Math.atan2(dy2, dx2) + angleOffset;
        const sx2 = cx + Math.cos(a2) * r2;
        const sy2 = cy + Math.sin(a2) * r2;

        drawBrushStroke(ctx, sx1, sy1, sx2, sy2, drawColor, speed);
        
        // Also draw reflected segments for true snowflake shape!
        const ra1 = -Math.atan2(dy1, dx1) + angleOffset;
        const rx1 = cx + Math.cos(ra1) * r1;
        const ry1 = cy + Math.sin(ra1) * r1;

        const ra2 = -Math.atan2(dy2, dx2) + angleOffset;
        const rx2 = cx + Math.cos(ra2) * r2;
        const ry2 = cy + Math.sin(ra2) * r2;

        drawBrushStroke(ctx, rx1, ry1, rx2, ry2, drawColor, speed);
      }
    }
  };

  // Touch and mouse inputs
  const handleStart = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    drawing.current = true;
    lastPos.current = { x, y };

    saveState(); // Capture state before stroke begins
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    executeDrawing(ctx, lastPos.current.x, lastPos.current.y, x, y);
    lastPos.current = { x, y };
  };

  const handleEnd = () => {
    drawing.current = false;
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-white select-none">
      {/* Target Canvas */}
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
        className="w-full h-full block bg-white cursor-crosshair"
      />

      {/* Floating Center Guide for Symmetry */}
      {symmetry !== 'none' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {symmetry === 'horizontal' && <div className="w-0.5 h-full bg-slate-400/20 border-l border-dashed border-slate-500/40" />}
          {symmetry === 'vertical' && <div className="h-0.5 w-full bg-slate-400/20 border-t border-dashed border-slate-500/40" />}
          {symmetry === 'four-way' && (
            <>
              <div className="w-0.5 h-full bg-slate-400/20 border-l border-dashed border-slate-500/40 absolute" />
              <div className="h-0.5 w-full bg-slate-400/20 border-t border-dashed border-slate-500/40 absolute" />
            </>
          )}
          {symmetry === 'kaleidoscope' && (
            <div className="w-20 h-20 rounded-full border border-dashed border-slate-500/30 flex items-center justify-center">
              <div className="w-2 h-2 bg-slate-500/40 rounded-full" />
            </div>
          )}
        </div>
      )}

      {/* Top Floating Control Bar */}
      <div className="absolute top-6 left-6 right-6 z-10 flex flex-wrap justify-between gap-4 pointer-events-none">
        {/* Left Side: Exit + Undo/Redo */}
        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={() => {
              synth.playPop();
              onBack();
            }}
            className="bg-white/95 hover:bg-white text-slate-800 font-bold px-6 py-3 rounded-full border-4 border-slate-200 hover:border-pink-300 shadow-md transition"
          >
            &larr; Exit
          </button>
          
          <div className="bg-white/95 px-2 py-1 flex items-center rounded-full border-4 border-slate-200 shadow-md">
            <button
              onClick={handleUndo}
              disabled={historyIndex.current <= 0}
              className={`p-2 rounded-full hover:bg-slate-100 transition ${historyIndex.current <= 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700'}`}
              title="Undo"
            >
              <Undo2 size={20} />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex.current >= history.current.length - 1}
              className={`p-2 rounded-full hover:bg-slate-100 transition ${historyIndex.current >= history.current.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700'}`}
              title="Redo"
            >
              <Redo2 size={20} />
            </button>
          </div>
        </div>

        {/* Center: Brush quick select */}
        <div className="hidden lg:flex gap-2 pointer-events-auto bg-white/95 px-4 py-1.5 rounded-full border-4 border-slate-200 shadow-md items-center">
          <span className="text-slate-400 font-extrabold text-xs uppercase mr-2">Brush:</span>
          {(['rainbow', 'neon', 'glitter', 'watercolor', 'chalk', 'crayon', 'magic-sparkles'] as BrushStyle[]).map((b) => (
            <button
              key={b}
              onClick={() => {
                synth.playPop();
                setBrush(b);
                if (b === 'magic-sparkles') setBrushSize(25);
                else if (b === 'watercolor') setBrushSize(40);
                else setBrushSize(15);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition capitalize ${brush === b ? 'bg-pink-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {b.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Right Side: Settings Toggle + Palette + Trash + Save */}
        <div className="flex gap-2 pointer-events-auto">
          {/* Colors quickbar */}
          <div className="hidden md:flex gap-1.5 bg-white/95 px-3 py-1.5 rounded-full border-4 border-slate-200 shadow-md">
            {presetColors.slice(0, 8).map((c) => (
              <button
                key={c}
                onClick={() => { synth.playPop(); setColor(c); }}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-full border-2 transition ${color === c ? 'border-slate-800 scale-110 shadow-inner' : 'border-white hover:scale-105'}`}
              />
            ))}
            <button
              onClick={generateRandomPalette}
              className="p-1 rounded-full text-slate-500 hover:bg-slate-100 transition"
              title="Random Color"
            >
              <Palette size={16} />
            </button>
          </div>

          <button
            onClick={clearCanvas}
            className="bg-white/95 hover:bg-white text-rose-500 font-bold p-3 rounded-full border-4 border-slate-200 hover:border-rose-300 shadow-md transition"
            title="Clear Canvas"
          >
            <Trash2 size={20} />
          </button>

          <button
            onClick={saveAsImage}
            className="bg-white/95 hover:bg-white text-emerald-600 font-bold p-3 rounded-full border-4 border-slate-200 hover:border-emerald-300 shadow-md transition"
            title="Save Image"
          >
            <Download size={20} />
          </button>

          <button
            onClick={() => {
              synth.playPop();
              setOpenSettings(!openSettings);
            }}
            className="bg-white/95 hover:bg-white text-pink-500 font-bold px-4 py-3 rounded-full border-4 border-pink-100 hover:border-pink-300 shadow-md transition flex items-center gap-1.5"
          >
            <Sliders size={20} />
            <span className="text-sm font-bold">Customize</span>
            <ChevronDown size={14} className={`transform transition-transform ${openSettings ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Floating Settings Drawer dropdown */}
      <AnimatePresence>
        {openSettings && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-24 right-6 w-80 bg-white z-20 rounded-3xl p-6 shadow-2xl border-4 border-pink-100 space-y-6"
          >
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-2 border-slate-100">
              <Paintbrush className="text-pink-500" /> Customize Brush
            </h3>

            {/* Mobile-only brush select dropdown replacement */}
            <div className="lg:hidden space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Brush Style</span>
              <select
                value={brush}
                onChange={(e) => {
                  synth.playPop();
                  setBrush(e.target.value as BrushStyle);
                }}
                className="w-full bg-slate-100 px-3 py-2 rounded-xl text-slate-700 font-bold text-sm border-none focus:ring-2 focus:ring-pink-500 capitalize"
              >
                {['rainbow', 'neon', 'glitter', 'watercolor', 'chalk', 'crayon', 'magic-sparkles'].map((b) => (
                  <option key={b} value={b}>{b.replace('-', ' ')}</option>
                ))}
              </select>
            </div>

            {/* Symmetry option */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Grid size={12} /> Symmetry Mirrors
              </span>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                <button
                  onClick={() => { synth.playPop(); setSymmetry('none'); }}
                  className={`py-1.5 rounded-lg transition ${symmetry === 'none' ? 'bg-pink-500 text-white shadow' : 'hover:bg-slate-200'}`}
                >
                  Off
                </button>
                <button
                  onClick={() => { synth.playPop(); setSymmetry('horizontal'); }}
                  className={`py-1.5 rounded-lg transition ${symmetry === 'horizontal' ? 'bg-pink-500 text-white shadow' : 'hover:bg-slate-200'}`}
                >
                  H-Mirror
                </button>
                <button
                  onClick={() => { synth.playPop(); setSymmetry('vertical'); }}
                  className={`py-1.5 rounded-lg transition ${symmetry === 'vertical' ? 'bg-pink-500 text-white shadow' : 'hover:bg-slate-200'}`}
                >
                  V-Mirror
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                <button
                  onClick={() => { synth.playPop(); setSymmetry('four-way'); }}
                  className={`py-1.5 rounded-lg transition ${symmetry === 'four-way' ? 'bg-pink-500 text-white shadow' : 'hover:bg-slate-200'}`}
                >
                  4-Way Mirror
                </button>
                <button
                  onClick={() => { synth.playPop(); setSymmetry('kaleidoscope'); }}
                  className={`py-1.5 rounded-lg transition ${symmetry === 'kaleidoscope' ? 'bg-pink-500 text-white shadow' : 'hover:bg-slate-200'}`}
                >
                  Kaleidoscope ❄️
                </button>
              </div>
            </div>

            {/* Brush color chooser for mobile/non-quickbar */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Brush Color</span>
              <input
                type="color"
                value={color.startsWith('hsl') ? '#ff4757' : color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-10 rounded-xl cursor-pointer bg-transparent border-2 border-slate-200 p-0.5"
              />
            </div>

            {/* Size Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-2">
                <span>Brush Size</span>
                <span className="text-pink-500 font-extrabold">{brushSize}px</span>
              </div>
              <input
                type="range"
                min="3"
                max="80"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
            </div>

            {/* Opacity slider */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-2">
                <span>Opacity</span>
                <span className="text-pink-500 font-extrabold">{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
            </div>

            {/* Glow intensity (Neon brush only) */}
            {brush === 'neon' && (
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-2">
                  <span>Glow Glow Glow</span>
                  <span className="text-pink-500 font-extrabold">{glowIntensity}px</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  value={glowIntensity}
                  onChange={(e) => setGlowIntensity(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Instructions Banner */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/20 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 pointer-events-none select-none text-center">
        <p className="text-slate-700 text-sm font-semibold drop-shadow-sm">
          🖌️ Paint across the screen! Toggle **Symmetry Mirrors** to draw mandala shapes.
        </p>
      </div>
    </div>
  );
};
