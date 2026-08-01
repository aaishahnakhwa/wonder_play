import React, { useEffect, useRef, useState } from 'react';
import { 
  Sun, 
  CloudRain, 
  CloudSnow, 
  Compass,
  Sprout,
  X
} from 'lucide-react';
import { synth } from '../utils/synth';

interface Flower {
  x: number;
  y: number;
  color: string;
  size: number;
  scale: number; // grows from 0 to 1
  petals: number;
}

interface Butterfly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  angle: number;
  flapSpeed: number;
  flapPhase: number;
  targetX: number;
  targetY: number;
  state: 'wandering' | 'seeking-flower' | 'seeking-cursor' | 'landed';
  landedOn: 'flower' | 'cursor' | null;
  targetFlowerIndex: number | null;
  landTimer: number;
}

interface Bee {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  wiggle: number;
}

interface Dragonfly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  dartTimer: number;
}

interface Leaf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  color: string;
}

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  wobble: number;
}

interface WeatherParticle {
  x: number;
  y: number;
  vy: number;
  vx: number;
  size: number;
}

type Weather = 'sunny' | 'rainy' | 'snowy';
type Season = 'spring' | 'summer' | 'autumn' | 'winter';

interface ButterflyGardenProps {
  onBack: () => void;
}

export const ButterflyGarden: React.FC<ButterflyGardenProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const mousePos = useRef({ x: -1000, y: -1000, isMoving: false, lastMoveTime: 0 });

  // Simulation controls
  const [timeOfDay, setTimeOfDay] = useState<number>(10); // 0-24 hour scale
  const [weather, setWeather] = useState<Weather>('sunny');
  const [season, setSeason] = useState<Season>('spring');
  const [showHelper, setShowHelper] = useState(true);

  // Simulation element arrays
  const flowers = useRef<Flower[]>([]);
  const butterflies = useRef<Butterfly[]>([]);
  const bees = useRef<Bee[]>([]);
  const dragonflies = useRef<Dragonfly[]>([]);
  const leaves = useRef<Leaf[]>([]);
  const fireflies = useRef<Firefly[]>([]);
  const weatherParticles = useRef<WeatherParticle[]>([]);

  useEffect(() => {
    synth.playPop();

    // Natural day/night cycle progression (takes ~3 minutes for full cycle)
    const timeTimer = setInterval(() => {
      setTimeOfDay((prev) => (prev + 0.1) % 24);
    }, 1000);

    return () => {
      clearInterval(timeTimer);
    };
  }, []);

  // Initialize simulation elements
  const initGarden = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    flowers.current = [
      { x: canvas.width * 0.2, y: canvas.height - 80, color: '#f43f5e', size: 14, scale: 1, petals: 6 },
      { x: canvas.width * 0.45, y: canvas.height - 60, color: '#eab308', size: 12, scale: 1, petals: 5 },
      { x: canvas.width * 0.75, y: canvas.height - 75, color: '#a855f7', size: 13, scale: 1, petals: 8 },
    ];

    // Spawn 15 butterflies
    butterflies.current = Array.from({ length: 15 }, () => spawnButterfly(canvas));

    // Spawn bees
    bees.current = Array.from({ length: 4 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * (canvas.height - 200) + 100,
      vx: Math.random() * 2 - 1,
      vy: Math.random() * 1 - 0.5,
      angle: Math.random() * Math.PI * 2,
      wiggle: Math.random() * Math.PI * 2,
    }));

    // Spawn dragonflies
    dragonflies.current = Array.from({ length: 3 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * (canvas.height - 300) + 100,
      vx: 0,
      vy: 0,
      color: `hsl(${Math.random() * 60 + 170}, 100%, 65%)`, // Blue-green neon
      dartTimer: Math.random() * 50,
    }));

    // Fireflies (for night time)
    fireflies.current = Array.from({ length: 20 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * (canvas.height - 150) + 50,
      vx: Math.random() * 1 - 0.5,
      vy: Math.random() * 1 - 0.5,
      wobble: Math.random() * Math.PI * 2,
    }));
  };

  const spawnButterfly = (canvas: HTMLCanvasElement): Butterfly => {
    const hue = Math.floor(Math.random() * 360);
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * (canvas.height - 200) + 100,
      vx: Math.random() * 4 - 2,
      vy: Math.random() * 4 - 2,
      color: `hsl(${hue}, 100%, 65%)`,
      size: Math.random() * 6 + 10,
      angle: Math.random() * Math.PI * 2,
      flapSpeed: Math.random() * 0.15 + 0.15,
      flapPhase: Math.random() * Math.PI * 2,
      targetX: Math.random() * canvas.width,
      targetY: Math.random() * canvas.height,
      state: 'wandering',
      landedOn: null,
      targetFlowerIndex: null,
      landTimer: 0,
    };
  };

  // Grow flower on click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Ignore clicks in sky, flowers grow on ground
    if (y < canvas.height * 0.4) {
      synth.playPop(); // Sky click makes soft bubble sound
      return;
    }

    synth.playChime(); // growing flower plays chimes

    const flowerColors = ['#f43f5e', '#a855f7', '#fb7185', '#ec4899', '#f59e0b', '#14b8a6', '#06b6d4'];
    const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];

    flowers.current.push({
      x,
      y,
      color,
      size: Math.random() * 5 + 10,
      scale: 0.1, // will animate grow
      petals: 5 + Math.floor(Math.random() * 4),
    });

    // Limit flowers to 15 to prevent overcrowding
    if (flowers.current.length > 15) {
      flowers.current.shift();
    }
  };

  // Handle cursor positioning
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mousePos.current.x = e.clientX - rect.left;
    mousePos.current.y = e.clientY - rect.top;
    mousePos.current.isMoving = true;
    mousePos.current.lastMoveTime = Date.now();
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches && e.touches[0]) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mousePos.current.x = e.touches[0].clientX - rect.left;
      mousePos.current.y = e.touches[0].clientY - rect.top;
      mousePos.current.isMoving = true;
      mousePos.current.lastMoveTime = Date.now();
    }
  };

  const handleMouseLeave = () => {
    mousePos.current.x = -1000;
    mousePos.current.y = -1000;
    mousePos.current.isMoving = false;
  };

  // Main animation / simulation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (flowers.current.length === 0) {
        initGarden();
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      // Check if mouse is stationary
      if (Date.now() - mousePos.current.lastMoveTime > 1200) {
        mousePos.current.isMoving = false;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Sky Backdrop (based on Day/Night timeOfDay)
      drawSky(ctx, canvas.width, canvas.height);

      // 2. Weather particles updates
      updateWeatherParticles(canvas.width, canvas.height);
      drawWeatherParticles(ctx);

      // 3. Draw hills / ground
      drawHills(ctx, canvas.width, canvas.height);

      // 4. Update and draw flowers
      updateAndDrawFlowers(ctx);

      // 5. Update and draw bees, ladybugs, dragonflies
      updateAndDrawInsects(ctx, canvas.width, canvas.height);

      // 6. Fireflies (at night)
      if (timeOfDay < 6 || timeOfDay > 18) {
        updateAndDrawFireflies(ctx, canvas.width, canvas.height);
      }

      // 7. Update and draw butterflies (core engine)
      updateAndDrawButterflies(ctx, canvas.width, canvas.height);

      // 8. Autumn leaves/floating spring petals
      updateAndDrawLeaves(ctx, canvas.width, canvas.height);

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [timeOfDay, weather, season]);

  // Background sky gradients
  const drawSky = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);

    // 24 hour color mappings
    if (timeOfDay >= 5 && timeOfDay < 8) {
      // Morning Dawn
      skyGrad.addColorStop(0, '#fca5a5'); // Pink peach
      skyGrad.addColorStop(0.6, '#fed7aa'); // Orange sunrise
      skyGrad.addColorStop(1, '#fef08a'); // Soft yellow ground
    } else if (timeOfDay >= 8 && timeOfDay < 17) {
      // Daytime Blue
      skyGrad.addColorStop(0, '#7dd3fc'); // Sky sky
      skyGrad.addColorStop(0.6, '#bae6fd'); // Light sky
      skyGrad.addColorStop(1, '#bae6fd');
    } else if (timeOfDay >= 17 && timeOfDay < 19.5) {
      // Sunset Golden
      skyGrad.addColorStop(0, '#701a75'); // Deep magenta top
      skyGrad.addColorStop(0.5, '#f43f5e'); // Rose sunset
      skyGrad.addColorStop(1, '#f59e0b'); // Golden horizon
    } else {
      // Night Starry Indigo
      skyGrad.addColorStop(0, '#0f172a'); // Very dark slate
      skyGrad.addColorStop(0.7, '#1e1b4b'); // Dark indigo
      skyGrad.addColorStop(1, '#312e81'); // Dark purple
    }

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Draw twinkling stars if night
    if (timeOfDay < 5.5 || timeOfDay > 18.5) {
      const starAlpha = timeOfDay > 18.5 
        ? Math.min(1, (timeOfDay - 18.5) * 2) 
        : Math.min(1, (5.5 - timeOfDay) * 2);

      ctx.fillStyle = `rgba(255, 255, 255, ${starAlpha})`;
      for (let i = 0; i < 30; i++) {
        // Pseudo-random star placements
        const x = (Math.sin(i * 382.2) * 0.5 + 0.5) * w;
        const y = (Math.cos(i * 927.8) * 0.5 + 0.5) * (h * 0.55);
        const twinkle = Math.abs(Math.sin(Date.now() / 300 + i)) * 1.5 + 0.5;
        
        ctx.beginPath();
        ctx.arc(x, y, twinkle, 0, Math.PI * 2);
        ctx.fill();
      }

      // Moon
      ctx.fillStyle = `rgba(254, 240, 138, ${starAlpha * 0.95})`;
      ctx.beginPath();
      ctx.arc(w * 0.8, 100, 30, 0, Math.PI * 2);
      ctx.fill();

      // Moon shadow for crescent shape
      ctx.fillStyle = `rgba(15, 23, 42, ${starAlpha})`; // Match deep slate top
      ctx.beginPath();
      ctx.arc(w * 0.78, 92, 28, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Sun (daytime)
      const sunAlpha = timeOfDay >= 8 && timeOfDay < 17 
        ? 1 
        : timeOfDay < 8 
          ? (timeOfDay - 5) / 3 
          : (19.5 - timeOfDay) / 2.5;

      ctx.fillStyle = `rgba(253, 224, 71, ${sunAlpha})`;
      ctx.shadowBlur = 40;
      ctx.shadowColor = '#eab308';
      ctx.beginPath();
      ctx.arc(w * 0.15, 110, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0; // Reset
    }
  };

  const drawHills = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // Ambient shade depending on Time
    let hillColor1 = '#4ade80'; // Bright spring green
    let hillColor2 = '#22c55e'; // Dark green

    if (timeOfDay < 6 || timeOfDay > 18) {
      hillColor1 = '#065f46'; // Night emerald
      hillColor2 = '#064e3b';
    } else if (timeOfDay >= 17) {
      hillColor1 = '#15803d'; // Autumn dusk
      hillColor2 = '#166534';
    }

    if (season === 'autumn') {
      hillColor1 = timeOfDay < 6 || timeOfDay > 18 ? '#78350f' : '#b45309'; // Brownish/orange hills
      hillColor2 = timeOfDay < 6 || timeOfDay > 18 ? '#451a03' : '#78350f';
    } else if (season === 'winter') {
      hillColor1 = '#e2e8f0'; // Snowy white/gray
      hillColor2 = '#cbd5e1';
    }

    // Back Hill
    ctx.fillStyle = hillColor2;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.quadraticCurveTo(w * 0.35, h - 180, w * 0.7, h - 50);
    ctx.quadraticCurveTo(w * 0.85, h - 20, w, h - 80);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Front Hill
    ctx.fillStyle = hillColor1;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.quadraticCurveTo(w * 0.25, h - 70, w * 0.5, h - 60);
    ctx.quadraticCurveTo(w * 0.75, h - 50, w, h - 110);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  };

  // Grow and render flowers
  const updateAndDrawFlowers = (ctx: CanvasRenderingContext2D) => {
    flowers.current.forEach((flower) => {
      // Sprout animation
      if (flower.scale < 1.0) {
        flower.scale += 0.05;
      }

      ctx.save();
      ctx.translate(flower.x, flower.y);
      ctx.scale(flower.scale, flower.scale);

      // Stem
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 80); // down to ground
      ctx.stroke();

      // Stem Leaf
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(-10, 30, 10, 5, -Math.PI/6, 0, Math.PI * 2);
      ctx.fill();

      // Draw Petals radial layout
      ctx.fillStyle = flower.color;
      const numPetals = flower.petals;
      for (let i = 0; i < numPetals; i++) {
        const angle = (i * Math.PI * 2) / numPetals;
        ctx.beginPath();
        ctx.ellipse(
          Math.cos(angle) * flower.size, 
          Math.sin(angle) * flower.size, 
          flower.size * 0.8, 
          flower.size * 0.5, 
          angle, 0, Math.PI * 2
        );
        ctx.fill();
      }

      // Yellow Center Disc
      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, flower.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    });
  };

  // Weather loop emitters
  const updateWeatherParticles = (w: number, h: number) => {
    const pArr = weatherParticles.current;

    if (weather === 'sunny') {
      pArr.length = 0;
      return;
    }

    // Generate weather
    const rate = weather === 'rainy' ? 3 : 1;
    if (Math.random() < 0.35 * rate) {
      pArr.push({
        x: Math.random() * w,
        y: -10,
        vy: weather === 'rainy' ? Math.random() * 5 + 8 : Math.random() * 1.5 + 1.5, // rain drops fly faster
        vx: weather === 'rainy' ? 1 : Math.random() * 1.5 - 0.75, // snow drifts
        size: weather === 'rainy' ? Math.random() * 1.5 + 1.5 : Math.random() * 3 + 2,
      });
    }

    // Update
    for (let i = pArr.length - 1; i >= 0; i--) {
      const p = pArr[i];
      p.y += p.vy;
      p.x += p.vx;
      if (p.y > h) {
        pArr.splice(i, 1);
      }
    }
  };

  const drawWeatherParticles = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    weatherParticles.current.forEach((p) => {
      ctx.globalAlpha = 0.6;
      if (weather === 'rainy') {
        ctx.strokeStyle = '#bae6fd'; // rain color
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 0.5, p.y + p.vy * 0.5);
        ctx.stroke();
      } else {
        // snow
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  };

  const updateAndDrawInsects = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // 1. BEES
    bees.current.forEach((b) => {
      b.wiggle += 0.2;
      b.x += b.vx + Math.sin(b.wiggle) * 0.8;
      b.y += b.vy + Math.cos(b.wiggle) * 0.5;

      // boundaries wrap
      if (b.x < -20) b.x = w + 20;
      else if (b.x > w + 20) b.x = -20;
      if (b.y < 50) { b.y = 50; b.vy = -b.vy; }
      else if (b.y > h - 150) { b.y = h - 150; b.vy = -b.vy; }

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(b.vx > 0 ? 1 : -1, 1);

      // Wings flap
      const wingY = Math.sin(Date.now() / 15) * 6;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.ellipse(-3, -8 + wingY, 6, 8, -Math.PI / 6, 0, Math.PI * 2);
      ctx.ellipse(3, -8 + wingY, 6, 8, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();

      // Bee body
      ctx.fillStyle = '#fbbf24'; // Yellow
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stripes (Black stripes)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-4, -8, 2.5, 16);
      ctx.fillRect(1, -8, 2.5, 16);

      // Eye
      ctx.beginPath();
      ctx.arc(6, -2, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // 2. DRAGONFLIES
    dragonflies.current.forEach((d) => {
      d.dartTimer--;
      if (d.dartTimer <= 0) {
        // Pick new dart velocity
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 3;
        d.vx = Math.cos(angle) * speed;
        d.vy = Math.sin(angle) * speed;
        d.dartTimer = Math.random() * 80 + 30; // dart duration
      }

      // Drag friction slowing down to hover state
      d.vx *= 0.95;
      d.vy *= 0.95;
      d.x += d.vx;
      d.y += d.vy;

      // Boundary safety
      if (d.x < 50) { d.x = 50; d.vx = -d.vx; }
      else if (d.x > w - 50) { d.x = w - 50; d.vx = -d.vx; }
      if (d.y < 50) { d.y = 50; d.vy = -d.vy; }
      else if (d.y > h - 180) { d.y = h - 180; d.vy = -d.vy; }

      ctx.save();
      ctx.translate(d.x, d.y);
      const angle = Math.atan2(d.vy, d.vx) || 0;
      ctx.rotate(angle);

      // Wings (long and thin)
      const flap = Math.sin(Date.now() / 20) * 4;
      ctx.fillStyle = 'rgba(200, 240, 255, 0.7)';
      ctx.beginPath();
      // Forward wings
      ctx.ellipse(0, -12 + flap, 3, 20, Math.PI / 2, 0, Math.PI * 2);
      ctx.ellipse(0, 12 - flap, 3, 20, -Math.PI / 2, 0, Math.PI * 2);
      // Rear wings
      ctx.ellipse(-6, -10 + flap, 2, 16, Math.PI / 2, 0, Math.PI * 2);
      ctx.ellipse(-6, 10 - flap, 2, 16, -Math.PI / 2, 0, Math.PI * 2);
      ctx.fill();

      // Tail
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-24, 0);
      ctx.stroke();

      // Head / body
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(4, 0, 4.5, 0, Math.PI * 2); // Head
      ctx.fill();

      ctx.restore();
    });
  };

  const updateAndDrawFireflies = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    fireflies.current.forEach((f) => {
      f.wobble += 0.05;
      f.x += f.vx + Math.sin(f.wobble) * 0.2;
      f.y += f.vy + Math.cos(f.wobble) * 0.2;

      // borders bounce
      if (f.x < 10) f.x = w - 10;
      else if (f.x > w - 10) f.x = 10;
      if (f.y < 50) f.y = h - 200;
      else if (f.y > h - 100) f.y = 50;

      // Twinkling glow
      const glow = Math.abs(Math.sin(Date.now() / 400 + f.wobble)) * 8 + 4;
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.shadowBlur = glow;
      ctx.shadowColor = '#86efac'; // soft green glow
      ctx.fillStyle = '#a7f3d0';
      ctx.beginPath();
      ctx.arc(f.x, f.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  };

  const updateAndDrawLeaves = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // Generate drift items
    const leavesArr = leaves.current;
    if (leavesArr.length < 15 && Math.random() > 0.9) {
      let leafColor = '#86efac'; // Spring light green
      if (season === 'autumn') {
        const fallColors = ['#f97316', '#ea580c', '#eab308', '#ca8a04', '#b45309'];
        leafColor = fallColors[Math.floor(Math.random() * fallColors.length)];
      } else if (season === 'winter') {
        leafColor = '#ffffff'; // snowflake leaves
      }

      leavesArr.push({
        x: Math.random() * w,
        y: -20,
        vx: Math.random() * 1.5 - 0.75 - 1.0, // slight left breeze
        vy: Math.random() * 0.8 + 0.8,
        size: Math.random() * 6 + 6,
        angle: Math.random() * Math.PI,
        color: leafColor,
      });
    }

    // Update
    for (let i = leavesArr.length - 1; i >= 0; i--) {
      const l = leavesArr[i];
      l.x += l.vx + Math.sin(Date.now() / 500 + i) * 0.4;
      l.y += l.vy;
      l.angle += 0.01;

      if (l.y > h + 20) {
        leavesArr.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.angle);
      ctx.fillStyle = l.color;
      ctx.beginPath();
      
      // Draw cute leaf shape
      ctx.ellipse(0, 0, l.size, l.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  // Core Butterfly Flocking and Steering AI code
  const updateAndDrawButterflies = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const bArr = butterflies.current;
    const fls = flowers.current;

    bArr.forEach((b) => {
      // 1. STATE MACHINE & STEERING

      // Proximity to cursor check
      const dxCursor = mousePos.current.x - b.x;
      const dyCursor = mousePos.current.y - b.y;
      const distCursor = Math.hypot(dxCursor, dyCursor);

      if (distCursor < 120) {
        // If cursor moves rapidly, push away (Flee)
        if (mousePos.current.isMoving) {
          b.state = 'wandering';
          b.landedOn = null;
          b.vx -= (dxCursor / distCursor) * 0.8;
          b.vy -= (dyCursor / distCursor) * 0.8;
        } 
        else if (b.state !== 'landed') {
          // Cursor stationary: seek and land on cursor!
          b.state = 'seeking-cursor';
          b.targetX = mousePos.current.x;
          b.targetY = mousePos.current.y;
        }
      } 
      else if (b.state === 'seeking-cursor') {
        // cursor is gone or moving
        b.state = 'wandering';
        b.landedOn = null;
      }

      // Seeking flowers
      if (b.state === 'wandering' && fls.length > 0 && Math.random() > 0.985) {
        // Pick a random flower to land on
        const flowIndex = Math.floor(Math.random() * fls.length);
        b.state = 'seeking-flower';
        b.targetFlowerIndex = flowIndex;
        b.targetX = fls[flowIndex].x;
        b.targetY = fls[flowIndex].y - 5; // land right on bloom
      }

      // Handle landed timer
      if (b.state === 'landed') {
        b.landTimer--;
        b.vx = 0;
        b.vy = 0;
        
        if (b.landTimer <= 0) {
          b.state = 'wandering';
          b.landedOn = null;
          b.targetFlowerIndex = null;
          // give launch velocity
          b.vx = Math.random() * 4 - 2;
          b.vy = -2;
        }
      }

      // steering velocities
      if (b.state !== 'landed') {
        let steeringForceX = 0;
        let steeringForceY = 0;

        if (b.state === 'wandering') {
          // Wander behavior: brownian noise drift
          if (Math.random() > 0.96) {
            b.targetX = Math.random() * w;
            b.targetY = Math.random() * (h - 200) + 50;
          }
        }

        // Steer towards target
        const dx = b.targetX - b.x;
        const dy = b.targetY - b.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 5) {
          const speedFactor = b.state === 'seeking-cursor' ? 0.025 : 0.015;
          steeringForceX = dx * speedFactor;
          steeringForceY = dy * speedFactor;
        } else {
          // Reached target
          if (b.state === 'seeking-flower') {
            b.state = 'landed';
            b.landedOn = 'flower';
            b.landTimer = Math.random() * 120 + 80; // stay 3-5 seconds
          } else if (b.state === 'seeking-cursor') {
            b.state = 'landed';
            b.landedOn = 'cursor';
            b.landTimer = Math.random() * 150 + 100;
          }
        }

        // Apply forces with drag
        b.vx = (b.vx + steeringForceX) * 0.93;
        b.vy = (b.vy + steeringForceY) * 0.93;

        // Clip maximum speed
        const speed = Math.hypot(b.vx, b.vy);
        const maxSpeed = 3.5;
        if (speed > maxSpeed) {
          b.vx = (b.vx / speed) * maxSpeed;
          b.vy = (b.vy / speed) * maxSpeed;
        }

        // Apply position
        b.x += b.vx;
        b.y += b.vy;
      }

      // Boundary safety checks
      if (b.x < 15) { b.x = 15; b.vx = -b.vx; }
      else if (b.x > w - 15) { b.x = w - 15; b.vx = -b.vx; }
      if (b.y < 30) { b.y = 30; b.vy = Math.abs(b.vy); }
      else if (b.y > h - 40) { b.y = h - 40; b.vy = -Math.abs(b.vy); }

      // 2. DRAW BUTTERFLY
      ctx.save();
      ctx.translate(b.x, b.y);

      // Flapping wings animation
      b.flapPhase += b.flapSpeed;
      // Landed butterfly flaps wings much slower/gently
      const currentFlapPhase = b.state === 'landed' ? Math.sin(Date.now() / 250) * 0.5 : Math.sin(b.flapPhase);
      const wingW = Math.abs(currentFlapPhase);

      // Rotate butterfly in the direction of flight
      const angle = b.state === 'landed' ? -Math.PI / 4 : Math.atan2(b.vy, b.vx);
      ctx.rotate(angle);

      // Wings HSL matching
      ctx.fillStyle = b.color;
      ctx.shadowBlur = 5;
      ctx.shadowColor = b.color;

      // Top Wing Left
      ctx.beginPath();
      ctx.ellipse(-b.size * 0.7 * wingW, -b.size * 0.6, b.size * 0.7 * wingW, b.size * 0.9, -Math.PI / 8, 0, Math.PI * 2);
      ctx.fill();

      // Top Wing Right
      ctx.beginPath();
      ctx.ellipse(b.size * 0.7 * wingW, -b.size * 0.6, b.size * 0.7 * wingW, b.size * 0.9, Math.PI / 8, 0, Math.PI * 2);
      ctx.fill();

      // Bottom Wing Left
      ctx.beginPath();
      ctx.ellipse(-b.size * 0.55 * wingW, b.size * 0.4, b.size * 0.55 * wingW, b.size * 0.6, Math.PI / 8, 0, Math.PI * 2);
      ctx.fill();

      // Bottom Wing Right
      ctx.beginPath();
      ctx.ellipse(b.size * 0.55 * wingW, b.size * 0.4, b.size * 0.55 * wingW, b.size * 0.6, -Math.PI / 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0; // Reset shadows

      // Butterfly Body
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.ellipse(0, 0, b.size * 0.18, b.size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Antennas
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-2, -b.size * 0.6);
      ctx.quadraticCurveTo(-6, -b.size * 1.2, -10, -b.size * 1.1);
      ctx.moveTo(2, -b.size * 0.6);
      ctx.quadraticCurveTo(6, -b.size * 1.2, 10, -b.size * 1.1);
      ctx.stroke();

      ctx.restore();
    });
  };

  const getDayNightLabel = () => {
    if (timeOfDay >= 5 && timeOfDay < 8) return '🌅 Dawn';
    if (timeOfDay >= 8 && timeOfDay < 17) return '☀️ Noon';
    if (timeOfDay >= 17 && timeOfDay < 19.5) return '🌇 Sunset';
    return '🌌 Night';
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden select-none bg-sky-200">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleCanvasClick}
        className="w-full h-full block cursor-pointer"
      />

      {/* Back Button */}
      <button
        onClick={() => {
          synth.playPop();
          onBack();
        }}
        className="absolute top-6 left-6 z-10 bg-white/95 hover:bg-white text-slate-800 font-bold px-6 py-3 rounded-full border-4 border-slate-200 hover:border-pink-300 shadow-md transition"
      >
        &larr; Exit
      </button>

      {/* Control Panel (Weather, Seasons, Time of Day info) */}
      <div className="absolute top-6 right-6 z-10 flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-white/90 backdrop-blur-md px-6 py-3.5 rounded-3xl border-4 border-emerald-100 shadow-md">
        
        {/* Status indicator */}
        <div className="flex items-center gap-2 pr-3 border-b md:border-b-0 md:border-r border-slate-200 pb-2 md:pb-0">
          <Compass className="text-emerald-500 animate-spin" style={{ animationDuration: '10s' }} size={20} />
          <div className="flex flex-col text-left">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase leading-none">Time of Day</span>
            <span className="text-sm font-extrabold text-slate-700 leading-normal">{getDayNightLabel()}</span>
          </div>
        </div>

        {/* Season selectors */}
        <div className="flex items-center gap-1.5 pb-2 md:pb-0">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase mr-1">Season:</span>
          {(['spring', 'summer', 'autumn', 'winter'] as Season[]).map((s) => (
            <button
              key={s}
              onClick={() => {
                synth.playPop();
                setSeason(s);
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition capitalize ${season === s ? 'bg-emerald-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Weather selectors */}
        <div className="flex items-center gap-1.5 border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 pl-0 md:pl-3">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase mr-1">Weather:</span>
          <button
            onClick={() => { synth.playPop(); setWeather('sunny'); }}
            className={`p-1.5 rounded-full transition ${weather === 'sunny' ? 'bg-amber-400 text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`}
            title="Sunny"
          >
            <Sun size={16} />
          </button>
          <button
            onClick={() => { synth.playPop(); setWeather('rainy'); }}
            className={`p-1.5 rounded-full transition ${weather === 'rainy' ? 'bg-blue-400 text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`}
            title="Rainy"
          >
            <CloudRain size={16} />
          </button>
          <button
            onClick={() => { synth.playPop(); setWeather('snowy'); }}
            className={`p-1.5 rounded-full transition ${weather === 'snowy' ? 'bg-sky-400 text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`}
            title="Snowy"
          >
            <CloudSnow size={16} />
          </button>
        </div>
      </div>

      {/* Floating Instructions Banner */}
      {showHelper && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/25 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/20 select-none text-center flex items-center gap-3">
          <p className="text-emerald-950 text-sm font-semibold drop-shadow-sm flex items-center gap-1.5">
            <Sprout size={16} className="text-emerald-700" /> Click on the ground to grow flowers! Butterflies will land on still cursors.
          </p>
          <button
            onClick={() => { synth.playPop(); setShowHelper(false); }}
            className="pointer-events-auto hover:bg-slate-800/10 p-1 rounded-full text-emerald-900 hover:text-rose-600 transition focus:outline-none"
            aria-label="Close instructions"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
