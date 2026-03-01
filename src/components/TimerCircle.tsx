import { motion } from "framer-motion";

interface TimerCircleProps {
  timeLeft: number;
  percentage: number;
  isWarning: boolean;
}

export function TimerCircle({ timeLeft, percentage, isWarning }: TimerCircleProps) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <motion.div
      className={`relative flex items-center justify-center ${isWarning ? "animate-timer-pulse" : ""}`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 200 }}
    >
      {/* Outer glow ring for urgency */}
      {isWarning && (
        <motion.div
          className="absolute inset-[-6px] rounded-full border-2 border-destructive/40"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <svg width="64" height="64" viewBox="0 0 64 64">
        {/* Background track */}
        <circle cx="32" cy="32" r={radius} fill="none" className="stroke-muted" strokeWidth="4" />
        {/* Progress arc */}
        <circle
          cx="32" cy="32" r={radius} fill="none"
          className={isWarning ? "stroke-destructive" : "stroke-primary"}
          strokeWidth={isWarning ? "5" : "4"}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 32 32)"
          style={{ transition: "stroke-dashoffset 1s linear, stroke-width 0.3s ease" }}
        />
      </svg>
      <motion.span
        key={timeLeft}
        initial={{ scale: 1.3, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={`absolute font-display text-lg font-bold tabular-nums ${isWarning ? "text-destructive" : "text-foreground"}`}
      >
        {timeLeft}
      </motion.span>
    </motion.div>
  );
}
