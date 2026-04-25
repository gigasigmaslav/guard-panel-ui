import type { TaskHistoryChange } from '@/api/types';

/** Дата в формате 09-04-2026 20:34 */
export function formatHistoryWhen(iso: string | undefined): string {
  if (!iso) {
    return '—';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Человекочитаемая строка истории, например:
 * «Добавил ВУД сотрудник Администратор в 09-04-2026 20:34»
 */
export function formatTaskHistorySentence(h: TaskHistoryChange): string {
  const name = h.createdBy?.name?.trim() || 'Неизвестно';
  const when = formatHistoryWhen(h.createdAt);
  switch (h.event) {
    case 'TASK_HISTORY_CHANGE_EVENT_COMMENT_ADDED':
      return `Добавил комментарий сотрудник ${name} в ${when}`;
    case 'TASK_HISTORY_CHANGE_EVENT_REFUND_ADDED':
      return `Добавил возмещение сотрудник ${name} в ${when}`;
    case 'TASK_HISTORY_CHANGE_EVENT_VUD_DECISION_ADDED':
      return `Добавил ВУД сотрудник ${name} в ${when}`;
    default:
      return `Событие ${h.event ?? '—'} · ${name} · ${when}`;
  }
}
