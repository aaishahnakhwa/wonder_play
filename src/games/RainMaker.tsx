import React, { useEffect, useRef, useState } from 'react';
import { 
  Sun, 
  Wind as WindIcon, 
  Zap 
} from 'lucide-react';
import { synth } from '../utils/synth';

interface Cloud {
  id: number;
  x: number;
  y: number;
  radius: number;
  vx: number;
  waterLevel: number; // 0 to 100
  isRaining: boolean;
}

interface Drop {
  x: number;
  y: number;
  vy: number;
  vx: number;
  type: 'rain' | 'snow';
}

interface Flower {
  x: number;
  type: 'daisy' | 'rose' | 'tulip';
  color: string;
  size: number;
  growth: number;
}

interface Duck {
  x: number;
  vx: number;
  wiggle: number;
}

interface Frog {
  x: number;
  y: number;
  vx: number;
  vy: number;
  groundY: number;
  hopTimer: number;
}

interface Bird {
  x: number;
  y: number;
  vx: number;
  flap: number;
}

interface RainMakerProps {
  onBack: () => void;
}

export const RainMaker: React.FC<RainMakerProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const isDrawingCloud = useRef(false);

  // Sliders/Controls
  const [sunshine, setSunshine] = useState(60); // 0 to 100
  const [wind, setWind] = useState(20); // 0 to 100
  const [snowMode, setSnowMode] = useState(false);
  const [rainbowEnabled, setRainbowEnabled] = useState(true);
  const [lightningFlash, setLightningFlash] = useState(false);

  // Entities Refs
  const clouds = useRef<Cloud[]>([]);
  const drops = useRef<Drop[]>([]);
  const flowers = useRef<Flower[]>([]);
  const ducks = useRef<Duck[]>([]);
  const frogs = useRef<Frog[]>([]);
  const birds = useRef<Bird[]>([]);

  // Ecosystem grid: 40 slots across width
  const gridSlots = 40;
  const soilMoisture = useRef<Float32Array>(new Float32Array(gridSlots));
  const grassHeight = useRef<Float32Array>(new Float32Array(gridSlots));
  const treeHeight = useRef<Float32Array>(new Float32Array(gridSlots));

  const cloudIdCounter = useRef(0);

  useEffect(() => {
    synth.playPop();

    // Initial vegetation states
    for (let i = 0; i < gridSlots; i++) {
      soilMoisture.current[i] = 20 + Math.random() * 20; // 20% moist
      grassHeight.current[i] = 10 + Math.random() * 15;
    }
  }, []);

  const triggerLightning = () => {
    synth.playBoom();
    setLightningFlash(true);
    setTimeout(() => {
      setLightningFlash(false);
    }, 150);
  };

  // Add cloud on click/drag in sky
  const addCloudAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Clouds belong in the sky
    if (y > canvas.height * 0.45) return;

    // Check if clicking near existing cloud to absorb water
    let merged = false;
    clouds.current.forEach((c) => {
      const dist = Math.hypot(c.x - x, c.y - y);
      if (dist < c.radius + 30) {
        c.waterLevel = Math.min(100, c.waterLevel + 8);
        c.radius = Math.min(100, c.radius + 1.5);
        if (c.waterLevel > 60) {
          c.isRaining = true;
        }
        merged = true;
      }
    });

    if (!merged && clouds.current.length < 12) {
      cloudIdCounter.current++;
      clouds.current.push({
        id: cloudIdCounter.current,
        x,
        y,
        radius: Math.random() * 15 + 40,
        vx: (wind - 50) * 0.05,
        waterLevel: 30,
        isRaining: false,
      });
      synth.playPop();
    }
  };

  const handleStart = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingCloud.current = true;
    addCloudAt(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawingCloud.current) {
      addCloudAt(e.clientX, e.clientY);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches && e.touches[0]) {
      isDrawingCloud.current = true;
      addCloudAt(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDrawingCloud.current && e.touches && e.touches[0]) {
      addCloudAt(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleEnd = () => {
    isDrawingCloud.current = false;
  };

  // Simulation frame
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

      // 1. SKY BACKDROP (light blue base, light orange if sunset/dusk sun levels)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      if (snowMode) {
        skyGrad.addColorStop(0, '#cbd5e1'); // chilly gray sky
        skyGrad.addColorStop(1, '#f1f5f9');
      } else {
        skyGrad.addColorStop(0, sunshine > 30 ? '#bae6fd' : '#1e1b4b'); // deep blue to sky
        skyGrad.addColorStop(1, sunshine > 30 ? '#e0f2fe' : '#312e81');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Rainbow render (Needs sunshine + rain/clouds on screen)
      if (rainbowEnabled && sunshine > 45 && clouds.current.some(c => c.isRaining) && !snowMode) {
        drawRainbow(ctx, canvas.width, canvas.height);
      }

      // Sunshine rays overlay
      if (sunshine > 10) {
        drawSunRays(ctx, canvas.width, sunshine);
      }

      // 2. GROUND & SOIL MOISTURE PHYSICS
      const groundY = canvas.height - 120;
      const slotW = canvas.width / gridSlots;

      // Update soil / grass / trees
      for (let i = 0; i < gridSlots; i++) {
        // Soil dries up in the sun
        const dryRate = (sunshine / 100) * 0.05 + 0.01;
        soilMoisture.current[i] = Math.max(0, soilMoisture.current[i] - dryRate);

        // Grass growth rules: likes moisture (between 15% and 85%)
        const moist = soilMoisture.current[i];
        if (moist > 15 && moist < 85) {
          grassHeight.current[i] = Math.min(80, grassHeight.current[i] + 0.12);
        } else if (moist <= 15) {
          // wilts in dry soil
          grassHeight.current[i] = Math.max(8, grassHeight.current[i] - 0.05);
        }

        // Tree growth rules: likes rich moisture (> 40%)
        if (moist > 40) {
          treeHeight.current[i] = Math.min(130, treeHeight.current[i] + 0.2);
        } else if (moist < 15) {
          // trees decay slowly
          treeHeight.current[i] = Math.max(0, treeHeight.current[i] - 0.08);
        }

        // Flower sprout triggers
        if (moist > 35 && moist < 75 && Math.random() > 0.992 && flowers.current.filter(f => Math.abs(f.x - (i * slotW)) < 30).length === 0) {
          const type = Math.random() > 0.6 ? 'daisy' : Math.random() > 0.3 ? 'rose' : 'tulip';
          const flowerColors = ['#f43f5e', '#a855f7', '#fb7185', '#eab308', '#ec4899'];
          flowers.current.push({
            x: i * slotW + Math.random() * slotW,
            type,
            color: flowerColors[Math.floor(Math.random() * flowerColors.length)],
            size: Math.random() * 4 + 8,
            growth: 0.1,
          });
        }
      }

      // 3. WATER DROPS PHYSICS
      updateAndDrawDrops(ctx, groundY, slotW);

      // 4. ANIMALS POPULATION MANAGEMENT
      updateEcosystemAnimals(canvas.width, groundY);

      // 5. DRAW LANDSCAPE VEGETATION
      drawLandscape(ctx, canvas.width, canvas.height, groundY, slotW);

      // 6. DRAW WATER BODIES (Lakes/Rivers form in flooded zones)
      drawWaterPuddles(ctx, groundY, slotW);

      // 7. DRAW NATURE ANIMALS
      drawAnimals(ctx, groundY);

      // 8. UPDATE AND DRAW CLOUDS
      updateAndDrawClouds(ctx, canvas.width);

      // 9. Lightning strike overlay flash
      if (lightningFlash) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [sunshine, wind, snowMode, rainbowEnabled, lightningFlash]);

  // Rain/Snow updates
  const updateAndDrawDrops = (
    ctx: CanvasRenderingContext2D, 
    groundY: number, 
    slotW: number
  ) => {
    // Spawning rain/snow from active raining clouds
    clouds.current.forEach((c) => {
      if (c.isRaining) {
        const rate = snowMode ? 0.2 : 0.6;
        if (Math.random() < rate) {
          // spawn droplet
          const dropX = c.x + (Math.random() * c.radius * 1.5 - c.radius * 0.75);
          drops.current.push({
            x: dropX,
            y: c.y + 10,
            vy: snowMode ? Math.random() * 1 + 1.5 : Math.random() * 4 + 7,
            vx: (wind - 50) * 0.08,
            type: snowMode ? 'snow' : 'rain',
          });
          // Cloud slowly dehydrates
          c.waterLevel = Math.max(0, c.waterLevel - 0.1);
          c.radius = Math.max(30, c.radius - 0.02);
          if (c.waterLevel <= 0) {
            c.isRaining = false;
          }
        }
      }
    });

    // Update drops position
    const pArr = drops.current;
    ctx.save();
    for (let i = pArr.length - 1; i >= 0; i--) {
      const d = pArr[i];
      d.y += d.vy;
      d.x += d.vx;

      // check ground collision
      if (d.y >= groundY) {
        // hit ground: hydrate soil
        const slotIdx = Math.floor(d.x / slotW);
        if (slotIdx >= 0 && slotIdx < gridSlots) {
          const wetAmount = d.type === 'snow' ? 1.5 : 3.0;
          soilMoisture.current[slotIdx] = Math.min(100, soilMoisture.current[slotIdx] + wetAmount);
        }
        pArr.splice(i, 1);
        continue;
      }

      // Draw drop
      ctx.globalAlpha = 0.5;
      if (d.type === 'rain') {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.vx * 0.3, d.y + d.vy * 0.3);
        ctx.stroke();
      } else {
        // snow
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(d.x, d.y, Math.random() * 2 + 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  const updateEcosystemAnimals = (w: number, groundY: number) => {
    // 1. DUCKS (appear in river channels/flooded slots)
    // Find slots where hydration is highly flooded (>85)
    let floodedSlot = -1;
    for (let i = 2; i < gridSlots - 2; i++) {
      if (soilMoisture.current[i] > 85) {
        floodedSlot = i;
        break;
      }
    }

    if (floodedSlot !== -1 && ducks.current.length < 2 && Math.random() > 0.995) {
      ducks.current.push({
        x: floodedSlot * (w / gridSlots),
        vx: Math.random() > 0.5 ? 0.6 : -0.6,
        wiggle: Math.random() * Math.PI,
      });
    }

    // Remove ducks if water dries up
    if (floodedSlot === -1 && ducks.current.length > 0) {
      ducks.current.pop();
    }

    // 2. FROGS (sprout in lush green moist grass areas)
    const healthyGrassCount = grassHeight.current.filter(h => h > 40).length;
    if (healthyGrassCount > 6 && frogs.current.length < 3 && Math.random() > 0.993) {
      // Spawn frog at green spot
      const spawnSlots: number[] = [];
      grassHeight.current.forEach((h, idx) => { if (h > 40) spawnSlots.push(idx); });
      const pickIdx = spawnSlots[Math.floor(Math.random() * spawnSlots.length)];
      
      frogs.current.push({
        x: pickIdx * (w / gridSlots),
        y: groundY - 10,
        vx: 0,
        vy: 0,
        groundY: groundY - 10,
        hopTimer: Math.random() * 60 + 40,
      });
    }

    // 3. BIRDS (appear when sunny and sky is clear)
    if (sunshine > 50 && birds.current.length < 4 && Math.random() > 0.992) {
      birds.current.push({
        x: -50,
        y: Math.random() * (groundY - 200) + 50,
        vx: Math.random() * 1.5 + 1.2,
        flap: Math.random() * Math.PI,
      });
    }
  };

  const drawLandscape = (
    ctx: CanvasRenderingContext2D, 
    w: number, 
    h: number, 
    groundY: number, 
    slotW: number
  ) => {
    // Ground soil rendering
    ctx.fillStyle = snowMode ? '#cbd5e1' : '#78350f'; // snowy gray mud vs chocolate brown soil
    ctx.fillRect(0, groundY, w, h - groundY);

    // Draw grass blades and trees dynamically based on sizes
    for (let i = 0; i < gridSlots; i++) {
      const x = i * slotW + slotW / 2;
      const moist = soilMoisture.current[i];

      // 1. Grass blades
      const gHeight = grassHeight.current[i];
      if (gHeight > 2) {
        ctx.save();
        ctx.translate(x, groundY);
        
        ctx.strokeStyle = snowMode 
          ? '#e2e8f0' 
          : moist > 80 
            ? '#15803d' // flooded swamp green
            : moist < 15 
              ? '#ca8a04' // dry yellow grass
              : '#22c55e'; // healthy grass green
        
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';

        // Draw multiple blades in slot
        ctx.beginPath();
        // Left blade
        ctx.moveTo(-6, 0);
        ctx.quadraticCurveTo(-9, -gHeight * 0.8, -12, -gHeight);
        // Middle blade
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(2, -gHeight * 0.9, 0, -gHeight * 1.15);
        // Right blade
        ctx.moveTo(6, 0);
        ctx.quadraticCurveTo(9, -gHeight * 0.7, 8, -gHeight * 0.95);
        ctx.stroke();

        // Snow dusting
        if (snowMode) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(-12, -gHeight, 2, 0, Math.PI * 2);
          ctx.arc(0, -gHeight * 1.15, 2.5, 0, Math.PI * 2);
          ctx.arc(8, -gHeight * 0.95, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // 2. Trees (grow bigger pine shape)
      const tHeight = treeHeight.current[i];
      if (tHeight > 10) {
        ctx.save();
        ctx.translate(x - slotW * 0.2, groundY);

        // Trunk
        ctx.fillStyle = '#451a03';
        ctx.fillRect(-4, 0, 8, -tHeight * 0.25);

        // Foliage triangles
        ctx.fillStyle = snowMode ? '#0f766e' : '#166534';
        const numLayers = 3;
        for (let l = 0; l < numLayers; l++) {
          const ly = -tHeight * 0.2 - (l * tHeight * 0.25);
          const lw = (tHeight * 0.35) * (1 - l * 0.22);
          const lh = tHeight * 0.35;

          ctx.beginPath();
          ctx.moveTo(0, ly - lh);
          ctx.lineTo(-lw, ly);
          ctx.lineTo(lw, ly);
          ctx.closePath();
          ctx.fill();

          // Snow cap on foliage
          if (snowMode) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(0, ly - lh);
            ctx.lineTo(-lw * 0.3, ly - lh * 0.7);
            ctx.lineTo(lw * 0.3, ly - lh * 0.7);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#0f766e'; // restore green for next loop
          }
        }

        ctx.restore();
      }
    }

    // 3. Draw sprouting flowers
    flowers.current.forEach((flower) => {
      if (flower.growth < 1) {
        flower.growth += 0.05;
      }

      ctx.save();
      ctx.translate(flower.x, groundY);
      ctx.scale(flower.growth, flower.growth);

      // green stem
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -flower.size * 2);
      ctx.stroke();

      // Bloom head
      ctx.translate(0, -flower.size * 2);
      ctx.fillStyle = flower.color;
      
      const petals = 5;
      for (let k = 0; k < petals; k++) {
        const a = (k * Math.PI * 2) / petals;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * flower.size * 0.6, Math.sin(a) * flower.size * 0.6, flower.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // center
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, flower.size * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  };

  const drawWaterPuddles = (ctx: CanvasRenderingContext2D, groundY: number, slotW: number) => {
    ctx.save();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.75)'; // cyan water
    
    for (let i = 0; i < gridSlots; i++) {
      const moist = soilMoisture.current[i];
      if (moist > 75) {
        const x = i * slotW;
        // Draw water puddle cap
        const depth = Math.min(22, (moist - 75) * 0.6);
        ctx.beginPath();
        ctx.ellipse(x + slotW / 2, groundY, slotW * 0.8, depth, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  const drawAnimals = (ctx: CanvasRenderingContext2D, groundY: number) => {
    // 1. DUCKS (swim left/right on puddles)
    ducks.current.forEach((d) => {
      d.wiggle += 0.05;
      d.x += d.vx;
      
      // boundaries wrap
      if (d.x < 50 || d.x > window.innerWidth - 50) {
        d.vx = -d.vx;
      }

      ctx.save();
      ctx.translate(d.x, groundY - 4);
      ctx.scale(d.vx > 0 ? 1 : -1, 1);

      // Yellow Duck body
      ctx.fillStyle = '#facc15'; // yellow-400
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Duck Head
      ctx.beginPath();
      ctx.arc(8, -8, 8, 0, Math.PI * 2);
      ctx.fill();

      // Beak (Orange)
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(14, -10);
      ctx.lineTo(21, -8);
      ctx.lineTo(14, -6);
      ctx.closePath();
      ctx.fill();

      // Eye
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(9, -10, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // 2. FROGS (hop on damp green slots)
    frogs.current.forEach((f) => {
      f.hopTimer--;
      
      // hop logic
      if (f.hopTimer <= 0) {
        f.vy = -7; // hop up
        f.vx = Math.random() > 0.5 ? 2.2 : -2.2;
        f.hopTimer = Math.random() * 80 + 100;
        synth.playPop(); // frog jump makes quick pop sound
      }

      // physics
      if (f.y < f.groundY) {
        f.vy += 0.35; // gravity
        f.x += f.vx;
        f.y += f.vy;
      } else {
        f.y = f.groundY;
        f.vx = 0;
        f.vy = 0;
      }

      // wrap borders
      if (f.x < 10) f.x = window.innerWidth - 10;
      else if (f.x > window.innerWidth - 10) f.x = 10;

      ctx.save();
      ctx.translate(f.x, f.y);

      // Draw simple green frog shape
      ctx.fillStyle = '#4ade80';
      // Body
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.beginPath();
      ctx.arc(-5, -7, 3.5, 0, Math.PI * 2);
      ctx.arc(5, -7, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Pupils
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(-5, -7, 1.2, 0, Math.PI * 2);
      ctx.arc(5, -7, 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // 3. BIRDS (fly in the sky)
    const bArr = birds.current;
    for (let i = bArr.length - 1; i >= 0; i--) {
      const b = bArr[i];
      b.x += b.vx;
      b.flap += 0.2;

      if (b.x > window.innerWidth + 50) {
        bArr.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(b.x, b.y);

      // Wing flap offsets
      const wingY = Math.sin(b.flap) * 12;

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      // Draw flying seagull V shape
      ctx.moveTo(-12, wingY);
      ctx.quadraticCurveTo(-6, -4, 0, 0);
      ctx.quadraticCurveTo(6, -4, 12, wingY);
      ctx.stroke();

      ctx.restore();
    }
  };

  const updateAndDrawClouds = (ctx: CanvasRenderingContext2D, w: number) => {
    const cArr = clouds.current;

    for (let i = cArr.length - 1; i >= 0; i--) {
      const c = cArr[i];

      // Wind updates speed
      c.vx = (wind - 50) * 0.04;
      c.x += c.vx;

      // boundaries wrap
      if (c.x + c.radius * 2 < -50) {
        c.x = w + 50;
      } else if (c.x - c.radius * 2 > w + 50) {
        c.x = -50;
      }

      // Draw cloud body (get darker based on water level)
      // Water level goes from 0 to 100
      const lightness = 95 - (c.waterLevel * 0.45); // 95% down to 50% gray
      ctx.fillStyle = `hsl(210, 10%, ${lightness}%)`;

      ctx.save();
      ctx.translate(c.x, c.y);

      // Draw fluffy overlapping arcs
      ctx.beginPath();
      ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
      ctx.arc(-c.radius * 0.6, c.radius * 0.2, c.radius * 0.7, 0, Math.PI * 2);
      ctx.arc(c.radius * 0.6, c.radius * 0.2, c.radius * 0.7, 0, Math.PI * 2);
      ctx.arc(-c.radius * 1.1, c.radius * 0.4, c.radius * 0.5, 0, Math.PI * 2);
      ctx.arc(c.radius * 1.1, c.radius * 0.4, c.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // rim highlight
      ctx.strokeStyle = `hsla(210, 10%, ${Math.min(100, lightness + 10)}%, 0.6)`;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.restore();
    }
  };

  // Rainbow Helper
  const drawRainbow = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 14;

    const cx = w / 2;
    const cy = h - 100;
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#4f46e5', '#a855f7'];

    colors.forEach((col, idx) => {
      const radius = 250 + idx * 14;
      ctx.strokeStyle = col;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, Math.PI, 0); // half circle arc
      ctx.stroke();
    });
    ctx.restore();
  };

  const drawSunRays = (ctx: CanvasRenderingContext2D, w: number, sunPower: number) => {
    ctx.save();
    ctx.globalAlpha = (sunPower / 100) * 0.08;

    const cx = w * 0.15;
    const cy = 110;
    const numRays = 18;

    ctx.fillStyle = '#fef08a';
    for (let i = 0; i < numRays; i++) {
      const angle = (i * Math.PI * 2) / numRays + (Date.now() / 4000);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle - 0.1) * 800, cy + Math.sin(angle - 0.1) * 800);
      ctx.lineTo(cx + Math.cos(angle + 0.1) * 800, cy + Math.sin(angle + 0.1) * 800);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden select-none bg-sky-200">
      <canvas
        ref={canvasRef}
        onMouseDown={handleStart}
        onMouseMove={handleMouseMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleEnd}
        className="w-full h-full block cursor-pointer"
      />

      {/* Exit Button */}
      <button
        onClick={() => {
          synth.playPop();
          onBack();
        }}
        className="absolute top-6 left-6 z-10 bg-white/95 hover:bg-white text-slate-800 font-bold px-6 py-3 rounded-full border-4 border-slate-200 hover:border-pink-300 shadow-md transition"
      >
        &larr; Exit
      </button>

      {/* Weather Dashboard Controls (Bottom Panel) */}
      <div className="absolute bottom-6 left-6 right-6 z-10 bg-white/90 backdrop-blur-md p-6 rounded-3xl border-4 border-sky-100 shadow-xl max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6 justify-between">
        
        {/* Sliders */}
        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sunshine slider */}
          <div className="space-y-1 text-left">
            <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <Sun size={14} className="text-amber-500" /> Sunshine
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={sunshine}
              onChange={(e) => setSunshine(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Wind slider */}
          <div className="space-y-1 text-left">
            <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <WindIcon size={14} className="text-teal-500" /> Wind Speed
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={wind}
              onChange={(e) => setWind(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-500"
            />
          </div>

          {/* Precipitator mode: Rain / Snow toggles */}
          <div className="flex items-center gap-4 py-1">
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase leading-none">Precipitation</span>
              <span className="text-sm font-extrabold text-slate-700 leading-normal">{snowMode ? '❄️ Snowing' : '🌧️ Raining'}</span>
            </div>
            <button
              onClick={() => { synth.playPop(); setSnowMode(!snowMode); }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${snowMode ? 'bg-sky-400' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${snowMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Buttons Panel */}
        <div className="flex gap-2 w-full md:w-auto">
          {/* Lightning button */}
          <button
            onClick={triggerLightning}
            className="flex-1 md:flex-none bg-yellow-400 hover:bg-yellow-500 text-white font-extrabold px-5 py-3 rounded-2xl border-2 border-yellow-300 shadow flex items-center gap-1.5 justify-center transition active:scale-95"
          >
            <Zap className="fill-white" size={18} /> Thunder!
          </button>

          {/* Rainbow button */}
          <button
            onClick={() => { synth.playPop(); setRainbowEnabled(!rainbowEnabled); }}
            className={`flex-1 md:flex-none font-extrabold px-5 py-3 rounded-2xl border-2 shadow flex items-center gap-1.5 justify-center transition active:scale-95 ${rainbowEnabled ? 'bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 to-blue-400 text-white border-white' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
          >
            🌈 Rainbow
          </button>
        </div>
      </div>

      {/* Floating Sky helper instructions */}
      <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-white/20 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 pointer-events-none select-none text-center">
        <p className="text-slate-800 text-xs md:text-sm font-semibold drop-shadow-sm flex items-center gap-1">
          ☁️ Click or drag in the sky to make clouds! Watch rain grow trees and frogs appear!
        </p>
      </div>
    </div>
  );
};
