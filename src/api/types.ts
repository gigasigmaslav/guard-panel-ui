/** Соответствует v1EmployeePosition в OpenAPI / common.proto */
export type EmployeePosition =
  | 'EMPLOYEE_POSITION_UNSPECIFIED'
  | 'SEC'
  | 'SEC_HEAD';

export type TaskStatus =
  | 'CASE_STATUS_UNSPECIFIED'
  | 'NEW'
  | 'IN_PROGRESS'
  | 'PENDING_VUD'
  | 'IN_COURT'
  | 'COMPLETED';

export type TaskPriority =
  | 'TASK_PRIORITY_UNSPECIFIED'
  | 'LOW'
  | 'HIGH';

export type OrderDirection =
  | 'ORDER_DIRECTION_UNSPECIFIED'
  | 'ASC'
  | 'DESC';

export type OrderBy =
  | 'ORDER_BY_UNSPECIFIED'
  | 'BARCODES_DAMAGE_AMOUNT'
  | 'CREATED_AT';

export type ViolatorType =
  | 'VIOLATOR_TYPE_UNSPECIFIED'
  | 'EMPLOYEE'
  | 'CLIENT';

export interface Lookup {
  id?: string;
  name?: string;
}

export interface RpcStatus {
  code?: number;
  message?: string;
}

export interface AuthTokensResponse {
  accessToken?: string;
  expiresAt?: string;
}

export interface WhoAmIResponse {
  employeeId?: string;
  fullName?: string;
  position?: EmployeePosition;
}

export interface TaskLookup {
  id?: string;
  damageAmount?: string;
  priority?: TaskPriority;
  executor?: Lookup;
  violator?: Lookup;
  office?: Lookup;
  createdBy?: Lookup;
  createdAt?: string;
  startDate?: string;
  endDate?: string;
}

export interface SearchTasksResponse {
  items?: TaskLookup[];
  total?: number;
}

export interface Employee {
  id?: string;
  fullName?: string;
  position?: EmployeePosition;
  createdBy?: Lookup;
  createdAt?: string;
}

export interface SearchEmployeesResponse {
  items?: Employee[];
}

export interface Office {
  id?: string;
  name?: string;
  address?: string;
  createdBy?: Lookup;
  createdAt?: string;
}

export interface SearchOfficesResponse {
  items?: Office[];
}

export interface TaskDashboardTopExecutor {
  executorId?: string;
  executorName?: string;
  completedTasks?: string;
}

export interface GetTaskDashboardKPIResponse {
  activeTasksCount?: string;
  completedInPeriod?: string;
  createdInPeriod?: string;
  completedToCreatedRatio?: number;
  topExecutor?: TaskDashboardTopExecutor;
}

export interface TaskSearchFilter {
  id?: string;
  priority?: TaskPriority;
  officeId?: string;
  executorId?: string;
  violatorType?: ViolatorType;
  kusp?: string;
  ud?: string;
}

export interface ViolatorLookup {
  id?: string;
  name?: string;
  violatorType?: ViolatorType;
  violatorPhoneNumber?: string;
}

export interface TaskVudDecision {
  id?: string;
  kusp?: string;
  ud?: string;
  criminalCaseOpened?: boolean;
  comment?: string;
}

export interface TaskRefund {
  id?: string;
  amount?: string;
  comment?: string;
}

export interface TaskComment {
  id?: string;
  comment?: string;
  createdBy?: Lookup;
  createdAt?: string;
}

export interface TaskHistoryChange {
  event?: string;
  createdBy?: Lookup;
  createdAt?: string;
}

export interface Task {
  id?: string;
  damageAmount?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  executor?: Lookup;
  violator?: ViolatorLookup;
  office?: Lookup;
  createdBy?: Lookup;
  createdAt?: string;
  startDate?: string;
  endDate?: string;
  vudDecisions?: TaskVudDecision;
  refunds?: TaskRefund[];
  comments?: TaskComment[];
  historyChanges?: TaskHistoryChange[];
}

export interface GetTaskDetailsResponse {
  task?: Task;
}

export interface CreatedResponse {
  id?: string;
}
