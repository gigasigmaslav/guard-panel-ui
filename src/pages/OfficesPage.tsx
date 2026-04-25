import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteOffice, searchOffices, updateOffice } from '@/api/guardPanel';
import { CreateOfficeModal } from '@/components/CreateOfficeModal';

export function OfficesPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['offices'],
    queryFn: searchOffices,
  });

  const items = q.data?.items ?? [];
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [rowError, setRowError] = useState<string | null>(null);

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!editId) {
        throw new Error('Не выбран офис для редактирования');
      }
      const name = editName.trim();
      const address = editAddress.trim();
      if (!name || !address) {
        throw new Error('Название и адрес обязательны');
      }
      await updateOffice(editId, { name, address });
    },
    onSuccess: async () => {
      setRowError(null);
      setEditId(null);
      await qc.invalidateQueries({ queryKey: ['offices'] });
    },
    onError: (e) => {
      setRowError(e instanceof Error ? e.message : 'Ошибка обновления офиса');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (officeId: string) => deleteOffice(officeId),
    onSuccess: async () => {
      if (editId) {
        setEditId(null);
      }
      setRowError(null);
      await qc.invalidateQueries({ queryKey: ['offices'] });
    },
    onError: (e) => {
      setRowError(e instanceof Error ? e.message : 'Ошибка удаления офиса');
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const isBusy = updateMut.isPending || deleteMut.isPending;
  const original = useMemo(
    () => items.find((o) => String(o.id) === String(editId ?? '')),
    [items, editId],
  );
  const isDirty =
    !!original &&
    (editName.trim() !== (original.name ?? '').trim() ||
      editAddress.trim() !== (original.address ?? '').trim());

  function startEdit(officeId: string, name: string, address: string): void {
    setEditId(officeId);
    setEditName(name);
    setEditAddress(address);
    setRowError(null);
  }

  function cancelEdit(): void {
    setEditId(null);
    setEditName('');
    setEditAddress('');
    setRowError(null);
  }

  return (
    <div className="gp-page">
      <header className="gp-tasks-page-head">
        <h2 className="gp-page-title">Офисы</h2>
        <p className="gp-tasks-page-hint">Справочник офисов компании</p>
        <button
          type="button"
          className="gp-btn gp-btn-primary gp-btn-sm"
          onClick={() => setCreateOpen(true)}
        >
          Новый офис
        </button>
      </header>

      {q.isPending ? (
        <p className="gp-muted">Загрузка…</p>
      ) : q.isError ? (
        <p className="gp-error">
          {q.error instanceof Error ? q.error.message : 'Ошибка'}
        </p>
      ) : (
        <div className="gp-table-wrap">
          <table className="gp-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Адрес</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="gp-muted gp-center-cell">
                    Список пуст
                  </td>
                </tr>
              ) : (
                items.map((o) => (
                  <tr key={o.id}>
                    <td>
                      {editId === o.id ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="gp-table-input"
                        />
                      ) : (
                        o.name ?? '—'
                      )}
                    </td>
                    <td>
                      {editId === o.id ? (
                        <input
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          className="gp-table-input"
                        />
                      ) : (
                        o.address ?? '—'
                      )}
                    </td>
                    <td>
                      {editId === o.id ? (
                        <div className="gp-row-actions">
                          <button
                            type="button"
                            className="gp-btn gp-btn-primary gp-btn-sm"
                            disabled={!isDirty || isBusy}
                            onClick={() => {
                              setRowError(null);
                              updateMut.mutate();
                            }}
                          >
                            Сохранить
                          </button>
                          <button
                            type="button"
                            className="gp-btn gp-btn-secondary gp-btn-sm"
                            disabled={isBusy}
                            onClick={cancelEdit}
                          >
                            Отмена
                          </button>
                        </div>
                      ) : (
                        <div className="gp-row-actions">
                          <button
                            type="button"
                            className="gp-btn gp-btn-secondary gp-btn-sm"
                            disabled={isBusy}
                            onClick={() =>
                              startEdit(String(o.id ?? ''), o.name ?? '', o.address ?? '')
                            }
                          >
                            Изменить
                          </button>
                          <button
                            type="button"
                            className="gp-btn gp-btn-danger-ghost gp-btn-sm"
                            disabled={isBusy}
                            onClick={() => {
                              if (!o.id) {
                                return;
                              }
                              if (
                                window.confirm(
                                  `Удалить офис «${o.name ?? 'без названия'}»? Действие необратимо.`,
                                )
                              ) {
                                setRowError(null);
                                deleteMut.mutate(String(o.id));
                              }
                            }}
                          >
                            Удалить
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {rowError ? <p className="gp-error gp-mt-sm">{rowError}</p> : null}

      <CreateOfficeModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setCreateOpen(false)}
      />
    </div>
  );
}
