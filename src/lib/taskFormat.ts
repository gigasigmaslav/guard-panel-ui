import type { TaskPriority, TaskStatus } from '@/api/types';

export const TASK_STATUSES: TaskStatus[] = [
  'NEW',
  'IN_PROGRESS',
  'PENDING_VUD',
  'IN_COURT',
  'COMPLETED',
];

export function statusRu(s: TaskStatus | string | undefined): string {
  switch (s) {
    case 'NEW':
      return 'Новые';
    case 'IN_PROGRESS':
      return 'В работе';
    case 'PENDING_VUD':
      return 'Ждут ВУД';
    case 'IN_COURT':
      return 'Суд';
    case 'COMPLETED':
      return 'Завершены';
    case 'CASE_STATUS_UNSPECIFIED':
      return '—';
    default:
      return s ?? '—';
  }
}

export function priorityRu(p: TaskPriority | string | undefined): string {
  switch (p) {
    case 'LOW':
      return 'Низкий';
    case 'HIGH':
      return 'Высокий';
    case 'TASK_PRIORITY_UNSPECIFIED':
      return '—';
    default:
      return p ?? '—';
  }
}

export function violatorTypeRu(v: string | undefined): string {
  switch (v) {
    case 'EMPLOYEE':
      return 'Сотрудник';
    case 'CLIENT':
      return 'Клиент';
    case 'VIOLATOR_TYPE_UNSPECIFIED':
      return '—';
    default:
      return v ?? '—';
  }
}

export function moneyRu(n: string | undefined): string {
  if (n == null || n === '') {
    return '—';
  }
  const val = Number(n);
  if (Number.isNaN(val)) {
    return n;
  }
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(val);
}

export function dtRu(iso: string | undefined): string {
  if (!iso) {
    return '—';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  const day = d.getDate();
  const month = d.toLocaleString('ru-RU', { month: 'short' });
  const year = d.getFullYear();
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${day} ${month} ${year} в ${time}`;
}

export function toDatetimeLocalValue(iso: string | undefined): string {
  if (!iso) {
    return '';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(s: string): string | undefined {
  const t = s.trim();
  if (!t) {
    return undefined;
  }
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) {
    return undefined;
  }
  return d.toISOString();
}
