import { apiFetch } from './client';
import type {
  AuthTokensResponse,
  CreatedResponse,
  EmployeePosition,
  GetTaskDashboardKPIResponse,
  GetTaskDetailsResponse,
  OrderBy,
  OrderDirection,
  SearchEmployeesResponse,
  SearchOfficesResponse,
  SearchTasksResponse,
  Task,
  TaskPriority,
  TaskSearchFilter,
  TaskStatus,
  TaskVudDecision,
  ViolatorType,
  WhoAmIResponse,
} from './types';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

/** Ответ GetTaskDetails: vudDecisions / vud_decisions, id как string (protojson). */
function normalizeVudDecision(raw: unknown): TaskVudDecision | undefined {
  if (!isPlainObject(raw)) {
    return undefined;
  }
  const idRaw = raw.id ?? raw.Id;
  const kuspRaw = raw.kusp ?? raw.Kusp;
  const kusp = typeof kuspRaw === 'string' ? kuspRaw : '';
  let idStr: string | undefined;
  if (typeof idRaw === 'number' && Number.isFinite(idRaw)) {
    idStr = String(idRaw);
  } else if (typeof idRaw === 'string' && idRaw.trim() !== '') {
    idStr = idRaw.trim();
  }
  const hasKusp = kusp.trim() !== '';
  const hasId = idStr != null && idStr !== '' && idStr !== '0';
  if (!hasId && !hasKusp) {
    return undefined;
  }
  const udRaw = raw.ud ?? raw.Ud;
  const ccRaw = raw.criminalCaseOpened ?? raw.criminal_case_opened;
  const commentRaw = raw.comment ?? raw.Comment;
  const out: TaskVudDecision = { kusp };
  if (hasId) {
    out.id = idStr;
  }
  if (typeof udRaw === 'string') {
    out.ud = udRaw;
  }
  if (typeof ccRaw === 'boolean') {
    out.criminalCaseOpened = ccRaw;
  }
  if (typeof commentRaw === 'string') {
    out.comment = commentRaw;
  }
  return out;
}

function normalizeTaskVud(task: Task): Task {
  const t = task as Task & { vud_decisions?: unknown };
  const raw = t.vudDecisions ?? t.vud_decisions;
  const one = Array.isArray(raw) ? raw[0] : raw;
  const vud = normalizeVudDecision(one);
  return { ...task, vudDecisions: vud };
}

function normalizeGetTaskDetailsBody(body: unknown): GetTaskDetailsResponse {
  if (!isPlainObject(body)) {
    return body as GetTaskDetailsResponse;
  }
  const taskRaw = body.task;
  if (!isPlainObject(taskRaw)) {
    return body as GetTaskDetailsResponse;
  }
  return { ...body, task: normalizeTaskVud(taskRaw as Task) };
}

function asInt64String(v: unknown): string | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return String(Math.trunc(v));
  }
  if (typeof v === 'string' && v.trim() !== '') {
    return v.trim();
  }
  return undefined;
}

function normalizeTaskDashboardKPIBody(body: unknown): GetTaskDashboardKPIResponse {
  if (!isPlainObject(body)) {
    return body as GetTaskDashboardKPIResponse;
  }
  const topRaw = body.topExecutor ?? body.top_executor;
  const top = isPlainObject(topRaw)
    ? {
        executorId: asInt64String(topRaw.executorId ?? topRaw.executor_id),
        executorName:
          typeof (topRaw.executorName ?? topRaw.executor_name) === 'string'
            ? String(topRaw.executorName ?? topRaw.executor_name)
            : undefined,
        completedTasks: asInt64String(
          topRaw.completedTasks ?? topRaw.completed_tasks,
        ),
      }
    : undefined;
  const ratioRaw = body.completedToCreatedRatio ?? body.completed_to_created_ratio;
  const ratio =
    typeof ratioRaw === 'number'
      ? ratioRaw
      : typeof ratioRaw === 'string'
        ? Number(ratioRaw)
        : undefined;
  return {
    activeTasksCount: asInt64String(body.activeTasksCount ?? body.active_tasks_count),
    completedInPeriod: asInt64String(body.completedInPeriod ?? body.completed_in_period),
    createdInPeriod: asInt64String(body.createdInPeriod ?? body.created_in_period),
    completedToCreatedRatio:
      ratio != null && Number.isFinite(ratio) ? ratio : undefined,
    topExecutor: top,
  };
}

export async function signIn(body: {
  employeeId: string;
  password: string;
}): Promise<AuthTokensResponse> {
  return apiFetch<AuthTokensResponse>('/api/v1/auth/sign-in', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({
      employeeId: body.employeeId,
      password: body.password,
    }),
  });
}

export async function signUp(body: {
  employeeId: string;
  password: string;
}): Promise<AuthTokensResponse> {
  return apiFetch<AuthTokensResponse>('/api/v1/auth/sign-up', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({
      employeeId: body.employeeId,
      password: body.password,
    }),
  });
}

export async function whoAmI(): Promise<WhoAmIResponse> {
  return apiFetch<WhoAmIResponse>('/api/v1/auth/whoami', { method: 'GET' });
}

export async function searchTasks(params: {
  page: number;
  perPage: number;
  sorting: { orderDirection: OrderDirection; orderBy: OrderBy };
  status: TaskStatus;
  filter?: TaskSearchFilter;
}): Promise<SearchTasksResponse> {
  const q = new URLSearchParams();
  q.set('page', String(params.page));
  q.set('perPage', String(params.perPage));
  q.set('sorting.orderDirection', params.sorting.orderDirection);
  q.set('sorting.orderBy', params.sorting.orderBy);
  q.set('status', params.status);
  const f = params.filter;
  if (f?.id?.trim()) {
    q.set('filter.id', f.id.trim());
  }
  if (f?.priority && f.priority !== 'TASK_PRIORITY_UNSPECIFIED') {
    q.set('filter.priority', f.priority);
  }
  if (f?.officeId?.trim()) {
    q.set('filter.officeId', f.officeId.trim());
  }
  if (f?.executorId?.trim()) {
    q.set('filter.executorId', f.executorId.trim());
  }
  if (f?.violatorType && f.violatorType !== 'VIOLATOR_TYPE_UNSPECIFIED') {
    q.set('filter.violatorType', f.violatorType);
  }
  if (f?.kusp?.trim()) {
    q.set('filter.kusp', f.kusp.trim());
  }
  if (f?.ud?.trim()) {
    q.set('filter.ud', f.ud.trim());
  }
  return apiFetch<SearchTasksResponse>(
    `/api/v1/tasks/search?${q.toString()}`,
    { method: 'GET' },
  );
}

export async function getTaskDetails(taskId: string): Promise<GetTaskDetailsResponse> {
  const body = await apiFetch<unknown>(`/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: 'GET',
  });
  return normalizeGetTaskDetailsBody(body);
}

export type UpdateTaskBody = {
  damageAmount?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  endDate?: string;
  executorId?: string;
};

export async function updateTask(
  taskId: string,
  body: UpdateTaskBody,
): Promise<void> {
  await apiFetch<Record<string, never>>(`/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function createTask(body: {
  damageAmount: string;
  priority: Exclude<TaskPriority, 'TASK_PRIORITY_UNSPECIFIED'>;
  executorId: string;
  officeId: string;
  violatorType: Exclude<ViolatorType, 'VIOLATOR_TYPE_UNSPECIFIED'>;
  violatorFullName: string;
  violatorPhoneNumber: string;
}): Promise<CreatedResponse> {
  return apiFetch<CreatedResponse>('/api/v1/tasks', {
    method: 'POST',
    body: JSON.stringify({
      damageAmount: body.damageAmount,
      priority: body.priority,
      executorId: body.executorId,
      officeId: body.officeId,
      violatorType: body.violatorType,
      violatorFullName: body.violatorFullName,
      violatorPhoneNumber: body.violatorPhoneNumber,
    }),
  });
}

export async function searchEmployees(): Promise<SearchEmployeesResponse> {
  return apiFetch<SearchEmployeesResponse>('/api/v1/employees/search', {
    method: 'GET',
  });
}

export type UpdateEmployeeBody = {
  fullName?: string;
  position?: EmployeePosition;
};

export async function updateEmployee(
  employeeId: string,
  body: UpdateEmployeeBody,
): Promise<void> {
  await apiFetch<Record<string, never>>(
    `/api/v1/employees/${encodeURIComponent(employeeId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  );
}

export async function createEmployee(body: {
  fullName: string;
  position: Exclude<EmployeePosition, 'EMPLOYEE_POSITION_UNSPECIFIED'>;
}): Promise<CreatedResponse> {
  return apiFetch<CreatedResponse>('/api/v1/employees', {
    method: 'POST',
    body: JSON.stringify({ fullName: body.fullName, position: body.position }),
  });
}

export async function deleteEmployee(employeeId: string): Promise<void> {
  await apiFetch<Record<string, never>>(
    `/api/v1/employees/${encodeURIComponent(employeeId)}`,
    { method: 'DELETE' },
  );
}

export async function searchOffices(): Promise<SearchOfficesResponse> {
  return apiFetch<SearchOfficesResponse>('/api/v1/offices/search', {
    method: 'GET',
  });
}

export type UpdateOfficeBody = {
  name?: string;
  address?: string;
};

export async function updateOffice(
  officeId: string,
  body: UpdateOfficeBody,
): Promise<void> {
  await apiFetch<Record<string, never>>(
    `/api/v1/offices/${encodeURIComponent(officeId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  );
}

export async function createOffice(body: {
  name: string;
  address: string;
}): Promise<CreatedResponse> {
  return apiFetch<CreatedResponse>('/api/v1/offices', {
    method: 'POST',
    body: JSON.stringify({ name: body.name, address: body.address }),
  });
}

export async function deleteOffice(officeId: string): Promise<void> {
  await apiFetch<Record<string, never>>(
    `/api/v1/offices/${encodeURIComponent(officeId)}`,
    { method: 'DELETE' },
  );
}

export async function createComment(body: {
  taskId: string;
  comment: string;
}): Promise<CreatedResponse> {
  return apiFetch<CreatedResponse>('/api/v1/comments', {
    method: 'POST',
    body: JSON.stringify({
      taskId: body.taskId,
      comment: body.comment,
    }),
  });
}

export async function deleteComment(commentId: string): Promise<void> {
  await apiFetch<Record<string, never>>(
    `/api/v1/comments/${encodeURIComponent(commentId)}`,
    { method: 'DELETE' },
  );
}

export async function createRefund(body: {
  taskId: string;
  amount: string;
  comment: string;
}): Promise<CreatedResponse> {
  return apiFetch<CreatedResponse>('/api/v1/refunds', {
    method: 'POST',
    body: JSON.stringify({
      taskId: body.taskId,
      amount: body.amount,
      comment: body.comment,
    }),
  });
}

export async function createVudDecision(body: {
  taskId: string;
  kusp: string;
  ud?: string;
  criminalCaseOpened?: boolean;
  comment?: string;
}): Promise<CreatedResponse> {
  const payload: Record<string, unknown> = {
    taskId: body.taskId,
    kusp: body.kusp,
  };
  if (body.ud !== undefined && body.ud !== '') {
    payload.ud = body.ud;
  }
  if (body.criminalCaseOpened !== undefined) {
    payload.criminalCaseOpened = body.criminalCaseOpened;
  }
  if (body.comment !== undefined && body.comment !== '') {
    payload.comment = body.comment;
  }
  return apiFetch<CreatedResponse>('/api/v1/vud-decisions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type UpdateVudDecisionBody = {
  kusp?: string;
  ud?: string;
  criminalCaseOpened?: boolean;
  comment?: string;
};

export async function updateVudDecision(
  vudId: string,
  body: UpdateVudDecisionBody,
): Promise<void> {
  await apiFetch<Record<string, never>>(
    `/api/v1/vud-decisions/${encodeURIComponent(vudId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  );
}

export function isSecHead(position: EmployeePosition | undefined): boolean {
  return position === 'SEC_HEAD';
}

export async function getTaskDashboardKPI(params?: {
  periodFrom?: string;
  periodTo?: string;
}): Promise<GetTaskDashboardKPIResponse> {
  const q = new URLSearchParams();
  if (params?.periodFrom) {
    q.set('periodFrom', params.periodFrom);
  }
  if (params?.periodTo) {
    q.set('periodTo', params.periodTo);
  }
  const qs = q.toString();
  const body = await apiFetch<unknown>(
    `/api/v1/analytics${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
  );
  return normalizeTaskDashboardKPIBody(body);
}
