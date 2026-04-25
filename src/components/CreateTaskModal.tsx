import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTask, searchEmployees, searchOffices } from '@/api/guardPanel';
import type { TaskPriority, ViolatorType } from '@/api/types';
import { priorityRu, violatorTypeRu } from '@/lib/taskFormat';

type CreatePriority = Exclude<TaskPriority, 'TASK_PRIORITY_UNSPECIFIED'>;
const PRIORITIES: CreatePriority[] = ['LOW', 'HIGH'];
const VIOLATOR_TYPES: Exclude<ViolatorType, 'VIOLATOR_TYPE_UNSPECIFIED'>[] = [
  'EMPLOYEE',
  'CLIENT',
];

export interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  /** После успешного создания (id с бэкенда) */
  onCreated: (taskId: string) => void;
}

export function CreateTaskModal({ open, onClose, onCreated }: CreateTaskModalProps) {
  const qc = useQueryClient();

  const officesQ = useQuery({
    queryKey: ['offices'],
    queryFn: searchOffices,
    enabled: open,
  });
  const employeesQ = useQuery({
    queryKey: ['employees'],
    queryFn: searchEmployees,
    enabled: open,
  });

  const [damageAmount, setDamageAmount] = useState('');
  const [priority, setPriority] = useState<CreatePriority>('LOW');
  const [executorId, setExecutorId] = useState('');
  const [officeId, setOfficeId] = useState('');
  const [violatorType, setViolatorType] = useState<
    (typeof VIOLATOR_TYPES)[number]
  >('CLIENT');
  const [violatorFullName, setViolatorFullName] = useState('');
  const [violatorPhoneNumber, setViolatorPhoneNumber] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setDamageAmount('');
    setPriority('LOW');
    setExecutorId('');
    setOfficeId('');
    setViolatorType('CLIENT');
    setViolatorFullName('');
    setViolatorPhoneNumber('');
    setFormError(null);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const createMut = useMutation({
    mutationFn: () =>
      createTask({
        damageAmount: damageAmount.trim(),
        priority,
        executorId: executorId.trim(),
        officeId: officeId.trim(),
        violatorType,
        violatorFullName: violatorFullName.trim(),
        violatorPhoneNumber: violatorPhoneNumber.trim(),
      }),
    onSuccess: async (res) => {
      const newId = res.id;
      if (!newId) {
        setFormError('Сервер не вернул id задачи');
        return;
      }
      await qc.invalidateQueries({ queryKey: ['tasks'] });
      onCreated(newId);
    },
    onError: (e) => {
      setFormError(e instanceof Error ? e.message : 'Ошибка создания');
    },
  });

  if (!open) {
    return null;
  }

  const offices = officesQ.data?.items ?? [];
  const employees = employeesQ.data?.items ?? [];

  return createPortal(
    <div className="gp-modal-root" role="presentation">
      <button
        type="button"
        className="gp-modal-backdrop"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div
        className="gp-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gp-create-task-title"
      >
        <div className="gp-modal-head">
          <h2 id="gp-create-task-title" className="gp-modal-title">
            Новая задача
          </h2>
          <button
            type="button"
            className="gp-modal-close"
            aria-label="Закрыть окно"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <form
          className="gp-modal-body gp-form"
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            if (
              !damageAmount.trim() ||
              !executorId.trim() ||
              !officeId.trim() ||
              !violatorFullName.trim() ||
              !violatorPhoneNumber.trim()
            ) {
              setFormError('Заполните все поля');
              return;
            }
            createMut.mutate();
          }}
        >
          <label className="gp-field gp-field_modal">
            <span>Сумма, ₽</span>
            <input
              value={damageAmount}
              onChange={(e) => setDamageAmount(e.target.value)}
              inputMode="numeric"
              required
            />
          </label>
          <label className="gp-field gp-field_modal">
            <span>Приоритет</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as CreatePriority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {priorityRu(p)}
                </option>
              ))}
            </select>
          </label>
          <label className="gp-field gp-field_modal">
            <span>Офис</span>
            {officesQ.isSuccess && offices.length > 0 ? (
              <select
                value={officeId}
                onChange={(e) => setOfficeId(e.target.value)}
                required
              >
                <option value="">— офис —</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id ?? ''}>
                    {o.name ?? o.id}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={officeId}
                onChange={(e) => setOfficeId(e.target.value)}
                placeholder="ID офиса"
                required
              />
            )}
          </label>
          <label className="gp-field gp-field_modal">
            <span>Исполнитель</span>
            {employeesQ.isSuccess && employees.length > 0 ? (
              <select
                value={executorId}
                onChange={(e) => setExecutorId(e.target.value)}
                required
              >
                <option value="">— сотрудник —</option>
                {employees.map((em) => (
                  <option key={em.id} value={em.id ?? ''}>
                    {em.fullName ?? em.id}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={executorId}
                onChange={(e) => setExecutorId(e.target.value)}
                placeholder="ID исполнителя"
                required
              />
            )}
          </label>
          {(officesQ.isError || employeesQ.isError) && (
            <p className="gp-muted-sm">Справочники недоступны — введите ID вручную.</p>
          )}
          <label className="gp-field gp-field_modal">
            <span>Тип нарушителя</span>
            <select
              value={violatorType}
              onChange={(e) =>
                setViolatorType(e.target.value as (typeof VIOLATOR_TYPES)[number])
              }
            >
              {VIOLATOR_TYPES.map((v) => (
                <option key={v} value={v}>
                  {violatorTypeRu(v)}
                </option>
              ))}
            </select>
          </label>
          <label className="gp-field gp-field_modal">
            <span>ФИО нарушителя</span>
            <input
              value={violatorFullName}
              onChange={(e) => setViolatorFullName(e.target.value)}
              required
            />
          </label>
          <label className="gp-field gp-field_modal">
            <span>Телефон</span>
            <input
              value={violatorPhoneNumber}
              onChange={(e) => setViolatorPhoneNumber(e.target.value)}
              required
            />
          </label>
          {formError ? <p className="gp-error gp-modal-error">{formError}</p> : null}
          <div className="gp-modal-actions">
            <button
              type="button"
              className="gp-btn gp-btn-secondary"
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="gp-btn gp-btn-primary"
              disabled={createMut.isPending}
            >
              {createMut.isPending ? 'Создание…' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
