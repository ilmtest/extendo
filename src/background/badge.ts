import { browser } from 'wxt/browser';

const setBadge = async (text: string, color: string) => {
    try {
        await browser.action.setBadgeBackgroundColor({ color });
        await browser.action.setBadgeText({ text });
    } catch {
        // Ignore badge update failures so sync/POST flows keep running.
    }
};

export const setSuccessBadge = () => setBadge('✅', '#15803d');

export const setWarningBadge = () => setBadge('⚠️', '#a16207');

export const setErrorBadge = () => setBadge('❌', '#b91c1c');
