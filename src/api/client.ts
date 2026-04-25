import type { RpcStatus } from './types';

const TOKEN_KEY = 'guard_panel_access_token';

/**
 * В ответе sign-in / sign-up поле access token уже может быть вида «Bearer <wire>».
 * В заголовок Authorization нужно передать ровно одну схему Bearer.
 */
export function normalizeAccessTokenWire(raw: string | null | undefined): string | null {
  if (raw == null) {
    return null;
  }
  let t = raw.trim();
  while (t.length > 0 && /^Bearer\s+/i.test(t)) {
    t = t.replace(/^Bearer\s+/i, '').trim();
  }
  return t.length > 0 ? t : null;
}

export function getApiBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL;
  return base != null && base !== '' ? base.replace(/\/$/, '') : '';
}

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** Сохраняем только «wire» без префикса Bearer — так проще и безопаснее подставлять в заголовок. */
export function setStoredAccessToken(token: string | null): void {
  const wire = token != null ? normalizeAccessTokenWire(token) : null;
  if (wire) {
    localStorage.setItem(TOKEN_KEY, wire);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly rpc?: RpcStatus;

  constructor(message: string, status: number, rpc?: RpcStatus) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.rpc = rpc;
  }
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers: hdrs, ...rest } = init;
  const headers = new Headers(hdrs);
  if (!headers.has('Content-Type') && rest.body != null) {
    headers.set('Content-Type', 'application/json');
  }
  if (auth) {
    const wire = normalizeAccessTokenWire(getStoredAccessToken());
    if (wire) {
      headers.set('Authorization', `Bearer ${wire}`);
    }
  }

  const url = `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, { ...rest, headers });
  const body = await parseJsonSafe(res);

  if (!res.ok) {
    const rpc =
      body != null && typeof body === 'object' && 'message' in body
        ? (body as RpcStatus)
        : undefined;
    const msg =
      rpc?.message ||
      (typeof body === 'string' ? body : `HTTP ${res.status}`);
    throw new ApiError(msg, res.status, rpc);
  }

  return body as T;
}
