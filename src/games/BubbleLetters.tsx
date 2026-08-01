import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, Volume2, Type, X } from 'lucide-react';
import { synth } from '../utils/synth';

interface LetterItem {
  emoji: string;
  word: string;
  phonics: string;
}

const letterMap: Record<string, LetterItem> = {
  a: { emoji: '🍎', word: 'Apple', phonics: 'ah, ah, Apple' },
  b: { emoji: '🎈', word: 'Balloon', phonics: 'buh, buh, Balloon' },
  c: { emoji: '🐱', word: 'Cat', phonics: 'cuh, cuh, Cat' },
  d: { emoji: '🐶', word: 'Dog', phonics: 'duh, duh, Dog' },
  e: { emoji: '🥚', word: 'Egg', phonics: 'eh, eh, Egg' },
  f: { emoji: '🐟', word: 'Fish', phonics: 'fuh, fuh, Fish' },
  g: { emoji: '🍇', word: 'Grapes', phonics: 'guh, guh, Grapes' },
  h: { emoji: '🎩', word: 'Hat', phonics: 'huh, huh, Hat' },
  i: { emoji: '🍦', word: 'Ice cream', phonics: 'ai, ai, Ice cream' },
  j: { emoji: '🪼', word: 'Jellyfish', phonics: 'juh, juh, Jellyfish' },
  k: { emoji: '🪁', word: 'Kite', phonics: 'kuh, kuh, Kite' },
  l: { emoji: '🦁', word: 'Lion', phonics: 'luh, luh, Lion' },
  m: { emoji: '🐵', word: 'Monkey', phonics: 'muh, muh, Monkey' },
  n: { emoji: '🪺', word: 'Nest', phonics: 'nuh, nuh, Nest' },
  o: { emoji: '🍊', word: 'Orange', phonics: 'ah, ah, Orange' },
  p: { emoji: '🐼', word: 'Panda', phonics: 'puh, puh, Panda' },
  q: { emoji: '👑', word: 'Queen', phonics: 'kwuh, kwuh, Queen' },
  r: { emoji: '🤖', word: 'Robot', phonics: 'ruh, ruh, Robot' },
  s: { emoji: '☀️', word: 'Sun', phonics: 'suh, suh, Sun' },
  t: { emoji: '🐯', word: 'Tiger', phonics: 'tuh, tuh, Tiger' },
  u: { emoji: '☂️', word: 'Umbrella', phonics: 'uh, uh, Umbrella' },
  v: { emoji: '🎻', word: 'Violin', phonics: 'vuh, vuh, Violin' },
  w: { emoji: '🍉', word: 'Watermelon', phonics: 'wuh, wuh, Watermelon' },
  x: { emoji: '🎹', word: 'Xylophone', phonics: 'zuh, zuh, Xylophone' },
  y: { emoji: '🪀', word: 'Yoyo', phonics: 'yuh, yuh, Yoyo' },
  z: { emoji: '🦓', word: 'Zebra', phonics: 'zuh, zuh, Zebra' },
};

interface LetterBubble {
  id: number;
  letter: string;
  emoji: string;
  word: string;
  phonics: string;
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  hue: number;
  opacity: number;
  wobblePhase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hue: number;
  size: number;
  alpha: number;
  decay: number;
}

interface BubbleLettersProps {
  onBack: () => void;
}

export const BubbleLetters: React.FC<BubbleLettersProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Configuration settings
  const [caseMode, setCaseMode] = useState<'uppercase' | 'lowercase'>('uppercase');
  const [voiceMode, setVoiceMode] = useState<'letter' | 'phonics'>('letter');
  const [showHelper, setShowHelper] = useState(true);

  const bubbles = useRef<LetterBubble[]>([]);
  const particles = useRef<Particle[]>([]);
  const bubbleIdCounter = useRef(0);

  useEffect(() => {
    synth.playPop();
    // Pre-populate with a few initial bubbles (A, B, C, D)
    setTimeout(() => {
      spawnLetterBubble('a');
      spawnLetterBubble('b');
      spawnLetterBubble('c');
    }, 200);
  }, []);

  const spawnLetterBubble = (char: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const lowerChar = char.toLowerCase();
    const info = letterMap[lowerChar];
    if (!info) return;

    // Create bubble
    bubbleIdCounter.current++;
    const radius = 55; // large child-friendly size
    const hue = (lowerChar.charCodeAt(0) * 15) % 360;

    // Voice narration
    if (voiceMode === 'letter') {
      const displayChar = caseMode === 'uppercase' ? char.toUpperCase() : char.toLowerCase();
      synth.speak(`${displayChar} is for ${info.word}`);
    } else {
      synth.speak(info.phonics);
    }

    bubbles.current.push({
      id: bubbleIdCounter.current,
      letter: caseMode === 'uppercase' ? lowerChar.toUpperCase() : lowerChar.toLowerCase(),
      emoji: info.emoji,
      word: info.word,
      phonics: info.phonics,
      x: Math.random() * (canvas.width - 150) + 75,
      y: canvas.height + 60, // spawn just off-screen bottom
      radius,
      vx: Math.random() * 2 - 1,
      vy: -(Math.random() * 1.5 + 1.2), // slow upward floats
      hue,
      opacity: 0.65,
      wobblePhase: Math.random() * Math.PI * 2,
    });
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (key.length === 1 && key >= 'a' && key <= 'z') {
      spawnLetterBubble(key);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [caseMode, voiceMode]);

  const clearCanvas = () => {
    synth.playPop();
    bubbles.current = [];
    particles.current = [];
  };

  const popLetterBubble = (b: LetterBubble, index: number) => {
    synth.playPop();
    bubbles.current.splice(index, 1);

    // Spawn sparks
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      particles.current.push({
        x: b.x,
        y: b.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        hue: b.hue,
        size: Math.random() * 4 + 3,
        alpha: 1.0,
        decay: Math.random() * 0.02 + 0.02,
      });
    }
  };

  // Click / Tap bubble pop
  const checkInteraction = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    for (let i = bubbles.current.length - 1; i >= 0; i--) {
      const b = bubbles.current[i];
      const dist = Math.hypot(b.x - x, b.y - y);
      if (dist <= b.radius + 5) {
        popLetterBubble(b, i);
        break;
      }
    }
  };

  // Main canvas animation loop
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
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background gradient sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGrad.addColorStop(0, '#fef08a'); // Amber sky
      skyGrad.addColorStop(1, '#ffedd5'); // Orange bottom
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Bubble-Bubble custom 2D elastic physics collision!
      const bArr = bubbles.current;
      for (let i = 0; i < bArr.length; i++) {
        const b1 = bArr[i];
        for (let j = i + 1; j < bArr.length; j++) {
          const b2 = bArr[j];
          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const dist = Math.hypot(dx, dy);
          const minDist = b1.radius + b2.radius;

          if (dist < minDist) {
            // normal vector
            const nx = dx / dist;
            const ny = dy / dist;

            // push apart to prevent overlap clipping
            const overlap = minDist - dist;
            b1.x -= nx * overlap * 0.5;
            b1.y -= ny * overlap * 0.5;
            b2.x += nx * overlap * 0.5;
            b2.y += ny * overlap * 0.5;

            // elastic collision bounce calculations
            const rvx = b2.vx - b1.vx;
            const rvy = b2.vy - b1.vy;
            const velNormal = rvx * nx + rvy * ny;

            if (velNormal < 0) {
              const restitution = 0.85; // bounce factor
              const impulse = -(1 + restitution) * velNormal * 0.5;
              b1.vx -= nx * impulse;
              b1.vy -= ny * impulse;
              b2.vx += nx * impulse;
              b2.vy += ny * impulse;
            }
          }
        }
      }

      // Update and Draw bubbles
      for (let i = bArr.length - 1; i >= 0; i--) {
        const b = bArr[i];
        b.x += b.vx;
        b.y += b.vy;

        // Bounce off left/right walls
        if (b.x - b.radius < 0) {
          b.x = b.radius;
          b.vx = -b.vx;
        } else if (b.x + b.radius > canvas.width) {
          b.x = canvas.width - b.radius;
          b.vx = -b.vx;
        }

        // Float off top - delete bubble
        if (b.y + b.radius < -50) {
          bArr.splice(i, 1);
          continue;
        }

        // Draw bubble shadow/rim
        ctx.save();
        ctx.translate(b.x, b.y);

        const radialGrad = ctx.createRadialGradient(
          -b.radius * 0.35, -b.radius * 0.35, b.radius * 0.08,
          0, 0, b.radius
        );
        radialGrad.addColorStop(0, '#ffffff');
        radialGrad.addColorStop(0.3, `hsla(${b.hue}, 100%, 75%, 0.65)`);
        radialGrad.addColorStop(1, `hsla(${b.hue}, 100%, 75%, 0.15)`);

        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = radialGrad;
        ctx.fill();

        ctx.strokeStyle = `hsla(${b.hue}, 100%, 65%, 0.8)`;
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // 3D Reflection spec highlights
        ctx.beginPath();
        ctx.arc(-b.radius * 0.35, -b.radius * 0.35, b.radius * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();

        // Draw letter
        ctx.font = 'bold 36px var(--font-fredoka)';
        ctx.fillStyle = `hsla(${b.hue}, 100%, 30%, 1.0)`;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5.5;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(b.letter, 0, -18);
        ctx.fillText(b.letter, 0, -18);

        // Draw emoji
        ctx.font = '32px serif';
        ctx.fillText(b.emoji, 0, 16);

        ctx.restore();
      }

      // Draw sparks particles
      const pArr = particles.current;
      for (let i = pArr.length - 1; i >= 0; i--) {
        const p = pArr[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // gravity
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          pArr.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = `hsl(${p.hue}, 100%, 60%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [caseMode, voiceMode]);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden select-none bg-orange-100">
      <canvas
        ref={canvasRef}
        onMouseDown={(e) => checkInteraction(e.clientX, e.clientY)}
        className="w-full h-full block cursor-pointer"
      />

      {/* Control header left: Exit + Clear */}
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
          onClick={clearCanvas}
          className="bg-white/95 hover:bg-white text-rose-500 font-bold p-3 rounded-full border-4 border-slate-200 hover:border-rose-300 shadow-md transition"
          title="Clear bubbles"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Control panel right: Settings */}
      <div className="absolute top-6 right-6 z-10 flex items-center gap-4 bg-white/90 backdrop-blur-md px-6 py-2.5 rounded-full border-4 border-orange-200 shadow-md">
        {/* Uppercase / Lowercase toggler */}
        <div className="flex items-center gap-1.5 border-r border-slate-200 pr-4">
          <Type className="text-orange-500" size={18} />
          <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-bold text-slate-600">
            <button
              onClick={() => { synth.playPop(); setCaseMode('uppercase'); }}
              className={`px-3 py-1 rounded transition ${caseMode === 'uppercase' ? 'bg-orange-500 text-white shadow' : 'hover:bg-slate-200'}`}
            >
              ABC
            </button>
            <button
              onClick={() => { synth.playPop(); setCaseMode('lowercase'); }}
              className={`px-3 py-1 rounded transition ${caseMode === 'lowercase' ? 'bg-orange-500 text-white shadow' : 'hover:bg-slate-200'}`}
            >
              abc
            </button>
          </div>
        </div>

        {/* Audio spelling mode toggler */}
        <div className="flex items-center gap-1.5">
          <Volume2 className="text-orange-500" size={18} />
          <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-bold text-slate-600">
            <button
              onClick={() => { synth.playPop(); setVoiceMode('letter'); }}
              className={`px-3 py-1 rounded transition ${voiceMode === 'letter' ? 'bg-orange-500 text-white shadow' : 'hover:bg-slate-200'}`}
            >
              A for Apple
            </button>
            <button
              onClick={() => { synth.playPop(); setVoiceMode('phonics'); }}
              className={`px-3 py-1 rounded transition ${voiceMode === 'phonics' ? 'bg-orange-500 text-white shadow' : 'hover:bg-slate-200'}`}
            >
              Phonics (ah, ah)
            </button>
          </div>
        </div>
      </div>

      {/* On-Screen Keyboard buttons (for mobile / click play) */}
      <div className="absolute bottom-6 left-6 right-6 z-10 bg-white/70 backdrop-blur-md p-4 rounded-3xl border-4 border-orange-100 shadow-lg max-w-4xl mx-auto flex flex-wrap justify-center gap-1.5">
        {'abcdefghijklmnopqrstuvwxyz'.split('').map((char) => {
          const displayChar = caseMode === 'uppercase' ? char.toUpperCase() : char;
          const keyHue = (char.charCodeAt(0) * 15) % 360;
          return (
            <button
              key={char}
              onClick={() => spawnLetterBubble(char)}
              style={{ 
                backgroundColor: `hsla(${keyHue}, 100%, 75%, 0.15)`,
                borderColor: `hsla(${keyHue}, 100%, 65%, 0.4)`
              }}
              className="w-10 h-10 md:w-12 md:h-12 border-2 hover:bg-white hover:scale-105 active:scale-95 transition rounded-xl font-black text-slate-700 flex items-center justify-center text-sm md:text-lg focus:outline-none"
            >
              {displayChar}
            </button>
          );
        })}
      </div>

      {/* Floating help notice */}
      {showHelper && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-white/20 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 select-none text-center flex items-center gap-3">
          <p className="text-slate-800 text-xs md:text-sm font-semibold drop-shadow-sm flex items-center gap-1.5">
            🎈 Press a key on your keyboard, click the letter buttons, or tap bubbles to POP!
          </p>
          <button
            onClick={() => { synth.playPop(); setShowHelper(false); }}
            className="pointer-events-auto hover:bg-slate-800/10 p-1 rounded-full text-slate-600 hover:text-rose-600 transition focus:outline-none"
            aria-label="Close instructions"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
