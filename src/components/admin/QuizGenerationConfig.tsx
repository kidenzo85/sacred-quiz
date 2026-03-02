import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Sparkles, Database, Loader2, Trash2 } from "lucide-react";

const AI_MODELS = [
  { id: "google/gemini-2.5-flash-lite", label: "Gemini Flash Lite (gratuit)", description: "Rapide et économique" },
  { id: "google/gemini-2.5-flash", label: "Gemini Flash", description: "Bon équilibre qualité/coût" },
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", description: "Dernière génération rapide" },
  { id: "google/gemini-2.5-pro", label: "Gemini Pro", description: "Haute qualité, plus lent" },
  { id: "openai/gpt-5-nano", label: "GPT-5 Nano", description: "Rapide et économique" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini", description: "Bon compromis" },
];

interface QuizConfig {
  questions_per_quiz: number;
  timer_seconds: number;
  auto_generate: boolean;
  ai_model: string;
}

export function QuizGenerationConfig() {
  const [config, setConfig] = useState<QuizConfig>({
    questions_per_quiz: 10,
    timer_seconds: 15,
    auto_generate: false,
    ai_model: "google/gemini-2.5-flash-lite",
  });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [genCount, setGenCount] = useState(20);

  useEffect(() => {
    supabase.from("admin_settings").select("value").eq("key", "quiz_config").single()
      .then(({ data }) => { if (data?.value) setConfig(data.value as unknown as QuizConfig); });
    supabase.from("quiz_questions").select("id", { count: "exact", head: true })
      .then(({ count }) => setQuestionCount(count || 0));
    supabase.from("categories").select("id, name").eq("is_active", true).order("display_order")
      .then(({ data }) => { if (data) setCategories(data); });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("admin_settings").update({ value: config as any }).eq("key", "quiz_config");
    setSaving(false);
    if (error) toast.error("Erreur"); else toast.success("Configuration sauvegardée");
  };

  const generateQuestions = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-and-store-questions", {
        body: {
          count: genCount,
          category: selectedCategory === "all" ? null : selectedCategory,
          model: config.ai_model,
        },
      });
      if (error) throw error;
      toast.success(`${data?.stored || 0} questions générées et stockées !`);
      const { count } = await supabase.from("quiz_questions").select("id", { count: "exact", head: true });
      setQuestionCount(count || 0);
    } catch (e: any) {
      toast.error("Erreur: " + (e.message || "Erreur de génération"));
    }
    setGenerating(false);
  };

  const clearQuestions = async () => {
    if (!confirm("Supprimer toutes les questions ? Cette action est irréversible.")) return;
    await supabase.from("user_quiz_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("quiz_questions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    setQuestionCount(0);
    toast.success("Toutes les questions ont été supprimées");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Génération & Modèle IA</CardTitle>
          <CardDescription>Configurez la génération automatique de questions et le modèle de langage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Modèle de langage</Label>
            <Select value={config.ai_model} onValueChange={(v) => setConfig({ ...config, ai_model: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex flex-col">
                      <span>{m.label}</span>
                      <span className="text-xs text-muted-foreground">{m.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Questions par quiz ({config.questions_per_quiz})</Label>
            <Slider min={5} max={30} step={5} value={[config.questions_per_quiz]} onValueChange={([v]) => setConfig({ ...config, questions_per_quiz: v })} />
          </div>

          <div className="space-y-2">
            <Label>Temps par question ({config.timer_seconds}s)</Label>
            <Slider min={5} max={60} step={5} value={[config.timer_seconds]} onValueChange={([v]) => setConfig({ ...config, timer_seconds: v })} />
          </div>

          <Button onClick={save} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />{saving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" /> Banque de questions
            <Badge variant="secondary">{questionCount} questions</Badge>
          </CardTitle>
          <CardDescription>Générez et stockez des questions dans la base de données</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nombre à générer</Label>
              <Input type="number" min={5} max={100} value={genCount} onChange={(e) => setGenCount(Number(e.target.value))} />
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={generateQuestions} disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {generating ? "Génération..." : `Générer ${genCount} questions`}
            </Button>
            <Button variant="destructive" onClick={clearQuestions} size="sm">
              <Trash2 className="w-4 h-4 mr-2" /> Tout supprimer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
