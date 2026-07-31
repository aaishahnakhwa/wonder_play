import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  CircleDot, 
  Paintbrush, 
  Flower2, 
  Sprout, 
  CloudRain, 
  Smile, 
  Volume2, 
  VolumeX,
  Compass
} from 'lucide-react';
import { synth } from '../utils/synth';

interface GameCard {
  id: string;
  title: string;
  description: string;
  emoji: string;
  icon: React.ComponentType<any>;
  gradient: string;
  neonGlow: string;
  delay: number;
}

const games: GameCard[] = [
  {
    id: 'keyboard-fireworks',
    title: 'Keyboard Fireworks',
    description: 'Press keys to launch spectacular fireworks or watch colorful flowers bloom!',
    emoji: '🎆',
    icon: Sparkles,
    gradient: 'from-purple-500/80 via-pink-500/80 to-red-500/80',
    neonGlow: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] border-purple-300/40',
    delay: 0.1,
  },
  {
    id: 'bubble-pop',
    title: 'Bubble Pop',
    description: 'Pop floating physics bubbles! Discover golden and rainbow surprise bonuses.',
    emoji: '🫧',
    icon: CircleDot,
    gradient: 'from-blue-500/80 via-cyan-500/80 to-indigo-500/80',
    neonGlow: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] border-blue-300/40',
    delay: 0.2,
  },
  {
    id: 'rainbow-paint',
    title: 'Rainbow Paint',
    description: 'Paint in rainbow, neon, or glitter! Draw snowflake kaleidoscope mirrors.',
    emoji: '🎨',
    icon: Paintbrush,
    gradient: 'from-yellow-500/80 via-orange-500/80 to-red-500/80',
    neonGlow: 'hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] border-orange-300/40',
    delay: 0.3,
  },
  {
    id: 'butterfly-garden',
    title: 'Butterfly Garden',
    description: 'Grow flowers and follow friendly steering butterflies in a peaceful forest.',
    emoji: '🦋',
    icon: Flower2,
    gradient: 'from-emerald-500/80 to-teal-500/80',
    neonGlow: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] border-emerald-300/40',
    delay: 0.4,
  },
  {
    id: 'magic-garden',
    title: 'Magic Garden',
    description: 'Click to grow procedural plants, glowing mushrooms, and fantasy creatures!',
    emoji: '🍄',
    icon: Sprout,
    gradient: 'from-green-500/80 via-emerald-500/80 to-teal-600/80',
    neonGlow: 'hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] border-green-300/40',
    delay: 0.5,
  },
  {
    id: 'rain-maker',
    title: 'Rain Maker',
    description: 'Create clouds and release rain to water the soil and grow a lively ecosystem!',
    emoji: '🌧️',
    icon: CloudRain,
    gradient: 'from-sky-500/80 via-blue-500/80 to-indigo-500/80',
    neonGlow: 'hover:shadow-[0_0_30px_rgba(14,165,233,0.5)] border-sky-300/40',
    delay: 0.6,
  },
  {
    id: 'bubble-letters',
    title: 'Alphabet Bubbles',
    description: 'Pop letters bubbles to hear phonetic pronunciations and see matching objects!',
    emoji: '🔤',
    icon: Smile,
    gradient: 'from-amber-500/80 via-orange-500/80 to-yellow-600/80',
    neonGlow: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] border-amber-300/40',
    delay: 0.7,
  },
  {
    id: 'geo-sandbox',
    title: 'Geo Sandbox',
    description: 'Sculpt mountains and canyons. Watch topographical maps color and water flow.',
    emoji: '🗺️',
    icon: Compass,
    gradient: 'from-emerald-500/80 via-yellow-500/80 to-blue-500/80',
    neonGlow: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] border-teal-300/40',
    delay: 0.8,
  },
  {
    id: 'space-swirl',
    title: 'Space Swirl',
    description: 'Orbit thousands of velocity comets around gravity stars and warped black holes!',
    emoji: '🌌',
    icon: Sparkles,
    gradient: 'from-slate-900/90 via-indigo-950/90 to-purple-950/90',
    neonGlow: 'hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] border-indigo-400/40',
    delay: 0.9,
  },
];

interface BackgroundParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface HomeProps {
  onSelectGame: (gameId: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onSelectGame }) => {
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [volume, setVolume] = useState(synth.getVolume() * 100);
  const [isMuted, setIsMuted] = useState(false);

  // Background floating bubble animation
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize 35 soft background bubbles
    const bgBubbles: BackgroundParticle[] = Array.from({ length: 35 }, () => {
      const colors = ['#fbcfe8', '#cbd5e1', '#fed7aa', '#bae6fd', '#a7f3d0', '#c084fc'];
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: Math.random() * 0.4 - 0.2,
        vy: Math.random() * 0.4 - 0.2,
        radius: Math.random() * 20 + 20,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    });

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw soft gradient background clearing
      const radial = ctx.createLinearGradient(0, 0, 0, canvas.height);
      radial.addColorStop(0, '#fefcf0'); // off yellow
      radial.addColorStop(1, '#fff5f5'); // soft pink bottom
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw floating bubbles
      bgBubbles.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;

        // Bounce
        if (b.x - b.radius < 0 || b.x + b.radius > canvas.width) b.vx = -b.vx;
        if (b.y - b.radius < 0 || b.y + b.radius > canvas.height) b.vy = -b.vy;

        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setVolume(val);
    synth.setVolume(val / 100);
    if (val > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    if (isMuted) {
      synth.setVolume(volume / 100);
      setIsMuted(false);
      synth.playPop();
    } else {
      synth.setVolume(0);
      setIsMuted(true);
    }
  };

  const handleCardClick = (gameId: string) => {
    synth.playPop();
    onSelectGame(gameId);
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden pb-16 px-4 md:px-8">
      {/* Dynamic drifting stardust background */}
      <canvas ref={bgCanvasRef} className="absolute inset-0 w-full h-full block pointer-events-none z-0" />

      {/* Header Panel */}
      <header className="max-w-6xl mx-auto pt-8 pb-4 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
        <div className="text-center md:text-left select-none">
          <motion.h1 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 100, damping: 10 }}
            className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 via-blue-500 to-emerald-500 drop-shadow-sm select-none cursor-default filter hover:hue-rotate-60 transition-all duration-1000"
          >
            Kids Playground 🎪
          </motion.h1>
          <p className="text-md md:text-lg text-slate-500 font-bold mt-2">
            A beautiful, wobbly sensory toybox for curious explorers!
          </p>
        </div>

        {/* Global Volume Controller with frosted glass styling */}
        <motion.div 
          className="flex items-center gap-3 bg-white/40 border border-white/40 backdrop-blur-lg px-5 py-3 rounded-full shadow-lg"
          whileHover={{ scale: 1.05 }}
        >
          <button 
            onClick={toggleMute}
            className="text-slate-600 hover:text-pink-500 transition-colors focus:outline-none"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}
          </button>
          <input 
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-24 md:w-32 h-3 bg-pink-100/50 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />
          <span className="text-pink-600 font-black w-8 text-center">{isMuted ? 0 : volume}%</span>
        </motion.div>
      </header>

      {/* Main Grid of Games */}
      <main className="max-w-6xl mx-auto mt-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {games.map((game) => {
            const IconComponent = game.icon;
            return (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 90, delay: game.delay }}
                whileHover={{ 
                  scale: 1.04,
                  rotate: [0, -0.6, 0.6, -0.6, 0],
                  transition: { duration: 0.3 }
                }}
                onClick={() => handleCardClick(game.id)}
                className={`group relative cursor-pointer overflow-hidden rounded-[2rem] p-8 text-white shadow-xl border-2 transition-all duration-300 bg-gradient-to-br ${game.gradient} ${game.neonGlow}`}
              >
                {/* Floating graphic element */}
                <div className="absolute -right-3 -bottom-3 text-7xl opacity-20 select-none pointer-events-none transition-transform group-hover:scale-115 group-hover:translate-x-1 duration-300">
                  {game.emoji}
                </div>

                <div className="flex justify-between items-start mb-6">
                  {/* Frosted Icon wrapper */}
                  <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner">
                    <IconComponent size={28} className="stroke-[2.5]" />
                  </div>
                  <span className="text-4xl filter drop-shadow-md transform transition-transform group-hover:scale-120 duration-300">
                    {game.emoji}
                  </span>
                </div>

                <h2 className="text-2xl font-black mb-3 drop-shadow-sm select-none">
                  {game.title}
                </h2>
                
                <p className="text-white/90 text-sm font-bold leading-relaxed select-none">
                  {game.description}
                </p>

                <div className="mt-6 flex justify-end">
                  <span className="bg-white/10 group-hover:bg-white/30 font-bold px-4 py-2 rounded-full text-xs uppercase tracking-wider backdrop-blur-md border border-white/20 transition-all duration-200">
                    Explore &rarr;
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-slate-400 mt-20 font-bold select-none">
        <p>🌟 Press, drag, and click to play! Designed for curious minds. 🌟</p>
      </footer>
    </div>
  );
};
