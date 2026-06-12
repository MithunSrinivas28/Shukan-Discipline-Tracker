import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const mapAuthError = (error: string): string => {
    const e = error.toLowerCase();
    if (e.includes("rate") || e.includes("too many")) return "Too many attempts. Please try again later.";
    if (e.includes("confirm")) return "Please check your email to confirm your account.";
    if (e.includes("network") || e.includes("fetch")) return "Network error. Please check your connection.";
    if (isLogin) return "Invalid email or password.";
    return "Unable to complete sign-up. Please try again.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Sign in failed", description: mapAuthError(error), variant: "destructive" });
      } else {
        navigate("/dashboard");
      }
    } else {
      if (username.trim().length < 3) {
        toast({ title: "Invalid username", description: "Username must be at least 3 characters", variant: "destructive" });
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, username.trim());
      if (error) {
        toast({ title: "Sign up failed", description: mapAuthError(error), variant: "destructive" });
      } else {
        toast({
          title: "Check your email",
          description: "If this email is available, we've sent a confirmation link.",
        });
      }
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto max-w-sm px-4 py-20">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
          {isLogin ? "Welcome back" : "Begin your journey"}
        </h1>
        <p className="text-muted-foreground text-sm font-body">
          {isLogin ? "Continue your study streak" : "Track your hours, build discipline"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {!isLogin && (
          <div className="space-y-2">
            <Label htmlFor="username" className="font-body text-sm">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_name"
              required={!isLogin}
              maxLength={30}
              className="bg-card border-border font-body"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email" className="font-body text-sm">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="bg-card border-border font-body"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="font-body text-sm">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="bg-card border-border font-body"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-body"
        >
          {loading ? "..." : isLogin ? "Sign In" : "Create Account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6 font-body">
        {isLogin ? "No account yet?" : "Already have an account?"}{" "}
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-primary hover:underline font-medium"
        >
          {isLogin ? "Register" : "Sign In"}
        </button>
      </p>
    </div>
  );
}
