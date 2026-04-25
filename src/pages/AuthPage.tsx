import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signIn, signUp } from '@/api/guardPanel';
import { setStoredAccessToken } from '@/api/client';
import { ApiError } from '@/api/client';
import { Logo } from '@/components/Logo';

type Mode = 'sign-in' | 'sign-up';

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? '/tasks';

  const [mode, setMode] = useState<Mode>('sign-in');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const id = employeeId.trim();
    if (!id || !password) {
      setError('Укажите ID сотрудника и пароль');
      return;
    }
    setLoading(true);
    try {
      const fn = mode === 'sign-in' ? signIn : signUp;
      const tokens = await fn({ employeeId: id, password });
      const at =
        tokens.accessToken ??
        (tokens as { access_token?: string }).access_token;
      if (!at) {
        setError('Сервер не вернул токен');
        return;
      }
      setStoredAccessToken(at);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Запрос не удался';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gp-screen gp-center gp-auth-screen">
      <div className="gp-card gp-auth-card">
        <div className="gp-auth-logo">
          <Logo size="lg" />
        </div>
        <p className="gp-muted gp-auth-sub">
          Вход по ID сотрудника и паролю. Первая установка пароля — через «Регистрация».
        </p>

        <div className="gp-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'sign-in'}
            className={`gp-tab${mode === 'sign-in' ? ' gp-tab_active' : ''}`}
            onClick={() => {
              setMode('sign-in');
              setError(null);
            }}
          >
            Вход
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'sign-up'}
            className={`gp-tab${mode === 'sign-up' ? ' gp-tab_active' : ''}`}
            onClick={() => {
              setMode('sign-up');
              setError(null);
            }}
          >
            Регистрация
          </button>
        </div>

        <form className="gp-form" onSubmit={onSubmit}>
          <label className="gp-field">
            <span>ID сотрудника</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="username"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="например, 42"
            />
          </label>
          <label className="gp-field">
            <span>Пароль</span>
            <input
              type="password"
              autoComplete={
                mode === 'sign-in' ? 'current-password' : 'new-password'
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'sign-up' ? 'минимум 8 символов' : ''}
            />
          </label>
          {error ? <p className="gp-error gp-field-error">{error}</p> : null}
          <button type="submit" className="gp-btn gp-btn-primary" disabled={loading}>
            {loading
              ? 'Отправка…'
              : mode === 'sign-in'
                ? 'Войти'
                : 'Зарегистрироваться'}
          </button>
        </form>
      </div>
    </div>
  );
}
