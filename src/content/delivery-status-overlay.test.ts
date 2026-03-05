import { afterEach, describe, expect, it } from 'bun:test';
import {
    createDeliveryStatusOverlay,
    isExtendoDeliveryStatusMessage,
    shouldDisplayDeliveryStatusForUrl,
    type ExtendoDeliveryStatusMessage,
} from '@/src/content/delivery-status-overlay';

const buildMessage = (overrides?: Partial<ExtendoDeliveryStatusMessage>): ExtendoDeliveryStatusMessage => ({
    type: 'EXTENDO_DELIVERY_STATUS',
    status: 'posted',
    conversationId: 'conv-123',
    eventId: 'event-1',
    seq: 7,
    ts: Date.now(),
    ...overrides,
});

describe('content/delivery-status-overlay', () => {
    afterEach(() => {
        document.getElementById('extendo-delivery-status-overlay')?.remove();
    });

    it('should validate runtime delivery status message shape', () => {
        expect(isExtendoDeliveryStatusMessage(buildMessage())).toBeTrue();
        expect(isExtendoDeliveryStatusMessage({ type: 'EXTENDO_DELIVERY_STATUS', status: 'posted' })).toBeFalse();
        expect(isExtendoDeliveryStatusMessage({ type: 'unknown' })).toBeFalse();
    });

    it('should only display status for matching conversation url', () => {
        const message = buildMessage({ conversationId: '69a77c25-90f0-832a-bf40-df3af6d4f511' });
        expect(
            shouldDisplayDeliveryStatusForUrl(message, 'https://chatgpt.com/c/69a77c25-90f0-832a-bf40-df3af6d4f511'),
        ).toBeTrue();
        expect(shouldDisplayDeliveryStatusForUrl(message, 'https://chatgpt.com/c/other-conversation')).toBeFalse();
    });

    it('should render extendo icon and success checkmark for posted status', () => {
        const overlay = createDeliveryStatusOverlay({
            iconUrl: '/icon/32.png',
        });

        overlay.show(buildMessage({ status: 'posted' }));

        const node = document.getElementById('extendo-delivery-status-overlay');
        expect(node).not.toBeNull();
        expect(node?.style.display).toBe('inline-flex');
        const icon = node?.querySelector('img') as HTMLImageElement | null;
        expect(icon?.src.includes('/icon/32.png')).toBeTrue();
        const badge = node?.querySelector('[data-extendo-status-badge="true"]');
        expect(badge?.textContent).toBe('✓');
        const closeButton = node?.querySelector('[data-extendo-status-close="true"]') as HTMLButtonElement | null;
        expect(closeButton).not.toBeNull();
    });

    it('should render failure text with error details', () => {
        const overlay = createDeliveryStatusOverlay({
            iconUrl: '/icon/32.png',
        });

        overlay.show(buildMessage({ status: 'failed', error: '500 Internal Server Error' }));

        const node = document.getElementById('extendo-delivery-status-overlay');
        const text = node?.querySelector('[data-extendo-status-text="true"]')?.textContent ?? '';
        expect(text).toContain('Extendo failed:');
        expect(text).toContain('500 Internal Server Error');
    });

    it('should remain visible until explicitly dismissed', () => {
        const overlay = createDeliveryStatusOverlay({
            iconUrl: '/icon/32.png',
        });

        overlay.show(buildMessage({ status: 'posted' }));

        const node = document.getElementById('extendo-delivery-status-overlay');
        expect(node?.style.display).toBe('inline-flex');

        const closeButton = node?.querySelector('[data-extendo-status-close="true"]') as HTMLButtonElement | null;
        if (!closeButton) {
            throw new Error('expected close button');
        }
        closeButton.click();
        expect(node?.style.display).toBe('none');
    });

    it('should show fallback initials when icon fails to load', () => {
        const overlay = createDeliveryStatusOverlay({
            iconUrl: '/missing-icon.png',
        });

        overlay.show(buildMessage({ status: 'posted' }));

        const node = document.getElementById('extendo-delivery-status-overlay');
        const icon = node?.querySelector('[data-extendo-status-icon="true"]') as HTMLImageElement | null;
        const fallback = node?.querySelector('[data-extendo-status-icon-fallback="true"]') as HTMLElement | null;
        if (!icon || !fallback) {
            throw new Error('expected icon and fallback nodes');
        }
        icon.dispatchEvent(new Event('error'));
        expect(icon.style.display).toBe('none');
        expect(fallback.style.display).toBe('inline-flex');
        expect(fallback.textContent).toBe('Ex');
    });
});
