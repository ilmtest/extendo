import browser from 'webextension-polyfill';

import { getEntries } from '../../api';
import { saveEntryResults } from '../../utils/db';
import { log } from '../../utils/logger';

const ENTRY_LOOKUP_RESULTS_KEY = 'entry_lookup_results';

const performTextLookup = async (selectedText) => {
    browser.action.setBadgeText({ text: '…' });
    const entries = await getEntries({ query: JSON.stringify([selectedText]) });

    browser.action.setBadgeText({ text: entries.length.toString() });

    if (entries.length) {
        await saveEntryResults(entries);
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
        id: ENTRY_LOOKUP_RESULTS_KEY,
        title: 'Query Entries',
    });
});

browser.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === ENTRY_LOOKUP_RESULTS_KEY) {
        performTextLookup(info.selectionText);
    }
});
