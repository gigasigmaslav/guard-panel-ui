import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteEmployee, searchEmployees, updateEmployee } from '@/api/guardPanel';
import type { EmployeePosition } from '@/api/types';
import { CreateEmployeeModal } from '@/components/CreateEmployeeModal';

function posRu(p: string | undefined): string {
  switch (p) {
    case 'SEC_HEAD':
      return 'Руководитель СБ';
    case 'SEC':
      return 'Сотрудник СБ';
    default:
      return p ?? '—';
  }
}

export function EmployeesPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['employees'],
    queryFn: searchEmployees,
  });

  const items = q.data?.items ?? [];
  const [editId, setEditId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPosition, setEditPosition] = useState<EmployeePosition>('SEC');
  const [rowError, setRowError] = useState<string | null>(null);

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!editId) {
        throw new Error('Не выбран сотрудник для редактирования');
      }
      const fullName = editFullName.trim();
      if (!fullName) {
        throw new Error('ФИО обязательно');
      }
      if (editPosition !== 'SEC' && editPosition !== 'SEC_HEAD') {
        throw new Error('Выберите корректную должность');
      }
      await updateEmployee(editId, { fullName, position: editPosition });
    },
    onSuccess: async () => {
      setRowError(null);
      setEditId(null);
      await qc.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (e) => {
      setRowError(e instanceof Error ? e.message : 'Ошибка обновления сотрудника');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (employeeId: string) => deleteEmployee(employeeId),
    onSuccess: async () => {
      if (editId) {
        setEditId(null);
      }
      setRowError(null);
      await qc.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (e) => {
      setRowError(e instanceof Error ? e.message : 'Ошибка удаления сотрудника');
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const isBusy = updateMut.isPending || deleteMut.isPending;
  const original = useMemo(
    () => items.find((e) => String(e.id) === String(editId ?? '')),
    [items, editId],
  );
  const isDirty =
    !!original &&
    (editFullName.trim() !== (original.fullName ?? '').trim() ||
      editPosition !== original.position);

  function startEdit(
    employeeId: string,
    fullName: string,
    position: EmployeePosition | undefined,
  ): void {
    setEditId(employeeId);
    setEditFullName(fullName);
    setEditPosition(position === 'SEC_HEAD' ? 'SEC_HEAD' : 'SEC');
    setRowError(null);
  }

  function cancelEdit(): void {
    setEditId(null);
    setEditFullName('');
    setEditPosition('SEC');
    setRowError(null);
  }

  return (
    <div className="gp-page">
      <header className="gp-tasks-page-head">
        <h2 className="gp-page-title">Сотрудники</h2>
        <p className="gp-tasks-page-hint">Управление учётными записями</p>
        <button
          type="button"
          className="gp-btn gp-btn-primary gp-btn-sm"
          onClick={() => setCreateOpen(true)}
        >
          Новый сотрудник
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
                <th>ФИО</th>
                <th>Должность</th>
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
                items.map((e) => (
                  <tr key={e.id}>
                    <td>
                      {editId === e.id ? (
                        <input
                          value={editFullName}
                          onChange={(ev) => setEditFullName(ev.target.value)}
                          className="gp-table-input"
                        />
                      ) : (
                        e.fullName ?? '—'
                      )}
                    </td>
                    <td>
                      {editId === e.id ? (
                        <select
                          value={editPosition}
                          onChange={(ev) =>
                            setEditPosition(ev.target.value as EmployeePosition)
                          }
                          className="gp-table-input"
                        >
                          <option value="SEC">Сотрудник СБ</option>
                          <option value="SEC_HEAD">Руководитель СБ</option>
                        </select>
                      ) : (
                        posRu(e.position)
                      )}
                    </td>
                    <td>
                      {editId === e.id ? (
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
                              startEdit(
                                String(e.id ?? ''),
                                e.fullName ?? '',
                                e.position,
                              )
                            }
                          >
                            Изменить
                          </button>
                          <button
                            type="button"
                            className="gp-btn gp-btn-danger-ghost gp-btn-sm"
                            disabled={isBusy}
                            onClick={() => {
                              if (!e.id) {
                                return;
                              }
                              if (
                                window.confirm(
                                  `Удалить сотрудника «${e.fullName ?? 'без имени'}»? Действие необратимо.`,
                                )
                              ) {
                                setRowError(null);
                                deleteMut.mutate(String(e.id));
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

      <CreateEmployeeModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setCreateOpen(false)}
      />
    </div>
  );
}
