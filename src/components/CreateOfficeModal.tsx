import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOffice } from '@/api/guardPanel';

export interface CreateOfficeModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateOfficeModal({ open, onClose, onCreated }: CreateOfficeModalProps) {
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName('');
    setAddress('');
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
    mutationFn: () => createOffice({ name: name.trim(), address: address.trim() }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['offices'] });
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
        aria-labelledby="gp-create-office-title"
      >
        <div className="gp-modal-head">
          <h2 id="gp-create-office-title" className="gp-modal-title">
            Новый офис
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
            if (!name.trim() || !address.trim()) {
              setFormError('Заполните все поля');
              return;
            }
            mut.mutate();
          }}
        >
          <label className="gp-field gp-field_modal">
            <span>Название</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Офис на Ленина"
              required
            />
          </label>
          <label className="gp-field gp-field_modal">
            <span>Адрес</span>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="г. Москва, ул. Ленина 1"
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
