import browser from 'webextension-polyfill';

import { logError } from './logger';

export const saveValue = async (key, value) => {
    return browser.storage.local.set({ [key]: value });
};

export const getValue = async (key) => {
    try {
        const result = await browser.storage.local.get(key);
        return result[key];
    } catch (err) {
        logError(err);
    }

    return undefined;
};

export const removeValue = async (key) => {
    return browser.storage.local.remove(key);
};
