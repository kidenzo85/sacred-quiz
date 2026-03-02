import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type QuizQuestion } from "@/data/questions";
import { useTimer } from "@/hooks/useTimer";
import { TimerCircle } from "@/components/TimerCircle";
import { AnswerOption } from "@/components/AnswerOption";
import { BookOpen, RotateCcw, Trophy, Sparkles, Volume2, VolumeX, Loader2, Zap } from "lucide-react";
import { playCorrectSound, playWrongSound, playTimeUpSound, preloadSounds } from "@/lib/sounds";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AUTO_ADVANCE_DELAY = 2000;

type QuizState = "idle" | "loading" | "playing" | "revealed" | "finished";

interface StoredQuestion extends QuizQuestion {
  dbId?: string;
}

function getAnonymousId(): string {
  let id = localStorage.getItem("quiz_anon_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("quiz_anon_id", id);
  }
  return id;
}

async function speakWithTTS(text: string, onEnd?: () => void) {
  try {
    const { data: ttsConfig } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "tts_config")
      .single();

    const config = ttsConfig?.value as any;
    if (config?.provider === "google") {
      const { data, error } = await supabase.functions.invoke("text-to-speech", {
        body: { text, voice: config.google_voice, speed: config.speed, pitch: config.pitch },
      });
      if (!error && data?.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        audio.onended = () => onEnd?.();
        audio.play();
        return;
      }
    }
  } catch {}
  // Fallback to browser TTS
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    u.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const fr = voices.find((v) => v.lang.startsWith("fr"));
    if (fr) u.voice = fr;
    if (onEnd) u.onend = onEnd;
    window.speechSynthesis.speak(u);
  }
}

export function QuizGame() {
  const { user } = useAuth();
  const [state, setState] = useState<QuizState>("idle");
  const [questions, setQuestions] = useState<StoredQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [congratsMessage, setCongratsMessage] = useState<string | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string | null }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => { preloadSounds(); }, []);

  // Load categories
  useEffect(() => {
    supabase.from("categories").select("id, name, icon").eq("is_active", true).order("display_order")
      .then(({ data }) => { if (data) setCategories(data); });
    // Load quiz config
    supabase.from("admin_settings").select("value").eq("key", "quiz_config").single()
      .then(({ data }) => {
        const c = data?.value as any;
        if (c?.timer_seconds) setTimerSeconds(c.timer_seconds);
      });
  }, []);

  const question: StoredQuestion | undefined = questions[currentIndex];

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
    autoAdvanceRef.current = setTimeout(() => goToNext(), AUTO_ADVANCE_DELAY);
  }, [goToNext]);

  const timer = useTimer(timerSeconds, handleTimeUp);

  useEffect(() => {
    if (state === "playing" && question && voiceEnabled) {
      speakWithTTS(question.question);
    }
  }, [currentIndex, state]);

  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  const recordHistory = async (questionDbId: string, wasCorrect: boolean) => {
    try {
      if (user) {
        await supabase.from("user_quiz_history").insert({
          user_id: user.id,
          question_id: questionDbId,
          was_correct: wasCorrect,
        });
      } else {
        await supabase.from("user_quiz_history").insert({
          anonymous_id: getAnonymousId(),
          question_id: questionDbId,
          was_correct: wasCorrect,
        });
      }
    } catch {}
  };

  const startQuiz = async () => {
    setState("loading");
    try {
      // Load config
      const { data: configData } = await supabase.from("admin_settings").select("value").eq("key", "quiz_config").single();
      const config = configData?.value as any;
      const questionsPerQuiz = config?.questions_per_quiz || 10;

      // Get already seen question IDs
      let seenIds: string[] = [];
      if (user) {
        const { data: history } = await supabase.from("user_quiz_history").select("question_id").eq("user_id", user.id);
        seenIds = (history || []).map((h: any) => h.question_id);
      } else {
        const anonId = getAnonymousId();
        const { data: history } = await supabase.from("user_quiz_history").select("question_id").eq("anonymous_id", anonId);
        seenIds = (history || []).map((h: any) => h.question_id);
      }

      // Query stored questions excluding seen ones
      let query = supabase.from("quiz_questions").select("*");
      if (selectedCategory !== "all") {
        const cat = categories.find((c) => c.id === selectedCategory);
        if (cat) {
          query = query.eq("category_id", cat.id);
        }
      }
      if (seenIds.length > 0) {
        query = query.not("id", "in", `(${seenIds.join(",")})`);
      }

      const { data: storedQuestions } = await query.limit(questionsPerQuiz);

      if (storedQuestions && storedQuestions.length >= 5) {
        // Use stored questions
        const formatted: StoredQuestion[] = storedQuestions.map((q: any, i: number) => ({
          id: i + 1,
          dbId: q.id,
          question: q.question,
          options: q.options as string[],
          correctIndex: q.correct_index,
          explanation: q.explanation,
          category: categories.find((c) => c.id === q.category_id)?.name || "Bible",
        }));
        // Shuffle
        for (let i = formatted.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [formatted[i], formatted[j]] = [formatted[j], formatted[i]];
        }
        setQuestions(formatted.slice(0, questionsPerQuiz));
      } else {
        // Fallback: generate with AI
        const { data, error } = await supabase.functions.invoke("generate-questions", {
          body: { count: questionsPerQuiz, category: selectedCategory !== "all" ? categories.find((c) => c.id === selectedCategory)?.name : undefined },
        });
        if (error) throw error;
        if (data?.questions) {
          setQuestions(data.questions.map((q: any, i: number) => ({
            id: i + 1,
            question: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            explanation: q.explanation,
            category: q.category,
          })));
        } else {
          throw new Error("No questions");
        }
      }
    } catch (e: any) {
      console.error("Failed to load questions:", e);
      toast.error("Erreur lors du chargement des questions.");
      setState("idle");
      return;
    }

    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setSelectedAnswer(null);
    setCongratsMessage(null);
    setState("playing");
    timer.start();
  };

  const congratulations = [
    "Bravo ! 🎉", "Excellent ! ✨", "Magnifique ! 🌟", "Parfait ! 👏",
    "Bien joué ! 💫", "Superbe ! 🏆", "Génial ! 🔥", "Impressionnant ! 💪",
    "Fantastique ! 🎯", "Incroyable ! ⭐", "Tu gères ! 👑", "Chapeau ! 🎩",
  ];

  const selectAnswer = (index: number) => {
    if (state !== "playing" || selectedAnswer !== null) return;
    setSelectedAnswer(index);
    timer.stop();

    const isCorrect = index === question.correctIndex;
    if (question.dbId) recordHistory(question.dbId, isCorrect);

    if (isCorrect) {
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
      const msg = congratulations[Math.floor(Math.random() * congratulations.length)];
      setCongratsMessage(msg);
      setState("revealed");
      playCorrectSound();
      if (voiceEnabled) speakWithTTS(msg);
      autoAdvanceRef.current = setTimeout(() => goToNext(), AUTO_ADVANCE_DELAY);
    } else {
      setStreak(0);
      setState("revealed");
      playWrongSound();
      if (voiceEnabled) speakWithTTS("Dommage ! La bonne réponse était : " + question.options[question.correctIndex]);
      autoAdvanceRef.current = setTimeout(() => goToNext(), AUTO_ADVANCE_DELAY + 1500);
    }
  };

  const nextQuestion = () => {
    if (autoAdvanceRef.current) { clearTimeout(autoAdvanceRef.current); autoAdvanceRef.current = null; }
    goToNext();
  };

  if (state === "idle") {
    return (
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col items-center justify-center text-center gap-6 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shadow-glow">
          <BookOpen className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Prêt à tester vos connaissances ?</h2>
          <p className="text-muted-foreground font-body text-sm">{timerSeconds}s par question</p>
        </div>

        {/* Category selection */}
        <div className="w-full max-w-xs">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir une catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📚 Toutes les catégories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-3 items-center">
          <Button onClick={startQuiz} size="lg" className="text-base px-6 py-5 shadow-glow">
            <Sparkles className="w-5 h-5 mr-2" /> Commencer le Quiz
          </Button>
          <Button variant="ghost" size="sm"
            onClick={() => { setVoiceEnabled(!voiceEnabled); timer.setSoundEnabled(!voiceEnabled); }}
            className="text-muted-foreground">
            {voiceEnabled ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
            {voiceEnabled ? "Voix activée" : "Voix désactivée"}
          </Button>
        </div>
      </motion.div>
    );
  }

  if (state === "loading") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex-1 flex flex-col items-center justify-center text-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <div>
          <h2 className="font-display text-xl font-bold text-foreground mb-1">Chargement du quiz...</h2>
          <p className="text-muted-foreground font-body text-sm">Préparation de vos questions</p>
        </div>
      </motion.div>
    );
  }

  if (state === "finished") {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="flex-1 flex flex-col items-center justify-center text-center gap-6 max-w-lg mx-auto">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center shadow-glow">
          <Trophy className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-1">Quiz terminé !</h2>
          <p className="text-4xl font-display font-bold text-gradient-gold my-3">{score}/{questions.length}</p>
          <p className="text-muted-foreground text-sm">{pct}% de bonnes réponses</p>
        </div>
        <Button onClick={startQuiz} size="lg" className="text-base px-6 py-5">
          <RotateCcw className="w-5 h-5 mr-2" /> Nouveau Quiz
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full min-h-0">
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-body text-muted-foreground">Question {currentIndex + 1}/{questions.length}</span>
              <span className="text-xs font-display font-bold text-primary">{score} pts</span>
              {streak >= 2 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="flex items-center gap-0.5 text-xs font-bold text-gradient-gold">
                  <Zap className="w-3 h-3 text-primary" />{streak}×
                </motion.span>
              )}
            </div>
            <div className="flex gap-0.5 mt-0.5">
              {questions.map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all w-3 ${
                  i < currentIndex ? "bg-primary" : i === currentIndex ? "bg-primary/50" : "bg-muted"
                }`} />
              ))}
            </div>
          </div>
          <Button variant="ghost" size="icon"
            onClick={() => { setVoiceEnabled(!voiceEnabled); timer.setSoundEnabled(!voiceEnabled); }}
            className="text-muted-foreground h-8 w-8">
            {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <TimerCircle timeLeft={timer.timeLeft} percentage={timer.percentage} isWarning={timer.timeLeft <= 5} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={question.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }} className="flex-1 flex flex-col min-h-0 gap-2">
          <div className="bg-gradient-card rounded-lg p-4 shadow-card border border-border">
            <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-body font-medium mb-1.5">
              {question.category}
            </span>
            <h3 className="font-display text-base md:text-lg font-bold text-foreground leading-snug">{question.question}</h3>
          </div>

          {congratsMessage && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <span className="text-lg font-display font-bold text-gradient-gold">{congratsMessage}</span>
            </motion.div>
          )}

          <div className="mt-auto space-y-2">
            {question.options.map((opt, i) => (
              <AnswerOption key={i} label={opt} index={i} isSelected={selectedAnswer === i}
                isCorrect={i === question.correctIndex} isRevealed={state === "revealed"}
                disabled={state === "revealed"} onClick={() => selectAnswer(i)} />
            ))}
          </div>

          {state === "revealed" && selectedAnswer !== question.correctIndex && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className="bg-secondary/5 border border-secondary/20 rounded-lg p-3">
              <p className="text-xs font-body text-foreground leading-relaxed">{question.explanation}</p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
