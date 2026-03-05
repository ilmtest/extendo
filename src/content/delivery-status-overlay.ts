type RuntimeDeliveryStatus = 'posting' | 'posted' | 'failed';

export type ExtendoDeliveryStatusMessage = {
    type: 'EXTENDO_DELIVERY_STATUS';
    status: RuntimeDeliveryStatus;
    conversationId: string;
    eventId: string;
    seq: number;
    ts: number;
    error?: string | null;
};

type CreateDeliveryStatusOverlayOptions = {
    iconUrl: string;
};

const OVERLAY_ID = 'extendo-delivery-status-overlay';
const ICON_FALLBACK_TEXT = 'Ex';

const buildMessageText = (message: ExtendoDeliveryStatusMessage) => {
    if (message.status === 'posting') {
        return 'Extendo sending...';
    }
    if (message.status === 'posted') {
        return 'Extendo sent to server';
    }
    if (!message.error) {
        return 'Extendo failed to send';
    }
    const trimmedError = message.error.length > 120 ? `${message.error.slice(0, 117)}...` : message.error;
    return `Extendo failed: ${trimmedError}`;
};

const ensureOverlayElement = (iconUrl: string) => {
    let overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
        return overlay;
    }

    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.position = 'fixed';
    overlay.style.right = '16px';
    overlay.style.bottom = '16px';
    overlay.style.zIndex = '2147483647';
    overlay.style.display = 'none';
    overlay.style.alignItems = 'center';
    overlay.style.gap = '8px';
    overlay.style.padding = '8px 10px';
    overlay.style.borderRadius = '10px';
    overlay.style.boxShadow = '0 10px 24px rgba(0, 0, 0, 0.2)';
    overlay.style.fontFamily = '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
    overlay.style.fontSize = '12px';
    overlay.style.lineHeight = '1.4';
    overlay.style.background = '#111827';
    overlay.style.color = '#f9fafb';
    overlay.style.maxWidth = '360px';

    const icon = document.createElement('img');
    icon.alt = 'Extendo';
    icon.src = iconUrl;
    icon.setAttribute('data-extendo-status-icon', 'true');
    icon.width = 18;
    icon.height = 18;
    icon.style.borderRadius = '4px';
    icon.style.flexShrink = '0';

    const iconFallback = document.createElement('span');
    iconFallback.setAttribute('data-extendo-status-icon-fallback', 'true');
    iconFallback.textContent = ICON_FALLBACK_TEXT;
    iconFallback.style.display = 'none';
    iconFallback.style.alignItems = 'center';
    iconFallback.style.justifyContent = 'center';
    iconFallback.style.width = '18px';
    iconFallback.style.height = '18px';
    iconFallback.style.borderRadius = '4px';
    iconFallback.style.background = '#1f2937';
    iconFallback.style.color = '#f9fafb';
    iconFallback.style.fontSize = '10px';
    iconFallback.style.fontWeight = '700';
    iconFallback.style.flexShrink = '0';

    icon.addEventListener('error', () => {
        icon.style.display = 'none';
        iconFallback.style.display = 'inline-flex';
    });

    const statusBadge = document.createElement('span');
    statusBadge.setAttribute('data-extendo-status-badge', 'true');
    statusBadge.style.display = 'inline-flex';
    statusBadge.style.alignItems = 'center';
    statusBadge.style.justifyContent = 'center';
    statusBadge.style.width = '16px';
    statusBadge.style.height = '16px';
    statusBadge.style.fontSize = '12px';
    statusBadge.style.fontWeight = '700';
    statusBadge.style.borderRadius = '999px';
    statusBadge.style.background = '#374151';
    statusBadge.style.color = '#f9fafb';
    statusBadge.style.flexShrink = '0';

    const text = document.createElement('span');
    text.setAttribute('data-extendo-status-text', 'true');

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = '×';
    closeButton.setAttribute('data-extendo-status-close', 'true');
    closeButton.setAttribute('aria-label', 'Dismiss Extendo delivery status');
    closeButton.style.marginLeft = '2px';
    closeButton.style.border = 'none';
    closeButton.style.background = 'transparent';
    closeButton.style.color = '#d1d5db';
    closeButton.style.fontSize = '16px';
    closeButton.style.lineHeight = '1';
    closeButton.style.cursor = 'pointer';
    closeButton.style.padding = '0';
    closeButton.style.width = '16px';
    closeButton.style.height = '16px';
    closeButton.style.flexShrink = '0';
    closeButton.addEventListener('click', () => {
        overlay.style.display = 'none';
    });

    overlay.append(icon, iconFallback, statusBadge, text, closeButton);
    document.documentElement.appendChild(overlay);
    return overlay;
};

const applyStatusVisuals = (overlay: HTMLElement, message: ExtendoDeliveryStatusMessage) => {
    const statusBadge = overlay.querySelector('[data-extendo-status-badge="true"]') as HTMLElement | null;
    const text = overlay.querySelector('[data-extendo-status-text="true"]') as HTMLElement | null;
    if (!statusBadge || !text) {
        return;
    }

    if (message.status === 'posting') {
        statusBadge.textContent = '…';
        statusBadge.style.background = '#1f2937';
        statusBadge.style.color = '#f9fafb';
    } else if (message.status === 'posted') {
        statusBadge.textContent = '✓';
        statusBadge.style.background = '#166534';
        statusBadge.style.color = '#ecfdf5';
    } else {
        statusBadge.textContent = '!';
        statusBadge.style.background = '#991b1b';
        statusBadge.style.color = '#fef2f2';
    }

    text.textContent = buildMessageText(message);
};

export const isExtendoDeliveryStatusMessage = (value: unknown): value is ExtendoDeliveryStatusMessage => {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value as Partial<ExtendoDeliveryStatusMessage>;
    return (
        candidate.type === 'EXTENDO_DELIVERY_STATUS' &&
        (candidate.status === 'posting' || candidate.status === 'posted' || candidate.status === 'failed') &&
        typeof candidate.conversationId === 'string' &&
        typeof candidate.eventId === 'string' &&
        typeof candidate.seq === 'number' &&
        Number.isFinite(candidate.seq)
    );
};

export const shouldDisplayDeliveryStatusForUrl = (message: ExtendoDeliveryStatusMessage, url: string) =>
    message.conversationId.length === 0 || url.includes(message.conversationId);

export const createDeliveryStatusOverlay = (options: CreateDeliveryStatusOverlayOptions) => {
    const show = (message: ExtendoDeliveryStatusMessage) => {
        const overlay = ensureOverlayElement(options.iconUrl);
        applyStatusVisuals(overlay, message);
        overlay.style.display = 'inline-flex';
    };

    return {
        show,
    };
};
