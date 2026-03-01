import { SEOHead } from "@/components/SEOHead";
import { QuizGame } from "@/components/QuizGame";

const Index = () => {
  return (
    <>
      <SEOHead />
      <div className="h-dvh flex flex-col bg-gradient-hero overflow-hidden">
        <main className="flex-1 flex flex-col min-h-0 px-4 py-3">
          <QuizGame />
        </main>
      </div>
    </>
  );
};

export default Index;
