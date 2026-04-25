import { Navigate, Route, Routes } from 'react-router-dom';
import { getStoredAccessToken } from '@/api/client';
import { MainLayout } from '@/layout/MainLayout';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { AuthPage } from '@/pages/AuthPage';
import { EmployeesPage } from '@/pages/EmployeesPage';
import { OfficesPage } from '@/pages/OfficesPage';
import { TaskDetailPage } from '@/pages/TaskDetailPage';
import { TasksPage } from '@/pages/TasksPage';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { SecHeadRoute } from '@/routes/SecHeadRoute';

function AuthGate() {
  if (getStoredAccessToken()) {
    return <Navigate to="/tasks" replace />;
  }
  return <AuthPage />;
}

export function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthGate />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/tasks" replace />} />
          <Route
            path="/tasks/new"
            element={<Navigate to="/tasks" replace state={{ openCreate: true }} />}
          />
          <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route element={<SecHeadRoute />}>
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/offices" element={<OfficesPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/tasks" replace />} />
    </Routes>
  );
}
