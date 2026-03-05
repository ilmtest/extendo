import { browser } from 'wxt/browser';
import { log } from '@/src/utils/logger';
import {
    handleActiveTabUpdated,
    handleContextMenuClick,
    handleRuntimeInstalled,
    handleRuntimeMessage,
} from './handlers';

export default defineBackground(() => {
    log('Extendo background started.');

    browser.tabs.onUpdated.addListener(handleActiveTabUpdated);
    browser.runtime.onInstalled.addListener((details) => {
        handleRuntimeInstalled(details);
    });
    browser.contextMenus.onClicked.addListener(handleContextMenuClick);
    browser.runtime.onMessage.addListener(handleRuntimeMessage);
});
