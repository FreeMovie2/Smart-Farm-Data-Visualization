import { API_BASE_URL } from './config';

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-store' });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`GET ${path} failed: ${response.status} ${response.statusText} ${text}`);
  }
  return (await response.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`POST ${path} failed: ${response.status} ${response.statusText} ${text}`);
  }
  return (await response.json()) as T;
}

