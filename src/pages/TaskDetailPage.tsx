import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  createComment,
  createRefund,
  createVudDecision,
  deleteComment,
  getTaskDetails,
  searchEmployees,
  updateTask,
  updateVudDecision,
} from '@/api/guardPanel';
import type {
  Task,
  TaskComment,
  TaskHistoryChange,
  TaskPriority,
  TaskStatus,
  TaskVudDecision,
} from '@/api/types';
import { ApiError } from '@/api/client';
import { formatTaskHistorySentence } from '@/lib/taskHistoryFormat';
import {
  dtRu,
  fromDatetimeLocalValue,
  moneyRu,
  priorityRu,
  statusRu,
  toDatetimeLocalValue,
  violatorTypeRu,
} from '@/lib/taskFormat';

const STATUSES: TaskStatus[] = [
  'NEW',
  'IN_PROGRESS',
  'PENDING_VUD',
  'IN_COURT',
  'COMPLETED',
];
const PRIORITIES: TaskPriority[] = ['LOW', 'HIGH'];

type DetailTab = 'main' | 'vud' | 'refunds' | 'history';

function syncFormFromTask(t: Task) {
  const pr =
    t.priority && t.priority !== 'TASK_PRIORITY_UNSPECIFIED'
      ? t.priority
      : 'LOW';
  const st =
    t.status && t.status !== 'CASE_STATUS_UNSPECIFIED' ? t.status : 'NEW';
  return {
    damageAmount: t.damageAmount ?? '',
    priority: pr,
    status: st,
    endDateLocal: toDatetimeLocalValue(t.endDate),
    executorId: t.executor?.id ?? '',
  };
}

function crimeTri(
  v: boolean | null | undefined,
): 'unset' | 'true' | 'false' {
  if (v === true) {
    return 'true';
  }
  if (v === false) {
    return 'false';
  }
  return 'unset';
}

function TaskSubTabs({
  tab,
  onTab,
}: {
  tab: DetailTab;
  onTab: (t: DetailTab) => void;
}) {
  const items: { id: DetailTab; label: string; title: string }[] = [
    {
      id: 'main',
      label: 'Сводка',
      title: 'Реквизиты, комментарии и редактирование дела',
    },
    { id: 'vud', label: 'ВУД', title: 'Решение ВУД' },
    { id: 'refunds', label: 'Возмещения', title: 'Возмещения' },
    { id: 'history', label: 'История', title: 'История изменений' },
  ];
  return (
    <nav
      className="gp-subtabs gp-subtabs_embedded"
      aria-label="Разделы карточки дела"
    >
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          className={`gp-subtab${tab === it.id ? ' gp-subtab_active' : ''}`}
          title={it.title}
          aria-current={tab === it.id ? 'page' : undefined}
          onClick={() => onTab(it.id)}
        >
          {it.label}
        </button>
      ))}
    </nav>
  );
}

function TaskSummaryCard({ task }: { task: Task }) {
  const violatorVal = (
    <>
      {task.violator?.name ?? '—'} ({violatorTypeRu(task.violator?.violatorType)})
      {task.violator?.violatorPhoneNumber
        ? ` · ${task.violator.violatorPhoneNumber}`
        : null}
    </>
  );

  const rows: { term: string; value: ReactNode }[] = [
    { term: 'Статус', value: statusRu(task.status) },
    { term: 'Сумма ущерба', value: moneyRu(task.damageAmount) },
    {
      term: 'Приоритет',
      value: (
        <span className={`gp-pill ${task.priority === 'HIGH' ? 'gp-pill-high' : 'gp-pill-low'}`}>
          {priorityRu(task.priority)}
        </span>
      ),
    },
    { term: 'Офис', value: task.office?.name ?? '—' },
    { term: 'Исполнитель', value: task.executor?.name ?? '—' },
    { term: 'Нарушитель', value: violatorVal },
    { term: 'Создана', value: dtRu(task.createdAt) },
    { term: 'Старт', value: dtRu(task.startDate) },
    { term: 'Окончание', value: dtRu(task.endDate) },
    { term: 'Автор', value: task.createdBy?.name ?? '—' },
  ];

  return (
    <section className="gp-panel gp-panel-elevated">
      <div className="gp-panel-title">Реквизиты и сроки</div>
      <dl className="gp-req-kv">
        {rows.map((row) => (
          <div key={row.term} className="gp-req-kv-row">
            <dt>{row.term}</dt>
            <dd className="gp-req-kv-dd">
              <span className="gp-req-kv-leader" aria-hidden="true" />
              <span className="gp-req-kv-val">{row.value}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CommentsBlock({
  taskId,
  comments,
}: {
  taskId: string;
  comments: TaskComment[] | undefined;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const addMut = useMutation({
    mutationFn: () => createComment({ taskId, comment: text.trim() }),
    onSuccess: async () => {
      setText('');
      setErr(null);
      await qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (e) => {
      setErr(e instanceof Error ? e.message : 'Ошибка');
    },
  });

  const delMut = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  const list = comments ?? [];

  return (
    <section className="gp-panel gp-panel-elevated">
      <div className="gp-panel-title">Комментарии</div>
      <div className="gp-comment-compose">
        <textarea
          className="gp-textarea"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Текст комментария…"
        />
        <button
          type="button"
          className="gp-btn gp-btn-primary gp-btn-sm"
          disabled={!text.trim() || addMut.isPending}
          onClick={() => {
            setErr(null);
            addMut.mutate();
          }}
        >
          {addMut.isPending ? 'Отправка…' : 'Добавить комментарий'}
        </button>
      </div>
      {err ? <p className="gp-error gp-mt-sm">{err}</p> : null}
      {list.length === 0 ? (
        <p className="gp-muted gp-mt">Пока нет комментариев</p>
      ) : (
        <ul className="gp-comment-list">
          {list.map((c) => (
            <li key={c.id} className="gp-comment-item">
              <div className="gp-comment-meta">
                <span>{c.createdBy?.name ?? '—'}</span>
                <span className="gp-muted-sm">{dtRu(c.createdAt)}</span>
                {c.id ? (
                  <button
                    type="button"
                    className="gp-btn gp-btn-ghost gp-btn-xs"
                    disabled={delMut.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          'Удалить этот комментарий? Действие необратимо.',
                        )
                      ) {
                        delMut.mutate(c.id!);
                      }
                    }}
                  >
                    Удалить
                  </button>
                ) : null}
              </div>
              <div className="gp-comment-body">{c.comment}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TaskEditForm({
  employees,
  employeesOk,
  damageAmount,
  setDamageAmount,
  priority,
  setPriority,
  status,
  setStatus,
  endDateLocal,
  setEndDateLocal,
  executorId,
  setExecutorId,
  dirty,
  saveError,
  saveMut,
}: {
  employees: { id?: string; fullName?: string }[];
  employeesOk: boolean;
  damageAmount: string;
  setDamageAmount: (v: string) => void;
  priority: TaskPriority;
  setPriority: (v: TaskPriority) => void;
  status: TaskStatus;
  setStatus: (v: TaskStatus) => void;
  endDateLocal: string;
  setEndDateLocal: (v: string) => void;
  executorId: string;
  setExecutorId: (v: string) => void;
  dirty: boolean;
  saveError: string | null;
  saveMut: { isPending: boolean; mutate: () => void };
}) {
  return (
    <aside className="gp-detail-aside">
      <section className="gp-panel gp-panel-sticky">
        <div className="gp-panel-title">Редактирование</div>
        <form
          className="gp-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveMut.mutate();
          }}
        >
          <label className="gp-field">
            <span>Сумма ущерба</span>
            <input
              value={damageAmount}
              onChange={(e) => setDamageAmount(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <label className="gp-field">
            <span>Приоритет</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {priorityRu(p)}
                </option>
              ))}
            </select>
          </label>
          <label className="gp-field">
            <span>Статус</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusRu(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="gp-field">
            <span>Дата окончания</span>
            <input
              className="gp-date-input"
              type="date"
              value={endDateLocal ? endDateLocal.slice(0, 10) : ''}
              onChange={(e) => {
                const v = e.target.value;
                setEndDateLocal(v ? `${v}T23:59` : '');
              }}
            />
          </label>
          <label className="gp-field">
            <span>Исполнитель</span>
            {employeesOk && employees.length > 0 ? (
              <select value={executorId} onChange={(e) => setExecutorId(e.target.value)}>
                <option value="">— выберите —</option>
                {executorId &&
                !employees.some((em) => String(em.id) === String(executorId)) ? (
                  <option value={executorId}>Текущий id {executorId}</option>
                ) : null}
                {employees.map((em) => (
                  <option key={em.id} value={em.id ?? ''}>
                    {em.fullName ?? em.id} (id {em.id})
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={executorId}
                onChange={(e) => setExecutorId(e.target.value)}
                placeholder="ID исполнителя"
              />
            )}
          </label>
          {!employeesOk ? (
            <p className="gp-muted-sm">Список сотрудников недоступен — введите ID вручную.</p>
          ) : null}
          {saveError ? <p className="gp-error">{saveError}</p> : null}
          <button
            type="submit"
            className="gp-btn gp-btn-primary"
            disabled={!dirty || saveMut.isPending}
          >
            {saveMut.isPending ? 'Сохранение…' : 'Сохранить изменения'}
          </button>
          {!dirty ? (
            <p className="gp-muted-sm gp-mt-sm">Измените поля для сохранения</p>
          ) : null}
        </form>
      </section>
    </aside>
  );
}

function vudCrimeLabel(v: TaskVudDecision | undefined): string {
  if (v?.criminalCaseOpened === true) {
    return 'Да';
  }
  if (v?.criminalCaseOpened === false) {
    return 'Нет';
  }
  return 'Не указано';
}

function VudTab({ task, taskId }: { task: Task; taskId: string }) {
  const qc = useQueryClient();
  const vud = task.vudDecisions;
  const hasVud = !!(vud?.id || vud?.kusp);
  const registered = hasVud && vud ? [vud] : [];

  const [kusp, setKusp] = useState('');
  const [ud, setUd] = useState('');
  const [crime, setCrime] = useState<'unset' | 'true' | 'false'>('unset');
  const [comment, setComment] = useState('');
  const [base, setBase] = useState<{
    kusp: string;
    ud: string;
    crime: 'unset' | 'true' | 'false';
    comment: string;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (hasVud && vud) {
      const c = crimeTri(vud.criminalCaseOpened);
      const next = {
        kusp: vud.kusp ?? '',
        ud: vud.ud ?? '',
        crime: c,
        comment: vud.comment ?? '',
      };
      setKusp(next.kusp);
      setUd(next.ud);
      setCrime(next.crime);
      setComment(next.comment);
      setBase(next);
    } else {
      setKusp('');
      setUd('');
      setCrime('unset');
      setComment('');
      setBase(null);
    }
  }, [hasVud, vud?.id, vud?.kusp, vud?.ud, vud?.criminalCaseOpened, vud?.comment]);

  const createMut = useMutation({
    mutationFn: () => {
      const payload: Parameters<typeof createVudDecision>[0] = {
        taskId,
        kusp: kusp.trim(),
      };
      if (ud.trim()) {
        payload.ud = ud.trim();
      }
      if (crime !== 'unset') {
        payload.criminalCaseOpened = crime === 'true';
      }
      if (comment.trim()) {
        payload.comment = comment.trim();
      }
      return createVudDecision(payload);
    },
    onSuccess: async () => {
      setErr(null);
      await qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (e) => setErr(e instanceof Error ? e.message : 'Ошибка'),
  });

  const updateDirty = useMemo(() => {
    if (!hasVud || !base) {
      return false;
    }
    return (
      kusp.trim() !== base.kusp ||
      ud.trim() !== base.ud ||
      crime !== base.crime ||
      comment.trim() !== base.comment
    );
  }, [hasVud, base, kusp, ud, crime, comment]);

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!vud?.id || !base) {
        throw new Error('Нет решения ВУД');
      }
      const body: Parameters<typeof updateVudDecision>[1] = {};
      if (kusp.trim() !== base.kusp) {
        body.kusp = kusp.trim();
      }
      if (ud.trim() !== base.ud) {
        body.ud = ud.trim();
      }
      if (crime !== base.crime) {
        if (crime === 'true') {
          body.criminalCaseOpened = true;
        } else if (crime === 'false') {
          body.criminalCaseOpened = false;
        }
        /* «Не указано» в PATCH не отправляем — бэкенд не меняет поле */
      }
      if (comment.trim() !== base.comment) {
        body.comment = comment.trim();
      }
      if (Object.keys(body).length === 0) {
        throw new Error('Нет изменений');
      }
      await updateVudDecision(vud.id, body);
    },
    onSuccess: async () => {
      setErr(null);
      await qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (e) => setErr(e instanceof Error ? e.message : 'Ошибка'),
  });

  return (
    <div className="gp-tab-page">
      <div className="gp-refunds-split">
        <section className="gp-panel gp-panel-elevated">
          <div className="gp-panel-title">Зарегистрированные решения ВУД</div>
          {registered.length === 0 ? (
            <p className="gp-muted">Пока нет решений ВУД</p>
          ) : (
            <ul className="gp-refund-list">
              {registered.map((d) => (
                <li key={String(d.id ?? d.kusp ?? 'vud')} className="gp-refund-card">
                  <div className="gp-refund-amount">
                    КУСП <span className="gp-mono">{d.kusp?.trim() ? d.kusp : '—'}</span>
                  </div>
                  <div className="gp-refund-comment">
                    УД:{' '}
                    <span className="gp-mono">{d.ud?.trim() ? d.ud : '—'}</span>
                  </div>
                  <div className="gp-refund-comment">
                    Уголовное дело: {vudCrimeLabel(d)}
                  </div>
                  {d.comment?.trim() ? (
                    <div className="gp-refund-comment">{d.comment}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="gp-panel gp-panel-elevated">
          <div className="gp-panel-title">
            {hasVud ? 'Изменение решения ВУД' : 'Новое решение ВУД'}
          </div>
          <p className="gp-muted-sm gp-mb">
            {hasVud
              ? 'Измените поля и нажмите «Сохранить».'
              : 'КУСП обязателен, до 10 символов.'}
          </p>
          <div className="gp-form">
            <label className="gp-field">
              <span>КУСП</span>
              <input value={kusp} onChange={(e) => setKusp(e.target.value)} maxLength={10} required />
            </label>
            <label className="gp-field">
              <span>УД</span>
              <input value={ud} onChange={(e) => setUd(e.target.value)} maxLength={25} />
            </label>
            <label className="gp-field">
              <span>Уголовное дело</span>
              <select
                value={crime}
                onChange={(e) => setCrime(e.target.value as typeof crime)}
              >
                <option value="unset">Не указано</option>
                <option value="true">Да</option>
                <option value="false">Нет</option>
              </select>
            </label>
            <label className="gp-field">
              <span>Комментарий</span>
              <textarea
                className="gp-textarea"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </label>
            {err ? <p className="gp-error">{err}</p> : null}
            {hasVud ? (
              <button
                type="button"
                className="gp-btn gp-btn-primary"
                disabled={!updateDirty || updateMut.isPending}
                onClick={() => {
                  setErr(null);
                  updateMut.mutate();
                }}
              >
                {updateMut.isPending ? 'Сохранение…' : 'Сохранить изменения ВУД'}
              </button>
            ) : (
              <button
                type="button"
                className="gp-btn gp-btn-primary"
                disabled={!kusp.trim() || createMut.isPending}
                onClick={() => {
                  setErr(null);
                  createMut.mutate();
                }}
              >
                {createMut.isPending ? 'Создание…' : 'Создать решение ВУД'}
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function RefundsTab({ task, taskId }: { task: Task; taskId: string }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      createRefund({
        taskId,
        amount: amount.trim(),
        comment: comment.trim(),
      }),
    onSuccess: async () => {
      setAmount('');
      setComment('');
      setErr(null);
      await qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (e) => setErr(e instanceof Error ? e.message : 'Ошибка'),
  });

  const refunds = task.refunds ?? [];

  return (
    <div className="gp-tab-page">
      <div className="gp-refunds-split">
        <section className="gp-panel gp-panel-elevated">
          <div className="gp-panel-title">Зарегистрированные возмещения</div>
          {refunds.length === 0 ? (
            <p className="gp-muted">Пока нет возмещений</p>
          ) : (
            <ul className="gp-refund-list">
              {refunds.map((r) => (
                <li key={r.id} className="gp-refund-card">
                  <div className="gp-refund-amount">{moneyRu(r.amount)}</div>
                  {r.comment ? <div className="gp-refund-comment">{r.comment}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="gp-panel gp-panel-elevated">
          <div className="gp-panel-title">Новое возмещение</div>
          <div className="gp-form">
            <label className="gp-field">
              <span>Сумма (руб.)</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <label className="gp-field">
              <span>Комментарий</span>
              <textarea
                className="gp-textarea"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Обязательное пояснение к возмещению"
              />
            </label>
            {err ? <p className="gp-error">{err}</p> : null}
            <button
              type="button"
              className="gp-btn gp-btn-primary"
              disabled={!amount.trim() || !comment.trim() || mut.isPending}
              onClick={() => {
                setErr(null);
                mut.mutate();
              }}
            >
              {mut.isPending ? 'Создание…' : 'Создать возмещение'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function HistoryTab({ history }: { history: TaskHistoryChange[] | undefined }) {
  const items = history ?? [];
  return (
    <div className="gp-tab-page">
      <p className="gp-muted gp-mb">
        Хронология изменений по делу в удобном для чтения виде.
      </p>
      {items.length === 0 ? (
        <p className="gp-muted">Записей истории нет</p>
      ) : (
        <ol className="gp-history-timeline">
          {items.map((h, i) => (
            <li key={`${h.createdAt}-${i}`} className="gp-history-item">
              {formatTaskHistorySentence(h)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<DetailTab>('main');

  const id = taskId ?? '';
  const detailQ = useQuery({
    queryKey: ['task', id],
    queryFn: () => getTaskDetails(id),
    enabled: !!id,
  });

  const employeesQ = useQuery({
    queryKey: ['employees'],
    queryFn: searchEmployees,
  });

  const task = detailQ.data?.task;

  const [damageAmount, setDamageAmount] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('LOW');
  const [status, setStatus] = useState<TaskStatus>('NEW');
  const [endDateLocal, setEndDateLocal] = useState('');
  const [executorId, setExecutorId] = useState('');
  const [baseline, setBaseline] = useState<ReturnType<typeof syncFormFromTask> | null>(
    null,
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!task) {
      return;
    }
    const s = syncFormFromTask(task);
    setDamageAmount(s.damageAmount);
    setPriority(s.priority);
    setStatus(s.status);
    setEndDateLocal(s.endDateLocal);
    setExecutorId(s.executorId);
    setBaseline(s);
  }, [task]);

  const dirty = useMemo(() => {
    if (!baseline) {
      return false;
    }
    const endIso = fromDatetimeLocalValue(endDateLocal);
    const baseEndIso = fromDatetimeLocalValue(baseline.endDateLocal);
    return (
      damageAmount.trim() !== baseline.damageAmount ||
      priority !== baseline.priority ||
      status !== baseline.status ||
      (endIso ?? '') !== (baseEndIso ?? '') ||
      executorId.trim() !== baseline.executorId.trim()
    );
  }, [baseline, damageAmount, priority, status, endDateLocal, executorId]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!task?.id || !baseline) {
        throw new Error('Нет данных задачи');
      }
      const body: Parameters<typeof updateTask>[1] = {};
      if (damageAmount.trim() !== baseline.damageAmount) {
        body.damageAmount = damageAmount.trim();
      }
      if (priority !== baseline.priority) {
        body.priority = priority;
      }
      if (status !== baseline.status) {
        body.status = status;
      }
      const endIso = fromDatetimeLocalValue(endDateLocal);
      const baseEndIso = fromDatetimeLocalValue(baseline.endDateLocal);
      if ((endIso ?? '') !== (baseEndIso ?? '') && endIso) {
        body.endDate = endIso;
      }
      if (executorId.trim() !== baseline.executorId.trim()) {
        body.executorId = executorId.trim();
      }
      if (Object.keys(body).length === 0) {
        throw new Error('Нет изменений для сохранения');
      }
      await updateTask(task.id, body);
    },
    onSuccess: async () => {
      setSaveError(null);
      await qc.invalidateQueries({ queryKey: ['task', id] });
      await qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (e) => {
      setSaveError(e instanceof Error ? e.message : 'Ошибка сохранения');
    },
  });

  let body: ReactNode = null;

  if (!id) {
    body = <p className="gp-muted">Не указан ID задачи</p>;
  } else if (detailQ.isPending) {
    body = <p className="gp-muted">Загрузка…</p>;
  } else if (detailQ.isError) {
    const msg =
      detailQ.error instanceof ApiError
        ? detailQ.error.message
        : detailQ.error instanceof Error
          ? detailQ.error.message
          : 'Ошибка';
    body = (
      <div>
        <p className="gp-error">{msg}</p>
        <Link to="/tasks" className="gp-link">
          К списку задач
        </Link>
      </div>
    );
  } else if (!task) {
    body = (
      <div>
        <p className="gp-muted">Задача не найдена</p>
        <Link to="/tasks" className="gp-link">
          К списку задач
        </Link>
      </div>
    );
  }

  if (body) {
    return <div className="gp-page gp-task-detail">{body}</div>;
  }

  const employees = employeesQ.data?.items ?? [];
  const employeesOk = employeesQ.isSuccess;

  let tabContent: ReactNode = null;
  if (tab === 'main') {
    tabContent = (
      <div className="gp-detail-main-stack">
        <div className="gp-detail-main-left">
          <TaskSummaryCard task={task!} />
          <CommentsBlock taskId={id} comments={task!.comments} />
        </div>
        <div className="gp-detail-main-edit">
          <TaskEditForm
            employees={employees}
            employeesOk={employeesOk}
            damageAmount={damageAmount}
            setDamageAmount={setDamageAmount}
            priority={priority}
            setPriority={setPriority}
            status={status}
            setStatus={setStatus}
            endDateLocal={endDateLocal}
            setEndDateLocal={setEndDateLocal}
            executorId={executorId}
            setExecutorId={setExecutorId}
            dirty={dirty}
            saveError={saveError}
            saveMut={saveMut}
          />
        </div>
      </div>
    );
  } else if (tab === 'vud') {
    tabContent = <VudTab task={task!} taskId={id} />;
  } else if (tab === 'refunds') {
    tabContent = <RefundsTab task={task!} taskId={id} />;
  } else {
    tabContent = <HistoryTab history={task!.historyChanges} />;
  }

  return (
    <div className="gp-page gp-task-detail">
      <header className="gp-panel gp-detail-hero" aria-label="Карточка дела">
        <div className="gp-detail-hero-inner">
          <Link to="/tasks" className="gp-detail-back">
            ← К списку задач
          </Link>
          <div className="gp-detail-hero-body">
            <h1 className="gp-page-title gp-detail-hero-title">
              Задача <span className="gp-mono gp-detail-hero-id">{task!.id}</span>
            </h1>
            <div className="gp-detail-meta-row" aria-label="Краткая сводка">
              <span className="gp-pill gp-detail-pill-status">
                {statusRu(task!.status)}
              </span>
              <span className="gp-detail-meta-strong">{moneyRu(task!.damageAmount)}</span>
              <span className="gp-detail-meta-sep" aria-hidden>
                ·
              </span>
              <span className="gp-detail-meta-office">{task!.office?.name ?? '—'}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="gp-detail-tab-body">
        <div className="gp-panel gp-detail-workspace">
          <TaskSubTabs tab={tab} onTab={setTab} />
          <div className="gp-detail-workspace-body">{tabContent}</div>
        </div>
      </div>
    </div>
  );
}
