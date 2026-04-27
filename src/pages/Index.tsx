import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import StudyCallLinks from "@/components/StudyCallLinks";

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto py-20 px-6 text-center">
      <div className="animate-float-up">
        <p className="text-6xl mb-8">🌸</p>
        <h1 className="text-6xl font-serif font-bold text-foreground mb-5 tracking-tight leading-none">
          Shūkan
        </h1>
        <p className="text-lg text-muted-foreground font-body mb-3">
          習慣 — The art of consistent study
        </p>
        <p className="text-sm text-muted-foreground font-body max-w-md mx-auto mb-12 leading-relaxed">
          Log one verified study hour at a time. Build discipline. Rise on the leaderboard.
          No shortcuts, no cheating — just honest effort.
        </p>
        <div className="flex items-center justify-center gap-3 mb-10">
          {user ? (
            <Link to="/dashboard">
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90 font-body px-8 py-5 text-base transition-all">
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90 font-body px-8 py-5 text-base transition-all">
                Get Started
              </Button>
            </Link>
          )}
          <Link to="/leaderboard">
            <Button variant="outline" className="font-body px-8 py-5 text-base border-border text-foreground hover:bg-muted/60 transition-all">
              Leaderboard
            </Button>
          </Link>
        </div>

        <div className="pt-8 border-t border-border/50">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-body mb-3">
            Studying with a friend?
          </p>
          <StudyCallLinks />
        </div>
      </div>
    </div>
  );
}
