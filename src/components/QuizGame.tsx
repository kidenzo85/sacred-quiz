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
  }, []);

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
        className="text-center space-y-8 max-w-lg mx-auto"
      >
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto shadow-glow">
          <BookOpen className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground mb-3">Prêt à tester vos connaissances ?</h2>
          <p className="text-muted-foreground font-body">
            10 questions sur la Bible · {TIMER_SECONDS}s par question
          </p>
        </div>
        <div className="flex flex-col gap-3 items-center">
          <Button onClick={fetchAIQuestions} size="lg" className="text-lg px-8 py-6 shadow-glow">
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
        className="text-center space-y-6 max-w-lg mx-auto py-20"
      >
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Génération des questions...</h2>
          <p className="text-muted-foreground font-body">L'IA prépare votre quiz biblique</p>
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
        className="text-center space-y-8 max-w-lg mx-auto"
      >
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto shadow-glow">
          <Trophy className="w-12 h-12 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground mb-2">Quiz terminé !</h2>
          <p className="text-5xl font-display font-bold text-gradient-gold my-4">{score}/{questions.length}</p>
          <p className="text-muted-foreground">{pct}% de bonnes réponses</p>
        </div>
        <Button onClick={fetchAIQuestions} size="lg" className="text-lg px-8 py-6">
          <RotateCcw className="w-5 h-5 mr-2" />
          Nouveau Quiz
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-sm font-body text-muted-foreground">
              Question {currentIndex + 1}/{questions.length}
            </span>
            <div className="flex gap-1 mt-1">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    questions.length > 10 ? "w-4" : "w-8"
                  } ${
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
            className="text-muted-foreground"
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
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

          {/* Congrats message */}
          {congratsMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-2"
            >
              <span className="text-2xl font-display font-bold text-gradient-gold">{congratsMessage}</span>
            </motion.div>
          )}

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

          {/* Explanation (only on wrong answer or time up) */}
          {state === "revealed" && selectedAnswer !== question.correctIndex && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-secondary/5 border border-secondary/20 rounded-xl p-5 space-y-3"
            >
              <p className="text-sm font-body text-foreground">{question.explanation}</p>
              <Button onClick={nextQuestion} className="w-full">
                {currentIndex + 1 >= questions.length ? "Voir les résultats" : "Question suivante"}
              </Button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
