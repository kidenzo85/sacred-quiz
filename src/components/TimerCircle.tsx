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
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" className="stroke-muted" strokeWidth="4" />
        <circle
          cx="32" cy="32" r={radius} fill="none"
          className={isWarning ? "stroke-destructive" : "stroke-primary"}
          strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 32 32)"
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <span className={`absolute font-display text-lg font-bold ${isWarning ? "text-destructive" : "text-foreground"}`}>
        {timeLeft}
      </span>
    </motion.div>
  );
}
