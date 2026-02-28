import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

interface AnswerOptionProps {
  label: string;
  index: number;
  isSelected: boolean;
  isCorrect: boolean | null;
  isRevealed: boolean;
  disabled: boolean;
  onClick: () => void;
}

const letters = ["A", "B", "C", "D"];

export function AnswerOption({ label, index, isSelected, isCorrect, isRevealed, disabled, onClick }: AnswerOptionProps) {
  let variant: "default" | "correct" | "wrong" = "default";
  if (isRevealed) {
    if (isCorrect) variant = "correct";
    else if (isSelected && !isCorrect) variant = "wrong";
  }

  const styles = {
    default: "bg-card border-border hover:border-primary/50 hover:shadow-soft",
    correct: "bg-success/10 border-success shadow-soft",
    wrong: "bg-destructive/10 border-destructive shadow-soft",
  };

  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      disabled={disabled}
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all duration-300 text-left ${styles[variant]} ${
        disabled && variant === "default" ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
      } ${isSelected && variant === "default" ? "border-primary shadow-soft" : ""}`}
    >
      <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm ${
        variant === "correct"
          ? "bg-success text-success-foreground"
          : variant === "wrong"
          ? "bg-destructive text-destructive-foreground"
          : isSelected
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground"
      }`}>
        {variant === "correct" ? <Check className="w-5 h-5" /> : variant === "wrong" ? <X className="w-5 h-5" /> : letters[index]}
      </span>
      <span className="font-body text-base text-foreground">{label}</span>
    </motion.button>
  );
}
