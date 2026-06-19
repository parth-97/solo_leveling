import { Navigate, Outlet } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Spinner } from '@/components/ui/spinner';

/**
 * Sits inside ProtectedRoute. Ensures authenticated users who haven't
 * completed onboarding are redirected to /onboarding before reaching
 * the main app shell.
 */
export default function OnboardingGate() {
  const { data: profile, isLoading } = useProfile();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <Spinner className="w-8 h-8 text-blue-400" />
      </div>
    );
  }

  if (profile && !profile.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
