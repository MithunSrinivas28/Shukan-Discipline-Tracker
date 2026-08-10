import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initializationError: string | null;
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null; requiresEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function cleanUsername(value: string | undefined | null) {
  const cleaned = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 30);

  return cleaned.length >= 3 ? cleaned : null;
}

async function ensureProfile(user: User, preferredUsername?: string) {
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) return selectError.message;
  if (existing) return null;

  const baseUsername = cleanUsername(preferredUsername)
    ?? cleanUsername(user.user_metadata?.username as string | undefined)
    ?? cleanUsername(user.email?.split("@")[0])
    ?? `user_${user.id.slice(0, 8)}`;
  const fallbackUsername = `user_${user.id.slice(0, 8)}`;
  const timestampFallback = `user_${Date.now().toString(36).slice(-6)}_${user.id.slice(0, 4)}`;
  const candidates = Array.from(new Set([baseUsername, fallbackUsername, timestampFallback]));

  for (const username of candidates) {
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      username,
    });

    if (!error) return null;
    if (!error.message.toLowerCase().includes("duplicate")) return error.message;
  }

  return "Unable to create profile";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const applySession = (nextSession: Session | null, error: string | null = null) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setInitializationError(error);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    const restoreAuth = async () => {
      const { data: { session: storedSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        applySession(null, sessionError.message);
        return;
      }

      if (!storedSession) {
        applySession(null);
        return;
      }

      const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !verifiedUser) {
        const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
        const reason = userError?.message ?? "The authenticated user could not be verified.";
        applySession(null, signOutError ? `${reason}; ${signOutError.message}` : reason);
        return;
      }

      const profileError = await ensureProfile(verifiedUser);
      applySession(storedSession, profileError ? `Profile initialization failed: ${profileError}` : null);
    };

    void restoreAuth().catch((error: unknown) => {
      applySession(null, error instanceof Error ? error.message : "Authentication initialization failed.");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) return { error: error.message, requiresEmailConfirmation: false };
    if (data.session && data.user) {
      const profileError = await ensureProfile(data.user, username);
      if (profileError) return { error: `Profile initialization failed: ${profileError}`, requiresEmailConfirmation: false };
    }
    return { error: null, requiresEmailConfirmation: data.session === null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      const profileError = await ensureProfile(data.user);
      if (profileError) return { error: profileError };
    }
    return { error: null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, initializationError, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
