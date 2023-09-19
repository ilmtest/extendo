import browser from 'webextension-polyfill';

import { getEntries } from '../../api';
import { ENTRY_LOOKUP_RESULTS_KEY } from '../../utils/constants';
import { log, logError } from '../../utils/logger';
import { saveValue } from '../../utils/state';

const EXTENSION_ID = 'ilmtest_entry_lookup';

const performTextLookup = async (selectedText) => {
    browser.action.setBadgeText({ text: '…' });
    const entries = await getEntries({ query: JSON.stringify([selectedText]) });

    browser.action.setBadgeText({ text: entries.length.toString() });

    if (entries.length) {
        try {
            saveValue(ENTRY_LOOKUP_RESULTS_KEY, entries);
            browser.storage.local.set({ [ENTRY_LOOKUP_RESULTS_KEY]: entries });
        } catch (ex) {
            logError('Error trying browser.storage.local.set', ex);
        }
    }
};

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
        browser.action.setBadgeText({ text: '' });
    }
});

browser.runtime.onInstalled.addListener((details) => {
    const manifestData = browser.runtime.getManifest();

    if (details.reason === 'install') {
        log(`${manifestData.name} by ${manifestData.author} installed v${manifestData.version}.`);
    } else if (details.reason === 'update') {
        log(`${manifestData.name} by ${manifestData.author} updated to v${manifestData.version}.`);
    }

    browser.contextMenus.create({
        contexts: ['selection'],
        id: EXTENSION_ID,
        title: 'Query Entries',
    });
});

browser.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === EXTENSION_ID) {
        performTextLookup(info.selectionText);
    }
});
