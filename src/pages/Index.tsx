import { SEOHead } from "@/components/SEOHead";
import { QuizGame } from "@/components/QuizGame";
import { BookOpen } from "lucide-react";

const Index = () => {
  return (
    <>
      <SEOHead />
      <div className="min-h-screen bg-gradient-hero">
        {/* Header */}
        <header className="border-b border-border/50 backdrop-blur-sm">
          <div className="container flex items-center gap-3 py-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Quiz Religieux</h1>
              <p className="text-xs text-muted-foreground font-body">Testez vos connaissances spirituelles</p>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="container py-10 md:py-16">
          <QuizGame />
        </main>

        {/* Footer */}
        <footer className="border-t border-border/50 py-6">
          <div className="container text-center">
            <p className="text-sm text-muted-foreground font-body">
              © {new Date().getFullYear()} Quiz Religieux · Questions générées par IA
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Index;
