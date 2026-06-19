import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import OnboardingGate from '@/components/auth/OnboardingGate';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Onboarding from '@/pages/Onboarding';
import Dashboard from '@/pages/Dashboard';
import Quests from '@/pages/Quests';
import Goals from '@/pages/Goals';
import Habits from '@/pages/Habits';
import Analytics from '@/pages/Analytics';
import Achievements from '@/pages/Achievements';
import Community from '@/pages/Community';
import Profile from '@/pages/Profile';
import Settings from '@/pages/Settings';
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <>
      <Toaster position="top-center" />
      <Routes>
        {/* Public routes */}
        <Route path="/landing" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* Authenticated routes */}
        <Route element={<ProtectedRoute />}>
          {/* Onboarding is reachable once authenticated, but doesn't require
              onboarding to already be complete (it's how you complete it). */}
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Main app shell — requires onboarding to be complete */}
          <Route element={<OnboardingGate />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/quests" element={<Quests />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/habits" element={<Habits />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/community" element={<Community />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Route>

        {/* Redirect root to landing */}
        <Route path="/" element={<Navigate to="/landing" replace />} />
        <Route path="*" element={<Navigate to="/landing" replace />} />
      </Routes>
    </>
  );
}

export default App;
