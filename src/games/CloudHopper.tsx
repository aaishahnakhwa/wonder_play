import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, X, Volume2, Settings } from 'lucide-react';
import { synth } from '../utils/synth';

type PlatformType = 'normal' | 'mushroom' | 'cloud' | 'bubble';
type CharacterType = 'bunny' | 'dino' | 'astronaut';

interface Platform {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  type: PlatformType;
  // Cloud motion details
  vx?: number;
  startX?: number;
  rangeX?: number;
  // Bubble pop states
  popTimer?: number; // active once touched
  isPopped?: boolean;
  respawnTimer?: number;
}

interface Collectible {
  id: number;
  x: number;
  y: number;
  emoji: string;
  collected: boolean;
  pulsePhase: number;
}

interface WindBooster {
  id: number;
  x: number;
  y: number;
  r: number;
  pulsePhase: number;
}

interface Balloon {
  id: number;
  x: number;
  y: number;
  color: string;
  popped: boolean;
  pulsePhase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
}

interface CloudHopperProps {
  onBack: () => void;
}

export const CloudHopper: React.FC<CloudHopperProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // States
  const [character, setCharacter] = useState<CharacterType>('bunny');
  const [starsCount, setStarsCount] = useState(0);
  const [volume, setVolume] = useState(synth.getVolume() * 100);
  const [showHelper, setShowHelper] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  // Custom Frequencies/Spacings Settings
  const [platformSpacing, setPlatformSpacing] = useState(90); // Average gap: 60px to 160px
  const [boosterFrequency, setBoosterFrequency] = useState(50); // Wind booster spawn rate: 0% to 100%
  const [speedFactor, setSpeedFactor] = useState(1.0); // Running speed multiplier: 0.6 to 2.2

  // Sync settings to refs to ensure the render loop reads changes instantly in real-time
  const speedFactorRef = useRef(speedFactor);
  useEffect(() => {
    speedFactorRef.current = speedFactor;
  }, [speedFactor]);

  // Keyboard state
  const keys = useRef<Record<string, boolean>>({});
  const jumpKeyReleased = useRef(true); // Gating keypresses to prevent instant double jump

  // Mobile controller state
  const mobileControls = useRef({ left: false, right: false, jump: false });

  // Player physics
  const player = useRef({
    x: 100,
    y: 300,
    vx: 0,
    vy: 0,
    w: 36,
    h: 36,
    isGrounded: false,
    facing: 'right' as 'left' | 'right',
    runPhase: 0, // for leg wiggling
    fadeAlpha: 1.0, // for rescue fade effect
    hasDoubleJump: true,
  });

  // Checkpoint tracking
  const lastSafeX = useRef(100);
  const lastSafeY = useRef(350);

  // Level config
  const levelLength = 5500;
  const cameraX = useRef(0);
  const platforms = useRef<Platform[]>([]);
  const collectibles = useRef<Collectible[]>([]);
  const windBoosters = useRef<WindBooster[]>([]);
  const balloons = useRef<Balloon[]>([]);
  const particles = useRef<Particle[]>([]);

  // Rescue state
  const rescueActive = useRef(false);
  const rescueCloudY = useRef(-1000); // catcher cloud visual animation

  // Rainbow trail count loop
  const frameCount = useRef(0);

  useEffect(() => {
    synth.playPop();
    initLevel();

    // Key event listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') {
        if (!keys.current[e.key]) {
          // Key was just pressed down (was up previously)
          jumpKeyReleased.current = true;
        }
      }
      keys.current[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key] = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') {
        jumpKeyReleased.current = true;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    synth.setVolume(val / 100);
  };

  const initLevel = () => {
    setStarsCount(0);
    setGameWon(false);
    cameraX.current = 0;
    rescueActive.current = false;
    rescueCloudY.current = -1000;

    // Reset Checkpoint to start coordinates
    lastSafeX.current = 100;
    lastSafeY.current = 350;

    // Reset Player position (slower, floatier gameplay)
    player.current = {
      x: 100,
      y: 350,
      vx: 0,
      vy: 0,
      w: 36,
      h: 36,
      isGrounded: false,
      facing: 'right',
      runPhase: 0,
      fadeAlpha: 1.0,
      hasDoubleJump: true,
    };

    // Pre-populate platforms procedurally
    const pList: Platform[] = [
      { id: 1, x: 50, y: 450, w: 280, h: 40, type: 'normal' }, // starting ground
    ];

    const boostersList: WindBooster[] = [];
    const collectList: Collectible[] = [];
    const balloonList: Balloon[] = [];

    let platformIdCounter = 2;
    let nextX = 380;
    let nextY = 400;

    // Generate sequence of challenges up to the levelLength (5500px)
    while (nextX < levelLength - 400) {
      const typeRand = Math.random();
      let type: PlatformType = 'normal';
      let w = 220; // wider platforms
      let h = 24;
      let vx: number | undefined;
      let startX: number | undefined;
      let rangeX: number | undefined;

      if (typeRand < 0.45) {
        type = 'normal';
        w = 180 + Math.random() * 80;
      } else if (typeRand < 0.7) {
        type = 'cloud';
        w = 160 + Math.random() * 60;
        vx = (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.4);
        startX = nextX;
        rangeX = 80 + Math.random() * 50;
      } else if (typeRand < 0.88) {
        type = 'mushroom';
        w = 80;
        h = 30;
      } else {
        type = 'bubble';
        w = 90;
        h = 20;
      }

      pList.push({
        id: platformIdCounter++,
        x: nextX,
        y: nextY,
        w,
        h,
        type,
        vx,
        startX,
        rangeX,
      });

      // Spawn star collectibles above platforms
      if (Math.random() > 0.3) {
        const starEmoji = Math.random() > 0.15 ? '⭐' : Math.random() > 0.5 ? '🍒' : '🍬';
        collectList.push({
          id: platformIdCounter++,
          x: nextX + w / 2 - 10,
          y: nextY - 50 - Math.random() * 40,
          emoji: starEmoji,
          collected: false,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }

      // Small gaps and flat elevations
      const minGap = Math.max(45, platformSpacing - 20);
      const maxGap = platformSpacing + 20;
      const gap = minGap + Math.random() * (maxGap - minGap);
      const heightStep = (Math.random() - 0.5) * 45;

      // Spawn wind booster in gaps
      if (gap > 80 && (Math.random() * 100) < boosterFrequency) {
        boostersList.push({
          id: platformIdCounter++,
          x: nextX + w + gap / 2,
          y: nextY + 30 + (Math.random() - 0.5) * 20,
          r: 22,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }

      // Spawn floating balloons in gaps
      if (gap > 95 && Math.random() > 0.3) {
        const balloonColors = ['#f43f5e', '#3b82f6', '#eab308', '#ec4899', '#a855f7', '#06b6d4'];
        balloonList.push({
          id: platformIdCounter++,
          x: nextX + w + gap / 2,
          y: nextY - 80 - Math.random() * 60,
          color: balloonColors[Math.floor(Math.random() * balloonColors.length)],
          popped: false,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }

      nextX += w + gap;
      nextY += heightStep;

      if (nextY > 500) nextY = 480;
      if (nextY < 180) nextY = 220;
    }

    // Final finish line castle platform
    pList.push({
      id: platformIdCounter++,
      x: levelLength - 300,
      y: 420,
      w: 300,
      h: 80,
      type: 'normal',
    });

    platforms.current = pList;
    collectibles.current = collectList;
    windBoosters.current = boostersList;
    balloons.current = balloonList;
    particles.current = [];
  };

  // Main Canvas game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.clientWidth || window.innerWidth;
      canvas.height = canvas.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      frameCount.current++;

      // 1. UPDATE CAMERAS
      const p = player.current;

      // Horizontal camera center tracking
      const targetCamX = p.x - canvas.width * 0.4;
      cameraX.current += (targetCamX - cameraX.current) * 0.08;

      // Clamp camera X bounds
      if (cameraX.current < 0) cameraX.current = 0;
      const maxCamX = levelLength - canvas.width;
      if (cameraX.current > maxCamX && maxCamX > 0) cameraX.current = maxCamX;

      // 2. BACKGROUND SCENERY (Parallax Scrolling sky)
      ctx.fillStyle = '#ebf8ff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw background sun/clouds
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(canvas.width * 0.85, 120, 90, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Parallax rolling hills
      ctx.save();
      ctx.fillStyle = '#bbf7d0';
      ctx.beginPath();
      for (let xIdx = 0; xIdx <= canvas.width; xIdx += 20) {
        const hillY = canvas.height - 40 - Math.sin((xIdx + cameraX.current * 0.12) * 0.003) * 30;
        if (xIdx === 0) ctx.moveTo(0, hillY);
        else ctx.lineTo(xIdx, hillY);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.fill();

      // Foreground hills
      ctx.fillStyle = '#86efac';
      ctx.beginPath();
      for (let xIdx = 0; xIdx <= canvas.width; xIdx += 20) {
        const hillY = canvas.height - 15 - Math.sin((xIdx + cameraX.current * 0.35) * 0.005) * 20;
        if (xIdx === 0) ctx.moveTo(0, hillY);
        else ctx.lineTo(xIdx, hillY);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.fill();
      ctx.restore();

      // 3. PHYSIC COLLISION AND PLATFORM UPDATES
      const currentPlatforms = platforms.current;
      const currentCollectibles = collectibles.current;
      const currentBoosters = windBoosters.current;
      const currentBalloons = balloons.current;

      // Update platforms (cloud motion & bubble timers)
      currentPlatforms.forEach((plat) => {
        if (plat.type === 'cloud' && plat.vx && plat.startX && plat.rangeX) {
          plat.x += plat.vx;
          if (plat.x < plat.startX - plat.rangeX) {
            plat.x = plat.startX - plat.rangeX;
            plat.vx = -plat.vx;
          } else if (plat.x > plat.startX + plat.rangeX) {
            plat.x = plat.startX + plat.rangeX;
            plat.vx = -plat.vx;
          }
        }

        // Bubble pop count down
        if (plat.type === 'bubble' && plat.popTimer !== undefined && !plat.isPopped) {
          plat.popTimer -= 1;
          if (plat.popTimer <= 0) {
            plat.isPopped = true;
            plat.respawnTimer = 240;
            triggerPoofParticles(plat.x + plat.w / 2, plat.y + plat.h / 2, '#22d3ee', 12);
            if (Math.abs(plat.x - p.x) < 500) {
              synth.playPop();
            }
          }
        }

        // Bubble respawn timer
        if (plat.type === 'bubble' && plat.isPopped && plat.respawnTimer !== undefined) {
          plat.respawnTimer -= 1;
          if (plat.respawnTimer <= 0) {
            plat.isPopped = false;
            plat.popTimer = undefined;
            triggerPoofParticles(plat.x + plat.w / 2, plat.y + plat.h / 2, '#99f6e4', 8);
          }
        }
      });

      // 4. UPDATE PLAYER PHYSICS
      if (!rescueActive.current && !gameWon) {
        // Horizontal Movement Input
        let moveX = 0;
        if (keys.current['ArrowLeft'] || keys.current['a'] || mobileControls.current.left) {
          moveX = -1;
          p.facing = 'left';
        }
        if (keys.current['ArrowRight'] || keys.current['d'] || mobileControls.current.right) {
          moveX = 1;
          p.facing = 'right';
        }

        if (moveX !== 0) {
          p.vx += moveX * (p.isGrounded ? 0.28 : 0.22) * speedFactorRef.current;
          p.runPhase += 0.22 * speedFactorRef.current;
          
          // Spawn beautiful rainbow stardust footprints!
          if (Math.random() > 0.5) {
            const hue = (frameCount.current * 4) % 360;
            particles.current.push({
              x: p.x + p.w / 2 - (moveX * 8),
              y: p.y + p.h - 5,
              vx: -moveX * (0.3 + Math.random() * 0.7),
              vy: -Math.random() * 1.0,
              color: `hsl(${hue}, 95%, 70%)`,
              size: Math.random() * 4 + 3,
              alpha: 0.95,
              decay: 0.035,
            });
          }
        } else {
          p.runPhase = 0;
        }

        // Apply friction
        p.vx *= p.isGrounded ? 0.82 : 0.96;

        // Max speed clamp scaled by speedFactorRef.current slider mutable settings instantly
        const maxHorizontalSpeed = 3.2 * speedFactorRef.current;
        if (p.vx > maxHorizontalSpeed) p.vx = maxHorizontalSpeed;
        if (p.vx < -maxHorizontalSpeed) p.vx = -maxHorizontalSpeed;

        // Floatier gravity
        p.vy += 0.26;

        // Update Position coordinates
        p.x += p.vx;
        p.y += p.vy;

        // Clamping level left edge
        if (p.x < 0) {
          p.x = 0;
          p.vx = 0;
        }

        // 5. COLLISION DETECTION SOLVER
        p.isGrounded = false;

        currentPlatforms.forEach((plat) => {
          if (plat.isPopped) return; // skip popped bubbles

          // Check AABB intersection
          const isIntersecting = 
            p.x + p.w - 5 > plat.x &&
            p.x + 5 < plat.x + plat.w &&
            p.y + p.h >= plat.y &&
            p.y + p.h - p.vy <= plat.y + 12;

          if (isIntersecting && p.vy > 0) {
            p.y = plat.y - p.h;
            p.vy = 0;
            p.isGrounded = true;
            p.hasDoubleJump = true;

            // Checkpoint update
            if (plat.type === 'normal' || plat.type === 'cloud') {
              lastSafeX.current = p.x;
              lastSafeY.current = p.y;
            }

            // Platform types specific events
            if (plat.type === 'mushroom') {
              p.vy = -10.5;
              p.isGrounded = false;
              synth.playChime();
              triggerPoofParticles(plat.x + plat.w / 2, plat.y, '#f472b6', 15);
            } 
            else if (plat.type === 'cloud' && plat.vx) {
              p.x += plat.vx;
            } 
            else if (plat.type === 'bubble' && plat.popTimer === undefined) {
              plat.popTimer = 50;
            }
          }
        });

        // Wind Boosters collision
        currentBoosters.forEach((wb) => {
          const dist = Math.hypot((p.x + p.w / 2) - wb.x, (p.y + p.h / 2) - wb.y);
          if (dist < wb.r + 15) {
            p.vy = -11.0;
            p.isGrounded = false;
            p.hasDoubleJump = true;
            if (Math.random() > 0.75) {
              synth.playSparkle();
            }
            triggerPoofParticles(wb.x, wb.y, '#38bdf8', 8);
          }
        });

        // Balloons collision
        currentBalloons.forEach((bl) => {
          if (bl.popped) return;

          const dist = Math.hypot((p.x + p.w / 2) - bl.x, (p.y + p.h / 2) - (bl.y - 12));
          if (dist < 32) {
            bl.popped = true;
            p.vy = -8.5;
            p.isGrounded = false;
            p.hasDoubleJump = true;
            synth.playSparkle();
            
            // Pop confetti burst
            for (let i = 0; i < 15; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 1.2 + Math.random() * 3.5;
              const confColors = ['#f43f5e', '#3b82f6', '#eab308', '#10b981', '#a855f7', '#ec4899'];
              particles.current.push({
                x: bl.x,
                y: bl.y - 12,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: confColors[Math.floor(Math.random() * confColors.length)],
                size: Math.random() * 4.5 + 2.5,
                alpha: 1.0,
                decay: 0.02 + Math.random() * 0.015,
              });
            }
          }
        });

        // Jump & Double Jump triggers
        const wantsJump = keys.current['ArrowUp'] || keys.current['w'] || keys.current[' '] || mobileControls.current.jump;
        if (wantsJump) {
          const isKeyboard = keys.current['ArrowUp'] || keys.current['w'] || keys.current[' '];
          
          if (!isKeyboard || jumpKeyReleased.current) {
            if (p.isGrounded) {
              p.vy = -7.5;
              p.isGrounded = false;
              p.hasDoubleJump = true;
              synth.playPop();
              if (isKeyboard) jumpKeyReleased.current = false;
              mobileControls.current.jump = false;
            } else if (p.hasDoubleJump) {
              p.vy = -6.8;
              p.hasDoubleJump = false;
              synth.playSparkle();
              triggerPoofParticles(p.x + p.w / 2, p.y + p.h / 2, '#c084fc', 12);
              if (isKeyboard) jumpKeyReleased.current = false;
              mobileControls.current.jump = false;
            }
          }
        }

        // Collectibles check
        currentCollectibles.forEach((col) => {
          if (!col.collected) {
            const dist = Math.hypot((p.x + p.w / 2) - (col.x + 10), (p.y + p.h / 2) - (col.y + 10));
            if (dist < 32) {
              col.collected = true;
              setStarsCount((prev) => prev + 1);
              synth.playSparkle();
              triggerPoofParticles(col.x + 10, col.y + 10, '#f59e0b', 12);
            }
          }
        });

        // WIN CHECK
        if (p.x >= levelLength - 200 && p.isGrounded) {
          setGameWon(true);
          synth.playChime();
        }

        // RESCUE VOID TRIGGER
        if (p.y > canvas.height + 60) {
          rescueActive.current = true;
          rescueCloudY.current = canvas.height + 150;
          synth.playBoom();
        }
      }

      // 6. CATCH RESCUE CLOUD CHECKPOINT LOGIC
      if (rescueActive.current) {
        rescueCloudY.current -= 12;

        if (rescueCloudY.current <= canvas.height - 100) {
          // Cloud caught the player! Reset position safely to checkpoint
          p.x = lastSafeX.current;
          p.y = lastSafeY.current - 40;
          p.vx = 0;
          p.vy = 0;
          p.fadeAlpha = 0;
          p.hasDoubleJump = true;
          
          cameraX.current = p.x - canvas.width * 0.4;
          if (cameraX.current < 0) cameraX.current = 0;
          const maxCam = levelLength - canvas.width;
          if (cameraX.current > maxCam && maxCam > 0) cameraX.current = maxCam;

          rescueActive.current = false;
          synth.playChime();
        }
      }

      // Smooth fade opacity back to normal
      if (p.fadeAlpha < 1.0) {
        p.fadeAlpha += 0.05;
      }

      // Draw collectibles
      currentCollectibles.forEach((col) => {
        if (col.collected) return;
        col.pulsePhase += 0.08;
        const scale = 1.0 + Math.sin(col.pulsePhase) * 0.1;

        ctx.save();
        ctx.translate(col.x + 10 - cameraX.current, col.y + 10);
        ctx.scale(scale, scale);
        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(col.emoji, 0, 0);
        ctx.restore();
      });

      // Draw Wind Boosters
      currentBoosters.forEach((wb) => {
        wb.pulsePhase += 0.05;
        const pulseScale = 1.0 + Math.sin(wb.pulsePhase) * 0.15;

        ctx.save();
        ctx.translate(wb.x - cameraX.current, wb.y);
        ctx.scale(pulseScale, pulseScale);

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, wb.r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(14, 165, 233, 0.12)';
        ctx.beginPath();
        ctx.arc(0, 0, wb.r * 0.65, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌀', 0, 0);

        ctx.restore();
      });

      // Draw Balloons (Floating pops 🎈)
      currentBalloons.forEach((bl) => {
        if (bl.popped) return;
        bl.pulsePhase += 0.03;
        const hoverOffset = Math.sin(bl.pulsePhase) * 5;

        ctx.save();
        ctx.translate(bl.x - cameraX.current, bl.y + hoverOffset);

        // Draw balloon body circle
        ctx.fillStyle = bl.color;
        ctx.beginPath();
        ctx.arc(0, -12, 14, 0, Math.PI * 2);
        ctx.fill();

        // Balloon highlight glint
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.arc(-5, -17, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Balloon knot bottom
        ctx.fillStyle = bl.color;
        ctx.beginPath();
        ctx.moveTo(-3, 2);
        ctx.lineTo(3, 2);
        ctx.lineTo(0, -2);
        ctx.closePath();
        ctx.fill();

        // String
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.quadraticCurveTo(4, 12, 0, 22);
        ctx.stroke();

        ctx.restore();
      });

      // Draw Platforms
      currentPlatforms.forEach((plat) => {
        if (plat.isPopped) return;

        ctx.save();
        ctx.translate(plat.x - cameraX.current, plat.y);

        if (plat.type === 'normal') {
          const grassGrad = ctx.createLinearGradient(0, 0, 0, plat.h);
          grassGrad.addColorStop(0, '#22c55e');
          grassGrad.addColorStop(0.3, '#15803d');
          grassGrad.addColorStop(1, '#78350f');

          ctx.fillStyle = grassGrad;
          ctx.beginPath();
          ctx.roundRect(0, 0, plat.w, plat.h, [8, 8, 2, 2]);
          ctx.fill();

          ctx.strokeStyle = '#86efac';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(0, 3);
          ctx.lineTo(plat.w, 3);
          ctx.stroke();
        } 
        else if (plat.type === 'mushroom') {
          const capGrad = ctx.createRadialGradient(plat.w / 2, plat.h / 2, 2, plat.w / 2, plat.h / 2, plat.w / 2);
          capGrad.addColorStop(0, '#f472b6');
          capGrad.addColorStop(0.7, '#db2777');
          capGrad.addColorStop(1, '#be185d');
          
          ctx.fillStyle = capGrad;
          ctx.beginPath();
          ctx.roundRect(0, 0, plat.w, 16, [14, 14, 2, 2]);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(15, 7, 3, 0, Math.PI * 2);
          ctx.arc(plat.w / 2, 5, 4, 0, Math.PI * 2);
          ctx.arc(plat.w - 15, 7, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fdf2f8';
          ctx.beginPath();
          ctx.roundRect(plat.w / 2 - 8, 16, 16, 14, [0, 0, 4, 4]);
          ctx.fill();
        } 
        else if (plat.type === 'cloud') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          ctx.arc(18, plat.h / 2, 14, 0, Math.PI * 2);
          ctx.arc(plat.w / 2, plat.h / 2 - 4, 16, 0, Math.PI * 2);
          ctx.arc(plat.w - 18, plat.h / 2, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } 
        else if (plat.type === 'bubble') {
          const wobble = plat.popTimer ? Math.sin(plat.popTimer * 0.5) * 3 : 0;
          ctx.translate(wobble, 0);

          const bubbleGrad = ctx.createRadialGradient(plat.w / 2, plat.h / 2, 2, plat.w / 2, plat.h / 2, plat.w / 2);
          bubbleGrad.addColorStop(0, 'rgba(34, 211, 238, 0.2)');
          bubbleGrad.addColorStop(0.8, 'rgba(56, 189, 248, 0.5)');
          bubbleGrad.addColorStop(1, '#06b6d4');

          ctx.fillStyle = bubbleGrad;
          ctx.beginPath();
          ctx.roundRect(0, 0, plat.w, plat.h, 10);
          ctx.fill();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.beginPath();
          ctx.arc(10, 6, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // Draw Finish Castle 🏰
      ctx.save();
      ctx.translate(levelLength - 200 - cameraX.current, 280);
      ctx.font = '90px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('🏰', 0, 140);
      
      ctx.strokeStyle = 'rgba(251, 146, 60, 0.35)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, 140, 120, Math.PI, 0);
      ctx.stroke();
      ctx.restore();

      // 7. RENDER PLAYER CHARACTER
      ctx.save();
      ctx.translate(p.x - cameraX.current, p.y);
      ctx.globalAlpha = p.fadeAlpha;

      const wiggle = Math.sin(p.runPhase) * 0.12;
      ctx.translate(p.w / 2, p.h / 2);
      ctx.rotate(wiggle);

      if (p.facing === 'left') {
        ctx.scale(-1, 1);
      }

      ctx.font = '34px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const charEmoji = character === 'bunny' ? '🐰' : character === 'dino' ? '🦖' : '👨🚀';
      ctx.fillText(charEmoji, 0, 0);

      ctx.restore();

      // 8. RENDER RESCUE CLOUD IN ACTION
      if (rescueActive.current) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 4;
        ctx.shadowColor = 'rgba(186, 230, 253, 0.5)';
        ctx.shadowBlur = 15;

        const cy = rescueCloudY.current;
        const cx = canvas.width / 2;

        ctx.beginPath();
        ctx.arc(cx - 100, cy, 50, 0, Math.PI * 2);
        ctx.arc(cx - 40, cy - 25, 70, 0, Math.PI * 2);
        ctx.arc(cx + 40, cy - 25, 70, 0, Math.PI * 2);
        ctx.arc(cx + 100, cy, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('☁️ Safe! ☁️', cx, cy - 10);
        ctx.restore();
      }

      // 9. DRAW PARTICLES
      const pArr = particles.current;
      for (let i = pArr.length - 1; i >= 0; i--) {
        const pt = pArr[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= pt.decay;

        if (pt.alpha <= 0) {
          pArr.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x - cameraX.current, pt.y, pt.size, 0, Math.PI * 2);
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
  }, [character, gameWon]);

  // Particle explosion trigger
  const triggerPoofParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 3.5;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 4 + 2,
        alpha: 1.0,
        decay: Math.random() * 0.03 + 0.02,
      });
    }
  };

  // Helper actions for touch buttons
  const handleTouchButton = (btn: 'left' | 'right' | 'jump', state: boolean) => {
    mobileControls.current[btn] = state;
    if (state && btn === 'jump') {
      synth.playPop();
    }
  };

  const restartGame = () => {
    synth.playPop();
    initLevel();
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden select-none bg-sky-50">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />

      {/* Back and Restart Buttons (Optimized responsive left spacing) */}
      <div className="absolute top-3 left-3 sm:top-6 sm:left-6 z-10 flex gap-1.5 sm:gap-2">
        <button
          onClick={() => {
            synth.playPop();
            onBack();
          }}
          className="bg-white/95 hover:bg-white text-slate-800 font-bold px-3 py-2 sm:px-6 sm:py-3 rounded-full border-2 sm:border-4 border-slate-200 hover:border-pink-300 shadow-md transition flex items-center justify-center text-xs sm:text-sm"
        >
          <span className="sm:inline mr-1 sm:mr-0">&larr;</span>
          <span className="hidden sm:inline">Exit</span>
        </button>

        <button
          onClick={restartGame}
          className="bg-white/95 hover:bg-white text-slate-600 font-bold p-2 sm:p-3 rounded-full border-2 sm:border-4 border-slate-200 hover:border-pink-300 shadow-md transition"
          title="Restart Level"
        >
          <RotateCcw size={16} className="sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Stats Counter & Goal (Top center, responsive text scales down on mobile) */}
      <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-10 bg-white/90 backdrop-blur-md px-3 py-1.5 sm:px-6 sm:py-2.5 rounded-full border-2 sm:border-4 border-pink-100 shadow-lg flex items-center gap-2 sm:gap-4 max-w-[50%] xs:max-w-none">
        <div className="flex items-center gap-1 sm:gap-1.5 select-none">
          <span className="text-lg sm:text-2xl">⭐</span>
          <span className="text-xs sm:text-lg font-black text-amber-600 leading-none">{starsCount} <span className="hidden xs:inline">Stars</span></span>
        </div>
        <div className="h-4 sm:h-6 w-0.5 bg-slate-200 select-none" />
        <div className="flex items-center gap-1 sm:gap-1.5 select-none">
          <span className="text-lg sm:text-2xl">🏰</span>
          <span className="text-xs sm:text-lg font-black text-emerald-600 leading-none truncate max-w-[70px] xs:max-w-none">
            <span className="hidden xs:inline">Goal: </span>Castle!
          </span>
        </div>
      </div>

      {/* Settings Button (Right top, character selection moved inside to clear space) */}
      <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-10">
        <button
          onClick={() => {
            synth.playPop();
            setShowSettings(!showSettings);
          }}
          className="bg-white/95 hover:bg-white text-emerald-600 font-bold p-2.5 sm:p-3 rounded-full border-2 sm:border-4 border-slate-200 hover:border-emerald-300 shadow-md transition"
          title="Settings"
        >
          <Settings size={16} className="sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Customize drawer settings (Consolidated for all screen widths) */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 right-3 sm:top-24 sm:right-6 w-[90vw] xs:w-80 bg-white z-20 rounded-3xl p-5 sm:p-6 shadow-2xl border-2 sm:border-4 border-emerald-100 space-y-5 sm:space-y-6"
          >
            <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-2 border-slate-100 select-none">
              ⚙️ Game Settings
            </h3>

            {/* Character Selector (Moved inside settings to prevent top-bar collision on phone) */}
            <div>
              <div className="flex justify-between text-[10px] sm:text-xs font-bold text-slate-500 uppercase mb-2 select-none">
                <span>Choose Character</span>
                <span className="text-emerald-600 font-extrabold capitalize">{character}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold text-slate-600">
                <button
                  onClick={() => { synth.playPop(); setCharacter('bunny'); }}
                  className={`py-2 rounded-xl transition ${character === 'bunny' ? 'bg-emerald-500 text-white shadow' : 'hover:bg-slate-200'}`}
                >
                  🐰 Bunny
                </button>
                <button
                  onClick={() => { synth.playPop(); setCharacter('dino'); }}
                  className={`py-2 rounded-xl transition ${character === 'dino' ? 'bg-emerald-500 text-white shadow' : 'hover:bg-slate-200'}`}
                >
                  🦖 Dino
                </button>
                <button
                  onClick={() => { synth.playPop(); setCharacter('astronaut'); }}
                  className={`py-2 rounded-xl transition ${character === 'astronaut' ? 'bg-emerald-500 text-white shadow' : 'hover:bg-slate-200'}`}
                >
                  🚀 Space
                </button>
              </div>
            </div>

            {/* Platform gap spacing frequency */}
            <div>
              <div className="flex justify-between text-[10px] sm:text-xs font-bold text-slate-500 uppercase mb-2 select-none">
                <span>Platform Gaps (Spacing)</span>
                <span className="text-emerald-600 font-extrabold">{platformSpacing}px</span>
              </div>
              <input
                type="range"
                min="60"
                max="160"
                value={platformSpacing}
                onChange={(e) => setPlatformSpacing(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-[9px] text-slate-400 select-none block mt-1">Lower = closer platforms (easier)</span>
            </div>

            {/* Wind booster spawn frequency */}
            <div>
              <div className="flex justify-between text-[10px] sm:text-xs font-bold text-slate-500 uppercase mb-2 select-none">
                <span>Wind Booster Frequency</span>
                <span className="text-emerald-600 font-extrabold">{boosterFrequency}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={boosterFrequency}
                onChange={(e) => setBoosterFrequency(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Character Speed Factor Slider */}
            <div>
              <div className="flex justify-between text-[10px] sm:text-xs font-bold text-slate-500 uppercase mb-2 select-none">
                <span>Character Speed</span>
                <span className="text-emerald-600 font-extrabold">{Math.round(speedFactor * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="2.2"
                step="0.1"
                value={speedFactor}
                onChange={(e) => setSpeedFactor(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Volume */}
            <div>
              <div className="flex justify-between text-[10px] sm:text-xs font-bold text-slate-500 uppercase mb-2 select-none">
                <span>Sound FX Volume</span>
                <span className="text-emerald-600 font-extrabold">{volume}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-slate-400" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>

            {/* Apply new level */}
            <button
              onClick={() => {
                synth.playPop();
                initLevel();
                setShowSettings(false);
              }}
              className="w-full py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-xs sm:text-sm active:scale-95 shadow-md transition"
            >
              🔄 Rebuild Level
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Gamepad Controllers (Responsive width and gap alignment) */}
      <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none flex justify-between items-end">
        {/* Left/Right Directional keys */}
        <div className="flex gap-3 pointer-events-auto mb-2 sm:mb-0">
          <button
            onMouseDown={() => handleTouchButton('left', true)}
            onMouseUp={() => handleTouchButton('left', false)}
            onTouchStart={(e) => { e.preventDefault(); handleTouchButton('left', true); }}
            onTouchEnd={(e) => { e.preventDefault(); handleTouchButton('left', false); }}
            className="w-14 h-14 sm:w-16 sm:h-16 bg-white/80 active:bg-emerald-500 active:text-white text-slate-700 border-2 sm:border-4 border-slate-100 hover:border-emerald-200 rounded-2xl shadow-xl flex items-center justify-center text-xl sm:text-2xl font-bold transition focus:outline-none"
          >
            ◀️
          </button>
          <button
            onMouseDown={() => handleTouchButton('right', true)}
            onMouseUp={() => handleTouchButton('right', false)}
            onTouchStart={(e) => { e.preventDefault(); handleTouchButton('right', true); }}
            onTouchEnd={(e) => { e.preventDefault(); handleTouchButton('right', false); }}
            className="w-14 h-14 sm:w-16 sm:h-16 bg-white/80 active:bg-emerald-500 active:text-white text-slate-700 border-2 sm:border-4 border-slate-100 hover:border-emerald-200 rounded-2xl shadow-xl flex items-center justify-center text-xl sm:text-2xl font-bold transition focus:outline-none"
          >
            ▶️
          </button>
        </div>

        {/* Jump key - Shifted upward by padding bottom on mobile screen layout to clear the watermark AAN */}
        <div className="pointer-events-auto pb-12 sm:pb-0">
          <button
            onMouseDown={() => handleTouchButton('jump', true)}
            onMouseUp={() => handleTouchButton('jump', false)}
            onTouchStart={(e) => { e.preventDefault(); handleTouchButton('jump', true); }}
            onTouchEnd={(e) => { e.preventDefault(); handleTouchButton('jump', false); }}
            className="w-18 h-18 sm:w-20 sm:h-20 bg-white/80 active:bg-pink-500 active:text-white text-slate-700 border-2 sm:border-4 border-slate-100 hover:border-pink-200 rounded-full shadow-2xl flex flex-col items-center justify-center text-xs sm:text-sm font-black uppercase transition focus:outline-none"
          >
            <span className="text-xl sm:text-2xl">🔼</span>
            <span className="text-[8px] sm:text-[9px] text-slate-400 active:text-white leading-none">Jump</span>
          </button>
        </div>
      </div>

      {/* Floating Instruction help banner (Responsive spans full width on phone) */}
      {showHelper && (
        <div className="absolute top-16 left-3 right-3 sm:top-24 sm:left-6 sm:right-auto z-10 bg-white/30 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 select-none text-left flex items-center justify-between gap-2 max-w-none sm:max-w-sm shadow-md">
          <p className="text-slate-800 text-[10px] sm:text-xs font-semibold leading-normal">
            🎮 Press <b>Arrow Keys</b> / <b>A D</b>. Press jump twice to **Double Jump**! Pop <b>🎈 Balloons</b> & check settings for speed adjusters!
          </p>
          <button
            onClick={() => { synth.playPop(); setShowHelper(false); }}
            className="hover:bg-slate-800/10 p-1 rounded-full text-slate-600 hover:text-rose-500 transition focus:outline-none flex-shrink-0"
            aria-label="Close instructions"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* WIN MODAL DRAWER */}
      {gameWon && (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[3rem] border-4 border-amber-200 shadow-2xl p-10 max-w-md text-center text-slate-800 relative overflow-hidden"
          >
            <div className="text-7xl mb-4 select-none">👑</div>
            <h3 className="text-3xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-600">
              Grand Winner!
            </h3>
            <p className="text-slate-600 font-bold mb-6">
              Wow! You leaped across the sky, collected <b>{starsCount} stars</b>, and reached the magical castle!
            </p>

            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  synth.playPop();
                  onBack();
                }}
                className="px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold transition active:scale-95 text-xs"
              >
                Dashboard
              </button>
              <button
                onClick={restartGame}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-extrabold flex items-center gap-1.5 shadow-lg shadow-amber-200 active:scale-95 transition text-xs"
              >
                Play Again &rarr;
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
