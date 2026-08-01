import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Volume2, 
  RotateCcw,
  Sparkles,
  Compass,
  Palette,
  X
} from 'lucide-react';
import { synth } from '../utils/synth';

type NodeType = 'pull' | 'push' | 'swallow';
type ColorMode = 'galaxy' | 'rainbow' | 'neon';

interface SpaceNode {
  id: number;
  x: number;
  y: number;
  type: NodeType;
  radius: number;
  angle: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  type?: 'dot' | 'ring';
}

interface SpaceSwirlProps {
  onBack: () => void;
}

export const SpaceSwirl: React.FC<SpaceSwirlProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const mousePos = useRef({ x: -1000, y: -1000 });

  // Game Settings
  const [activeTool, setActiveTool] = useState<NodeType | 'delete'>('pull');
  const [colorMode, setColorMode] = useState<ColorMode>('galaxy');
  const [speedLimit, setSpeedLimit] = useState(6);
  const [trailLength, setTrailLength] = useState(0.08); // canvas alpha clear (0.02 - long trails, 0.3 - short)
  const [volume, setVolume] = useState(synth.getVolume() * 100);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelper, setShowHelper] = useState(true);

  // Entities
  const nodes = useRef<SpaceNode[]>([]);
  const particles = useRef<Particle[]>([]);
  const sparks = useRef<Spark[]>([]);

  // Dragging states
  const draggedNodeId = useRef<number | null>(null);
  const nodeIdCounter = useRef(0);

  useEffect(() => {
    synth.playPop();
    initSandbox();
  }, []);

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    synth.setVolume(val / 100);
  };

  const initSandbox = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    nodeIdCounter.current = 0;
    // Initial Nodes: place a Star (pull) and a Repeller (push) on the left/right center
    nodes.current = [
      { id: ++nodeIdCounter.current, x: canvas.width * 0.35, y: canvas.height * 0.5, type: 'pull', radius: 35, angle: 0 },
      { id: ++nodeIdCounter.current, x: canvas.width * 0.65, y: canvas.height * 0.5, type: 'push', radius: 35, angle: 0 }
    ];

    // Initialize 1800 particles
    particles.current = Array.from({ length: 1800 }, () => createParticle(canvas.width, canvas.height));
    sparks.current = [];
  };

  const createParticle = (w: number, h: number): Particle => {
    let color = '';

    if (colorMode === 'galaxy') {
      // Magenta, Deep Purple, Neon Pink, Indigo Blue
      const colors = ['#f43f5e', '#a855f7', '#ec4899', '#6366f1', '#3b82f6'];
      color = colors[Math.floor(Math.random() * colors.length)];
    } else if (colorMode === 'neon') {
      // Cyan, lime green, white
      const colors = ['#06b6d4', '#10b981', '#34d399', '#ffffff', '#22d3ee'];
      color = colors[Math.floor(Math.random() * colors.length)];
    } else {
      // Rainbow
      color = `hsl(${Math.floor(Math.random() * 360)}, 100%, 65%)`;
    }

    // Spawn randomly
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: Math.random() * 4 - 2,
      vy: Math.random() * 4 - 2,
      color,
      size: Math.random() * 2 + 1.2,
    };
  };

  // Click on Canvas handles placement, deleting, or selecting node to drag
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked near an existing node
    let clickedNodeIdx = -1;
    nodes.current.forEach((n, idx) => {
      const dist = Math.hypot(n.x - x, n.y - y);
      if (dist < n.radius + 15) {
        clickedNodeIdx = idx;
      }
    });

    if (clickedNodeIdx !== -1) {
      const targetNode = nodes.current[clickedNodeIdx];
      
      // Deleting node tool
      if (activeTool === 'delete') {
        synth.playPop();
        nodes.current.splice(clickedNodeIdx, 1);
      } else {
        // Drag node
        synth.playPop();
        draggedNodeId.current = targetNode.id;
      }
    } else if (activeTool !== 'delete' && nodes.current.length < 10) {
      // Spawn new node
      synth.playChime();
      nodeIdCounter.current++;
      nodes.current.push({
        id: nodeIdCounter.current,
        x,
        y,
        type: activeTool,
        radius: 35,
        angle: Math.random() * Math.PI * 2,
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Track mouse gravitational comet
    mousePos.current.x = x;
    mousePos.current.y = y;

    // Update dragged node coordinate
    if (draggedNodeId.current !== null) {
      nodes.current.forEach((n) => {
        if (n.id === draggedNodeId.current) {
          n.x = x;
          n.y = y;
        }
      });
    }
  };

  const handleCanvasMouseUp = () => {
    draggedNodeId.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches && e.touches[0]) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;

      let clickedNodeIdx = -1;
      nodes.current.forEach((n, idx) => {
        const dist = Math.hypot(n.x - x, n.y - y);
        if (dist < n.radius + 20) {
          clickedNodeIdx = idx;
        }
      });

      if (clickedNodeIdx !== -1) {
        const targetNode = nodes.current[clickedNodeIdx];
        if (activeTool === 'delete') {
          synth.playPop();
          nodes.current.splice(clickedNodeIdx, 1);
        } else {
          synth.playPop();
          draggedNodeId.current = targetNode.id;
        }
      } else if (activeTool !== 'delete' && nodes.current.length < 10) {
        synth.playChime();
        nodeIdCounter.current++;
        nodes.current.push({
          id: nodeIdCounter.current,
          x,
          y,
          type: activeTool,
          radius: 35,
          angle: Math.random() * Math.PI * 2,
        });
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches && e.touches[0]) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;

      mousePos.current.x = x;
      mousePos.current.y = y;

      if (draggedNodeId.current !== null) {
        nodes.current.forEach((n) => {
          if (n.id === draggedNodeId.current) {
            n.x = x;
            n.y = y;
          }
        });
      }
    }
  };

  const handleMouseLeave = () => {
    mousePos.current.x = -1000;
    mousePos.current.y = -1000;
    draggedNodeId.current = null;
  };

  // Main loop: physics update and render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (particles.current.length === 0) {
        initSandbox();
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      // 1. Draw glowing space backdrop (low opacity clears create particle trails)
      ctx.fillStyle = `rgba(10, 10, 24, ${trailLength})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const activeNodes = nodes.current;
      const pArr = particles.current;

      // 2. Physics & Draw Particle Swarm
      for (let i = 0; i < pArr.length; i++) {
        const p = pArr[i];

        // Apply friction/drag to stabilize orbit spirals
        p.vx *= 0.985;
        p.vy *= 0.985;

        // Apply gravitational pulls/pushes from placed nodes
        let absorbed = false;
        for (let j = 0; j < activeNodes.length; j++) {
          const n = activeNodes[j];
          const dx = n.x - p.x;
          const dy = n.y - p.y;
          const dist = Math.hypot(dx, dy) + 0.1;

          if (n.type === 'swallow') {
            // Event horizon bounds check
            if (dist < 18) {
              absorbed = true;
              // Spawn explosion sparks & shockwave ring
              triggerSwallowExplosion(p.x, p.y, p.color);
              // Respawn particle at screen borders
              const newP = createParticle(canvas.width, canvas.height);
              p.x = newP.x;
              p.y = newP.y;
              p.vx = newP.vx;
              p.vy = newP.vy;
              p.color = newP.color;
              break;
            }

            // Black hole gravity pull (stronger pull close-up)
            const force = 0.95 / (dist * 0.045 + 1.0);
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          } 
          else if (n.type === 'pull') {
            // Star attraction
            const force = 0.65 / (dist * 0.05 + 1.0);
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          } 
          else if (n.type === 'push') {
            // Wind repeller push
            const force = -0.75 / (dist * 0.04 + 1.0);
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        if (absorbed) continue;

        // Mouse gravity pull comet effect
        if (mousePos.current.x > 0) {
          const dxM = mousePos.current.x - p.x;
          const dyM = mousePos.current.y - p.y;
          const distM = Math.hypot(dxM, dyM) + 0.1;
          if (distM < 220) {
            const force = 0.35 / (distM * 0.05 + 1.0);
            p.vx += (dxM / distM) * force;
            p.vy += (dyM / distM) * force;
          }
        }

        // Limit speed to maintain stable orbits
        const speed = Math.hypot(p.vx, p.vy);
        if (speed > speedLimit) {
          p.vx = (p.vx / speed) * speedLimit;
          p.vy = (p.vy / speed) * speedLimit;
        }

        // Apply position
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around borders
        if (p.x < -10) p.x = canvas.width + 10;
        else if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        else if (p.y > canvas.height + 10) p.y = -10;

        // ----------------------------------------------------
        // PREMIUM REDESIGN: Draw Stretched Velocity-Aligned Comet Lines
        // ----------------------------------------------------
        const stretch = Math.min(12, speed * 1.8); // stretch length based on speed
        const angle = Math.atan2(p.vy, p.vx);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);

        // Linear gradient tail fading out
        const cometGrad = ctx.createLinearGradient(-stretch, 0, 0, 0);
        cometGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        cometGrad.addColorStop(0.65, p.color);
        cometGrad.addColorStop(1, '#ffffff'); // bright glowing core head

        ctx.strokeStyle = cometGrad;
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-stretch, 0);
        ctx.lineTo(0, 0);
        ctx.stroke();

        ctx.restore();
      }

      // 3. Draw Sparks & shockwaves
      const sArr = sparks.current;
      for (let i = sArr.length - 1; i >= 0; i--) {
        const s = sArr[i];
        s.x += s.vx;
        s.y += s.vy;
        s.alpha -= s.decay;

        if (s.alpha <= 0) {
          sArr.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = s.alpha;

        if (s.type === 'ring') {
          s.size += 1.6; // expand shockwave ring
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 4. Draw Space Nodes (Pulsating Stars, Swirling Vortexes, Accretion Disks)
      activeNodes.forEach((n) => {
        n.angle += 0.025; // rotate graphic

        ctx.save();
        ctx.translate(n.x, n.y);

        if (n.type === 'pull') {
          // ----------------------------------------------------
          // PREMIUM REDESIGN: Pulsating Solar Corona Star
          // ----------------------------------------------------
          const pulse = Math.sin(Date.now() / 180) * 4.5;
          const rCore = n.radius + pulse;

          // Ambient flare backing glow
          const radial = ctx.createRadialGradient(0, 0, 2, 0, 0, rCore * 1.25);
          radial.addColorStop(0, '#ffffff');
          radial.addColorStop(0.2, '#fde047'); // yellow-300
          radial.addColorStop(0.5, '#f97316'); // orange-500
          radial.addColorStop(0.8, '#dc2626'); // red-600
          radial.addColorStop(1, 'rgba(220, 38, 38, 0)');
          
          ctx.fillStyle = radial;
          ctx.beginPath();
          ctx.arc(0, 0, rCore * 1.25, 0, Math.PI * 2);
          ctx.fill();

          // Rotating breathing corona rays
          ctx.strokeStyle = 'rgba(251, 146, 60, 0.4)'; // orange-400
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';
          const rayCount = 14;
          for (let k = 0; k < rayCount; k++) {
            const rayAngle = (k / rayCount) * Math.PI * 2 + (Date.now() / 1500);
            const rLength = 22 + Math.sin(Date.now() / 100 + k) * 6;
            ctx.beginPath();
            ctx.moveTo(Math.cos(rayAngle) * rCore * 0.4, Math.sin(rayAngle) * rCore * 0.4);
            ctx.lineTo(Math.cos(rayAngle) * (rCore * 0.5 + rLength), Math.sin(rayAngle) * (rCore * 0.5 + rLength));
            ctx.stroke();
          }

          // Core sun spot highlights
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          ctx.arc(-4, -4, rCore * 0.25, 0, Math.PI * 2);
          ctx.fill();
        } 
        else if (n.type === 'push') {
          // ----------------------------------------------------
          // PREMIUM REDESIGN: Double-swirling typhoon Vortex
          // ----------------------------------------------------
          ctx.strokeStyle = '#22d3ee'; // cyan-400
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';

          // Dual spinning bands
          for (let band = 0; band < 3; band++) {
            ctx.save();
            ctx.rotate(n.angle * (band % 2 === 0 ? 1 : -1) + band * (Math.PI / 3));
            ctx.beginPath();
            for (let a = 0; a < 36; a++) {
              const spiralAngle = a * 0.32;
              const r = (n.radius / 36) * a * 0.95;
              ctx.lineTo(Math.cos(spiralAngle) * r, Math.sin(spiralAngle) * r);
            }
            ctx.stroke();
            ctx.restore();
          }

          // Floating neon sparks orbiters
          ctx.fillStyle = '#ffffff';
          for (let k = 0; k < 6; k++) {
            const orbAngle = (k / 6) * Math.PI * 2 - (Date.now() / 250);
            const orbRadius = 26 + Math.sin(Date.now() / 120 + k) * 4.5;
            ctx.beginPath();
            ctx.arc(Math.cos(orbAngle) * orbRadius, Math.sin(orbAngle) * orbRadius, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        } 
        else if (n.type === 'swallow') {
          // ----------------------------------------------------
          // PREMIUM REDESIGN: Warped Accretion Disk (Interstellar style)
          // ----------------------------------------------------
          
          // 1. Accretion disc radial backing
          const accretion = ctx.createRadialGradient(0, 0, 8, 0, 0, n.radius * 1.35);
          accretion.addColorStop(0, '#000000');
          accretion.addColorStop(0.35, '#8b5cf6'); // purple edge
          accretion.addColorStop(0.65, '#f97316'); // hot orange
          accretion.addColorStop(0.9, '#fde047'); // yellow-300 rim
          accretion.addColorStop(1.0, 'rgba(253, 224, 71, 0)');
          
          ctx.fillStyle = accretion;
          ctx.beginPath();
          ctx.arc(0, 0, n.radius * 1.35, 0, Math.PI * 2);
          ctx.fill();

          // 2. Gravitational lensing warped accretion rings
          ctx.save();
          ctx.rotate(n.angle * 0.4);
          
          // Primary lensing horizontal disk
          ctx.strokeStyle = 'rgba(253, 224, 71, 0.88)';
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, n.radius * 1.15, n.radius * 0.35, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Secondary angled cooling disk
          ctx.strokeStyle = 'rgba(139, 92, 246, 0.45)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, n.radius * 0.95, n.radius * 0.62, Math.PI / 4, 0, Math.PI * 2);
          ctx.stroke();

          ctx.restore();

          // 3. Jet/Event horizon black core
          ctx.fillStyle = '#020617';
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.fill();

          // Core border neon corona
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      });

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [trailLength, speedLimit, colorMode]);

  // Swallow explosion handler
  const triggerSwallowExplosion = (x: number, y: number, color: string) => {
    // Throttled sound
    if (Math.random() > 0.93) {
      synth.playLaser();
    }
    
    // 1. Event horizon expanding shockwave ring
    sparks.current.push({
      x,
      y,
      vx: 0,
      vy: 0,
      color: '#a78bfa', // purple event shockwave
      size: 2,
      alpha: 1.0,
      decay: 0.045, // fades out in ~22 frames
      type: 'ring',
    });

    // 2. Debris sparks flying out
    const sparkCount = 8;
    for (let i = 0; i < sparkCount; i++) {
      const angle = (i / sparkCount) * Math.PI * 2 + Math.random() * 0.5;
      const speed = Math.random() * 3.5 + 1.5;
      sparks.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 2,
        alpha: 1.0,
        decay: Math.random() * 0.035 + 0.025,
        type: 'dot',
      });
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden select-none bg-[#050512]">
      <canvas
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleCanvasMouseUp}
        className="w-full h-full block cursor-crosshair"
      />

      {/* Back & Resets */}
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
          onClick={initSandbox}
          className="bg-white/95 hover:bg-white text-slate-600 font-bold p-3 rounded-full border-4 border-slate-200 hover:border-pink-300 shadow-md transition"
          title="Reset Cosmos"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Top right control tool belt */}
      <div className="absolute top-6 right-6 z-10 flex flex-col md:flex-row items-center gap-3 bg-white/90 backdrop-blur-md px-6 py-3 rounded-3xl border-4 border-indigo-100 shadow-md">
        <span className="text-[10px] text-slate-400 font-extrabold uppercase select-none">Cosmic Tool:</span>
        <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-bold text-slate-600">
          <button
            onClick={() => { synth.playPop(); setActiveTool('pull'); }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${activeTool === 'pull' ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-200'}`}
          >
            ☀️ Gravity Star
          </button>
          <button
            onClick={() => { synth.playPop(); setActiveTool('push'); }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${activeTool === 'push' ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-200'}`}
          >
            🌀 Repeller
          </button>
          <button
            onClick={() => { synth.playPop(); setActiveTool('swallow'); }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${activeTool === 'swallow' ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-200'}`}
          >
            🕳️ Black Hole
          </button>
          <button
            onClick={() => { synth.playPop(); setActiveTool('delete'); }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 text-rose-500 ${activeTool === 'delete' ? 'bg-rose-500 text-white shadow' : 'hover:bg-rose-50/50'}`}
          >
            🗑️ Eraser
          </button>
        </div>

        {/* Settings button */}
        <button
          onClick={() => {
            synth.playPop();
            setShowSettings(!showSettings);
          }}
          className="bg-slate-100 hover:bg-slate-200 text-indigo-600 font-bold p-1.5 rounded-xl transition"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Floating customize dropdown settings */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-24 right-6 w-80 bg-white z-20 rounded-3xl p-6 shadow-2xl border-4 border-indigo-100 space-y-6"
          >
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-2 border-slate-100 select-none">
              <Compass className="text-indigo-500" /> Space Customization
            </h3>

            {/* Colors modes */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 select-none">
                <Palette size={12} /> Nebula Colors
              </span>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                <button
                  onClick={() => { synth.playPop(); setColorMode('galaxy'); }}
                  className={`py-1.5 rounded-lg transition ${colorMode === 'galaxy' ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-200'}`}
                >
                  Galaxy 🌌
                </button>
                <button
                  onClick={() => { synth.playPop(); setColorMode('rainbow'); }}
                  className={`py-1.5 rounded-lg transition ${colorMode === 'rainbow' ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-200'}`}
                >
                  Rainbow 🌈
                </button>
                <button
                  onClick={() => { synth.playPop(); setColorMode('neon'); }}
                  className={`py-1.5 rounded-lg transition ${colorMode === 'neon' ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-200'}`}
                >
                  Cyber ⚡
                </button>
              </div>
            </div>

            {/* Orbit Speed limit */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-2 select-none">
                <span>Maximum Speed</span>
                <span className="text-indigo-500 font-extrabold">{speedLimit}</span>
              </div>
              <input
                type="range"
                min="3"
                max="12"
                value={speedLimit}
                onChange={(e) => setSpeedLimit(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Trail length alpha */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-2 select-none">
                <span>Space Trails length</span>
                <span className="text-indigo-500 font-extrabold">
                  {trailLength === 0.02 ? 'Super Long' : trailLength === 0.08 ? 'Normal' : 'Short'}
                </span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.25"
                step="0.03"
                value={trailLength}
                onChange={(e) => setTrailLength(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Volume */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-2 select-none">
                <span>Sound FX Volume</span>
                <span className="text-indigo-500 font-extrabold">{volume}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-slate-400" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Instructions Banner */}
      {showHelper && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/15 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/20 select-none text-center flex items-center gap-3">
          <p className="text-slate-200 text-xs md:text-sm font-semibold drop-shadow-sm flex items-center gap-1.5 justify-center">
            <Sparkles size={16} className="text-yellow-400" /> Tap empty space to place stars, repellers, or black holes! Drag nodes to move them.
          </p>
          <button
            onClick={() => { synth.playPop(); setShowHelper(false); }}
            className="pointer-events-auto hover:bg-white/20 p-1 rounded-full text-slate-300 hover:text-white transition focus:outline-none"
            aria-label="Close instructions"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
