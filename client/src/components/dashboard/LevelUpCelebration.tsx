import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LevelUpCelebrationProps {
  newLevel: number;
  onClose: () => void;
}

function Particle({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full pointer-events-none"
      style={{ backgroundColor: color, left: "50%", top: "50%" }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{ x, y, opacity: 0, scale: 0 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
    />
  );
}

const COLORS = ["#f59e0b", "#a855f7", "#3b82f6", "#10b981", "#ef4444", "#ec4899", "#facc15"];

function generateParticles(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360;
    const distance = 80 + Math.random() * 120;
    const rad = (angle * Math.PI) / 180;
    return {
      id: i,
      x: Math.cos(rad) * distance,
      y: Math.sin(rad) * distance,
      color: COLORS[i % COLORS.length],
    };
  });
}

export default function LevelUpCelebration({ newLevel, onClose }: LevelUpCelebrationProps) {
  const [particles] = useState(() => generateParticles(24));
  const [particleKey, setParticleKey] = useState(0);

  useEffect(() => {
    setParticleKey(k => k + 1);
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative bg-card border shadow-2xl rounded-2xl p-8 mx-4 max-w-sm w-full text-center overflow-visible"
          initial={{ scale: 0.5, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative flex items-center justify-center mb-5">
            {particles.map(p => (
              <Particle key={`${particleKey}-${p.id}`} x={p.x} y={p.y} color={p.color} />
            ))}
            <motion.div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #a855f7, #f59e0b)" }}
              initial={{ rotate: -15, scale: 0.8 }}
              animate={{ rotate: [0, 15, -10, 8, 0], scale: [0.8, 1.15, 1] }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <Award className="w-10 h-10 text-white" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-1">
              Level Up!
            </p>
            <h2 className="text-4xl font-extrabold mb-1">
              Level{" "}
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(90deg, #a855f7, #f59e0b)" }}
              >
                {newLevel}
              </span>
            </h2>
            <p className="text-muted-foreground text-sm mb-5">
              Congratulations! You've reached a new level. Keep completing tasks to unlock even greater rewards!
            </p>
          </motion.div>

          <motion.div
            className="flex items-center justify-center gap-1 mb-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.07, type: "spring", stiffness: 400 }}
              >
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              </motion.div>
            ))}
          </motion.div>

          <Button
            className="w-full font-semibold text-white"
            style={{ background: "linear-gradient(90deg, #a855f7, #f59e0b)", border: "none" }}
            onClick={onClose}
          >
            Keep Going!
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
