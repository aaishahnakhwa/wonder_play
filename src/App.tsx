import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Home } from './components/Home';
import { KeyboardFireworks } from './games/KeyboardFireworks';
import { BubblePop } from './games/BubblePop';
import { RainbowPaint } from './games/RainbowPaint';
import { ButterflyGarden } from './games/ButterflyGarden';
import { MagicGarden } from './games/MagicGarden';
import { RainMaker } from './games/RainMaker';
import { BubbleLetters } from './games/BubbleLetters';
import { GeoSandbox } from './games/GeoSandbox';
import { SpaceSwirl } from './games/SpaceSwirl';
import { CloudHopper } from './games/CloudHopper';
import { Play, X } from 'lucide-react';
import { synth } from './utils/synth';
import './App.css';

interface Instruction {
  title: string;
  emoji: string;
  text: string;
  tips: string;
  gradient: string;
}

const gameInstructions: Record<string, Instruction> = {
  'keyboard-fireworks': {
    title: 'Keyboard Fireworks',
    emoji: '🎆',
    text: 'Press any letter keys on your keyboard or click on the screen to trigger spectacular fireworks or bloom magical flowers!',
    tips: 'Hold down keys or click repeatedly for amazing visual patterns.',
    gradient: 'from-purple-500 via-pink-500 to-red-500'
  },
  'bubble-pop': {
    title: 'Bubble Pop',
    emoji: '🫧',
    text: 'Hover your mouse cursor or drag your finger over the floating bubbles to pop them! Find the rare special bubbles.',
    tips: 'Rainbow bubbles split, Golden stars give +10 score, and Gift boxes burst confetti!',
    gradient: 'from-blue-500 via-cyan-500 to-indigo-500'
  },
  'rainbow-paint': {
    title: 'Rainbow Paint',
    emoji: '🎨',
    text: 'Drag your cursor or finger to paint beautiful color strokes! Customize brush sizes, glow, transparency, and style.',
    tips: 'Try Kaleidoscope mode to paint magical, symmetric snowflake mandalas!',
    gradient: 'from-yellow-500 via-orange-500 to-red-500'
  },
  'butterfly-garden': {
    title: 'Butterfly Garden',
    emoji: '🦋',
    text: 'Click on the ground to grow flowers. Watch butterflies, bees, and dragonflies explore the changing seasons and weather.',
    tips: 'Hold your cursor completely still and see if a butterfly lands on it!',
    gradient: 'from-emerald-500 to-teal-500'
  },
  'magic-garden': {
    title: 'Magic Garden',
    emoji: '🍄',
    text: 'Click or drag across the ground to procedurally grow a forest of trees, mushrooms, crystal shards, and candy canes.',
    tips: 'Switch between Spring, Winter, and Candy themes in the top-right corner!',
    gradient: 'from-green-500 via-emerald-500 to-teal-600'
  },
  'rain-maker': {
    title: 'Rain Maker',
    emoji: '🌧️',
    text: 'Click or drag in the sky to build rain clouds. Rainfall waters the soil, growing grass, flowers, and trees.',
    tips: 'Lush ground attracts frogs, flooding creates puddles for ducks, and sunshine spawns birds and rainbows!',
    gradient: 'from-sky-500 via-blue-500 to-indigo-500'
  },
  'bubble-letters': {
    title: 'Alphabet Bubbles',
    emoji: '🔤',
    text: 'Press keyboard letters or click on-screen buttons to spawn letter bubbles. Click a bubble to pop it and hear its sound.',
    tips: 'Learn matching emojis and phonics pronunciations dynamically!',
    gradient: 'from-amber-500 via-orange-500 to-yellow-600'
  },
  'geo-sandbox': {
    title: 'Geo Sandbox',
    emoji: '🗺️',
    text: 'Sculpt the heightmap plain! Raise mountain peaks, dig valleys, and rain water to watch realistic fluid physics flow downhill.',
    tips: 'Toggle the Contours On switch to see live mathematical elevation lines!',
    gradient: 'from-emerald-500 via-yellow-500 to-blue-500'
  },
  'space-swirl': {
    title: 'Space Swirl',
    emoji: '🌌',
    text: 'Place gravity stars, wind repellers, and black holes to orbit thousands of velocity-aligned neon comet particles.',
    tips: 'Black holes swallow stardust, triggering gravitational lens shockwaves!',
    gradient: 'from-slate-900 via-indigo-950 to-purple-950'
  },
  'cloud-hopper': {
    title: 'Cloud Hopper',
    emoji: '🐰',
    text: '🏰 GOAL: Reach the Castle!\nRun and jump across floating cloud platforms and bouncy spring mushrooms to make it to the finish castle.',
    tips: 'Collect as many stars (⭐) as you can to set a high score!\n\nElements:\n🟩 Grasslands - Stable, solid path\n🍄 Mushrooms - Springs you high in the air\n☁️ Drift Clouds - Slow moving platforms\n🫧 Bubbles - Pop 1 second after you land\n🎈 Balloons - Pop them for a jump boost & confetti\n🌀 Wind Vortices - Blows you high with sparkles\n\n💡 Tip: Press jump twice in mid-air to Double Jump!',
    gradient: 'from-yellow-400 via-orange-400 to-amber-500'
  }
};

function App() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleSelectGame = (gameId: string) => {
    setActiveGame(gameId);
    setShowModal(true);
  };

  const handleStartGame = () => {
    synth.playPop();
    setShowModal(false);
  };

  const handleCancelModal = () => {
    synth.playPop();
    setShowModal(false);
    setActiveGame(null);
  };

  const renderGame = () => {
    switch (activeGame) {
      case 'keyboard-fireworks':
        return (
          <motion.div
            key="keyboard-fireworks"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            <KeyboardFireworks onBack={() => setActiveGame(null)} />
          </motion.div>
        );
      case 'bubble-pop':
        return (
          <motion.div
            key="bubble-pop"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            <BubblePop onBack={() => setActiveGame(null)} />
          </motion.div>
        );
      case 'rainbow-paint':
        return (
          <motion.div
            key="rainbow-paint"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            <RainbowPaint onBack={() => setActiveGame(null)} />
          </motion.div>
        );
      case 'butterfly-garden':
        return (
          <motion.div
            key="butterfly-garden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            <ButterflyGarden onBack={() => setActiveGame(null)} />
          </motion.div>
        );
      case 'magic-garden':
        return (
          <motion.div
            key="magic-garden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            <MagicGarden onBack={() => setActiveGame(null)} />
          </motion.div>
        );
      case 'rain-maker':
        return (
          <motion.div
            key="rain-maker"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            <RainMaker onBack={() => setActiveGame(null)} />
          </motion.div>
        );
      case 'bubble-letters':
        return (
          <motion.div
            key="bubble-letters"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            <BubbleLetters onBack={() => setActiveGame(null)} />
          </motion.div>
        );
      case 'geo-sandbox':
        return (
          <motion.div
            key="geo-sandbox"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            <GeoSandbox onBack={() => setActiveGame(null)} />
          </motion.div>
        );
      case 'space-swirl':
        return (
          <motion.div
            key="space-swirl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            <SpaceSwirl onBack={() => setActiveGame(null)} />
          </motion.div>
        );
      case 'cloud-hopper':
        return (
          <motion.div
            key="cloud-hopper"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            <CloudHopper onBack={() => setActiveGame(null)} />
          </motion.div>
        );
      default:
        return (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full min-h-screen bg-[#fefcf0]"
          >
            <Home onSelectGame={handleSelectGame} />
          </motion.div>
        );
    }
  };

  const selectedInstructions = activeGame ? gameInstructions[activeGame] : null;

  return (
    <div className="w-full min-h-screen relative font-sans">
      <AnimatePresence mode="wait">
        {renderGame()}
      </AnimatePresence>

      {/* Persistent Watermark Badge */}
      <div className="fixed bottom-4 right-4 z-40 bg-white/30 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/30 shadow-md pointer-events-none select-none text-[10px] md:text-xs font-black text-slate-500/70 tracking-widest uppercase">
        AAN
      </div>

      {/* Instruction Modal Overlay */}
      <AnimatePresence>
        {showModal && selectedInstructions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal backdrop blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={handleCancelModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />

            {/* Modal card */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 120 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] border-4 border-pink-100 shadow-2xl p-8 relative overflow-hidden text-slate-800"
            >
              {/* Corner Close button */}
              <button
                onClick={handleCancelModal}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={20} />
              </button>

              <div className="text-center">
                {/* Large animated emoji */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="text-7xl mb-4 select-none"
                >
                  {selectedInstructions.emoji}
                </motion.div>

                {/* Styled title matching game gradient */}
                <h3 className={`text-3xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r ${selectedInstructions.gradient} drop-shadow-sm`}>
                  {selectedInstructions.title}
                </h3>

                {/* Primary instructions */}
                <p className="text-slate-600 text-base font-semibold leading-relaxed mb-6">
                  {selectedInstructions.text}
                </p>

                {/* Tips alert box */}
                <div className="bg-amber-50/80 border-2 border-dashed border-amber-200 p-4 rounded-2xl mb-8 flex gap-3 text-left">
                  <span className="text-2xl select-none">💡</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold text-amber-700 uppercase">Tip for extra fun</span>
                    <p className="text-xs font-bold text-amber-950 mt-0.5 leading-normal whitespace-pre-line">{selectedInstructions.tips}</p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleCancelModal}
                    className="px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold transition active:scale-95 text-sm"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleStartGame}
                    className={`px-8 py-3.5 rounded-2xl bg-gradient-to-r ${selectedInstructions.gradient} text-white font-extrabold flex items-center gap-1.5 shadow-lg shadow-pink-200 active:scale-95 transition text-sm`}
                  >
                    <Play size={16} className="fill-white" /> Let's Play!
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
