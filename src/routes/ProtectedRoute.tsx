import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStoredAccessToken, setStoredAccessToken } from '@/api/client';
import { ApiError } from '@/api/client';
import { useSession } from '@/session/SessionContext';

export function ProtectedRoute() {
  const token = getStoredAccessToken();
  const location = useLocation();
  const navigate = useNavigate();
  const { setProfile, refreshProfile, logout } = useSession();

  const q = useQuery({
    queryKey: ['whoami', token],
    queryFn: refreshProfile,
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (!q.isError) {
      return;
    }
    const err = q.error;
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      logout();
      navigate('/auth', { replace: true });
      return;
    }
    setProfile(null);
  }, [q.isError, q.error, logout, setProfile, navigate]);

  if (!token) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (q.isPending) {
    return (
      <div className="gp-screen gp-center">
        <p className="gp-muted">Загрузка профиля…</p>
      </div>
    );
  }

  if (q.isError) {
    const err = q.error;
    const msg = err instanceof Error ? err.message : 'Ошибка';
    return (
      <div className="gp-screen gp-center gp-stack">
        <p className="gp-error">{msg}</p>
        <button
          type="button"
          className="gp-btn gp-btn-secondary"
          onClick={() => {
            setStoredAccessToken(null);
            logout();
            navigate('/auth', { replace: true });
          }}
        >
          К окну входа
        </button>
      </div>
    );
  }

  return <Outlet />;
}
