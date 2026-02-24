import { browser } from 'wxt/browser';

import type { PersistedConversationHashEntry } from '@/src/background/types';
import { logError } from '@/src/utils/logger';

const ENTRY_RESULTS_KEY = 'entry_results';
const ILMTEST_API_INSTANCE_KEY = 'ilmtest_api_instance';
const TRANSLATIONS_API_INSTANCE_KEY = 'translations_api_instance';
const BLACKIYA_EXTENSION_ID_KEY = 'blackiya_extension_id';
const BLACKIYA_SAVED_CONVERSATION_HASHES_KEY = 'blackiya_saved_conversation_hashes';

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

const normalizeApiInstance = (value: string) => value.trim().replace(/\/+$/, '');
const normalizeExtensionId = (value: string) => value.trim();

const isPersistedConversationHashEntry = (value: unknown): value is PersistedConversationHashEntry =>
    Array.isArray(value) && value.length === 2 && typeof value[0] === 'string' && typeof value[1] === 'string';

export const popEntryResults = async <T = unknown[]>(): Promise<T> => {
    const result = await getValue<T>(ENTRY_RESULTS_KEY);

    if (result) {
        await removeValue(ENTRY_RESULTS_KEY);
        return result;
    }

    return [] as T;
};

export const saveEntryResults = async (value: unknown[]) => saveValue(ENTRY_RESULTS_KEY, value);

export const getIlmTestApiInstance = async () => {
    const result = await getValue<string>(ILMTEST_API_INSTANCE_KEY);
    return result ?? '';
};

export const saveIlmTestApiInstance = async (value: string) =>
    saveValue(ILMTEST_API_INSTANCE_KEY, normalizeApiInstance(value));

export const getTranslationsApiInstance = async () => {
    const result = await getValue<string>(TRANSLATIONS_API_INSTANCE_KEY);
    return result ?? '';
};

export const saveTranslationsApiInstance = async (value: string) =>
    saveValue(TRANSLATIONS_API_INSTANCE_KEY, normalizeApiInstance(value));

export const getBlackiyaExtensionId = async () => {
    const result = await getValue<string>(BLACKIYA_EXTENSION_ID_KEY);
    return result ?? '';
};

export const saveBlackiyaExtensionId = async (value: string) =>
    saveValue(BLACKIYA_EXTENSION_ID_KEY, normalizeExtensionId(value));

export const getBlackiyaSavedConversationHashes = async () => {
    const result = await getValue<unknown>(BLACKIYA_SAVED_CONVERSATION_HASHES_KEY);
    if (!Array.isArray(result)) {
        return [] as PersistedConversationHashEntry[];
    }

    return result.filter(isPersistedConversationHashEntry);
};

export const saveBlackiyaSavedConversationHashes = async (value: PersistedConversationHashEntry[]) =>
    saveValue(BLACKIYA_SAVED_CONVERSATION_HASHES_KEY, value);
