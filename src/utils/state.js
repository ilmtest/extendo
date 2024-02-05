import browser from 'webextension-polyfill';

import { logError } from './logger';

export const saveValue = async (key, value) => {
    try {
        await browser.storage.local.set({ [key]: value });
    } catch (ex) {
        logError('Error trying browser.storage.local.set', ex);
    }
};

export const removeValue = async (key) => {
    return browser.storage.local.remove(key);
};
