import browser from 'webextension-polyfill';

import { logError } from './logger';

const ENTRY_RESULTS_KEY = 'entry_results';
const URL_QUERY_ENDPOINT_KEY = 'url_query_endpoint';
const CONTENT_QUERY_ENDPOINT_KEY = 'content_query_endpoint';

const saveValue = async (key, value) => {
    try {
        await browser.storage.local.set({ [key]: value });
    } catch (ex) {
        logError('Error trying browser.storage.local.set', ex);
    }
};

const getValue = async (key) => {
    const records = await browser.storage.local.get(key);
    return records && records[key];
};

const removeValue = async (key) => {
    return browser.storage.local.remove(key);
};

export const popEntryResults = async () => {
    const result = await getValue(ENTRY_RESULTS_KEY);

    if (result) {
        await removeValue(ENTRY_RESULTS_KEY);
        return result;
    }

    return [];
};

export const saveEntryResults = async (value) => {
    return saveValue(ENTRY_RESULTS_KEY, value);
};

export const getUrlQueryEndpoint = async () => {
    const result = await getValue(URL_QUERY_ENDPOINT_KEY);
    return result || '';
};

export const saveUrlQueryEndpoint = async (value) => {
    return saveValue(URL_QUERY_ENDPOINT_KEY, value);
};

export const getContentQueryEndpoint = async () => {
    const result = await getValue(CONTENT_QUERY_ENDPOINT_KEY);
    return result || '';
};

export const saveContentQueryEndpoint = async (value) => {
    return saveValue(CONTENT_QUERY_ENDPOINT_KEY, value);
};
