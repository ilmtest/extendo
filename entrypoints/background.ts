import { doGetRequest } from '@/api';
import { getContentQueryEndpoint, saveEntryResults } from '@/utils/db';
import { log, logError } from '@/utils/logger';
import { browser } from 'wxt/browser';

const QUERY_LOOKUP_RESULTS_KEY = 'query_lookup_results';

const performTextLookup = async (selectedText: string) => {
  if (!selectedText?.trim()) {
    return;
  }

  try {
    browser.action.setBadgeText({ text: '...' });

    const endpoint = await getContentQueryEndpoint();
    if (!endpoint) {
      browser.action.setBadgeText({ text: '' });
      return;
    }

    const urlWithQueryParams = endpoint
      .replace('{{text}}', encodeURIComponent(selectedText))
      .replace('{{string_array}}', encodeURIComponent(JSON.stringify([selectedText])));

    const data = await doGetRequest<Record<string, unknown>[]>(urlWithQueryParams);
    const results = data.map((item) => ({
      [`${QUERY_LOOKUP_RESULTS_KEY}_timestamp`]: new Date().toLocaleTimeString(),
      [QUERY_LOOKUP_RESULTS_KEY]: selectedText,
      ...item,
    }));

    browser.action.setBadgeText({ text: results.length.toString() });

    if (results.length > 0) {
      await saveEntryResults(results);
    }
  } catch (error) {
    logError('performTextLookup failed', error);
    browser.action.setBadgeText({ text: '!' });
  }
};

export default defineBackground(() => {
  browser.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
      browser.action.setBadgeText({ text: '' });
    }
  });

  browser.runtime.onInstalled.addListener((details) => {
    const manifestData = browser.runtime.getManifest();

    if (details.reason === 'install') {
      log(`${manifestData.name} by ${manifestData.author ?? 'unknown'} installed v${manifestData.version}.`);
    } else if (details.reason === 'update') {
      log(`${manifestData.name} by ${manifestData.author ?? 'unknown'} updated to v${manifestData.version}.`);
    }

    browser.contextMenus.removeAll().finally(() => {
      browser.contextMenus.create({
        contexts: ['selection'],
        id: QUERY_LOOKUP_RESULTS_KEY,
        title: 'Query Selected Text',
      });
    });
  });

  browser.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === QUERY_LOOKUP_RESULTS_KEY && info.selectionText) {
      void performTextLookup(info.selectionText);
    }
  });
});
