import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sampleQuestions, type QuizQuestion } from "@/data/questions";
import { useTimer } from "@/hooks/useTimer";
import { TimerCircle } from "@/components/TimerCircle";
import { AnswerOption } from "@/components/AnswerOption";
import { BookOpen, RotateCcw, Trophy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const TIMER_SECONDS = 15;

type QuizState = "idle" | "playing" | "revealed" | "finished";

export function QuizGame() {
  const [state, setState] = useState<QuizState>("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);

  const question: QuizQuestion | undefined = sampleQuestions[currentIndex];

  const handleTimeUp = useCallback(() => {
    setState("revealed");
    setAnswers((prev) => [...prev, selectedAnswer]);
  }, [selectedAnswer]);

  const timer = useTimer(TIMER_SECONDS, handleTimeUp);

  const startQuiz = () => {
    setCurrentIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setAnswers([]);
    setState("playing");
    timer.start();
  };

  const selectAnswer = (index: number) => {
    if (state !== "playing" || selectedAnswer !== null) return;
    setSelectedAnswer(index);
    timer.stop();

    if (index === question.correctIndex) {
      setScore((s) => s + 1);
    }

    setAnswers((prev) => [...prev, index]);
    setState("revealed");
  };

  const nextQuestion = () => {
    if (currentIndex + 1 >= sampleQuestions.length) {
      setState("finished");
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedAnswer(null);
    setState("playing");
    timer.start();
  };

  if (state === "idle") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-8 max-w-lg mx-auto"
      >
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto shadow-glow">
          <BookOpen className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground mb-3">Prêt à tester vos connaissances ?</h2>
          <p className="text-muted-foreground font-body">
            {sampleQuestions.length} questions · {TIMER_SECONDS}s par question
          </p>
        </div>
        <Button onClick={startQuiz} size="lg" className="text-lg px-8 py-6 shadow-glow">
          <Sparkles className="w-5 h-5 mr-2" />
          Commencer le Quiz
        </Button>
      </motion.div>
    );
  }

  if (state === "finished") {
    const pct = Math.round((score / sampleQuestions.length) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-8 max-w-lg mx-auto"
      >
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto shadow-glow">
          <Trophy className="w-12 h-12 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground mb-2">Quiz terminé !</h2>
          <p className="text-5xl font-display font-bold text-gradient-gold my-4">{score}/{sampleQuestions.length}</p>
          <p className="text-muted-foreground">{pct}% de bonnes réponses</p>
        </div>
        <Button onClick={startQuiz} size="lg" className="text-lg px-8 py-6">
          <RotateCcw className="w-5 h-5 mr-2" />
          Rejouer
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-body text-muted-foreground">Question {currentIndex + 1}/{sampleQuestions.length}</span>
          <div className="flex gap-1 mt-1">
            {sampleQuestions.map((_, i) => (
              <div key={i} className={`h-1.5 w-8 rounded-full transition-all ${
                i < currentIndex ? "bg-primary" : i === currentIndex ? "bg-primary/50" : "bg-muted"
              }`} />
            ))}
          </div>
        </div>
        <TimerCircle timeLeft={timer.timeLeft} percentage={timer.percentage} isWarning={timer.timeLeft <= 5} />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-6"
        >
          <div className="bg-gradient-card rounded-xl p-6 shadow-card border border-border">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-body font-medium mb-3">
              {question.category}
            </span>
            <h3 className="font-display text-xl md:text-2xl font-bold text-foreground leading-relaxed">
              {question.question}
            </h3>
          </div>

          {/* Answers */}
          <div className="space-y-3">
            {question.options.map((opt, i) => (
              <AnswerOption
                key={i}
                label={opt}
                index={i}
                isSelected={selectedAnswer === i}
                isCorrect={i === question.correctIndex}
                isRevealed={state === "revealed"}
                disabled={state === "revealed"}
                onClick={() => selectAnswer(i)}
              />
            ))}
          </div>

          {/* Explanation */}
          {state === "revealed" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-secondary/5 border border-secondary/20 rounded-xl p-5 space-y-3"
            >
              <p className="text-sm font-body text-foreground">{question.explanation}</p>
              <Button onClick={nextQuestion} className="w-full">
                {currentIndex + 1 >= sampleQuestions.length ? "Voir les résultats" : "Question suivante"}
              </Button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
