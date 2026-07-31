import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock, Zap, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { synth } from '../utils/synth';

interface Bubble {
  id: number;
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  color: string;
  opacity: number;
  type: 'normal' | 'gold' | 'rainbow' | 'giant-star' | 'surprise';
  wobbleSpeed: number;
  wobblePhase: number;
  wobbleAmp: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  decay: number;
  type?: 'circle' | 'star' | 'butterfly';
  angle?: number;
  wiggle?: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  scale: number;
}

interface BubblePopProps {
  onBack: () => void;
}

export const BubblePop: React.FC<BubblePopProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Game state
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [gameTime, setGameTime] = useState(0); // Count up
  
  // Internal refs
  const bubbles = useRef<Bubble[]>([]);
  const particles = useRef<Particle[]>([]);
  const floatingTexts = useRef<FloatingText[]>([]);
  const lastPopTime = useRef<number>(0);
  const bubbleIdCounter = useRef<number>(0);
  const screenShake = useRef<number>(0);
  const density = useRef<number>(15); // initial bubble target count

  // Screen shake wrapper CSS transform values
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    synth.playPop();

    // Timer
    const timer = setInterval(() => {
      setGameTime(prev => prev + 1);
      // Gradually increase density over time (max 40)
      if (density.current < 40 && Math.random() > 0.7) {
        density.current += 1;
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const resetGame = () => {
    synth.playPop();
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setGameTime(0);
    density.current = 15;
    bubbles.current = [];
    particles.current = [];
    floatingTexts.current = [];
    spawnInitialBubbles();
  };

  // Helper to spawn a bubble
  const createBubble = (
    x: number, 
    y: number, 
    type?: Bubble['type'], 
    radiusOverride?: number
  ): Bubble => {
    bubbleIdCounter.current++;
    const rTypes: Bubble['type'][] = ['normal', 'normal', 'normal', 'gold', 'rainbow', 'giant-star', 'surprise'];
    const bubbleType = type || rTypes[Math.floor(Math.random() * rTypes.length)];

    let radius = Math.random() * 20 + 25; // 25 to 45
    let color = '';
    let opacity = 0.4 + Math.random() * 0.3;

    if (bubbleType === 'gold') {
      radius = Math.random() * 15 + 25;
      color = '45, 100%, 60%'; // Gold
    } else if (bubbleType === 'rainbow') {
      radius = Math.random() * 15 + 30;
      color = '300, 100%, 70%'; // Placeholder for gradient drawing
    } else if (bubbleType === 'giant-star') {
      radius = Math.random() * 20 + 55; // Huge
      color = '190, 100%, 65%'; // Sky Blue
    } else if (bubbleType === 'surprise') {
      radius = Math.random() * 15 + 35;
      color = '280, 100%, 70%'; // Purple
    } else {
      // Normal colorful bubble
      const hue = Math.floor(Math.random() * 360);
      color = `${hue}, 100%, 75%`;
    }

    if (radiusOverride) {
      radius = radiusOverride;
    }

    return {
      id: bubbleIdCounter.current,
      x,
      y,
      radius,
      vx: (Math.random() * 1 - 0.5) * 1.5,
      vy: -(Math.random() * 1.5 + 0.8), // Floating up
      color,
      opacity,
      type: bubbleType,
      wobbleSpeed: Math.random() * 0.03 + 0.015,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleAmp: Math.random() * 2 + 1,
    };
  };

  const spawnInitialBubbles = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    for (let i = 0; i < density.current; i++) {
      bubbles.current.push(
        createBubble(
          Math.random() * canvas.width, 
          Math.random() * (canvas.height - 100) + canvas.height * 0.2
        )
      );
    }
  };

  // Trigger pop action
  const popBubble = (bubble: Bubble, index: number) => {
    // 1. Remove bubble
    bubbles.current.splice(index, 1);

    // 2. Play sound effects
    if (bubble.type === 'gold') {
      synth.playChime();
    } else {
      synth.playPop();
    }

    // 3. Screen shake logic
    if (bubble.radius > 45) {
      screenShake.current = 12; // Big shake
    } else if (bubble.radius > 30) {
      screenShake.current = 5;
    }

    // 4. Update Combo system
    const now = Date.now();
    let newCombo = 1;
    if (now - lastPopTime.current < 1200) {
      newCombo = combo + 1;
    }
    setCombo(newCombo);
    if (newCombo > maxCombo) setMaxCombo(newCombo);
    lastPopTime.current = now;

    // 5. Add Score
    let points = 1;
    if (bubble.type === 'gold') points = 10;
    const finalPoints = points * newCombo;
    setScore(prev => prev + finalPoints);

    // 6. Spawn float score text
    floatingTexts.current.push({
      x: bubble.x,
      y: bubble.y,
      text: `+${finalPoints}${newCombo > 1 ? ` (${newCombo}x!)` : ''}`,
      color: bubble.type === 'gold' ? '#f59e0b' : '#3b82f6',
      alpha: 1,
      scale: 1,
    });

    // 7. Spark/Particle explosions
    const pArr = particles.current;
    const pCount = Math.floor(bubble.radius * 0.6);

    // Standard pop particles
    for (let i = 0; i < pCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      pArr.push({
        x: bubble.x,
        y: bubble.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: bubble.type === 'gold' ? 'hsl(45, 100%, 65%)' : `hsl(${bubble.color})`,
        radius: Math.random() * 3 + 2,
        alpha: 1,
        decay: Math.random() * 0.02 + 0.02,
        type: 'circle',
      });
    }

    // Special bubble mechanics
    if (bubble.type === 'rainbow') {
      // Splits into 3 smaller bubbles
      for (let i = 0; i < 3; i++) {
        const splitB = createBubble(bubble.x, bubble.y, 'normal', 18);
        splitB.vx = (Math.random() * 4 - 2);
        splitB.vy = (Math.random() * 4 - 2);
        bubbles.current.push(splitB);
      }
    } else if (bubble.type === 'giant-star') {
      // Releases star particles
      const starCount = 8;
      for (let i = 0; i < starCount; i++) {
        const angle = (i / starCount) * Math.PI * 2;
        pArr.push({
          x: bubble.x,
          y: bubble.y,
          vx: Math.cos(angle) * 3,
          vy: Math.sin(angle) * 3,
          color: '#fbbf24', // Gold star
          radius: 8,
          alpha: 1,
          decay: 0.015,
          type: 'star',
        });
      }
    } else if (bubble.type === 'surprise') {
      // Confetti burst!
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { x: bubble.x / window.innerWidth, y: bubble.y / window.innerHeight }
      });

      // Spawn butterfly particles
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        pArr.push({
          x: bubble.x,
          y: bubble.y,
          vx: Math.cos(angle) * 2,
          vy: Math.sin(angle) * 2 - 1,
          color: `hsl(${Math.random() * 360}, 100%, 70%)`,
          radius: 10,
          alpha: 1,
          decay: 0.008,
          type: 'butterfly',
          angle: Math.random() * Math.PI * 2,
          wiggle: Math.random() * 0.2 + 0.1,
        });
      }
    }
  };

  // Pop detection on Move/Tap
  const checkInteraction = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Search backwards to pop overlapping topmost bubbles first
    for (let i = bubbles.current.length - 1; i >= 0; i--) {
      const b = bubbles.current[i];
      const dist = Math.hypot(b.x - x, b.y - y);
      if (dist <= b.radius + 5) { // Add 5px tolerance
        popBubble(b, i);
        break; // Pop one bubble per tap/hover event for premium feel
      }
    }
  };

  // Event handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    checkInteraction(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches && e.touches[0]) {
      checkInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  // Main Canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (bubbles.current.length === 0) spawnInitialBubbles();
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      // 1. Handle screen shake
      if (screenShake.current > 0.1) {
        const dx = (Math.random() - 0.5) * screenShake.current;
        const dy = (Math.random() - 0.5) * screenShake.current;
        setShakeOffset({ x: dx, y: dy });
        screenShake.current *= 0.9; // decay
      } else {
        setShakeOffset({ x: 0, y: 0 });
      }

      // Clear Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGrad.addColorStop(0, '#e0f2fe'); // light blue
      skyGrad.addColorStop(1, '#fef08a'); // soft yellow bottom
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw decorative cartoon background clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      // Cloud 1
      ctx.beginPath();
      ctx.arc(200, 150, 60, 0, Math.PI * 2);
      ctx.arc(280, 130, 80, 0, Math.PI * 2);
      ctx.arc(360, 150, 60, 0, Math.PI * 2);
      ctx.fill();

      // Cloud 2
      ctx.beginPath();
      ctx.arc(canvas.width - 250, 220, 50, 0, Math.PI * 2);
      ctx.arc(canvas.width - 180, 200, 70, 0, Math.PI * 2);
      ctx.arc(canvas.width - 110, 220, 50, 0, Math.PI * 2);
      ctx.fill();

      // 2. Maintain density
      while (bubbles.current.length < density.current) {
        bubbles.current.push(createBubble(Math.random() * canvas.width, canvas.height + 50));
      }

      // 3. Draw Bubbles
      const bArr = bubbles.current;
      for (let i = bArr.length - 1; i >= 0; i--) {
        const b = bArr[i];
        
        // Gentle organic wobble
        b.wobblePhase += b.wobbleSpeed;
        const wobbleX = Math.sin(b.wobblePhase) * b.wobbleAmp;

        // Apply velocity
        b.x += b.vx + wobbleX * 0.1;
        b.y += b.vy;

        // Bounce left/right boundaries
        if (b.x - b.radius < 0) {
          b.x = b.radius;
          b.vx = -b.vx;
        } else if (b.x + b.radius > canvas.width) {
          b.x = canvas.width - b.radius;
          b.vx = -b.vx;
        }

        // Float off top - wrap to bottom
        if (b.y + b.radius < -50) {
          bArr.splice(i, 1);
          continue;
        }

        // Draw bubble body
        ctx.save();
        ctx.translate(b.x, b.y);

        // Highlight gradient
        const radialGrad = ctx.createRadialGradient(
          -b.radius * 0.3, -b.radius * 0.3, b.radius * 0.1,
          0, 0, b.radius
        );

        if (b.type === 'gold') {
          // Gold Bubble
          radialGrad.addColorStop(0, 'rgba(255, 253, 220, 0.9)');
          radialGrad.addColorStop(0.3, 'rgba(245, 158, 11, 0.6)');
          radialGrad.addColorStop(1, 'rgba(180, 83, 9, 0.2)');
        } else if (b.type === 'rainbow') {
          // Rainbow cycling colors
          const pulse = (Date.now() / 20) % 360;
          radialGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
          radialGrad.addColorStop(0.3, `hsla(${(pulse) % 360}, 100%, 75%, 0.6)`);
          radialGrad.addColorStop(0.6, `hsla(${(pulse + 120) % 360}, 100%, 75%, 0.4)`);
          radialGrad.addColorStop(1, `hsla(${(pulse + 240) % 360}, 100%, 75%, 0.2)`);
        } else if (b.type === 'giant-star') {
          // Giant Star Blue Bubble
          radialGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
          radialGrad.addColorStop(0.4, 'rgba(14, 165, 233, 0.5)');
          radialGrad.addColorStop(1, 'rgba(3, 105, 161, 0.15)');
        } else if (b.type === 'surprise') {
          // Surprise Purple
          radialGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
          radialGrad.addColorStop(0.3, 'rgba(168, 85, 247, 0.6)');
          radialGrad.addColorStop(1, 'rgba(109, 40, 217, 0.2)');
        } else {
          // Normal colorful
          radialGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          radialGrad.addColorStop(0.35, `hsla(${b.color}, 0.5)`);
          radialGrad.addColorStop(1, `hsla(${b.color}, 0.1)`);
        }

        // Draw bubble shadow & rim outline
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = radialGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        if (b.type === 'gold') {
          ctx.strokeStyle = 'rgba(217, 119, 6, 0.7)';
          ctx.lineWidth = 3;
        } else if (b.type === 'giant-star') {
          ctx.strokeStyle = 'rgba(2, 132, 199, 0.7)';
          ctx.lineWidth = 3.5;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 2;
        }
        ctx.stroke();

        // 3D Highlight Reflection curve
        ctx.beginPath();
        ctx.arc(-b.radius * 0.35, -b.radius * 0.35, b.radius * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();

        // If giant-star, draw a star in the middle!
        if (b.type === 'giant-star') {
          ctx.fillStyle = '#f59e0b';
          drawStar(ctx, 0, 0, 5, b.radius * 0.3, b.radius * 0.15);
          ctx.fill();
        } else if (b.type === 'surprise') {
          // Draw a small cute question mark inside
          ctx.font = `bold ${b.radius * 0.6}px var(--font-fredoka)`;
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🎁', 0, 0);
        } else if (b.type === 'gold') {
          ctx.font = `bold ${b.radius * 0.5}px var(--font-fredoka)`;
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⭐', 0, 0);
        }

        ctx.restore();
      }

      // 4. Draw Particles
      const pArr = particles.current;
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

        if (p.type === 'star') {
          ctx.beginPath();
          drawStar(ctx, p.x, p.y, 5, p.radius, p.radius * 0.5);
          ctx.fill();
        } else if (p.type === 'butterfly') {
          p.angle = (p.angle || 0) + (p.wiggle || 0.1);
          p.vx += Math.sin(p.angle) * 0.2;
          p.vy -= 0.1; // slowly floats up

          ctx.translate(p.x, p.y);
          const wingScaleX = Math.abs(Math.sin(p.angle * 2.5));
          ctx.beginPath();
          ctx.ellipse(-p.radius * 0.6 * wingScaleX, -p.radius * 0.5, p.radius * 0.6 * wingScaleX, p.radius * 0.8, -Math.PI / 8, 0, Math.PI * 2);
          ctx.ellipse(p.radius * 0.6 * wingScaleX, -p.radius * 0.5, p.radius * 0.6 * wingScaleX, p.radius * 0.8, Math.PI / 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.ellipse(0, 0, p.radius * 0.15, p.radius * 0.6, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#1e293b';
          ctx.fill();
        } else {
          // circle
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 5. Draw Floating Texts
      const ftArr = floatingTexts.current;
      for (let i = ftArr.length - 1; i >= 0; i--) {
        const ft = ftArr[i];
        ft.y -= 1.5; // Rise up
        ft.alpha -= 0.015; // Fade out

        if (ft.alpha <= 0) {
          ftArr.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.font = 'bold 24px var(--font-fredoka)';
        ctx.fillStyle = ft.color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.textAlign = 'center';
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      // Loop
      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  // Helper to draw stars
  const drawStar = (
    ctx: CanvasRenderingContext2D, 
    cx: number, cy: number, 
    spikes: number, 
    outerRadius: number, 
    innerRadius: number
  ) => {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  };

  // Auto combo reset after 1.5 seconds of inactivity
  useEffect(() => {
    if (combo > 0) {
      const reset = setTimeout(() => {
        setCombo(0);
      }, 1500);
      return () => clearTimeout(reset);
    }
  }, [combo]);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden select-none bg-sky-100">
      <div 
        style={{ 
          transform: `translate(${shakeOffset.x}px, ${shakeOffset.y}px)`, 
          transition: 'transform 0.05s linear' 
        }} 
        className="w-full h-full relative"
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          className="w-full h-full block cursor-pointer"
        />
      </div>

      {/* Floating Header UI overlay */}
      <div className="absolute top-6 left-6 z-10 flex gap-4">
        <button
          onClick={() => {
            synth.playPop();
            onBack();
          }}
          className="bg-white/95 hover:bg-white text-slate-800 font-bold px-6 py-3 rounded-full border-4 border-slate-200 hover:border-blue-300 shadow-md transition"
        >
          &larr; Exit
        </button>

        <button
          onClick={resetGame}
          className="bg-white/95 hover:bg-white text-slate-600 font-bold p-3 rounded-full border-4 border-slate-200 hover:border-pink-300 shadow-md transition"
          aria-label="Restart"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Stats Bar */}
      <div className="absolute top-6 right-6 z-10 flex items-center gap-4 bg-white/80 backdrop-blur-md px-6 py-3 rounded-full border-4 border-sky-200 shadow-md">
        {/* Score */}
        <div className="flex items-center gap-2">
          <Trophy className="text-yellow-500 fill-yellow-400" size={24} />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase leading-none">Score</span>
            <span className="text-xl font-black text-slate-700 leading-none">{score}</span>
          </div>
        </div>

        <div className="w-px h-6 bg-slate-200" />

        {/* Time */}
        <div className="flex items-center gap-2">
          <Clock className="text-blue-500" size={24} />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase leading-none">Time</span>
            <span className="text-xl font-black text-slate-700 leading-none">{formatTime(gameTime)}</span>
          </div>
        </div>
      </div>

      {/* Combo Indicator Floating */}
      {combo > 1 && (
        <motion.div 
          key={combo}
          initial={{ scale: 0.5, y: -20, opacity: 0 }}
          animate={{ scale: 1.2, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="absolute top-24 right-6 z-10 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-extrabold px-4 py-2 rounded-full border-2 border-white shadow-lg flex items-center gap-1 cursor-default pointer-events-none"
        >
          <Zap className="fill-white" size={16} />
          <span>{combo}x Pop Combo!</span>
        </motion.div>
      )}

      {/* Help bubble */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/30 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 select-none text-center pointer-events-none">
        <p className="text-sky-900 text-sm font-semibold drop-shadow-sm">
          🎈 Glide your mouse or drag your finger over bubbles to POP them!
        </p>
      </div>
    </div>
  );
};
