import React, { useEffect, useRef, useState } from 'react';
import { 
  Palette, 
  Sparkles, 
  Trash2, 
  Undo
} from 'lucide-react';
import { synth } from '../utils/synth';

type Theme = 'spring' | 'summer' | 'autumn' | 'winter' | 'fairy-forest' | 'candy-garden' | 'rainbow-meadow';

interface Plant {
  type: 'tree' | 'flower' | 'mushroom' | 'crystal' | 'lollipop' | 'shrub';
  x: number;
  y: number;
  maxScale: number;
  scale: number;
  color1: string;
  color2: string;
  seed: number;
  branches?: { angle: number; length: number; width: number }[]; // For trees
}

interface SparkleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
}

interface MagicGardenProps {
  onBack: () => void;
}

export const MagicGarden: React.FC<MagicGardenProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const isMouseDown = useRef(false);
  const lastGrowTime = useRef(0);

  // States
  const [theme, setTheme] = useState<Theme>('fairy-forest');
  const plants = useRef<Plant[]>([]);
  const sparkles = useRef<SparkleParticle[]>([]);

  useEffect(() => {
    synth.playPop();
  }, []);

  const clearGarden = () => {
    synth.playPop();
    plants.current = [];
    sparkles.current = [];
  };

  const handleUndo = () => {
    if (plants.current.length > 0) {
      synth.playPop();
      plants.current.pop();
    }
  };

  // Set up procedural plant configurations depending on mouse Y and theme
  const spawnPlant = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Throttle during drags
    const now = Date.now();
    if (isMouseDown.current && now - lastGrowTime.current < 150) return;
    lastGrowTime.current = now;

    synth.playChime(); // Play sound effect!

    // Determine type by vertical Y coordinate
    // Lower on screen (bottom Y) spawns ground mushrooms/shrubs, higher Y spawns trees
    const relativeY = y / canvas.height;
    let type: Plant['type'] = 'flower';

    if (theme === 'winter') {
      type = relativeY < 0.65 ? 'tree' : relativeY < 0.82 ? 'crystal' : 'shrub';
    } else if (theme === 'fairy-forest') {
      type = relativeY < 0.65 ? 'tree' : relativeY < 0.82 ? 'mushroom' : 'flower';
    } else if (theme === 'candy-garden') {
      type = relativeY < 0.65 ? 'tree' : relativeY < 0.82 ? 'lollipop' : 'shrub';
    } else {
      // General themes (Spring, Summer, Autumn, Rainbow Meadow)
      type = relativeY < 0.65 ? 'tree' : relativeY < 0.82 ? 'flower' : 'mushroom';
    }

    // Determine colors based on themes
    let color1 = '#f43f5e';
    let color2 = '#fda4af';

    switch (theme) {
      case 'spring':
        color1 = `hsl(${340 + Math.random() * 30}, 100%, 75%)`; // pink cherry blossoms
        color2 = '#22c55e'; // green stems
        break;
      case 'summer':
        color1 = Math.random() > 0.5 ? '#eab308' : '#ef4444'; // sunflower yellow / rose red
        color2 = '#15803d';
        break;
      case 'autumn':
        color1 = Math.random() > 0.5 ? '#d97706' : '#b45309'; // orange/amber
        color2 = '#78350f';
        break;
      case 'winter':
        color1 = Math.random() > 0.5 ? '#93c5fd' : '#e2e8f0'; // crystal ice blue/white
        color2 = '#64748b';
        break;
      case 'fairy-forest':
        color1 = `hsl(${260 + Math.random() * 60}, 100%, 65%)`; // purple/blue bioluminescent
        color2 = '#a855f7';
        break;
      case 'candy-garden':
        color1 = Math.random() > 0.5 ? '#ec4899' : '#f43f5e'; // candy pink / red stripes
        color2 = '#a855f7';
        break;
      case 'rainbow-meadow':
        color1 = `hsl(${Math.random() * 360}, 100%, 65%)`; // true random rainbow
        color2 = '#22c55e';
        break;
    }

    // Generate branches seeds for trees
    const seed = Math.random();
    let branches: Plant['branches'] = [];
    if (type === 'tree') {
      const numBranches = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < numBranches; i++) {
        branches.push({
          angle: (Math.random() * 0.4 - 0.2) * Math.PI,
          length: Math.random() * 20 + 35,
          width: Math.random() * 4 + 3,
        });
      }
    }

    plants.current.push({
      type,
      x,
      y,
      maxScale: Math.random() * 0.4 + 0.6, // 0.6 to 1.0
      scale: 0.05,
      color1,
      color2,
      seed,
      branches,
    });

    // Limit plants to avoid heavy lag
    if (plants.current.length > 50) {
      plants.current.shift();
    }

    // Spawn sparkles
    const sparklesCount = 8;
    for (let i = 0; i < sparklesCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      sparkles.current.push({
        x,
        y: type === 'tree' ? y - 60 : y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1, // upward drift
        color: color1,
        size: Math.random() * 5 + 4,
        alpha: 1.0,
        decay: Math.random() * 0.02 + 0.015,
      });
    }
  };

  // Input triggers
  const handleStart = (clientX: number, clientY: number) => {
    isMouseDown.current = true;
    spawnPlant(clientX, clientY);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (isMouseDown.current) {
      spawnPlant(clientX, clientY);
    }
  };

  const handleEnd = () => {
    isMouseDown.current = false;
  };

  // Main canvas renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      // 1. Draw themed background gradient
      drawThemedBackground(ctx, canvas.width, canvas.height);

      // 2. Draw Plants
      plants.current.forEach((p) => {
        // Growth animation
        if (p.scale < p.maxScale) {
          p.scale += 0.035;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(p.scale, p.scale);

        // Procedural render branches / petals
        if (p.type === 'tree') {
          drawProceduralTree(ctx, p);
        } else if (p.type === 'flower') {
          drawProceduralFlower(ctx, p);
        } else if (p.type === 'mushroom') {
          drawProceduralMushroom(ctx, p);
        } else if (p.type === 'crystal') {
          drawProceduralCrystal(ctx, p);
        } else if (p.type === 'lollipop') {
          drawProceduralLollipop(ctx, p);
        } else if (p.type === 'shrub') {
          drawProceduralShrub(ctx, p);
        }

        ctx.restore();
      });

      // 3. Draw Sparks
      const spArr = sparkles.current;
      for (let i = spArr.length - 1; i >= 0; i--) {
        const s = spArr[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.05; // gravity drop
        s.alpha -= s.decay;

        if (s.alpha <= 0) {
          spArr.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = s.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = s.color;

        // Spark cross star shape
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - s.size);
        ctx.lineTo(s.x + s.size * 0.3, s.y - s.size * 0.3);
        ctx.lineTo(s.x + s.size, s.y);
        ctx.lineTo(s.x + s.size * 0.3, s.y + s.size * 0.3);
        ctx.lineTo(s.x, s.y + s.size);
        ctx.lineTo(s.x - s.size * 0.3, s.y + s.size * 0.3);
        ctx.lineTo(s.x - s.size, s.y);
        ctx.lineTo(s.x - s.size * 0.3, s.y - s.size * 0.3);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }

      // Draw floating fireflies matching theme colors
      drawAmbientLights(ctx, canvas.width, canvas.height);

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [theme]);

  // Background gradient per theme
  const drawThemedBackground = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    
    if (theme === 'spring') {
      bgGrad.addColorStop(0, '#fdf2f8'); // pale pink
      bgGrad.addColorStop(1, '#f0fdf4'); // soft mint bottom
    } else if (theme === 'summer') {
      bgGrad.addColorStop(0, '#e0f2fe'); // blue sky
      bgGrad.addColorStop(1, '#f0fdf4'); // green field
    } else if (theme === 'autumn') {
      bgGrad.addColorStop(0, '#fffbeb'); // warm yellow
      bgGrad.addColorStop(1, '#fef3c7'); // pumpkin/amber bottom
    } else if (theme === 'winter') {
      bgGrad.addColorStop(0, '#f1f5f9'); // foggy slate
      bgGrad.addColorStop(1, '#e2e8f0'); // snowy ice bottom
    } else if (theme === 'fairy-forest') {
      bgGrad.addColorStop(0, '#0f051d'); // deep night violet
      bgGrad.addColorStop(1, '#1e1b4b'); // indigo forest bottom
    } else if (theme === 'candy-garden') {
      bgGrad.addColorStop(0, '#fdf4ff'); // bubblegum light pink
      bgGrad.addColorStop(1, '#fae8ff');
    } else {
      // Rainbow Meadow
      bgGrad.addColorStop(0, '#f0fdfa'); // teal meadow sky
      bgGrad.addColorStop(1, '#ccfbf1');
    }

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);
  };

  // Draw procedural botanical items
  const drawProceduralTree = (ctx: CanvasRenderingContext2D, p: Plant) => {
    // Tree Trunk
    ctx.strokeStyle = theme === 'winter' ? '#475569' : theme === 'fairy-forest' ? '#1e1b4b' : '#78350f';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -70);
    ctx.stroke();

    // Render tree branches
    if (p.branches) {
      ctx.save();
      ctx.translate(0, -70);
      
      p.branches.forEach((branch, index) => {
        ctx.save();
        ctx.rotate(branch.angle);
        
        ctx.lineWidth = branch.width;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -branch.length);
        ctx.stroke();

        // Draw foliage at tips
        ctx.translate(0, -branch.length);
        ctx.fillStyle = p.color1;
        ctx.beginPath();
        ctx.arc(0, 0, branch.length * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Fairy Forest glows on foliage
        if (theme === 'fairy-forest') {
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(Math.sin(Date.now() / 400 + index) * 5, Math.cos(Date.now() / 400 + index) * 5, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });
      ctx.restore();
    }
  };

  const drawProceduralFlower = (ctx: CanvasRenderingContext2D, p: Plant) => {
    // Stem
    ctx.strokeStyle = p.color2;
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -35);
    ctx.stroke();

    // Leaves
    ctx.fillStyle = p.color2;
    ctx.beginPath();
    ctx.ellipse(-8, -15, 8, 4, -Math.PI/6, 0, Math.PI * 2);
    ctx.ellipse(8, -22, 8, 4, Math.PI/6, 0, Math.PI * 2);
    ctx.fill();

    // Flower blossom
    ctx.save();
    ctx.translate(0, -35);
    const petals = 6;
    ctx.fillStyle = p.color1;
    for (let i = 0; i < petals; i++) {
      const angle = (i * Math.PI * 2) / petals;
      ctx.beginPath();
      ctx.ellipse(
        Math.cos(angle) * 11, 
        Math.sin(angle) * 11, 
        11, 6, angle, 0, Math.PI * 2
      );
      ctx.fill();
    }

    // Yellow disc
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawProceduralMushroom = (ctx: CanvasRenderingContext2D, p: Plant) => {
    // Stem (stalk)
    ctx.fillStyle = theme === 'fairy-forest' ? '#cbd5e1' : '#fef3c7';
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.quadraticCurveTo(-8, -20, -5, -30);
    ctx.lineTo(5, -30);
    ctx.quadraticCurveTo(8, -20, 6, 0);
    ctx.closePath();
    ctx.fill();

    // Mushroom Cap
    ctx.fillStyle = p.color1;
    ctx.beginPath();
    ctx.arc(0, -30, 20, Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    // Spore dots
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-8, -40, 2.5, 0, Math.PI * 2);
    ctx.arc(0, -45, 3.5, 0, Math.PI * 2);
    ctx.arc(9, -38, 2, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Bioluminescent spores if fairy theme
    if (theme === 'fairy-forest') {
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#86efac';
      ctx.fillStyle = '#a7f3d0';
      ctx.beginPath();
      ctx.arc(-1, -30, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  };

  const drawProceduralCrystal = (ctx: CanvasRenderingContext2D, p: Plant) => {
    // Draw glowing polygon sharp shards
    ctx.shadowBlur = 15;
    ctx.shadowColor = p.color1;

    ctx.fillStyle = p.color1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-8, -40);
    ctx.lineTo(0, -60);
    ctx.lineTo(8, -40);
    ctx.closePath();
    ctx.fill();

    // Secondary side crystal shard
    ctx.fillStyle = p.color2;
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(-18, -30);
    ctx.lineTo(-12, -45);
    ctx.lineTo(-3, -25);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(16, -25);
    ctx.lineTo(12, -40);
    ctx.lineTo(3, -22);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0; // reset
  };

  const drawProceduralLollipop = (ctx: CanvasRenderingContext2D, p: Plant) => {
    // White plastic stick
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -40);
    ctx.stroke();

    // Lollipop head spiral
    ctx.save();
    ctx.translate(0, -40);

    const radius = 22;
    // Outer circle
    ctx.fillStyle = p.color1;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Spiral pattern inside lollipop
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 40; i++) {
      const angle = 0.3 * i;
      const r = (radius / 40) * i;
      const spiralX = Math.cos(angle) * r;
      const spiralY = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(spiralX, spiralY);
      else ctx.lineTo(spiralX, spiralY);
    }
    ctx.stroke();

    ctx.restore();
  };

  const drawProceduralShrub = (ctx: CanvasRenderingContext2D, p: Plant) => {
    // Draw multiple bubbles overlapping
    ctx.fillStyle = p.color1;
    
    // Shrub bunch
    ctx.beginPath();
    ctx.arc(-15, -12, 16, 0, Math.PI * 2);
    ctx.arc(15, -12, 16, 0, Math.PI * 2);
    ctx.arc(0, -26, 20, 0, Math.PI * 2);
    ctx.fill();

    // Draw little berries/flowers on bush
    ctx.fillStyle = p.color2;
    ctx.beginPath();
    ctx.arc(-10, -22, 3.5, 0, Math.PI * 2);
    ctx.arc(12, -20, 3.5, 0, Math.PI * 2);
    ctx.arc(2, -10, 4, 0, Math.PI * 2);
    ctx.fill();
  };

  // Draw ambient floating background lights (fairy dust particles)
  const drawAmbientLights = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    ctx.globalAlpha = 0.55;
    
    let glowColor = '#fbcfe8'; // Default pink spring
    if (theme === 'winter') glowColor = '#93c5fd';
    if (theme === 'fairy-forest') glowColor = '#c084fc';
    if (theme === 'autumn') glowColor = '#fde047';

    for (let i = 0; i < 15; i++) {
      const x = (Math.sin(i * 183.4 + Date.now() / 1500) * 0.5 + 0.5) * w;
      const y = (Math.cos(i * 492.1 + Date.now() / 1800) * 0.5 + 0.5) * h;
      const size = Math.abs(Math.sin(Date.now() / 400 + i)) * 6 + 2;

      ctx.shadowBlur = size * 1.5;
      ctx.shadowColor = glowColor;
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden select-none bg-indigo-950">
      {/* Grow Canvas */}
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

      {/* Control overlay top left: Exit + Reset + Undo */}
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
          onClick={handleUndo}
          className="bg-white/95 hover:bg-white text-slate-600 font-bold p-3 rounded-full border-4 border-slate-200 hover:border-pink-300 shadow-md transition"
          title="Undo last plant"
        >
          <Undo size={20} />
        </button>

        <button
          onClick={clearGarden}
          className="bg-white/95 hover:bg-white text-rose-500 font-bold p-3 rounded-full border-4 border-slate-200 hover:border-rose-300 shadow-md transition"
          title="Clear Garden"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Control overlay top right: Theme select */}
      <div className="absolute top-6 right-6 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-full border-4 border-pink-100 shadow-md">
        <Palette className="text-pink-500" size={20} />
        <select
          value={theme}
          onChange={(e) => {
            synth.playPop();
            setTheme(e.target.value as Theme);
          }}
          className="bg-transparent border-none text-slate-700 font-bold text-sm focus:ring-0 cursor-pointer capitalize pr-8"
        >
          <option value="fairy-forest">🍄 Fairy Forest</option>
          <option value="spring">🌸 Spring Bloom</option>
          <option value="summer">🌻 Summer Sun</option>
          <option value="autumn">🍁 Autumn Leaves</option>
          <option value="winter">❄️ Crystal Winter</option>
          <option value="candy-garden">🍭 Candy Garden</option>
          <option value="rainbow-meadow">🌈 Rainbow Meadow</option>
        </select>
      </div>

      {/* Floating Instructions Banner */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/20 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/20 pointer-events-none select-none text-center">
        <p className="text-slate-800 text-sm font-semibold drop-shadow-sm flex items-center gap-1.5 justify-center">
          <Sparkles size={16} className="text-yellow-500" /> Click or drag across the screen to watch your magical forest grow!
        </p>
      </div>
    </div>
  );
};
