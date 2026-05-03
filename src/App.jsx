import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth }  from "./context/AuthContext";
import { ThemeProvider }          from "./context/ThemeContext";
import { PersonaProvider, usePersona } from "./context/PersonaContext";
import TaxEngine from "./pages/TaxEngine";
import NetWorth  from "./pages/NetWorth";

import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
//import "@fontsource/cormorant-garamond/900.css";
import "@fontsource/dm-sans/300.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-mono/400.css";
import "@fontsource/dm-mono/500.css";

import Layout          from "./components/Layout";
import ProtectedRoute  from "./components/ProtectedRoute";
import OnboardingFlow  from "./onboarding/OnboardingFlow";
import LoginPage       from "./pages/LoginPage";
import AdminLogin      from "./pages/AdminLogin";
import AdminDashboard  from "./pages/AdminDashboard";
import Home            from "./pages/Home";
import AddEntry        from "./pages/AddEntry";
import Dashboard       from "./pages/Dashboard";
import Transactions    from "./pages/Transactions";
import Profile         from "./pages/Profile";
import SalaryReport    from "./pages/SalaryReport";
import Goals           from "./pages/Goals";
import ExpensePlanner  from "./pages/ExpensePlanner";

// Inner app — checks if onboarding is done
function AppRoutes() {
  const { user }             = useAuth();
  const { persona, loading } = usePersona();

  if (!user) return null;
  if (loading) return null;

  // First-time user — show onboarding
  if (!persona) {
    return (
      <OnboardingFlow onComplete={() => window.location.reload()} />
    );
  }

  return (
    <Routes>
      <Route path="/login"       element={<LoginPage />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin"       element={<AdminDashboard />} />

      <Route path="/" element={
        <ProtectedRoute><Layout><Home /></Layout></ProtectedRoute>
      } />
      <Route path="/add" element={
        <ProtectedRoute><Layout><AddEntry /></Layout></ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
      } />
      <Route path="/transactions" element={
        <ProtectedRoute><Layout><Transactions /></Layout></ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>
      } />
      <Route path="/report" element={
        <ProtectedRoute><Layout><SalaryReport /></Layout></ProtectedRoute>
      } />
      <Route path="/goals" element={
        <ProtectedRoute><Layout><Goals /></Layout></ProtectedRoute>
      } />
      <Route path="/planner" element={
        <ProtectedRoute><Layout><ExpensePlanner /></Layout></ProtectedRoute>
      } />
      <Route path="/tax" element={
        <ProtectedRoute><Layout><TaxEngine /></Layout></ProtectedRoute>
      } />
      <Route path="/networth" element={
        <ProtectedRoute><Layout><NetWorth /></Layout></ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <PersonaProvider>
            <AppRoutes />
          </PersonaProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}