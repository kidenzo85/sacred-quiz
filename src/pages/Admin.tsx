import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TTSConfig } from "@/components/admin/TTSConfig";
import { QuizGenerationConfig } from "@/components/admin/QuizGenerationConfig";
import { CategoriesManager } from "@/components/admin/CategoriesManager";
import { SoundConfig } from "@/components/admin/SoundConfig";
import { Shield, ArrowLeft, Volume2, BookOpen, Sparkles, Music } from "lucide-react";
import { Link } from "react-router-dom";

export default function Admin() {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading) return <div className="min-h-dvh flex items-center justify-center bg-gradient-hero"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-dvh bg-gradient-hero">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="font-display text-lg font-bold">Administration</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="quiz" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-xl">
            <TabsTrigger value="quiz" className="flex items-center gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5" /> Quiz & IA
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-1.5 text-xs">
              <BookOpen className="w-3.5 h-3.5" /> Catégories
            </TabsTrigger>
            <TabsTrigger value="tts" className="flex items-center gap-1.5 text-xs">
              <Volume2 className="w-3.5 h-3.5" /> Voix TTS
            </TabsTrigger>
            <TabsTrigger value="sounds" className="flex items-center gap-1.5 text-xs">
              <Music className="w-3.5 h-3.5" /> Sons
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quiz"><QuizGenerationConfig /></TabsContent>
          <TabsContent value="categories"><CategoriesManager /></TabsContent>
          <TabsContent value="tts"><TTSConfig /></TabsContent>
          <TabsContent value="sounds"><SoundConfig /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
