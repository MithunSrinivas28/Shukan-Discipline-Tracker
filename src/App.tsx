import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Vault from "./pages/Vault";
import InterviewLab from "./pages/InterviewLab";
import NotFound from "./pages/NotFound";
import FlipPreview from "./pages/FlipPreview";
import FocusRoom from "./pages/FocusRoom";
import { STUDY_TOGETHER_ENABLED } from "@/lib/features";
import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/vault" element={<ProtectedRoute><Vault /></ProtectedRoute>} />
              <Route path="/interview-lab" element={<ProtectedRoute><InterviewLab /></ProtectedRoute>} />
              {STUDY_TOGETHER_ENABLED && (
                <Route path="/focus-room/:roomId" element={<ProtectedRoute><FocusRoom /></ProtectedRoute>} />
              )}
              <Route path="/__flip" element={<FlipPreview />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
