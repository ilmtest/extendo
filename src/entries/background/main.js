import browser from 'webextension-polyfill';

import { doGetRequest } from '~/api';

import { getContentQueryEndpoint, saveEntryResults } from '../../utils/db';
import { log } from '../../utils/logger';

const QUERY_LOOKUP_RESULTS_KEY = 'query_lookup_results';

const performTextLookup = async (selectedText) => {
    browser.action.setBadgeText({ text: '…' });

    const endpoint = await getContentQueryEndpoint();
    const urlWithQueryParams = endpoint
        .replace('{{text}}', encodeURIComponent(selectedText))
        .replace('{{string_array}}', JSON.stringify([selectedText]));
    const results = (await doGetRequest(urlWithQueryParams)).map((r) => ({
        [`${QUERY_LOOKUP_RESULTS_KEY}_timestamp`]: new Date().toLocaleTimeString(),
        [QUERY_LOOKUP_RESULTS_KEY]: selectedText,
        ...r,
    }));

    browser.action.setBadgeText({ text: results.length.toString() });

    if (results.length) {
        await saveEntryResults(results);
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
        id: QUERY_LOOKUP_RESULTS_KEY,
        title: 'Query Selected Text',
    });
});

browser.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === QUERY_LOOKUP_RESULTS_KEY) {
        performTextLookup(info.selectionText);
    }
});
