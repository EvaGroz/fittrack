import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ProtectedLayout from './components/ProtectedLayout';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ExercisesPage from './pages/ExercisesPage';
import WorkoutsPage from './pages/WorkoutsPage';
import WorkoutEditorPage from './pages/WorkoutEditorPage';
import WorkoutDetailPage from './pages/WorkoutDetailPage';
import PlansPage from './pages/PlansPage';
import PlanEditorPage from './pages/PlanEditorPage';
import HistoryPage from './pages/HistoryPage';
import { Spinner } from './components/ui';

// Recharts is large, so the stats page is loaded only when visited.
const StatsPage = lazy(() => import('./pages/StatsPage'));
import NotFoundPage from './pages/NotFoundPage';

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  // After login/register, return to the page the user originally asked for.
  return user ? <Navigate to={location.state?.from || '/'} replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />

      <Route element={<ProtectedLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="exercises" element={<ExercisesPage />} />
        <Route path="workouts" element={<WorkoutsPage />} />
        <Route path="workouts/new" element={<WorkoutEditorPage />} />
        <Route path="workouts/:id" element={<WorkoutDetailPage />} />
        <Route path="workouts/:id/edit" element={<WorkoutEditorPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="plans/:id" element={<PlanEditorPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route
          path="stats"
          element={
            <Suspense fallback={<Spinner />}>
              <StatsPage />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
