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
import './App.css';

function App() {
  const [activeGame, setActiveGame] = useState<string | null>(null);

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
      default:
        return (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full min-height-screen bg-[#fefcf0]"
          >
            <Home onSelectGame={setActiveGame} />
          </motion.div>
        );
    }
  };

  return (
    <div className="w-full min-h-screen relative font-sans">
      <AnimatePresence mode="wait">
        {renderGame()}
      </AnimatePresence>
    </div>
  );
}

export default App;
