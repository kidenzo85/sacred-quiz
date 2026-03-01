import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sampleQuestions, type QuizQuestion } from "@/data/questions";
import { useTimer } from "@/hooks/useTimer";
import { TimerCircle } from "@/components/TimerCircle";
import { AnswerOption } from "@/components/AnswerOption";
import { BookOpen, RotateCcw, Trophy, Sparkles, Volume2, VolumeX, Loader2 } from "lucide-react";
import { playCorrectSound, playWrongSound, playTimeUpSound } from "@/lib/sounds";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TIMER_SECONDS = 15;
const AUTO_ADVANCE_DELAY = 2000;

type QuizState = "idle" | "loading" | "playing" | "revealed" | "finished";

function speakText(text: string, onEnd?: () => void) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR";
  utterance.rate = 0.95;
  utterance.pitch = 1;
  // Try to find a French voice
  const voices = window.speechSynthesis.getVoices();
  const frenchVoice = voices.find((v) => v.lang.startsWith("fr"));
  if (frenchVoice) utterance.voice = frenchVoice;
  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
}

export function QuizGame() {
  const [state, setState] = useState<QuizState>("idle");
  const [questions, setQuestions] = useState<QuizQuestion[]>(sampleQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [congratsMessage, setCongratsMessage] = useState<string | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const question: QuizQuestion | undefined = questions[currentIndex];

  const goToNext = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      setState("finished");
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedAnswer(null);
    setCongratsMessage(null);
    setState("playing");
    timer.start();
  }, [currentIndex, questions.length]);

  const handleTimeUp = useCallback(() => {
    playTimeUpSound();
    setState("revealed");
    // Auto-advance after time up
    autoAdvanceRef.current = setTimeout(() => {
      goToNext();
    }, AUTO_ADVANCE_DELAY);
  }, [goToNext]);

  const timer = useTimer(TIMER_SECONDS, handleTimeUp);

  // Speak question when it changes
  useEffect(() => {
    if (state === "playing" && question && voiceEnabled) {
      speakText(question.question);
    }
  }, [currentIndex, state]);

  // Cleanup auto-advance on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  const fetchAIQuestions = async () => {
    setState("loading");
    try {
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: { count: 10 },
      });

      if (error) throw error;

      if (data?.questions && data.questions.length > 0) {
        const formatted = data.questions.map((q: any, i: number) => ({
          id: i + 1,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          category: q.category,
        }));
        setQuestions(formatted);
      } else {
        toast.error("Impossible de générer les questions, utilisation des questions par défaut.");
        setQuestions(sampleQuestions);
      }
    } catch (e: any) {
      console.error("Failed to fetch AI questions:", e);
      toast.error("Erreur IA, utilisation des questions par défaut.");
      setQuestions(sampleQuestions);
    }

    setCurrentIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setCongratsMessage(null);
    setState("playing");
    timer.start();
  };

  const congratulations = [
    "Bravo ! 🎉",
    "Excellent ! ✨",
    "Magnifique ! 🌟",
    "Parfait ! 👏",
    "Bien joué ! 💫",
    "Superbe ! 🏆",
    "Génial ! 🔥",
    "Impressionnant ! 💪",
    "Fantastique ! 🎯",
    "Incroyable ! ⭐",
    "Tu gères ! 👑",
    "Chapeau ! 🎩",
  ];

  const selectAnswer = (index: number) => {
    if (state !== "playing" || selectedAnswer !== null) return;
    setSelectedAnswer(index);
    timer.stop();

    const isCorrect = index === question.correctIndex;

    if (isCorrect) {
      setScore((s) => s + 1);
      const msg = congratulations[Math.floor(Math.random() * congratulations.length)];
      setCongratsMessage(msg);
      setState("revealed");

      playCorrectSound();
      if (voiceEnabled) speakText(msg);

      // Auto-advance after delay
      autoAdvanceRef.current = setTimeout(() => {
        goToNext();
      }, AUTO_ADVANCE_DELAY);
    } else {
      setState("revealed");
      playWrongSound();
      if (voiceEnabled) speakText("Dommage ! La bonne réponse était : " + question.options[question.correctIndex]);
      // Auto-advance after wrong answer
      autoAdvanceRef.current = setTimeout(() => {
        goToNext();
      }, AUTO_ADVANCE_DELAY + 1500);
    }
  };

  const nextQuestion = () => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    goToNext();
  };

  if (state === "idle") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col items-center justify-center text-center gap-6 max-w-lg mx-auto"
      >
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shadow-glow">
          <BookOpen className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Prêt à tester vos connaissances ?</h2>
          <p className="text-muted-foreground font-body text-sm">
            10 questions sur la Bible · {TIMER_SECONDS}s par question
          </p>
        </div>
        <div className="flex flex-col gap-3 items-center">
          <Button onClick={fetchAIQuestions} size="lg" className="text-base px-6 py-5 shadow-glow">
            <Sparkles className="w-5 h-5 mr-2" />
            Commencer le Quiz
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setVoiceEnabled(!voiceEnabled);
              timer.setSoundEnabled(!voiceEnabled);
            }}
            className="text-muted-foreground"
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
            {voiceEnabled ? "Voix activée" : "Voix désactivée"}
          </Button>
        </div>
      </motion.div>
    );
  }

  if (state === "loading") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col items-center justify-center text-center gap-4"
      >
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <div>
          <h2 className="font-display text-xl font-bold text-foreground mb-1">Génération des questions...</h2>
          <p className="text-muted-foreground font-body text-sm">L'IA prépare votre quiz biblique</p>
        </div>
      </motion.div>
    );
  }

  if (state === "finished") {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex-1 flex flex-col items-center justify-center text-center gap-6 max-w-lg mx-auto"
      >
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center shadow-glow">
          <Trophy className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-1">Quiz terminé !</h2>
          <p className="text-4xl font-display font-bold text-gradient-gold my-3">{score}/{questions.length}</p>
          <p className="text-muted-foreground text-sm">{pct}% de bonnes réponses</p>
        </div>
        <Button onClick={fetchAIQuestions} size="lg" className="text-base px-6 py-5">
          <RotateCcw className="w-5 h-5 mr-2" />
          Nouveau Quiz
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full min-h-0">
      {/* Header row */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0">
            <span className="text-xs font-body text-muted-foreground">
              Question {currentIndex + 1}/{questions.length}
            </span>
            <div className="flex gap-0.5 mt-0.5">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all w-3 ${
                    i < currentIndex ? "bg-primary" : i === currentIndex ? "bg-primary/50" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setVoiceEnabled(!voiceEnabled);
              timer.setSoundEnabled(!voiceEnabled);
            }}
            className="text-muted-foreground h-8 w-8"
          >
            {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <TimerCircle timeLeft={timer.timeLeft} percentage={timer.percentage} isWarning={timer.timeLeft <= 5} />
      </div>

      {/* Question + Answers — fills remaining space */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex-1 flex flex-col min-h-0 gap-2"
        >
          {/* Question card */}
          <div className="bg-gradient-card rounded-lg p-4 shadow-card border border-border">
            <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-body font-medium mb-1.5">
              {question.category}
            </span>
            <h3 className="font-display text-base md:text-lg font-bold text-foreground leading-snug">
              {question.question}
            </h3>
          </div>

          {/* Congrats message */}
          {congratsMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <span className="text-lg font-display font-bold text-gradient-gold">{congratsMessage}</span>
            </motion.div>
          )}

          {/* Answers — push to bottom */}
          <div className="mt-auto space-y-2">
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
          {state === "revealed" && selectedAnswer !== question.correctIndex && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-secondary/5 border border-secondary/20 rounded-lg p-3"
            >
              <p className="text-xs font-body text-foreground leading-relaxed">{question.explanation}</p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
