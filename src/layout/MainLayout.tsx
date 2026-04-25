import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { isSecHead } from '@/api/guardPanel';
import { Logo } from '@/components/Logo';
import { useSession } from '@/session/SessionContext';

type Theme = 'dark' | 'light';

function getStoredTheme(): Theme {
  try {
    const v = localStorage.getItem('gp-theme');
    if (v === 'light' || v === 'dark') {
      return v;
    }
  } catch { /* ignore */ }
  return 'dark';
}

const navCls = ({ isActive }: { isActive: boolean }) =>
  `gp-header-nav-item${isActive ? ' gp-header-nav-item_active' : ''}`;

function positionLabel(p: string | undefined): string {
  switch (p) {
    case 'SEC_HEAD':
      return 'Руководитель СБ';
    case 'SEC':
      return 'Сотрудник СБ';
    default:
      return p ?? '—';
  }
}

export function MainLayout() {
  const { profile, logout } = useSession();
  const navigate = useNavigate();
  const head = isSecHead(profile?.position);

  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gp-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <div className="gp-app">
      <header className="gp-header">
        <div className="gp-header-brand">
          <Logo size="sm" />
          <button
            type="button"
            className="gp-theme-toggle"
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            aria-label="Переключить тему"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? '\u2600' : '\u263E'}
          </button>
        </div>
        <nav className="gp-header-nav" aria-label="Основные разделы">
          <NavLink to="/tasks" className={navCls} end>
            Задачи
          </NavLink>
          {head ? (
            <>
              <NavLink to="/analytics" className={navCls}>
                Аналитика
              </NavLink>
              <NavLink to="/offices" className={navCls}>
                Офисы
              </NavLink>
              <NavLink to="/employees" className={navCls}>
                Сотрудники
              </NavLink>
            </>
          ) : null}
        </nav>
        <div className="gp-header-user">
          <span className="gp-header-name">{profile?.fullName ?? '—'}</span>
          <span className="gp-badge">{positionLabel(profile?.position)}</span>
          <button
            type="button"
            className="gp-btn gp-btn-ghost gp-btn-sm"
            onClick={() => {
              logout();
              navigate('/auth', { replace: true });
            }}
          >
            Выйти
          </button>
        </div>
      </header>

      <main className="gp-main">
        <Outlet />
      </main>

      <footer className="gp-footer">Guard Panel &copy; {new Date().getFullYear()}</footer>
    </div>
  );
}
