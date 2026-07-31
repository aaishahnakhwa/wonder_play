import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Volume2, Sun, Moon, Palette } from 'lucide-react';
import { synth } from '../utils/synth';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  gravity?: number;
  sparkle?: boolean;
  trail?: { x: number; y: number }[];
}

interface FlowerParticle {
  type: 'stem' | 'petal' | 'butterfly' | 'pollen';
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  angle?: number;
  wiggleSpeed?: number;
  p1x?: number; // Petal curves
  p1y?: number;
  p2x?: number;
  p2y?: number;
  stemTargetY?: number;
  petalsSpawned?: boolean;
}

interface KeyboardFireworksProps {
  onBack: () => void;
}

export const KeyboardFireworks: React.FC<KeyboardFireworksProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeKeys = useRef<Set<string>>(new Set());
  const animationFrameId = useRef<number | null>(null);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [mode, setMode] = useState<'fireworks' | 'flowers'>('fireworks');
  const [density, setDensity] = useState(3.5); // Multiplier for particle counts
  const [speed, setSpeed] = useState(1); // Speed modifier
  const [theme, setTheme] = useState<'dark' | 'light' | 'magical'>('dark');
  const [volume, setVolume] = useState(synth.getVolume() * 100);
  const [effectsEnabled, setEffectsEnabled] = useState(true);

  // Arrays of drawing elements
  const particles = useRef<Particle[]>([]);
  const flowerElements = useRef<FlowerParticle[]>([]);

  useEffect(() => {
    synth.playPop();
  }, []);

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    synth.setVolume(val / 100);
  };

  // Helper to get color from a key press
  const getColorFromKey = (key: string) => {
    const code = key.toLowerCase().charCodeAt(0) || 120;
    const hue = (code * 17) % 360;
    return `hsl(${hue}, 100%, ${theme === 'light' ? '50%' : '65%'})`;
  };

  // Trigger effect at position
  const spawnEffect = (key: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Pick random location
    const x = Math.random() * (canvas.width - 200) + 100;
    const y = mode === 'fireworks' 
      ? Math.random() * (canvas.height - 250) + 100 
      : canvas.height - 20; // Flowers grow from bottom

    const color = getColorFromKey(key);

    if (mode === 'fireworks') {
      synth.playBoom();
      // Rocket trail
      const particleCount = Math.floor(25 * density);
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speedScale = (1 + Math.random() * 6) * speed;
        particles.current.push({
          x,
          y,
          vx: Math.cos(angle) * speedScale,
          vy: Math.sin(angle) * speedScale - (Math.random() * 2), // Slight upward push
          color,
          size: Math.random() * 3 + 2,
          alpha: 1,
          decay: Math.random() * 0.015 + 0.01,
          gravity: 0.08,
          sparkle: Math.random() > 0.4,
          trail: [],
        });
      }
    } else {
      synth.playChime();
      // Stem starts growing from bottom
      const targetY = canvas.height - (Math.random() * 300 + 150);
      flowerElements.current.push({
        type: 'stem',
        x,
        y: canvas.height,
        vx: 0,
        vy: -4 * speed,
        color: '#22c55e', // Green stem
        size: Math.random() * 4 + 4,
        alpha: 1,
        decay: 0.005,
        stemTargetY: targetY,
        petalsSpawned: false,
      });
    }
  };

  // Handle keys holding
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid tracking repeats or meta keys
      if (e.repeat || e.ctrlKey || e.altKey || e.metaKey || e.key === 'Escape') return;
      activeKeys.current.add(e.key);
      spawnEffect(e.key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mode, density, speed, theme]);

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let frameCount = 0;

    const render = () => {
      frameCount++;

      // Background clearing depending on theme
      if (theme === 'dark') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.2)'; // Tailwind slate-900 with alpha for trails
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (theme === 'light') {
        ctx.fillStyle = 'rgba(254, 252, 240, 0.2)'; // Soft off-white
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        // Magical: Deep Purple gradient trails
        ctx.fillStyle = 'rgba(29, 14, 52, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Continuous key press emitter
      if (frameCount % 8 === 0 && activeKeys.current.size > 0) {
        activeKeys.current.forEach((key) => {
          spawnEffect(key);
        });
      }

      // 1. Draw Fireworks Particles
      const pArr = particles.current;
      for (let i = pArr.length - 1; i >= 0; i--) {
        const p = pArr[i];
        p.vy += p.gravity || 0;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          pArr.splice(i, 1);
          continue;
        }

        // Keep trail
        if (effectsEnabled) {
          p.trail?.push({ x: p.x, y: p.y });
          if (p.trail && p.trail.length > 5) p.trail.shift();
        }

        // Draw trail
        if (effectsEnabled && p.trail && p.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let k = 1; k < p.trail.length; k++) {
            ctx.lineTo(p.trail[k].x, p.trail[k].y);
          }
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * 0.5;
          ctx.globalAlpha = p.alpha * 0.4;
          ctx.stroke();
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        
        if (effectsEnabled) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
        }
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow

        // Sparkle overlays
        if (effectsEnabled && p.sparkle && Math.random() > 0.6) {
          ctx.beginPath();
          ctx.arc(p.x + (Math.random() * 6 - 3), p.y + (Math.random() * 6 - 3), p.size * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = p.alpha * 0.8;
          ctx.fill();
        }
      }

      // 2. Draw Flower/Nature Elements
      const fArr = flowerElements.current;
      for (let i = fArr.length - 1; i >= 0; i--) {
        const f = fArr[i];
        f.x += f.vx;
        f.y += f.vy;

        if (f.type === 'stem') {
          // Keep drawing stem downward
          ctx.beginPath();
          ctx.moveTo(f.x, canvas.height);
          ctx.lineTo(f.x, f.y);
          ctx.strokeStyle = f.color;
          ctx.lineWidth = f.size;
          ctx.lineCap = 'round';
          ctx.globalAlpha = f.alpha;
          ctx.stroke();

          // Sprout leaves on stem
          if (canvas.height - f.y > 60) {
            ctx.beginPath();
            ctx.ellipse(f.x - 8, f.y + 40, 8, 4, -Math.PI/6, 0, Math.PI * 2);
            ctx.ellipse(f.x + 8, f.y + 25, 8, 4, Math.PI/6, 0, Math.PI * 2);
            ctx.fillStyle = '#15803d';
            ctx.fill();
          }

          // Trigger flowers blooming at top target Y
          if (f.y <= (f.stemTargetY || 300)) {
            f.vy = 0; // Stop stem growth
            if (!f.petalsSpawned) {
              f.petalsSpawned = true;
              const flowerColor = getColorFromKey(String.fromCharCode(65 + Math.floor(Math.random() * 26)));
              // Spawn petals
              const petalCount = 6 + Math.floor(Math.random() * 4);
              for (let k = 0; k < petalCount; k++) {
                const angle = (k / petalCount) * Math.PI * 2;
                fArr.push({
                  type: 'petal',
                  x: f.x,
                  y: f.y,
                  vx: Math.cos(angle) * 1.5 * speed,
                  vy: Math.sin(angle) * 1.5 * speed,
                  color: flowerColor,
                  size: Math.random() * 10 + 10,
                  alpha: 1,
                  decay: Math.random() * 0.01 + 0.015,
                  angle: angle,
                });
              }
              // Spawn pollen
              const pollenCount = 10;
              for (let p = 0; p < pollenCount; p++) {
                const pAngle = Math.random() * Math.PI * 2;
                const pSpeed = Math.random() * 2;
                fArr.push({
                  type: 'pollen',
                  x: f.x,
                  y: f.y,
                  vx: Math.cos(pAngle) * pSpeed * speed,
                  vy: Math.sin(pAngle) * pSpeed * speed - 1,
                  color: '#fbbf24', // Gold pollen
                  size: Math.random() * 2 + 1,
                  alpha: 1,
                  decay: Math.random() * 0.02 + 0.01,
                });
              }
              // Spawn butterfly
              if (Math.random() > 0.4) {
                fArr.push({
                  type: 'butterfly',
                  x: f.x,
                  y: f.y - 10,
                  vx: (Math.random() * 2 - 1) * speed,
                  vy: -2 * speed,
                  color: flowerColor,
                  size: Math.random() * 5 + 8,
                  alpha: 1,
                  decay: 0.008,
                  wiggleSpeed: Math.random() * 0.2 + 0.1,
                  angle: Math.random() * Math.PI * 2,
                });
              }
              // Mark stem to fade away slowly
              f.decay = 0.008;
            }
          }

          // Slow stem fade
          if (f.petalsSpawned) {
            f.alpha -= f.decay;
            if (f.alpha <= 0) {
              fArr.splice(i, 1);
            }
          }
        } else if (f.type === 'petal') {
          // Petals float slightly outwards, then drift down
          f.vx *= 0.95;
          f.vy = f.vy * 0.9 + 0.3; // Gravity drift
          f.alpha -= f.decay;

          if (f.alpha <= 0) {
            fArr.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.translate(f.x, f.y);
          ctx.rotate(f.angle || 0);
          ctx.beginPath();
          ctx.ellipse(0, 0, f.size, f.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fillStyle = f.color;
          ctx.globalAlpha = f.alpha;
          ctx.fill();
          
          // Petal center line
          ctx.beginPath();
          ctx.moveTo(-f.size, 0);
          ctx.lineTo(0, 0);
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.restore();
        } else if (f.type === 'pollen') {
          f.vx += (Math.random() * 0.2 - 0.1) * speed;
          f.vy += 0.02; // Gentle fall
          f.alpha -= f.decay;

          if (f.alpha <= 0) {
            fArr.splice(i, 1);
            continue;
          }

          ctx.beginPath();
          ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
          ctx.fillStyle = f.color;
          ctx.globalAlpha = f.alpha;
          ctx.fill();
        } else if (f.type === 'butterfly') {
          // Flaps wings, wiggles
          f.angle = (f.angle || 0) + (f.wiggleSpeed || 0.1);
          f.vx += Math.sin(f.angle) * 0.4 * speed;
          f.vy += (Math.random() * 0.6 - 0.3) * speed;
          f.alpha -= f.decay;

          if (f.alpha <= 0) {
            fArr.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.translate(f.x, f.y);
          ctx.globalAlpha = f.alpha;

          const wingScaleX = Math.abs(Math.sin(f.angle * 2.5)); // Flap motion

          // Left wing
          ctx.beginPath();
          ctx.ellipse(-f.size * 0.6 * wingScaleX, -f.size * 0.5, f.size * 0.6 * wingScaleX, f.size * 0.8, -Math.PI / 8, 0, Math.PI * 2);
          ctx.fillStyle = f.color;
          ctx.fill();

          // Right wing
          ctx.beginPath();
          ctx.ellipse(f.size * 0.6 * wingScaleX, -f.size * 0.5, f.size * 0.6 * wingScaleX, f.size * 0.8, Math.PI / 8, 0, Math.PI * 2);
          ctx.fillStyle = f.color;
          ctx.fill();

          // Body
          ctx.beginPath();
          ctx.ellipse(0, 0, f.size * 0.15, f.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#1e293b';
          ctx.fill();

          ctx.restore();
        }
      }

      ctx.globalAlpha = 1;
      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [mode, density, speed, theme, effectsEnabled]);

  // Click on canvas generates effect
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const color = getColorFromKey(randomLetter);

    if (mode === 'fireworks') {
      synth.playBoom();
      const particleCount = Math.floor(25 * density);
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speedScale = (1 + Math.random() * 6) * speed;
        particles.current.push({
          x: clickX,
          y: clickY,
          vx: Math.cos(angle) * speedScale,
          vy: Math.sin(angle) * speedScale - (Math.random() * 2),
          color,
          size: Math.random() * 3 + 2,
          alpha: 1,
          decay: Math.random() * 0.015 + 0.01,
          gravity: 0.08,
          sparkle: Math.random() > 0.4,
          trail: [],
        });
      }
    } else {
      synth.playChime();
      const targetY = clickY;
      flowerElements.current.push({
        type: 'stem',
        x: clickX,
        y: canvas.height,
        vx: 0,
        vy: -4 * speed,
        color: '#22c55e',
        size: Math.random() * 4 + 4,
        alpha: 1,
        decay: 0.005,
        stemTargetY: targetY,
        petalsSpawned: false,
      });
    }
  };

  const getBackgroundClass = () => {
    if (theme === 'dark') return 'bg-slate-950';
    if (theme === 'light') return 'bg-[#fefcf0]';
    return 'bg-gradient-to-b from-[#1a0b2e] via-[#0b031b] to-[#120024]';
  };

  return (
    <div className={`fixed inset-0 w-full h-full overflow-hidden ${getBackgroundClass()}`}>
      <canvas 
        ref={canvasRef} 
        onClick={handleCanvasClick}
        className="w-full h-full block cursor-crosshair"
      />

      {/* Return Button */}
      <button
        onClick={() => {
          synth.playPop();
          onBack();
        }}
        className="absolute top-6 left-6 z-20 bg-white/90 hover:bg-white text-slate-800 font-bold px-6 py-3 rounded-full border-4 border-slate-200 hover:border-pink-300 shadow-md hover:scale-105 transition active:scale-95"
      >
        &larr; Back to Playground
      </button>

      {/* Right Control Settings button */}
      <button
        onClick={() => {
          synth.playPop();
          setShowSettings(true);
        }}
        className="absolute top-6 right-6 z-20 bg-white/90 hover:bg-white text-pink-500 font-bold p-3 rounded-full border-4 border-pink-100 hover:border-pink-300 shadow-md hover:scale-105 transition active:scale-95"
        aria-label="Settings"
      >
        <Settings size={24} />
      </button>

      {/* Floating Instructions Banner */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/20 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 pointer-events-none select-none text-center">
        <p className="text-white text-sm md:text-base font-semibold drop-shadow-md tracking-wider">
          ⌨️ Press any key on your keyboard or tap the screen to play!
        </p>
      </div>

      {/* Settings Modal Drawer */}
      <AnimatePresence>
        {showSettings && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black z-30"
            />

            {/* Sidebar drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-white z-40 rounded-l-3xl p-6 shadow-2xl flex flex-col justify-between border-l-4 border-pink-100 overflow-y-auto"
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Settings className="text-pink-500" /> Playground Settings
                  </h3>
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Mode switch */}
                  <div>
                    <span className="block text-sm font-bold text-slate-600 mb-2">Visual Mode</span>
                    <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                      <button
                        onClick={() => { synth.playPop(); setMode('fireworks'); }}
                        className={`py-2 rounded-lg font-bold text-sm transition ${mode === 'fireworks' ? 'bg-pink-500 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        🎆 Fireworks
                      </button>
                      <button
                        onClick={() => { synth.playPop(); setMode('flowers'); }}
                        className={`py-2 rounded-lg font-bold text-sm transition ${mode === 'flowers' ? 'bg-emerald-500 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        🌸 Flowers
                      </button>
                    </div>
                  </div>

                  {/* Particle density */}
                  <div>
                    <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                      <span>Particle Density</span>
                      <span className="text-pink-500">{Math.round(density * 20)}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="6"
                      step="0.5"
                      value={density}
                      onChange={(e) => setDensity(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-pink-500"
                    />
                  </div>

                  {/* Speed */}
                  <div>
                    <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                      <span>Explosion Speed</span>
                      <span className="text-pink-500">{speed}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={speed}
                      onChange={(e) => setSpeed(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-pink-500"
                    />
                  </div>

                  {/* Themes */}
                  <div>
                    <span className="block text-sm font-bold text-slate-600 mb-2">Background Theme</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { synth.playPop(); setTheme('dark'); }}
                        className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-xs font-bold transition ${theme === 'dark' ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-100 bg-slate-50 text-slate-600'}`}
                      >
                        <Moon size={16} /> Dark
                      </button>
                      <button
                        onClick={() => { synth.playPop(); setTheme('light'); }}
                        className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-xs font-bold transition ${theme === 'light' ? 'border-pink-300 bg-amber-50 text-slate-800' : 'border-slate-100 bg-slate-50 text-slate-600'}`}
                      >
                        <Sun size={16} /> Light
                      </button>
                      <button
                        onClick={() => { synth.playPop(); setTheme('magical'); }}
                        className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-xs font-bold transition ${theme === 'magical' ? 'border-purple-500 bg-purple-900/50 text-white' : 'border-slate-100 bg-slate-50 text-slate-600'}`}
                      >
                        <Palette size={16} /> Magical
                      </button>
                    </div>
                  </div>

                  {/* Volume */}
                  <div>
                    <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                      <span>Sound Effects</span>
                      <span className="text-pink-500">{volume}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Volume2 size={16} className="text-slate-400" />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-pink-500"
                      />
                    </div>
                  </div>

                  {/* Glow Effects toggle */}
                  <div className="flex items-center justify-between py-2 border-t border-slate-100">
                    <span className="text-sm font-bold text-slate-600">Glow Effects</span>
                    <button
                      onClick={() => { synth.playPop(); setEffectsEnabled(!effectsEnabled); }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${effectsEnabled ? 'bg-pink-500' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${effectsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-center text-xs font-semibold text-slate-400 mt-8">
                Press multiple keys at once for huge combo effects! 🌟
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
