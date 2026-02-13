import { log } from '@/utils/logger';

export const doGetRequest = async <T = unknown>(host: string, queries: Record<string, string> = {}): Promise<T> => {
  const url = new URL(host);

  if (Object.keys(queries).length > 0) {
    const search = new URLSearchParams(url.search);

    Object.entries(queries).forEach(([key, value]) => {
      search.append(key, value);
    });

    url.search = search.toString();
  }

  log('Requesting', url.toString());

  const response = await fetch(url, { method: 'GET' });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
};
