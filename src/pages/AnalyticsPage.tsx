import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTaskDashboardKPI } from '@/api/guardPanel';
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '@/lib/taskFormat';

function intRu(v: string | undefined): string {
  if (!v) {
    return '0';
  }
  const n = Number(v);
  if (Number.isNaN(n)) {
    return v;
  }
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);
}

function ratioRu(v: number | undefined): string {
  if (v == null || Number.isNaN(v)) {
    return '—';
  }
  return `${(v * 100).toFixed(1)}%`;
}

export function AnalyticsPage() {
  const [periodFromLocal, setPeriodFromLocal] = useState('');
  const [periodToLocal, setPeriodToLocal] = useState('');

  const periodFrom = useMemo(
    () => fromDatetimeLocalValue(periodFromLocal),
    [periodFromLocal],
  );
  const periodTo = useMemo(() => fromDatetimeLocalValue(periodToLocal), [periodToLocal]);

  const q = useQuery({
    queryKey: ['analytics', periodFrom, periodTo],
    queryFn: () => getTaskDashboardKPI({ periodFrom, periodTo }),
  });

  const kpi = q.data;
  const top = kpi?.topExecutor;

  return (
    <div className="gp-page">
      <header className="gp-tasks-page-head">
        <h2 className="gp-page-title">Аналитика</h2>
        <p className="gp-tasks-page-hint">KPI по задачам за период</p>
      </header>

      <div className="gp-analytics-bar">
        <label className="gp-date-inline">
          <span className="gp-date-inline-label">С</span>
          <input
            className="gp-date-input"
            type="date"
            value={periodFromLocal ? periodFromLocal.slice(0, 10) : ''}
            onChange={(e) => {
              const v = e.target.value;
              setPeriodFromLocal(v ? `${v}T00:00` : '');
            }}
          />
        </label>
        <label className="gp-date-inline">
          <span className="gp-date-inline-label">По</span>
          <input
            className="gp-date-input"
            type="date"
            value={periodToLocal ? periodToLocal.slice(0, 10) : ''}
            onChange={(e) => {
              const v = e.target.value;
              setPeriodToLocal(v ? `${v}T23:59` : '');
            }}
          />
        </label>
        <button
          type="button"
          className="gp-btn gp-btn-secondary gp-btn-sm"
          onClick={() => {
            setPeriodFromLocal('');
            setPeriodToLocal('');
          }}
        >
          Сбросить
        </button>
        <button
          type="button"
          className="gp-btn gp-btn-secondary gp-btn-sm"
          onClick={() => {
            const now = new Date();
            const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            setPeriodFromLocal(toDatetimeLocalValue(from.toISOString()));
            setPeriodToLocal(toDatetimeLocalValue(now.toISOString()));
          }}
        >
          30 дней
        </button>
      </div>

      {q.isPending ? (
        <p className="gp-muted">Загрузка…</p>
      ) : q.isError ? (
        <p className="gp-error">{q.error instanceof Error ? q.error.message : 'Ошибка'}</p>
      ) : (
        <div className="gp-analytics-grid">
          <section className="gp-panel gp-panel-elevated gp-kpi-card">
            <div className="gp-kpi-icon gp-kpi-icon--accent" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </div>
            <div>
              <div className="gp-panel-title">Активные задачи</div>
              <div className="gp-kpi-value">{intRu(kpi?.activeTasksCount)}</div>
            </div>
          </section>

          <section className="gp-panel gp-panel-elevated gp-kpi-card">
            <div className="gp-kpi-icon gp-kpi-icon--info" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <div>
              <div className="gp-panel-title">Создано за период</div>
              <div className="gp-kpi-value">{intRu(kpi?.createdInPeriod)}</div>
            </div>
          </section>

          <section className="gp-panel gp-panel-elevated gp-kpi-card">
            <div className="gp-kpi-icon gp-kpi-icon--success" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <div className="gp-panel-title">Завершено за период</div>
              <div className="gp-kpi-value">{intRu(kpi?.completedInPeriod)}</div>
            </div>
          </section>

          <section className="gp-panel gp-panel-elevated gp-kpi-card">
            <div className="gp-kpi-icon gp-kpi-icon--warning" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <div>
              <div className="gp-panel-title">Доля завершённых</div>
              <div className="gp-kpi-value">{ratioRu(kpi?.completedToCreatedRatio)}</div>
            </div>
          </section>

          <section className="gp-panel gp-panel-elevated gp-kpi-card gp-kpi-top">
            <div className="gp-kpi-icon gp-kpi-icon--star" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <div className="gp-panel-title">Топ исполнитель</div>
              {top?.executorName ? (
                <>
                  <div className="gp-kpi-top-name">{top.executorName}</div>
                  <p className="gp-muted-sm gp-mt-sm">
                    Завершено: <span className="gp-mono">{intRu(top.completedTasks)}</span>
                  </p>
                </>
              ) : (
                <p className="gp-muted">Нет данных за выбранный период</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
