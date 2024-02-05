import browser from 'webextension-polyfill';

import { getEntries, ocr } from '../../api';
import { ENTRY_LOOKUP_RESULTS_KEY, OCR_RESULTS_KEY } from '../../utils/constants';
import { log } from '../../utils/logger';
import { saveValue } from '../../utils/state';

const performTextLookup = async (selectedText) => {
    browser.action.setBadgeText({ text: '…' });
    const entries = await getEntries({ query: JSON.stringify([selectedText]) });

    browser.action.setBadgeText({ text: entries.length.toString() });

    if (entries.length) {
        await saveValue(ENTRY_LOOKUP_RESULTS_KEY, entries);
    }
};

const performOCR = async (link) => {
    browser.action.setBadgeText({ text: '…' });
    const result = await ocr(import.meta.env.VITE_API_OCR_SPACE_URL, link);
    const text = result.ParsedResults?.length > 0 && result.ParsedResults[0].ParsedText;

    if (text) {
        await saveValue(OCR_RESULTS_KEY, { text });
        browser.action.setBadgeText({ text: '1' });
    } else {
        browser.action.setBadgeText({ text: '' });
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

    browser.contextMenus.create({
        contexts: ['image'],
        id: OCR_RESULTS_KEY,
        title: 'OCR',
    });
});

browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === ENTRY_LOOKUP_RESULTS_KEY) {
        performTextLookup(info.selectionText);
    } else if (info.menuItemId === OCR_RESULTS_KEY) {
        performOCR(info.srcUrl, tab);
    }
});
