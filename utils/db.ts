import { browser } from 'wxt/browser';

import { logError } from '@/utils/logger';

const ENTRY_RESULTS_KEY = 'entry_results';
const URL_QUERY_ENDPOINT_KEY = 'url_query_endpoint';
const CONTENT_QUERY_ENDPOINT_KEY = 'content_query_endpoint';

const saveValue = async (key: string, value: unknown) => {
  try {
    await browser.storage.local.set({ [key]: value });
  } catch (error) {
    logError('Error trying browser.storage.local.set', error);
  }
};

const getValue = async <T = unknown>(key: string): Promise<T | undefined> => {
  const records = await browser.storage.local.get(key);
  return records?.[key] as T | undefined;
};

const removeValue = async (key: string) => browser.storage.local.remove(key);

export const popEntryResults = async <T = unknown[]>(): Promise<T> => {
  const result = await getValue<T>(ENTRY_RESULTS_KEY);

  if (result) {
    await removeValue(ENTRY_RESULTS_KEY);
    return result;
  }

  return [] as T;
};

export const saveEntryResults = async (value: unknown[]) => saveValue(ENTRY_RESULTS_KEY, value);

export const getUrlQueryEndpoint = async () => {
  const result = await getValue<string>(URL_QUERY_ENDPOINT_KEY);
  return result ?? '';
};

export const saveUrlQueryEndpoint = async (value: string) => saveValue(URL_QUERY_ENDPOINT_KEY, value);

export const getContentQueryEndpoint = async () => {
  const result = await getValue<string>(CONTENT_QUERY_ENDPOINT_KEY);
  return result ?? '';
};

export const saveContentQueryEndpoint = async (value: string) => saveValue(CONTENT_QUERY_ENDPOINT_KEY, value);
