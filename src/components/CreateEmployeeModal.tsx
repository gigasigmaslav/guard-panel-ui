import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEmployee } from '@/api/guardPanel';
import type { EmployeePosition } from '@/api/types';

type Position = Exclude<EmployeePosition, 'EMPLOYEE_POSITION_UNSPECIFIED'>;

export interface CreateEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateEmployeeModal({ open, onClose, onCreated }: CreateEmployeeModalProps) {
  const qc = useQueryClient();

  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState<Position>('SEC');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setFullName('');
    setPosition('SEC');
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

  const mut = useMutation({
    mutationFn: () =>
      createEmployee({ fullName: fullName.trim(), position }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['employees'] });
      onCreated();
    },
    onError: (e) => {
      setFormError(e instanceof Error ? e.message : 'Ошибка создания');
    },
  });

  if (!open) {
    return null;
  }

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
        aria-labelledby="gp-create-employee-title"
      >
        <div className="gp-modal-head">
          <h2 id="gp-create-employee-title" className="gp-modal-title">
            Новый сотрудник
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
            if (!fullName.trim()) {
              setFormError('Введите ФИО');
              return;
            }
            mut.mutate();
          }}
        >
          <label className="gp-field gp-field_modal">
            <span>ФИО</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Иванов Иван Иванович"
              required
            />
          </label>
          <label className="gp-field gp-field_modal">
            <span>Должность</span>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value as Position)}
            >
              <option value="SEC">Сотрудник СБ</option>
              <option value="SEC_HEAD">Руководитель СБ</option>
            </select>
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
              disabled={mut.isPending}
            >
              {mut.isPending ? 'Создание…' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
