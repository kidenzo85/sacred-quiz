import { SEOHead } from "@/components/SEOHead";
import { QuizGame } from "@/components/QuizGame";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, LogIn, LogOut, User } from "lucide-react";

const Index = () => {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <>
      <SEOHead />
      <div className="h-dvh flex flex-col bg-gradient-hero overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-end gap-2 px-4 py-2">
          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="text-xs">
                <Shield className="w-3.5 h-3.5 mr-1" /> Admin
              </Button>
            </Link>
          )}
          {user ? (
            <Button variant="ghost" size="sm" onClick={signOut} className="text-xs">
              <LogOut className="w-3.5 h-3.5 mr-1" /> Déconnexion
            </Button>
          ) : (
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-xs">
                <LogIn className="w-3.5 h-3.5 mr-1" /> Connexion
              </Button>
            </Link>
          )}
        </div>
        <main className="flex-1 flex flex-col min-h-0 px-4 py-3">
          <QuizGame />
        </main>
      </div>
    </>
  );
};

export default Index;
