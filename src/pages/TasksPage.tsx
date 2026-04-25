import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { searchTasks, searchOffices, searchEmployees } from '@/api/guardPanel';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import type { OrderBy, OrderDirection, TaskLookup, TaskPriority, TaskSearchFilter, TaskStatus, ViolatorType } from '@/api/types';
import {
  TASK_STATUSES,
  dtRu,
  moneyRu,
  priorityRu,
  statusRu,
} from '@/lib/taskFormat';

const PRIORITIES: TaskPriority[] = ['LOW', 'HIGH'];
const VIOLATOR_TYPES: ViolatorType[] = ['EMPLOYEE', 'CLIENT'];
const ORDER_BY: { v: OrderBy; label: string }[] = [
  { v: 'CREATED_AT', label: 'По дате создания' },
  { v: 'BARCODES_DAMAGE_AMOUNT', label: 'По сумме ущерба' },
];
const ORDER_DIR: { v: OrderDirection; label: string }[] = [
  { v: 'DESC', label: 'По убыванию' },
  { v: 'ASC', label: 'По возрастанию' },
];

function TaskRow({ t, onOpen }: { t: TaskLookup; onOpen: (id: string) => void }) {
  const id = t.id ?? '';
  return (
    <tr
      className="gp-table-row-click"
      tabIndex={0}
      role="button"
      onClick={() => id && onOpen(id)}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && id) {
          e.preventDefault();
          onOpen(id);
        }
      }}
    >
      <td className="gp-mono">{t.id}</td>
      <td>{moneyRu(t.damageAmount)}</td>
      <td>
        <span className={`gp-pill ${t.priority === 'HIGH' ? 'gp-pill-high' : 'gp-pill-low'}`}>
          {priorityRu(t.priority)}
        </span>
      </td>
      <td>{t.executor?.name ?? '—'}</td>
      <td>{t.violator?.name ?? '—'}</td>
      <td>{t.office?.name ?? '—'}</td>
      <td className="gp-muted-sm">{dtRu(t.createdAt)}</td>
    </tr>
  );
}

export function TasksPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const perPage = 20;
  const [createOpen, setCreateOpen] = useState(false);

  const [status, setStatus] = useState<TaskStatus>('NEW');
  const [page, setPage] = useState(1);
  const [orderBy, setOrderBy] = useState<OrderBy>('CREATED_AT');
  const [orderDirection, setOrderDirection] = useState<OrderDirection>('DESC');

  const [draftFilter, setDraftFilter] = useState<TaskSearchFilter>({});
  const [appliedFilter, setAppliedFilter] = useState<TaskSearchFilter>({});

  const officesQ = useQuery({ queryKey: ['offices'], queryFn: searchOffices });
  const employeesQ = useQuery({ queryKey: ['employees'], queryFn: searchEmployees });
  const offices = officesQ.data?.items ?? [];
  const employees = employeesQ.data?.items ?? [];

  const filterForQuery = useMemo((): TaskSearchFilter | undefined => {
    const out: TaskSearchFilter = {};
    if (appliedFilter.id?.trim()) {
      out.id = appliedFilter.id.trim();
    }
    if (
      appliedFilter.priority &&
      appliedFilter.priority !== 'TASK_PRIORITY_UNSPECIFIED'
    ) {
      out.priority = appliedFilter.priority;
    }
    if (appliedFilter.officeId?.trim()) {
      out.officeId = appliedFilter.officeId.trim();
    }
    if (appliedFilter.executorId?.trim()) {
      out.executorId = appliedFilter.executorId.trim();
    }
    if (
      appliedFilter.violatorType &&
      appliedFilter.violatorType !== 'VIOLATOR_TYPE_UNSPECIFIED'
    ) {
      out.violatorType = appliedFilter.violatorType;
    }
    if (appliedFilter.kusp?.trim()) {
      out.kusp = appliedFilter.kusp.trim();
    }
    if (appliedFilter.ud?.trim()) {
      out.ud = appliedFilter.ud.trim();
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }, [appliedFilter]);

  const query = useQuery({
    queryKey: ['tasks', status, page, perPage, orderBy, orderDirection, appliedFilter],
    queryFn: () =>
      searchTasks({
        page,
        perPage,
        status,
        sorting: { orderBy, orderDirection },
        filter: filterForQuery,
      }),
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const errMsg = useMemo(() => {
    if (!query.error) {
      return null;
    }
    return query.error instanceof Error ? query.error.message : 'Ошибка';
  }, [query.error]);

  function applyFilters() {
    setAppliedFilter({ ...draftFilter });
    setPage(1);
  }

  function resetFilters() {
    setDraftFilter({});
    setAppliedFilter({});
    setPage(1);
  }

  useEffect(() => {
    const s = location.state as { openCreate?: boolean } | null;
    if (s?.openCreate) {
      setCreateOpen(true);
      navigate('/tasks', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  return (
    <div className="gp-page">
      <header className="gp-tasks-page-head">
        <h2 className="gp-page-title">Задачи</h2>
        <p className="gp-tasks-page-hint">
          Клик по строке — карточка дела
        </p>
        <button
          type="button"
          className="gp-btn gp-btn-primary gp-btn-sm"
          onClick={() => setCreateOpen(true)}
        >
          Новая задача
        </button>
      </header>

      <div className="gp-panel gp-tasks-controls">
        <div className="gp-tasks-controls-top">
          <div className="gp-tasks-inline-field">
            <span className="gp-tasks-inline-label">Статус</span>
            <select
              className="gp-tasks-select"
              value={status}
              required
              onChange={(e) => {
                setStatus(e.target.value as TaskStatus);
                setPage(1);
              }}
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusRu(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="gp-tasks-sort-row" aria-label="Сортировка">
            <span className="gp-tasks-sort-label">Сортировка</span>
            <select
              className="gp-tasks-select"
              title="Поле сортировки"
              value={orderBy}
              onChange={(e) => {
                setOrderBy(e.target.value as OrderBy);
                setPage(1);
              }}
            >
              {ORDER_BY.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className="gp-tasks-select"
              title="Направление сортировки"
              value={orderDirection}
              onChange={(e) => {
                setOrderDirection(e.target.value as OrderDirection);
                setPage(1);
              }}
            >
              {ORDER_DIR.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="gp-tasks-filter-grid">
          <label className="gp-field gp-field_compact">
            <span>ID</span>
            <input
              value={draftFilter.id ?? ''}
              onChange={(e) =>
                setDraftFilter((f) => ({ ...f, id: e.target.value }))
              }
              placeholder="id"
            />
          </label>
          <label className="gp-field gp-field_compact">
            <span>Приоритет</span>
            <select
              value={draftFilter.priority ?? 'TASK_PRIORITY_UNSPECIFIED'}
              onChange={(e) =>
                setDraftFilter((f) => ({
                  ...f,
                  priority:
                    e.target.value === 'TASK_PRIORITY_UNSPECIFIED'
                      ? undefined
                      : (e.target.value as TaskPriority),
                }))
              }
            >
              <option value="TASK_PRIORITY_UNSPECIFIED">—</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {priorityRu(p)}
                </option>
              ))}
            </select>
          </label>
          <label className="gp-field gp-field_compact">
            <span>Нарушитель</span>
            <select
              value={draftFilter.violatorType ?? 'VIOLATOR_TYPE_UNSPECIFIED'}
              onChange={(e) =>
                setDraftFilter((f) => ({
                  ...f,
                  violatorType:
                    e.target.value === 'VIOLATOR_TYPE_UNSPECIFIED'
                      ? undefined
                      : (e.target.value as ViolatorType),
                }))
              }
            >
              <option value="VIOLATOR_TYPE_UNSPECIFIED">—</option>
              {VIOLATOR_TYPES.map((v) => (
                <option key={v} value={v}>
                  {v === 'EMPLOYEE' ? 'Сотрудник' : 'Клиент'}
                </option>
              ))}
            </select>
          </label>
          <label className="gp-field gp-field_compact">
            <span>Офис</span>
            <select
              value={draftFilter.officeId ?? ''}
              onChange={(e) =>
                setDraftFilter((f) => ({
                  ...f,
                  officeId: e.target.value || undefined,
                }))
              }
            >
              <option value="">— все —</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id ?? ''}>
                  {o.name ?? o.id}
                </option>
              ))}
            </select>
          </label>
          <label className="gp-field gp-field_compact">
            <span>Исполнитель</span>
            <select
              value={draftFilter.executorId ?? ''}
              onChange={(e) =>
                setDraftFilter((f) => ({
                  ...f,
                  executorId: e.target.value || undefined,
                }))
              }
            >
              <option value="">— все —</option>
              {employees.map((em) => (
                <option key={em.id} value={em.id ?? ''}>
                  {em.fullName ?? em.id}
                </option>
              ))}
            </select>
          </label>
          <label className="gp-field gp-field_compact gp-tasks-f-span2">
            <span>КУСП</span>
            <input
              value={draftFilter.kusp ?? ''}
              onChange={(e) =>
                setDraftFilter((f) => ({ ...f, kusp: e.target.value }))
              }
              placeholder="КУСП"
            />
          </label>
          <label className="gp-field gp-field_compact gp-tasks-f-span2">
            <span>УД</span>
            <input
              value={draftFilter.ud ?? ''}
              onChange={(e) =>
                setDraftFilter((f) => ({ ...f, ud: e.target.value }))
              }
              placeholder="УД"
            />
          </label>
          <div className="gp-tasks-filter-actions gp-tasks-f-span2">
            <button
              type="button"
              className="gp-btn gp-btn-primary gp-btn-sm"
              onClick={applyFilters}
            >
              Применить
            </button>
            <button
              type="button"
              className="gp-btn gp-btn-secondary gp-btn-sm"
              onClick={resetFilters}
            >
              Сброс
            </button>
          </div>
        </div>
      </div>

      {errMsg ? <p className="gp-error gp-mb">{errMsg}</p> : null}

      {query.isPending ? (
        <p className="gp-muted">Загрузка…</p>
      ) : (
        <>
          <div className="gp-toolbar gp-mb">
            <p className="gp-muted-sm gp-toolbar-meta">
              Найдено: {total} · стр. {page} из {totalPages}
            </p>
            <div className="gp-pagination">
              <button
                type="button"
                className="gp-btn gp-btn-secondary gp-btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Назад
              </button>
              <button
                type="button"
                className="gp-btn gp-btn-secondary gp-btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Вперёд
              </button>
            </div>
          </div>
          <div className="gp-table-wrap">
            <table className="gp-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Сумма</th>
                  <th>Приоритет</th>
                  <th>Исполнитель</th>
                  <th>Нарушитель</th>
                  <th>Офис</th>
                  <th>Создана</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="gp-muted gp-center-cell">
                      Нет задач по текущим условиям
                    </td>
                  </tr>
                ) : (
                  items.map((t) => (
                    <TaskRow
                      key={t.id ?? `${t.createdAt}-${t.office?.id}`}
                      t={t}
                      onOpen={(id) => navigate(`/tasks/${id}`)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <CreateTaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(taskId) => {
          setCreateOpen(false);
          navigate(`/tasks/${taskId}`);
        }}
      />
    </div>
  );
}
